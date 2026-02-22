import boto3
import os
import azure.identity
import azure.mgmt.storage
from botocore.exceptions import ClientError
from typing import List, Dict, Any

def get_aws_s3_client():
    """
    Helper to bridge Azure Managed Identity to AWS IAM Role via OIDC.
    """
    # 1. Get Azure Managed Identity token for the AWS audience
    # client_id here is your Managed Identity's Client ID (from app_settings)
    azure_cred = azure.identity.ManagedIdentityCredential(
        client_id=os.environ.get("AZURE_CLIENT_ID")
    )
    azure_token = azure_cred.get_token("api://AzureADTokenExchange")

    # 2. Exchange Azure JWT for AWS temporary credentials
    sts_client = boto3.client('sts', region_name='us-east-1')
    assumed_role = sts_client.assume_role_with_web_identity(
        RoleArn=os.environ.get("AWS_ROLE_ARN"),
        RoleSessionName="AzureFunctionS3Session",
        WebIdentityToken=azure_token.token
    )

    # 3. Return S3 client with temporary AWS credentials
    creds = assumed_role['Credentials']
    return boto3.client(
        's3',
        aws_access_key_id=creds['AccessKeyId'],
        aws_secret_access_key=creds['SecretAccessKey'],
        aws_security_token=creds['SessionToken']
    )

def get_s3_buckets_with_metadata() -> List[Dict[str, str]]:
    """Lists all S3 buckets using OIDC Bridge."""
    s3_client = get_aws_s3_client() # Updated to use OIDC client
    buckets = s3_client.list_buckets()['Buckets']
    
    bucket_metadata = []
    for bucket in buckets:
        location = s3_client.get_bucket_location(Bucket=bucket['Name']).get('LocationConstraint')
        bucket_metadata.append({
            'name': bucket['Name'],
            'created': bucket['CreationDate'].isoformat(),
            'region': location or 'us-east-1'
        })
    
    return bucket_metadata

def get_s3_bucket_details(bucket_name: str) -> Dict[str, Any]:
    """Gets detailed metadata for specific S3 bucket using OIDC Bridge."""
    s3_client = get_aws_s3_client() # Updated to use OIDC client
    
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

# Azure functions remain unchanged as you stated they work perfectly
def get_azure_storage_accounts_with_metadata(subscription_id: str) -> List[Dict[str, Any]]:
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

def safe_aws_call(s3_client, func_name: str, key: str, default: Any, **kwargs) -> Any:
    try:
        func = getattr(s3_client, func_name)
        response = func(**kwargs)
        return response.get(key, default)
    except ClientError:
        return default