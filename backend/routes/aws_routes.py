# routes/aws_routes.py - UPDATED (NO DECORATORS)

import azure.functions as func
import logging
from datetime import datetime
import json

logger = logging.getLogger(__name__)

def http_json_response(data, status_code=200, error_message=None):
    if error_message:
        body = {
            "error": error_message,
            "timestamp": datetime.utcnow().isoformat()
        }
    else:
        body = data
    return func.HttpResponse(
        json.dumps(body, default=str),
        mimetype="application/json",
        status_code=status_code
    )

# Import your methods
from methods.aws.s3 import get_s3_buckets_with_metadata, get_s3_bucket_details
from methods.aws.eks import list_all_eks_clusters, get_eks_cluster_details
from methods.aws.rds import list_all_rds_instances, get_rds_instance_details
from methods.aws.ec2 import list_all_ec2_instances, get_ec2_instance_details

# PLAIN FUNCTIONS - NO @app.route()
def list_s3(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("🚀 list_s3 START")
    try:
        data = get_s3_buckets_with_metadata()
        return http_json_response(data, 200)
    except Exception as e:
        logger.error(f"💥 S3 list failed: {str(e)}", exc_info=True)
        return http_json_response(
            data=None,
            error_message=str(e),
            status_code=500
        )

def list_eks(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("🚀 list_eks START")
    try:
        data = list_all_eks_clusters()
        return http_json_response(data, 200)
    except Exception as e:
        logger.error(f"💥 EKS list failed: {str(e)}", exc_info=True)
        return http_json_response(
            data=None,
            error_message=str(e),
            status_code=500
        )

def eks_details(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("🚀 eks_details START")
    name = req.params.get("name")
    region = req.params.get("region")
    if not all([name, region]):
        return http_json_response(
            data=None,
            error_message="Missing: name and region",
            status_code=400
        )
    data = get_eks_cluster_details(name, region)
    return http_json_response(data, 200)

def s3_details(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("🚀 s3_details START")
    bucket_name = req.params.get("bucket_name")
    if not bucket_name:
        return http_json_response(
            data=None,
            error_message="bucket_name required",
            status_code=400
        )
    data = get_s3_bucket_details(bucket_name)
    return http_json_response(data, 200)

def list_rds(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("🚀 list_rds START")
    try:
        data = list_all_rds_instances()
        return http_json_response(data, 200)
    except Exception as e:
        logger.error(f"💥 RDS list failed: {str(e)}", exc_info=True)
        return http_json_response(
            data=None,
            error_message=str(e),
            status_code=500
        )

def rds_details(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("🚀 rds_details START")
    instance_id = req.params.get("instance_id")
    region = req.params.get("region")
    if not all([instance_id, region]):
        return http_json_response(
            data=None,
            error_message="Missing: instance_id and region",
            status_code=400
        )
    data = get_rds_instance_details(instance_id, region)
    return http_json_response(data, 200)

def list_ec2(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("🚀 list_ec2 START")
    try:
        data = list_all_ec2_instances()
        return http_json_response(data, 200)
    except Exception as e:
        logger.error(f"💥 EC2 list failed: {str(e)}", exc_info=True)
        return http_json_response(
            data=None,
            error_message=str(e),
            status_code=500
        )

def ec2_details(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("🚀 ec2_details START")
    instance_id = req.params.get("instance_id")
    region = req.params.get("region")
    if not all([instance_id, region]):
        return http_json_response(
            data=None,
            error_message="Missing: instance_id and region",
            status_code=400
        )
    data = get_ec2_instance_details(instance_id, region)
    return http_json_response(data, 200)
