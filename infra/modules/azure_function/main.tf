resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

resource "azurerm_storage_account" "func_storage" {
  name                     = substr(replace("st${var.function_app_name}${random_string.suffix.result}", "-", ""), 0, 24)
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
  sku_name            = "Y1" 
}

data "archive_file" "python_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../backend"
  output_path = "${path.module}/backend.zip"
  excludes    = ["__pycache__", ".env", ".venv", ".git", "local.settings.json"]
}

resource "azurerm_linux_function_app" "function_app" {
  name                       = var.function_app_name
  resource_group_name        = var.resource_group_name
  location                   = var.location
  storage_account_name       = azurerm_storage_account.func_storage.name
  storage_account_access_key = azurerm_storage_account.func_storage.primary_access_key
  service_plan_id            = azurerm_service_plan.func_plan.id

  # Connects the User-Assigned Identity
  identity {
    type         = "UserAssigned"
    identity_ids = [var.managed_identity_id]
  }

  site_config {
    application_stack {
      python_version = "3.11"
    }

    cors {
      allowed_origins     = ["https://staticweb-project.vercel.app", "http://localhost:5173", "https://portal.azure.com"]
      support_credentials = true
    }
  }

  app_settings = {
    RUN_ENV = "azure"
    # CRITICAL: Forces the local agent to recognize the Identity
    AZURE_CLIENT_ID       = var.managed_identity_client_id
    AZURE_TENANT_ID       = var.azure_tenant_id
    AZURE_SUBSCRIPTION_ID = var.subscription_id
    
    # AWS OIDC Configuration
    AWS_ROLE_ARN          = var.aws_role_arn
    
    # Function Runtime Settings
    FUNCTIONS_WORKER_RUNTIME       = "python"
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.appinsights.connection_string
    SCM_DO_BUILD_DURING_DEPLOYMENT = "true"
    ENABLE_ORYX_BUILD              = "true"
    
    _DEPLOY_TAG = data.archive_file.python_zip.output_base64sha256
  }

  zip_deploy_file = data.archive_file.python_zip.output_path

  auth_settings_v2 {
    auth_enabled           = false
    default_provider       = "AzureActiveDirectory"
    unauthenticated_action = "Return401"

    active_directory_v2 {
      client_id            = var.azured_app_client_id
      tenant_auth_endpoint = "https://login.microsoftonline.com/${var.azure_tenant_id}/v2.0/"
      allowed_audiences    = ["api://mobile-dashboard-api-rushikesh"]
    }

    login {
      token_store_enabled = false
    }
  }
}