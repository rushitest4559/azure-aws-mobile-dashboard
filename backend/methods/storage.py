import boto3
import os
import logging
import azure.identity
import azure.mgmt.storage
from botocore.exceptions import ClientError
from typing import List, Dict, Any

# Configure logging to show in Azure Log Stream
logger = logging.getLogger(__name__)

def get_aws_s3_client():
    """Exchanges Azure Managed Identity token for AWS temporary credentials."""
    client_id = os.environ.get("AZURE_CLIENT_ID")
    role_arn = os.environ.get("AWS_ROLE_ARN")

    logger.info(f"OIDC Bridge: Starting exchange for ClientID: {client_id[:5]}... and Role: {role_arn}")

    if not client_id or not role_arn:
        logger.error("OIDC Bridge: Missing environment variables AZURE_CLIENT_ID or AWS_ROLE_ARN")
        raise ValueError("Missing critical AWS/Azure environment variables")

    try:
        # 1. Get Azure Token
        logger.info("OIDC Bridge: Requesting token from Azure Identity...")
        azure_cred = azure.identity.ManagedIdentityCredential(client_id=client_id)
        azure_token = azure_cred.get_token("api://AzureADTokenExchange")
        logger.info("OIDC Bridge: Azure token acquired successfully.")

        # 2. Assume Role with AWS
        logger.info("OIDC Bridge: Calling AWS STS AssumeRoleWithWebIdentity...")
        sts_client = boto3.client('sts', region_name='us-east-1')
        assumed_role = sts_client.assume_role_with_web_identity(
            RoleArn=role_arn,
            RoleSessionName="AzureFunctionS3Session",
            WebIdentityToken=azure_token.token
        )
        logger.info("OIDC Bridge: AWS credentials assumed successfully.")

        # 3. Create S3 Client
        creds = assumed_role['Credentials']
        return boto3.client(
            's3',
            aws_access_key_id=creds['AccessKeyId'],
            aws_secret_access_key=creds['SecretAccessKey'],
            aws_security_token=creds['SessionToken']
        )
    except Exception as e:
        logger.error(f"OIDC Bridge Fatal Error: {str(e)}")
        raise

def safe_aws_call(s3_client, func_name: str, key: str, default: Any, **kwargs) -> Any:
    """Error handling wrapper for S3 API calls."""
    try:
        func = getattr(s3_client, func_name)
        response = func(**kwargs)
        return response.get(key, default)
    except Exception as e:
        logger.warning(f"AWS Call {func_name} failed: {str(e)}")
        return default

def get_s3_buckets_with_metadata() -> List[Dict[str, str]]:
    """Lists all S3 buckets via the OIDC Bridge."""
    logger.info("Fetching S3 bucket list...")
    s3_client = get_aws_s3_client()
    
    try:
        response = s3_client.list_buckets()
        buckets = response.get('Buckets', [])
        logger.info(f"Found {len(buckets)} S3 buckets.")
        
        bucket_metadata = []
        for bucket in buckets:
            name = bucket['Name']
            location = s3_client.get_bucket_location(Bucket=name).get('LocationConstraint')
            bucket_metadata.append({
                'name': name,
                'created': bucket['CreationDate'].isoformat(),
                'region': location or 'us-east-1'
            })
        return bucket_metadata
    except Exception as e:
        logger.error(f"Error listing S3 buckets: {str(e)}")
        raise

# Azure logic remains largely same but with basic entry logging
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

# ... [rest of the Azure details functions remain same]