resource "azurerm_storage_account" "func_storage" {
  name = substr(replace("st${var.function_app_name}${random_string.suffix.result}", "-", ""), 0, 24)

  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_application_insights" "appinsights" {
  name                = "ai-${var.function_app_name}"
  location            = var.location
  resource_group_name = var.resource_group_name
  application_type    = "web"
}

resource "azurerm_service_plan" "func_plan" {
  name                = "asp-${var.function_app_name}"
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = "Y1" # Consumption plan
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

  site_config {
    application_stack {
      python_version = "3.11"
    }
    cors {
      allowed_origins = ["https://staticweb-project.vercel.app/"]
    }
  }

  app_settings = {
    FUNCTIONS_WORKER_RUNTIME                 = "python"
    AZURE_SUBSCRIPTION_ID                    = var.subscription_id
    APPINSIGHTS_INSTRUMENTATIONKEY           = azurerm_application_insights.appinsights.instrumentation_key
    AWS_ROLE_ARN                             = var.aws_role_arn # For S3 access via OIDC
    SCM_DO_BUILD_DURING_DEPLOYMENT           = "true"
    "AzureFunctionsJobHost__functionTimeout" = "00:02:00"
  }

  

  zip_deploy_file = "${var.backend_path}/backend.zip" # Your Python code
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}
