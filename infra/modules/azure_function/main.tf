resource "azurerm_storage_account" "func_storage" {
  name = substr(replace("st${var.function_app_name}${random_string.suffix.result}", "-", ""), 0, 24)

  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_log_analytics_workspace" "workspace" {
  name                = "log-${var.function_app_name}"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_application_insights" "appinsights" {
  name                = "ai-${var.function_app_name}"
  location            = var.location
  resource_group_name = var.resource_group_name
  workspace_id        = azurerm_log_analytics_workspace.workspace.id
  application_type    = "web"
}

resource "azurerm_service_plan" "func_plan" {
  name                = "asp-${var.function_app_name}"
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = "Y1" # Consumption plan
}

data "archive_file" "python_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../backend"
  output_path = "${path.module}/backend.zip"

  excludes = ["__pycache__", ".env", ".venv", ".git", "local.settings.json"]
}

resource "azurerm_linux_function_app" "function_app" {
  name                       = var.function_app_name
  resource_group_name        = var.resource_group_name
  location                   = var.location
  storage_account_name       = azurerm_storage_account.func_storage.name
  storage_account_access_key = azurerm_storage_account.func_storage.primary_access_key
  service_plan_id            = azurerm_service_plan.func_plan.id

  identity {
    type         = "UserAssigned"
    identity_ids = [var.managed_identity_id]
  }

  # --- CRITICAL AUTH CONFIGURATION ---
  auth_settings_v2 {
    auth_enabled           = true
    default_provider       = "AzureActiveDirectory"
    unauthenticated_action = "Return401" # Correct for API calls

    active_directory_v2 {
      # Points to your App Registration Client ID
      client_id = var.azured_app_client_id

      # Dynamically build the endpoint using your tenant variable
      tenant_auth_endpoint = "https://login.microsoftonline.com/5f4096ce-7b27-4e3e-8fe4-ce7c1c051ae3/v2.0/"

      # These audiences MUST match the 'aud' claim in the JWT token sent by MSAL
      allowed_audiences = [
        var.azured_app_client_id,
        "api://${var.azured_app_client_id}"
      ]
      
      # Allows the app to call itself (Frontend -> Backend on same ID)
      allowed_applications = [var.azured_app_client_id]
    }

    login {
      token_store_enabled = true
    }
  }

  site_config {
    application_stack {
      python_version = "3.11"
    }
    cors {
      # Ensure your Vercel URL does NOT have a trailing slash
      allowed_origins     = ["https://staticweb-project.vercel.app"]
      support_credentials = true
    }
  }

  app_settings = {
    AZURE_CLIENT_ID                        = var.managed_identity_client_id
    _DEPLOY_TAG                            = data.archive_file.python_zip.output_base64sha256
    FUNCTIONS_WORKER_RUNTIME               = "python"
    AZURE_SUBSCRIPTION_ID                  = var.subscription_id
    APPINSIGHTS_INSTRUMENTATIONKEY         = azurerm_application_insights.appinsights.instrumentation_key
    AWS_ROLE_ARN                           = var.aws_role_arn
    SCM_DO_BUILD_DURING_DEPLOYMENT         = "true"
    "AzureFunctionsJobHost__functionTimeout" = "00:02:00"
    ENABLE_ORYX_BUILD                      = "true"
  }

  zip_deploy_file = data.archive_file.python_zip.output_path
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}
