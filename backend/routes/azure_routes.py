# routes/azure_routes.py - UPDATED (NO DECORATORS)

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

# Import Azure methods
from methods.azure.functions import (
    get_azure_functions_with_metadata,
    get_azure_function_details,
)
from methods.azure.storage import (
    get_azure_storage_accounts_with_metadata,
    get_azure_storage_details,
)

# PLAIN FUNCTIONS - NO @app.route()
def list_azure_functions(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("🚀 list_azure_functions START")
    subscription_id = req.params.get("subscription_id")
    if not subscription_id:
        return http_json_response(
            data=None,
            error_message="subscription_id required",
            status_code=400
        )
    try:
        data = get_azure_functions_with_metadata(subscription_id)
        return http_json_response(data, 200)
    except Exception as e:
        logger.error(f"💥 Azure Functions list failed: {str(e)}", exc_info=True)
        return http_json_response(
            data=None,
            error_message=str(e),
            status_code=500
        )

def azure_function_details(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("🚀 azure_function_details START")
    subscription_id = req.params.get("subscription_id")
    resource_group = req.params.get("resource_group")
    function_app_name = req.params.get("name")
    if not all([subscription_id, resource_group, function_app_name]):
        return http_json_response(
            data=None,
            error_message="Missing: subscription_id, resource_group, name",
            status_code=400
        )
    try:
        data = get_azure_function_details(subscription_id, resource_group, function_app_name)
        return http_json_response(data, 200)
    except Exception as e:
        logger.error(f"💥 Azure Function details failed: {str(e)}", exc_info=True)
        return http_json_response(
            data=None,
            error_message=str(e),
            status_code=500
        )

def list_azure_storage_accounts(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("🚀 list_azure_storage_accounts START")
    subscription_id = req.params.get("subscription_id")
    if not subscription_id:
        return http_json_response(
            data=None,
            error_message="subscription_id required",
            status_code=400
        )
    try:
        data = get_azure_storage_accounts_with_metadata(subscription_id)
        return http_json_response(data, 200)
    except Exception as e:
        logger.error(f"💥 Azure Storage list failed: {str(e)}", exc_info=True)
        return http_json_response(
            data=None,
            error_message=str(e),
            status_code=500
        )

def azure_storage_details(req: func.HttpRequest) -> func.HttpResponse:
    logger.info("🚀 azure_storage_details START")
    subscription_id = req.params.get("subscription_id")
    resource_group = req.params.get("resource_group")
    account_name = req.params.get("name")
    if not all([subscription_id, resource_group, account_name]):
        return http_json_response(
            data=None,
            error_message="Missing: subscription_id, resource_group, account_name",
            status_code=400
        )
    try:
        data = get_azure_storage_details(subscription_id, resource_group, account_name)
        return http_json_response(data, 200)
    except Exception as e:
        logger.error(f"💥 Azure Storage details failed: {str(e)}", exc_info=True)
        return http_json_response(
            data=None,
            error_message=str(e),
            status_code=500
        )
