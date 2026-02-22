import logging
import azure.identity
import azure.mgmt.storage
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def get_azure_storage_accounts_with_metadata(subscription_id: str) -> List[Dict[str, Any]]:
    logger.info(f"Fetching Azure Storage accounts for sub: {subscription_id}")
    credential = azure.identity.DefaultAzureCredential()
    storage_client = azure.mgmt.storage.StorageManagementClient(credential, subscription_id)
    
    accounts = []
    for account in storage_client.storage_accounts.list():
        parts = account.id.split('/')
        resource_group = parts[4] if len(parts) > 4 else 'unknown'
        accounts.append({
            'name': account.name,
            'location': account.location,
            'sku': account.sku.name,
            'kind': account.kind,
            'resource_group': resource_group
        })
    return accounts

def get_azure_storage_details(subscription_id: str, resource_group: str, account_name: str) -> Dict[str, Any]:
    """Fetches full properties for a specific Azure storage account."""
    credential = azure.identity.DefaultAzureCredential()
    client = azure.mgmt.storage.StorageManagementClient(credential, subscription_id)
    account = client.storage_accounts.get_properties(resource_group, account_name)
    
    def get_enum_value(attr) -> str:
        return getattr(attr, 'value', attr) if attr else None
    
    return {
        'name': account.name,
        'location': account.location,
        'sku': account.sku.name,
        'kind': account.kind,
        'status': get_enum_value(account.status_of_primary),
        'access_tier': get_enum_value(account.access_tier),
        'endpoints': {
            'blob': account.primary_endpoints.blob,
            'file': account.primary_endpoints.file,
            'queue': account.primary_endpoints.queue,
            'table': account.primary_endpoints.table
        },
        'encryption': account.encryption.as_dict() if account.encryption else {},
        'tags': dict(account.tags) if account.tags else {}
    }