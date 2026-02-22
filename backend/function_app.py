import azure.functions as func
import os
import json
import logging

# Set up logging to ensure it captures detail
logger = logging.getLogger(__name__)

# Import logic
try:
    from methods.storage import (
        get_s3_buckets_with_metadata,
        get_azure_storage_accounts_with_metadata,
        get_s3_bucket_details,
        get_azure_storage_details
    )
    logger.info("Successfully imported methods.storage")
except Exception as e:
    logger.error(f"Failed to import methods.storage: {str(e)}")

# Initialize the Function App
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
        logger.exception("Error in list_aws") # This prints the full stack trace
        return func.HttpResponse(
            json.dumps({"error": str(e), "context": "Error occurred in list_aws"}),
            status_code=500,
            mimetype="application/json"
        )

@app.route(route="azure/list", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def list_azure(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("Route hit: /azure/list")
    try:
        sub_id = os.environ.get('AZURE_SUBSCRIPTION_ID')
        if not sub_id:
            logger.error("AZURE_SUBSCRIPTION_ID is missing from environment")
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
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500)

@app.route(route="azure/details", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def azure_details(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("Route hit: /azure/details")
    try:
        sub_id = os.environ.get('AZURE_SUBSCRIPTION_ID')
        resource_group = req.params.get('resource_group')
        account_name = req.params.get('account_name')
        
        if not all([sub_id, resource_group, account_name]):
            return func.HttpResponse("Missing: subscription_id, resource_group, or account_name", status_code=400)
        
        data = get_azure_storage_details(sub_id, resource_group, account_name)
        return func.HttpResponse(
            json.dumps(data, default=str),
            mimetype="application/json",
            status_code=200
        )
    except Exception as e:
        logger.exception("Error in azure_details")
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500)import azure.functions as func
import os
import json
import logging

# Set up logging to ensure it captures detail
logger = logging.getLogger(__name__)

# Import logic
try:
    from methods.storage import (
        get_s3_buckets_with_metadata,
        get_azure_storage_accounts_with_metadata,
        get_s3_bucket_details,
        get_azure_storage_details
    )
    logger.info("Successfully imported methods.storage")
except Exception as e:
    logger.error(f"Failed to import methods.storage: {str(e)}")

# Initialize the Function App
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
        logger.exception("Error in list_aws") # This prints the full stack trace
        return func.HttpResponse(
            json.dumps({"error": str(e), "context": "Error occurred in list_aws"}),
            status_code=500,
            mimetype="application/json"
        )

@app.route(route="azure/list", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def list_azure(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("Route hit: /azure/list")
    try:
        sub_id = os.environ.get('AZURE_SUBSCRIPTION_ID')
        if not sub_id:
            logger.error("AZURE_SUBSCRIPTION_ID is missing from environment")
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
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500)

@app.route(route="azure/details", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def azure_details(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("Route hit: /azure/details")
    try:
        sub_id = os.environ.get('AZURE_SUBSCRIPTION_ID')
        resource_group = req.params.get('resource_group')
        account_name = req.params.get('account_name')
        
        if not all([sub_id, resource_group, account_name]):
            return func.HttpResponse("Missing: subscription_id, resource_group, or account_name", status_code=400)
        
        data = get_azure_storage_details(sub_id, resource_group, account_name)
        return func.HttpResponse(
            json.dumps(data, default=str),
            mimetype="application/json",
            status_code=200
        )
    except Exception as e:
        logger.exception("Error in azure_details")
        return func.HttpResponse(json.dumps({"error": str(e)}), status_code=500)