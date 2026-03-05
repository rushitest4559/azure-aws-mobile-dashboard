# methods/aws/rds.py

import concurrent.futures
from typing import List, Dict, Any
from methods.aws.auth import get_aws_boto_client, is_running_in_azure


# Configure logging
import logging
logger = logging.getLogger(__name__)


def get_aws_rds_client(region: str):
    """Return RDS client using OIDC in Azure, default AWS credentials elsewhere."""
    if is_running_in_azure():
        logger.info("🚀 Running in Azure – using OIDC + Managed Identity for RDS")
        return get_aws_boto_client("rds", region=region)
    else:
        logger.info(f"💻 Running locally – using default AWS credentials for RDS ({region})")
        return get_aws_boto_client("rds", region=region)


def _fetch_rds_instances_in_region(region: str) -> List[Dict[str, Any]]:
    """For a single region, fetch its RDS instances WITHOUT heavy details."""
    try:
        rds = get_aws_rds_client(region)
        logger.info(f"📍 Scanning RDS instances in {region}")

        resp = rds.describe_db_instances()
        instances = resp.get("DBInstances", [])
        if not instances:
            return []

        # Minimal list view: no engine‑level schema info, no snapshots, etc.
        return [
            {
                "db_instance_identifier": db["DBInstanceIdentifier"],
                "db_instance_class": db["DBInstanceClass"],
                "engine": db["Engine"],
                "status": db["DBInstanceStatus"],
                "region": region,
                "endpoint_address": db.get("Endpoint", {}).get("Address"),
                "port": db.get("Endpoint", {}).get("Port"),
            }
            for db in instances
        ]
    except Exception as e:
        logger.warning(f"⚠️ Failed to list RDS instances in {region}: {str(e)}", exc_info=True)
        return []


def list_all_rds_instances() -> List[Dict[str, Any]]:
    """Lists all RDS instances across all AWS regions for the current account.
    Optimized for fast list view."""
    logger.info("🚀 list_all_rds_instances (FAST) START")

    # Get all regions via EC2
    ec2 = get_aws_boto_client("ec2")
    try:
        response = ec2.describe_regions()
        regions = [r["RegionName"] for r in response["Regions"]]
        logger.info(f"🌍 Found {len(regions)} AWS regions")
    except Exception as e:
        logger.error(f"❌ Failed to list AWS regions: {str(e)}", exc_info=True)
        return []

    all_instances: List[Dict[str, Any]] = []

    # Parallelize region calls for speed
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_region = {
            executor.submit(_fetch_rds_instances_in_region, region): region
            for region in regions
        }

        for future in concurrent.futures.as_completed(future_to_region):
            region = future_to_region[future]
            try:
                instances = future.result()
                all_instances.extend(instances)
            except Exception as e:
                logger.warning(f"⚠️ Exception fetching RDS instances for {region}: {str(e)}", exc_info=True)

    logger.info(f"🎉 Found {len(all_instances)} RDS instances across {len(regions)} regions")
    return all_instances


def get_rds_instance_details(instance_id: str, region: str) -> Dict[str, Any]:
    """Returns rich, detailed info for a single RDS instance (identifier + region)."""
    logger.info(f"🔍 get_rds_instance_details: {instance_id} @ {region}")

    try:
        rds = get_aws_rds_client(region)
        resp = rds.describe_db_instances(DBInstanceIdentifier=instance_id)
        db = resp["DBInstances"][0]  # assume exists; caller already has list

        # 1️⃣ Core instance metadata
        core = {
            "db_instance_identifier": db["DBInstanceIdentifier"],
            "db_instance_class": db["DBInstanceClass"],
            "engine": db["Engine"],
            "engine_version": db.get("EngineVersion"),
            "status": db["DBInstanceStatus"],
            "region": region,
            "multi_az": db.get("MultiAZ", False),
            "storage_type": db.get("StorageType"),
            "allocated_storage_gb": db.get("AllocatedStorage"),
            "storage_encrypted": db.get("StorageEncrypted", False),
            "iam_database_authentication_enabled": db.get("IAMDatabaseAuthenticationEnabled", False),
        }

        # 2️⃣ Endpoint / network
        endpoint = db.get("Endpoint", {})
        networking = {
            "address": endpoint.get("Address"),
            "port": endpoint.get("Port"),
            "hosted_zone_id": endpoint.get("HostedZoneId"),
        }

        # 3️⃣ VPC / subnet / security groups
        vpc = {}
        if "DBSubnetGroup" in db:
            vpc = {
                "db_subnet_group": db["DBSubnetGroup"]["DBSubnetGroupName"],
                "vpc_id": db["DBSubnetGroup"].get("VpcId"),
                "subnet_ids": [
                    sn["SubnetIdentifier"] for sn in db["DBSubnetGroup"].get("Subnets", [])
                ],
                "db_security_group_instances": [
                    sg["DBSecurityGroupName"] for sg in db.get("DBSecurityGroups", [])
                ],
            }

        # 4️⃣ High‑level storage / performance
        performance = {
            "iops": db.get("Iops"),
            "max_allocated_storage": db.get("MaxAllocatedStorage"),
            "backup_retention_days": db.get("BackupRetentionPeriod"),
            "preferred_backup_window": db.get("PreferredBackupWindow"),
            "preferred_maintenance_window": db.get("PreferredMaintenanceWindow"),
            "auto_minor_version_upgrade": db.get("AutoMinorVersionUpgrade", False),
        }

        # 5️⃣ Tags
        tags = {"tags": db.get("TagList", [])}

        return {
            "core": core,
            "networking": networking,
            "vpc": vpc,
            "performance": performance,
            "tags": tags,
        }

    except Exception as e:
        logger.error(f"💥 Failed to get RDS instance details for {instance_id} in {region}: {str(e)}", exc_info=True)
        return {
            "error": str(e),
            "db_instance_identifier": instance_id,
            "region": region,
            "status": "Unknown",
        }
