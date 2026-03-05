# methods/azure/functions.py

import logging
from typing import List, Dict, Any
import azure.identity
import azure.mgmt.web

logger = logging.getLogger(__name__)

def get_azure_functions_with_metadata(subscription_id: str) -> List[Dict[str, Any]]:
    """Fetch ALL Azure Function Apps (including Static Web Apps) in subscription."""
    logger.info(f"🪄 Fetching Azure Functions for subscription: {subscription_id}")
    try:
        credential = azure.identity.DefaultAzureCredential()
        client = azure.mgmt.web.WebSiteManagementClient(credential, subscription_id)

        apps = []
        for app in client.web_apps.list():
            # 🛡️ Basic safety checks
            if not app or not hasattr(app, 'name'):
                continue
                
            app_name = app.name
            logger.debug(f"🔍 Checking: {app_name}")

            # 🎯 CORRECT Function App Detection (3 methods)
            is_function_app = False
            
            # Method 1: Classic Function App
            if (hasattr(app, 'site_config') and app.site_config and 
                hasattr(app.site_config, 'app_settings') and app.site_config.app_settings and
                "FUNCTIONS_EXTENSION_VERSION" in app.site_config.app_settings):
                is_function_app = True
                logger.debug(f"  ✅ {app_name}: Classic Function App")
            
            # Method 2: Function indicators (storage, worker runtime)
            elif (hasattr(app, 'site_config') and app.site_config and 
                  hasattr(app.site_config, 'app_settings') and app.site_config.app_settings):
                settings = app.site_config.app_settings
                function_indicators = ["AzureWebJobsStorage", "FUNCTIONS_WORKER_RUNTIME"]
                if any(indicator in settings for indicator in function_indicators):
                    is_function_app = True
                    logger.debug(f"  ✅ {app_name}: Function by indicators")
            
            # Method 3: Kind contains 'functionapp'
            if not is_function_app and hasattr(app, 'kind') and app.kind:
                if 'functionapp' in app.kind.lower():
                    is_function_app = True
                    logger.debug(f"  ✅ {app_name}: Function by kind='{app.kind}'")

            if is_function_app:
                parts = app.id.split("/") if hasattr(app, 'id') and app.id else []
                resource_group = parts[4] if len(parts) > 4 else "unknown"

                apps.append({
                    "name": app_name,
                    "location": getattr(app, 'location', 'unknown'),
                    "kind": getattr(app, 'kind', 'unknown'),
                    "resource_group": resource_group,
                    "id": getattr(app, 'id', ''),
                    "state": str(getattr(app, 'state', 'Unknown')),
                })
                logger.info(f"🎉 ADDED: {app_name} ({app.kind or 'unknown'})")

        logger.info(f"✅ Found {len(apps)} Function Apps total")
        return apps

    except Exception as e:
        logger.error(f"💥 Error: {str(e)}", exc_info=True)
        raise

def get_azure_function_details(
    subscription_id: str, resource_group: str, function_app_name: str
) -> Dict[str, Any]:
    """Fetches rich details for a specific Azure Function (App Service / Function App)."""
    logger.info(
        f"📋 Fetching details for Azure Function App: {function_app_name} in RG={resource_group}"
    )
    try:
        credential = azure.identity.DefaultAzureCredential()
        client = azure.mgmt.web.WebSiteManagementClient(
            credential, subscription_id
        )

        app = client.web_apps.get(resource_group, function_app_name)
        logger.debug(f"App properties retrieved: {app.name}")

        def get_enum_value(attr) -> str:
            return getattr(attr, "value", str(attr)) if attr else "Unknown"

        # 🛡️ Safe app settings retrieval
        try:
            settings = client.web_apps.list_application_settings(
                resource_group, function_app_name
            )
            app_settings = {s.name: s.value for s in settings.properties} if settings and settings.properties else {}
        except:
            app_settings = {}

        # Plan details (if linked to an App Service Plan)
        plan = None
        if getattr(app, 'server_farm_id', None):
            plan_parts = app.server_farm_id.split("/")
            plan_name = plan_parts[-1] if plan_parts else None
            plan = {
                "name": plan_name,
                "id": getattr(app, 'server_farm_id', ''),
            }

        details = {
            "name": getattr(app, 'name', function_app_name),
            "location": getattr(app, 'location', 'unknown'),
            "kind": getattr(app, 'kind', 'unknown'),
            "state": get_enum_value(getattr(app, 'state', None)),
            "resource_group": resource_group,
            "id": getattr(app, 'id', ''),
            "host_names": list(getattr(app, 'host_names', [])),
            "enabled": getattr(app, 'enabled', False),
            "https_only": getattr(app, 'https_only', False),
            "app_service_plan": plan,
            "sku": getattr(app, 'sku', {}),
            "app_settings": app_settings,
            "tags": dict(getattr(app, 'tags', {})),
        }

        logger.info(
            f"✅ Details fetched successfully for Function App: {function_app_name}"
        )
        return details

    except Exception as e:
        logger.error(
            f"💥 Failed to fetch details for {function_app_name} (RG={resource_group}): {str(e)}",
            exc_info=True,
        )
        raise
