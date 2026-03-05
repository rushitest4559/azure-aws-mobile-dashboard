# methods/aws/s3.py

import os
import boto3
from botocore.exceptions import ClientError
from typing import List, Dict, Any
from methods.aws.auth import get_aws_boto_client, is_running_in_azure


# Configure logging
import logging
logger = logging.getLogger(__name__)


def safe_aws_call(s3_client, func_name: str, key: str, default: Any, **kwargs) -> Any:
    """Error handling wrapper for S3 API calls."""
    logger.info(f"📞 S3.{func_name}({kwargs})")
    try:
        func_call = getattr(s3_client, func_name)
        response = func_call(**kwargs)
        return response.get(key, default)
    except ClientError as e:
        logger.warning(f"⚠️ S3.{func_name} failed [{e.response['Error']['Code']}]")
        return default
    except Exception as e:
        logger.warning(f"⚠️ S3.{func_name}: {str(e)}", exc_info=True)
        return default


def get_aws_s3_client():
    """Return S3 client using OIDC in Azure, default AWS credentials elsewhere."""
    if is_running_in_azure():
        logger.info("🚀 Running in Azure – using OIDC + Managed Identity for S3")
        return get_aws_boto_client("s3")
    else:
        logger.info("💻 Running locally – using default AWS credentials (~/.aws/credentials) for S3")
        return boto3.client("s3")


def get_s3_buckets_with_metadata() -> List[Dict[str, Any]]:
    """Lists all S3 buckets."""
    logger.info("📦 get_s3_buckets_with_metadata START")
    s3_client = get_aws_s3_client()

    logger.info("🏠 Listing buckets...")
    response = s3_client.list_buckets()
    buckets = response.get("Buckets", [])
    logger.info(f"✅ Found {len(buckets)} buckets")

    bucket_metadata = []
    for i, bucket in enumerate(buckets, 1):
        name = bucket["Name"]
        logger.info(f"📍 [{i}/{len(buckets)}] Processing: {name}")

        region = safe_aws_call(
            s3_client, "get_bucket_location", "LocationConstraint",
            "us-east-1", Bucket=name
        ) or "us-east-1"

        bucket_metadata.append({
            "name": name,
            "created": bucket["CreationDate"].isoformat(),
            "region": region
        })

    logger.info(f"🎉 Returning {len(bucket_metadata)} buckets")
    return bucket_metadata


def get_s3_bucket_details(bucket_name: str) -> Dict[str, Any]:
    """Get detailed info for specific S3 bucket."""
    logger.info(f"📋 get_s3_bucket_details: {bucket_name}")
    s3_client = get_aws_s3_client()

    location = safe_aws_call(
        s3_client, "get_bucket_location", "LocationConstraint",
        "us-east-1", Bucket=bucket_name
    )

    policy = safe_aws_call(
        s3_client, "get_bucket_policy", "Policy", None,
        Bucket=bucket_name
    )

    return {
        "name": bucket_name,
        "region": location or "us-east-1",
        "policy_exists": policy is not None
    }
