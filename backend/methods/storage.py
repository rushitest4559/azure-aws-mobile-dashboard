import boto3
import azure.identity
import azure.mgmt.storage
from botocore.exceptions import ClientError
from typing import List, Dict, Any


def get_s3_buckets_with_metadata() -> List[Dict[str, str]]:
    """
    List all S3 buckets with basic metadata (name, creation date, region).
    
    Returns:
        List of bucket metadata dictionaries.
    """
    s3_client = boto3.client('s3')
    buckets = s3_client.list_buckets()['Buckets']
    
    bucket_metadata = []
    for bucket in buckets:
        # Get bucket region (None for us-east-1)
        location = s3_client.get_bucket_location(Bucket=bucket['Name']).get('LocationConstraint')
        bucket_metadata.append({
            'name': bucket['Name'],
            'created': bucket['CreationDate'].isoformat(),
            'region': location or 'us-east-1'
        })
    
    return bucket_metadata


def get_azure_storage_accounts_with_metadata(subscription_id: str) -> List[Dict[str, Any]]:
    """
    List Azure storage accounts with metadata for given subscription.
    
    Args:
        subscription_id: Azure subscription ID
        
    Returns:
        List of storage account metadata dictionaries.
    """
    credential = azure.identity.DefaultAzureCredential()
    storage_client = azure.mgmt.storage.StorageManagementClient(credential, subscription_id)
    
    accounts = []
    for account in storage_client.storage_accounts.list():
        # Parse resource group from account ID
        # /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/{name}
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


def safe_aws_call(s3_client, func_name: str, key: str, default: Any, **kwargs) -> Any:
    """
    Safely call AWS S3 API with error handling for missing resources.
    
    Args:
        s3_client: boto3 S3 client
        func_name: AWS function name (get_bucket_versioning, etc.)
        key: Response key to extract
        default: Default value if error occurs
        **kwargs: Arguments for the AWS function
        
    Returns:
        Value from response[key] or default
    """
    try:
        func = getattr(s3_client, func_name)
        response = func(**kwargs)
        return response.get(key, default)
    except ClientError:
        return default


def get_s3_bucket_details(bucket_name: str) -> Dict[str, Any]:
    """
    Get detailed metadata for specific S3 bucket.
    
    Args:
        bucket_name: Name of S3 bucket
        
    Returns:
        Dictionary with bucket configuration details.
    """
    s3_client = boto3.client('s3')
    
    # Get bucket properties with safe error handling
    location = safe_aws_call(
        s3_client, 'get_bucket_location', 'LocationConstraint', 'us-east-1', Bucket=bucket_name
    )
    
    return {
        'name': bucket_name,
        'region': location if location != 'None' else 'us-east-1',
        'versioning': safe_aws_call(s3_client, 'get_bucket_versioning', 'Status', 'Disabled', Bucket=bucket_name),
        'encryption': safe_aws_call(s3_client, 'get_bucket_encryption', 'ServerSideEncryptionConfiguration', {}, Bucket=bucket_name),
        'tags': safe_aws_call(s3_client, 'get_bucket_tagging', 'TagSet', [], Bucket=bucket_name),
        'logging': safe_aws_call(s3_client, 'get_bucket_logging', 'LoggingEnabled', None, Bucket=bucket_name),
        'public_access': safe_aws_call(s3_client, 'get_public_access_block', 'PublicAccessBlockConfiguration', {}, Bucket=bucket_name)
    }


def get_azure_storage_details(subscription_id: str, resource_group: str, account_name: str) -> Dict[str, Any]:
    """
    Get detailed properties for specific Azure storage account.
    
    Args:
        subscription_id: Azure subscription ID
        resource_group: Resource group name
        account_name: Storage account name
        
    Returns:
        Dictionary with storage account details.
    """
    credential = azure.identity.DefaultAzureCredential()
    client = azure.mgmt.storage.StorageManagementClient(credential, subscription_id)
    
    # Fetch account properties
    account = client.storage_accounts.get_properties(resource_group, account_name)
    
    def get_enum_value(attr) -> str:
        """Safely extract string value from enum or None."""
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
