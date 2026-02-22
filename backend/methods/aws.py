import boto3
import os
import logging
from botocore.exceptions import ClientError
from typing import List, Dict, Any
import azure.identity

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
        logger.info("OIDC Bridge: Requesting token from Azure Identity...")
        azure_cred = azure.identity.ManagedIdentityCredential(client_id=client_id)
        azure_token = azure_cred.get_token("api://AzureADTokenExchange")
        logger.info("OIDC Bridge: Azure token acquired successfully.")

        logger.info("OIDC Bridge: Calling AWS STS AssumeRoleWithWebIdentity...")
        sts_client = boto3.client('sts', region_name='us-east-1')
        assumed_role = sts_client.assume_role_with_web_identity(
            RoleArn=role_arn,
            RoleSessionName="AzureFunctionS3Session",
            WebIdentityToken=azure_token.token
        )
        logger.info("OIDC Bridge: AWS credentials assumed successfully.")

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