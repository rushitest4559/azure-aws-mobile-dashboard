# methods/aws/ec2.py

import concurrent.futures
from typing import List, Dict, Any
from methods.aws.auth import get_aws_boto_client, is_running_in_azure


# Configure logging
import logging
logger = logging.getLogger(__name__)


def get_aws_ec2_client(region: str):
    """Return EC2 client using OIDC in Azure, default AWS credentials elsewhere."""
    if is_running_in_azure():
        logger.info("🚀 Running in Azure – using OIDC + Managed Identity for EC2")
        return get_aws_boto_client("ec2", region=region)
    else:
        logger.info(f"💻 Running locally – using default AWS credentials for EC2 ({region})")
        return get_aws_boto_client("ec2", region=region)


def _fetch_ec2_instances_in_region(region: str) -> List[Dict[str, Any]]:
    """For a single region, fetch its EC2 instances without heavy details."""
    try:
        ec2 = get_aws_ec2_client(region)
        logger.info(f"📍 Scanning EC2 instances in {region}")

        resp = ec2.describe_instances()
        reservations = resp.get("Reservations", [])
        if not reservations:
            return []

        instances = []
        for reservation in reservations:
            for inst in reservation.get("Instances", []):
                # Minimal list view
                tags = {
                    tag["Key"]: tag["Value"] for tag in inst.get("Tags", [])
                } if inst.get("Tags") else {}
                instances.append({
                    "instance_id": inst["InstanceId"],
                    "instance_type": inst.get("InstanceType"),
                    "state": inst.get("State", {}).get("Name"),
                    "name": tags.get("Name", ""),
                    "public_ip": inst.get("PublicIpAddress"),
                    "private_ip": inst.get("PrivateIpAddress"),
                    "region": region,
                })

        return instances

    except Exception as e:
        logger.warning(f"⚠️ Failed to list EC2 instances in {region}: {str(e)}", exc_info=True)
        return []


def list_all_ec2_instances() -> List[Dict[str, Any]]:
    """Lists all EC2 instances across all AWS regions for the current account.
    Optimized for fast list view."""
    logger.info("🚀 list_all_ec2_instances (FAST) START")

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
            executor.submit(_fetch_ec2_instances_in_region, region): region
            for region in regions
        }

        for future in concurrent.futures.as_completed(future_to_region):
            region = future_to_region[future]
            try:
                instances = future.result()
                all_instances.extend(instances)
            except Exception as e:
                logger.warning(f"⚠️ Exception fetching EC2 instances for {region}: {str(e)}", exc_info=True)

    logger.info(f"🎉 Found {len(all_instances)} EC2 instances across {len(regions)} regions")
    return all_instances


def get_ec2_instance_details(instance_id: str, region: str) -> Dict[str, Any]:
    """Returns rich, detailed info for a single EC2 instance (ID + region)."""
    logger.info(f"🔍 get_ec2_instance_details: {instance_id} @ {region}")

    try:
        ec2 = get_aws_ec2_client(region)
        resp = ec2.describe_instances(InstanceIds=[instance_id])
        reservation = resp.get("Reservations", [{}])[0]
        inst = reservation.get("Instances", [{}])[0]

        # 1️⃣ Core instance metadata
        core = {
            "instance_id": inst.get("InstanceId"),
            "instance_type": inst.get("InstanceType"),
            "state": inst.get("State", {}).get("Name"),
            "region": region,
            "placement": {
                "availability_zone": inst.get("Placement", {}).get("AvailabilityZone"),
                "tenancy": inst.get("Placement", {}).get("Tenancy"),
            },
        }

        # 2️⃣ Networking
        networking = {
            "public_ip": inst.get("PublicIpAddress"),
            "private_ip": inst.get("PrivateIpAddress"),
            "private_dns_name": inst.get("PrivateDnsName"),
            "public_dns_name": inst.get("PublicDnsName"),
            "vpc_id": inst.get("VpcId"),
            "subnet_id": inst.get("SubnetId"),
        }

        # 3️⃣ Image / boot info
        image = {}
        if "ImageId" in inst:
            image = {
                "image_id": inst["ImageId"],
                "image_name": inst.get("Image", {}).get("Name"),  # not always present
                "kernel_id": inst.get("KernelId"),
                "ramdisk_id": inst.get("RamdiskId"),
            }

        # 4️⃣ Security / VPC
        vpc = {
            "security_groups": [
                sg["GroupName"] for sg in inst.get("SecurityGroups", [])
            ],
        }

        # 5️⃣ Storage (block device mappings)
        block_devices = inst.get("BlockDeviceMappings", [])
        storage = [
            {
                "device_name": bd["DeviceName"],
                "volume_id": bd.get("Ebs", {}).get("VolumeId"),
                "delete_on_termination": bd.get("Ebs", {}).get("DeleteOnTermination", False),
            }
            for bd in block_devices
        ]

        # 6️⃣ Tags
        tags = {
            tag["Key"]: tag["Value"] for tag in inst.get("Tags", [])
        } if inst.get("Tags") else {}

        return {
            "core": core,
            "networking": networking,
            "image": image,
            "vpc": vpc,
            "storage": storage,
            "tags": tags,
        }

    except Exception as e:
        logger.error(f"💥 Failed to get EC2 instance details for {instance_id} in {region}: {str(e)}", exc_info=True)
        return {
            "error": str(e),
            "instance_id": instance_id,
            "region": region,
            "state": "Unknown",
        }
