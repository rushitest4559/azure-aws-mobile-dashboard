# methods/aws/credentials.py (or auth.py)

import os
import boto3
import azure.identity
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def is_running_in_azure():
    if os.environ.get("RUN_ENV") == "local":
        return False
    if os.environ.get("RUN_ENV") == "azure":
        return True
    return bool(
        os.environ.get("WEBSITE_SITE_NAME")
        and os.environ.get("WEBSITE_INSTANCE_ID")
    )


def _get_aws_credentials_via_oidc():
    """Return a dict of AWS creds (AccessKeyId, SecretAccessKey, SessionToken)."""
    client_id = os.environ.get("AZURE_CLIENT_ID")
    role_arn = os.environ.get("AWS_ROLE_ARN")
    if not client_id or not role_arn:
        raise ValueError("Missing AZURE_CLIENT_ID / AWS_ROLE_ARN")

    cred = azure.identity.ManagedIdentityCredential(client_id=client_id)

    scopes_to_try = [
        "api://sts.amazonaws.com",
        "https://sts.amazonaws.com",
        "sts.amazonaws.com",
    ]

    token = None
    for scope in scopes_to_try:
        try:
            logger.info(f"🔑 OIDC token request for scope: {scope}")
            token = cred.get_token(scope)
            logger.info(f"✅ Token obtained for {scope}")
            break
        except Exception as e:
            logger.error(f"❌ OIDC token failed for {scope}: {str(e)}", exc_info=True)

    if token is None:
        raise ValueError("No OIDC token acquired")

    sts = boto3.client("sts", region_name="us-east-1")
    assumed = sts.assume_role_with_web_identity(
        RoleArn=role_arn,
        RoleSessionName=f"azfunc-{datetime.utcnow().strftime('%H%M%S')}",
        WebIdentityToken=token.token,
    )

    creds = assumed["Credentials"]
    return {
        "aws_access_key_id": creds["AccessKeyId"],
        "aws_secret_access_key": creds["SecretAccessKey"],
        "aws_session_token": creds["SessionToken"],
    }


def get_aws_boto_client(service: str, region: str = "us-east-1"):
    """Central factory for any AWS boto client (s3, eks, rds, ec2, ...)."""
    if is_running_in_azure():
        logger.info(f"🚀 Running in Azure: using OIDC for {service}")
        creds = _get_aws_credentials_via_oidc()
        return boto3.client(
            service,
            region_name=region,
            **creds,
        )
    else:
        logger.info(f"💻 Local: default AWS credentials for {service} ({region})")
        return boto3.client(service, region_name=region)
