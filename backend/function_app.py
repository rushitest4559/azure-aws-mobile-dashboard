import azure.functions as func
import os
import json
import logging

logger = logging.getLogger(__name__)

try:
    from methods.aws import (
        get_s3_buckets_with_metadata,
        get_s3_bucket_details
    )
    from methods.azure import (
        get_azure_storage_accounts_with_metadata,
        get_azure_storage_details
    )
    logger.info("Successfully imported aws and azure modules")
except Exception as e:
    logger.error(f"Failed to import modules: {str(e)}")

app = func.FunctionApp()

@app.route(route="aws/list", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def list_aws(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("Route hit: /aws/list")
    try:
        data = get_s3_buckets_with_metadata()
        return func.HttpResponse(
            json.dumps(data, default=str),
            mimetype="application/json",
            status_code=200
        )
    except Exception as e:
        logger.exception("Error in list_aws")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )

@app.route(route="azure/list", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def list_azure(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("Route hit: /azure/list")
    try:
        sub_id = os.environ.get('AZURE_SUBSCRIPTION_ID')
        if not sub_id:
            return func.HttpResponse("Subscription ID not configured", status_code=500)
        
        data = get_azure_storage_accounts_with_metadata(sub_id)
        return func.HttpResponse(
            json.dumps(data, default=str),
            mimetype="application/json",
            status_code=200
        )
    except Exception as e:
        logger.exception("Error in list_azure")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )

@app.route(route="aws/details", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def aws_details(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("Route hit: /aws/details")
    try:
        bucket_name = req.params.get('bucket_name')
        if not bucket_name:
            return func.HttpResponse("Missing bucket_name parameter", status_code=400)
        
        data = get_s3_bucket_details(bucket_name)
        return func.HttpResponse(
            json.dumps(data, default=str),
            mimetype="application/json",
            status_code=200
        )
    except Exception as e:
        logger.exception(f"Error in aws_details for bucket: {bucket_name}")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )

@app.route(route="azure/details", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def azure_details(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("Route hit: /azure/details")
    try:
        sub_id = os.environ.get('AZURE_SUBSCRIPTION_ID')
        resource_group = req.params.get('resource_group')
        account_name = req.params.get('account_name')
        
        if not all([sub_id, resource_group, account_name]):
            return func.HttpResponse("Missing parameters", status_code=400)
        
        data = get_azure_storage_details(sub_id, resource_group, account_name)
        return func.HttpResponse(
            json.dumps(data, default=str),
            mimetype="application/json",
            status_code=200
        )
    except Exception as e:
        logger.exception("Error in azure_details")
        return func.HttpResponse(
            json.dumps({"error": str(e)}),
            status_code=500,
            mimetype="application/json"
        )