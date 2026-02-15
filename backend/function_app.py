import azure.functions as func
import os
import json
from methods.storage import (
    get_s3_buckets_with_metadata,
    get_azure_storage_accounts_with_metadata,
    get_s3_bucket_details,
    get_azure_storage_details
)

app = func.FunctionApp()

@app.route(route="aws/list", methods=["GET"])
def list_aws(req: func.HttpRequest) -> func.HttpResponse:
    """List all AWS S3 buckets with metadata."""
    data = get_s3_buckets_with_metadata()
    return func.HttpResponse(
        json.dumps(data, default=str),
        mimetype="application/json"
    )

@app.route(route="azure/list", methods=["GET"])
def list_azure(req: func.HttpRequest) -> func.HttpResponse:
    """List Azure storage accounts for configured subscription."""
    sub_id = os.environ.get('AZURE_SUBSCRIPTION_ID')
    if not sub_id:
        return func.HttpResponse(
            "Subscription ID not configured",
            status_code=500
        )
    
    data = get_azure_storage_accounts_with_metadata(sub_id)
    return func.HttpResponse(
        json.dumps(data, default=str),
        mimetype="application/json"
    )

@app.route(route="aws/details", methods=["GET"])
def aws_details(req: func.HttpRequest) -> func.HttpResponse:
    """Get details for specific AWS S3 bucket."""
    bucket_name = req.params.get('bucket_name')
    if not bucket_name:
        return func.HttpResponse(
            "Missing bucket_name parameter",
            status_code=400
        )
    
    data = get_s3_bucket_details(bucket_name)
    return func.HttpResponse(
        json.dumps(data, default=str),
        mimetype="application/json"
    )

@app.route(route="azure/details", methods=["GET"])
def azure_details(req: func.HttpRequest) -> func.HttpResponse:
    """Get details for specific Azure storage account."""
    sub_id = os.environ.get('AZURE_SUBSCRIPTION_ID')
    resource_group = req.params.get('resource_group')
    account_name = req.params.get('account_name')
    
    if not all([sub_id, resource_group, account_name]):
        return func.HttpResponse(
            "Missing: subscription_id, resource_group, or account_name",
            status_code=400
        )
    
    data = get_azure_storage_details(sub_id, resource_group, account_name)
    return func.HttpResponse(
        json.dumps(data, default=str),
        mimetype="application/json"
    )
