# methods/azure/storage.py

import logging
from typing import List, Dict, Any
import azure.identity
import azure.mgmt.storage


logger = logging.getLogger(__name__)


def get_azure_storage_accounts_with_metadata(subscription_id: str) -> List[Dict[str, Any]]:
    """Fetch metadata for all Azure Storage accounts in a subscription."""
    logger.info(f"📦 Fetching Azure Storage accounts for subscription: {subscription_id}")
    try:
        credential = azure.identity.DefaultAzureCredential()
        storage_client = azure.mgmt.storage.StorageManagementClient(
            credential, subscription_id
        )

        accounts = []
        for account in storage_client.storage_accounts.list():
            parts = account.id.split("/")
            resource_group = parts[4] if len(parts) > 4 else "unknown"

            logger.debug(f"Account found: {account.name} in RG={resource_group}")
            accounts.append({
                "name": account.name,
                "location": account.location,
                "sku": account.sku.name,
                "kind": account.kind,
                "resource_group": resource_group,
                "id": account.id,
            })

        logger.info(f"✅ Total accounts fetched: {len(accounts)}")
        return accounts

    except Exception as e:
        logger.error(
            f"💥 Failed to fetch storage accounts for {subscription_id}: {str(e)}",
            exc_info=True,
        )
        raise


def get_azure_storage_details(
    subscription_id: str, resource_group: str, account_name: str
) -> Dict[str, Any]:
    """Fetches full properties for a specific Azure storage account."""
    logger.info(
        f"📋 Fetching details for storage account: {account_name} in RG={resource_group}"
    )
    try:
        credential = azure.identity.DefaultAzureCredential()
        client = azure.mgmt.storage.StorageManagementClient(
            credential, subscription_id
        )

        account = client.storage_accounts.get_properties(
            resource_group_name=resource_group, account_name=account_name
        )
        logger.debug(f"Properties retrieved for account: {account.name}")

        def get_enum_value(attr) -> str:
            return getattr(attr, "value", attr) if attr else None

        details = {
            "name": account.name,
            "location": account.location,
            "sku": account.sku.name,
            "kind": account.kind,
            "status": get_enum_value(account.status_of_primary),
            "access_tier": get_enum_value(account.access_tier),
            "endpoints": {
                "blob": account.primary_endpoints.blob,
                "file": account.primary_endpoints.file,
                "queue": account.primary_endpoints.queue,
                "table": account.primary_endpoints.table,
            },
            "encryption": account.encryption.as_dict() if account.encryption else None,
            "tags": dict(account.tags) if account.tags else {},
        }

        logger.info(
            f"✅ Details fetched successfully for account: {account_name}"
        )
        return details

    except Exception as e:
        logger.error(
            f"💥 Failed to fetch details for {account_name} (RG={resource_group}): {str(e)}",
            exc_info=True,
        )
        raise
