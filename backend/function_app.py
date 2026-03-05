import azure.functions as func
import os
import json
import logging
from datetime import datetime

# Configure logging once at startup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)

# Use a module-specific logger
logger = logging.getLogger(__name__)

app = func.FunctionApp()

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

# Import all AWS routes
from routes.aws_routes import (
    list_s3, list_eks, eks_details, s3_details, 
    list_rds, rds_details, list_ec2, ec2_details
)

# Import all Azure routes
from routes.azure_routes import (
    list_azure_functions, azure_function_details, 
    list_azure_storage_accounts, azure_storage_details
)

# REGISTER ALL AWS ROUTES (AFTER app is created)
app.route(route="aws/s3/list", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)(list_s3)
app.route(route="aws/eks/list", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)(list_eks)
app.route(route="aws/eks/details", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)(eks_details)
app.route(route="aws/s3/details", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)(s3_details)
app.route(route="aws/rds/list", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)(list_rds)
app.route(route="aws/rds/details", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)(rds_details)
app.route(route="aws/ec2/list", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)(list_ec2)
app.route(route="aws/ec2/details", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)(ec2_details)

# REGISTER ALL AZURE ROUTES
app.route(route="azure/functions/list", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)(list_azure_functions)
app.route(route="azure/functions/details", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)(azure_function_details)
app.route(route="azure/storage/list", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)(list_azure_storage_accounts)
app.route(route="azure/storage/details", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)(azure_storage_details)

logger.info("✅ Functions loaded successfully - 12 routes registered!")
