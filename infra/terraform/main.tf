# 1. Resource Group
module "resource_group" {
  source              = "../modules/resource_group"
  resource_group_name = var.resource_group_name
  location            = var.location
}

# 2. Managed Identity & Azure Roles
module "role" {
  source              = "../modules/role"
  identity_name       = var.identity_name
  resource_group_name = module.resource_group.name
  location            = var.location
  subscription_id     = var.subscription_id
}

# 3. Entra ID / Auth Setup
module "auth_setup" {
  source                        = "../modules/auth_setup"
  frontend_url                  = var.frontend_url
  tenant_id                     = var.tenant_id
  managed_identity_principal_id = module.role.principal_id # Linked for Federated Identity
}

# 4. AWS OIDC Provider & Roles
module "aws_oidc" {
  source                        = "../modules/aws_oidc"
  azure_tenant_id               = var.tenant_id
  azure_client_id               = module.auth_setup.client_id
  managed_identity_principal_id = module.role.principal_id # Linked for OIDC Trust
  oidc_provider_name            = "Azure-to-AWS-OIDC"
  aws_role_name                 = "AzureFunctionS3ReadRole"
}

# 5. Azure Function App
module "azure_function" {
  source              = "../modules/azure_function"
  function_app_name   = var.function_app_name
  resource_group_name = module.resource_group.name
  location            = var.location
  subscription_id     = var.subscription_id
  managed_identity_id = module.role.managed_identity_id
  aws_role_arn        = module.aws_oidc.aws_role_arn
  backend_path        = "../../backend"
}