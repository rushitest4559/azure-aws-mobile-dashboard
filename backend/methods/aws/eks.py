# methods/aws/eks.py

import os
import concurrent.futures
from typing import List, Dict, Any
from methods.aws.auth import get_aws_boto_client, is_running_in_azure


# Configure logging
import logging
logger = logging.getLogger(__name__)


def get_aws_eks_client(region: str):
    """Return EKS client using OIDC in Azure, default AWS credentials elsewhere."""
    if is_running_in_azure():
        logger.info("🚀 Running in Azure – using OIDC + Managed Identity for EKS")
        return get_aws_boto_client("eks", region=region)
    else:
        logger.info(f"💻 Running locally – using default AWS credentials for EKS ({region})")
        return get_aws_boto_client("eks", region=region)


def _fetch_clusters_in_region(region: str) -> List[Dict[str, Any]]:
    """For a single region, fetch its EKS clusters without describe_cluster."""
    try:
        eks = get_aws_eks_client(region)
        logger.info(f"📍 Scanning EKS clusters in {region}")

        resp = eks.list_clusters()
        cluster_names = resp.get("clusters", [])
        if not cluster_names:
            return []

        # Do NOT call describe_cluster; just return lightweight entries
        return [
            {
                "name": name,
                "region": region,
                # Real status would normally come from describe_cluster,
                # but for quick list page you can fake it or accept it not shown yet.
                "status": "Fetching..."  # or omit "status" entirely
            }
            for name in cluster_names
        ]
    except Exception as e:
        logger.warning(f"⚠️ Failed to list EKS clusters in {region}: {str(e)}", exc_info=True)
        return []


def list_all_eks_clusters() -> List[Dict[str, Any]]:
    """Lists all EKS clusters in all AWS regions for the current account.
    Returns minimal info optimized for fast list view."""
    logger.info("🚀 list_all_eks_clusters (FAST) START")

    # Get all regions via EC2
    ec2 = get_aws_boto_client("ec2")
    try:
        response = ec2.describe_regions()
        regions = [r["RegionName"] for r in response["Regions"]]
        logger.info(f"🌍 Found {len(regions)} AWS regions")
    except Exception as e:
        logger.error(f"❌ Failed to list AWS regions: {str(e)}", exc_info=True)
        return []

    all_clusters: List[Dict[str, Any]] = []

    # Parallelize region calls for speed
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_region = {
            executor.submit(_fetch_clusters_in_region, region): region
            for region in regions
        }

        for future in concurrent.futures.as_completed(future_to_region):
            region = future_to_region[future]
            try:
                clusters = future.result()
                all_clusters.extend(clusters)
            except Exception as e:
                logger.warning(f"⚠️ Exception fetching clusters for {region}: {str(e)}", exc_info=True)

    logger.info(f"🎉 Found {len(all_clusters)} EKS clusters across {len(regions)} regions")
    return all_clusters

def get_eks_cluster_details(name: str, region: str) -> Dict[str, Any]:
    """Returns rich, detailed info for a single EKS cluster (name + region)."""
    logger.info(f"🔍 get_eks_cluster_details: {name} @ {region}")

    try:
        eks = get_aws_eks_client(region)  # uses your shared factory
        resp = eks.describe_cluster(name=name)
        desc = resp["cluster"]

        # 1️⃣ Core cluster metadata
        core = {
            "name": desc["name"],
            "region": region,
            "arn": desc["arn"],
            "version": desc.get("version"),
            "platform_version": desc.get("platformVersion"),
            "status": desc["status"],
            "created_at": desc.get("createdAt").isoformat() if desc.get("createdAt") else None,
            "endpoint": desc.get("endpoint"),
        }

        # 2️⃣ VPC + Networking (resourcesVpcConfig)
        vpc_config = desc.get("resourcesVpcConfig", {})
        networking = {
            "vpc_id": vpc_config.get("vpcId"),
            "subnet_ids": vpc_config.get("subnetIds", []),
            "cluster_security_group_ids": vpc_config.get("clusterSecurityGroupIds", []),
            "endpoint_private_access": vpc_config.get("endpointPrivateAccess", False),
            "endpoint_public_access": vpc_config.get("endpointPublicAccess", False),
            "public_access_cidrs": vpc_config.get("publicAccessCidrs", []),
        }

        # 3️⃣ Kubernetes API / identity
        api = {
            "identity": desc.get("identity", {}),  # mostly oidc info
            "certificate_authority_data": desc.get("certificateAuthority", {}).get("data"),
        }

        # 4️⃣ Logging / monitoring (control plane logging)
        logging_config = desc.get("logging", {})
        logging_info = {
            "cluster_logging_enabled_types": [
                x["types"] for x in logging_config.get("clusterLogging", []) if x.get("enabled", False)
            ],
            "cluster_logging_enabled_services": [
                x["types"] for x in logging_config.get("clusterLogging", []) if x.get("enabled", False)
            ],
        }

        # 5️⃣ Add-ons / platform (extensions / platformVersion‑level flags)
        add_ons_info = {
            "platform_version": desc.get("platformVersion"),
        }

        # 6️⃣ Tags (if any)
        tags = {
            "tags": desc.get("tags", {})
        }

        # Merge all sections into one big detail object
        return {
            "core": core,
            "networking": networking,
            "api": api,
            "logging": logging_info,
            "add_ons": add_ons_info,
            "tags": tags,
            # If you prefer flat, you can merge keys into top level instead.
        }

    except Exception as e:
        logger.error(f"💥 Failed to get EKS cluster details for {name} in {region}: {str(e)}", exc_info=True)
        return {
            "error": str(e),
            "name": name,
            "region": region,
            "status": "Unknown"
        }
    """Returns detailed info for one EKS cluster by name and region."""
    logger.info(f"🔍 get_eks_cluster_details: {name} @ {region}")

    try:
        eks = get_aws_eks_client(region)
        desc = eks.describe_cluster(name=name)["cluster"]

        # Same structure as you use in list_all_eks_clusters, just one item
        return {
            "name": name,
            "region": region,
            "arn": desc["arn"],
            "version": desc.get("version"),
            "status": desc["status"],
            "endpoint": desc.get("endpoint"),
            "vpc_id": desc.get("resourcesVpcConfig", {}).get("vpcId"),
            "cluster_security_groups": desc.get("resourcesVpcConfig", {}).get("clusterSecurityGroupIds", []),
            "subnets": desc.get("resourcesVpcConfig", {}).get("subnetIds", []),
            "created_at": desc.get("createdAt").isoformat() if desc.get("createdAt") else None,
            "endpoint_private_access": desc.get("resourcesVpcConfig", {}).get("endpointPrivateAccess", False),
            "endpoint_public_access": desc.get("resourcesVpcConfig", {}).get("endpointPublicAccess", False),
            "platform_version": desc.get("platformVersion"),
        }

    except Exception as e:
        logger.error(f"💥 Failed to get EKS cluster {name} in {region}: {str(e)}", exc_info=True)
        return {
            "error": str(e),
            "name": name,
            "region": region,
            "status": "Unknown"
        }


        