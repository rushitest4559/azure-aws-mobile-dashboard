data "azuread_client_config" "current" {}

resource "azuread_application" "auth_app" {
  display_name     = "azure-aws-mobile-dashboard-app"
  owners           = [data.azuread_client_config.current.object_id]
  sign_in_audience = "AzureADMyOrg"

  single_page_application {
    redirect_uris = [var.frontend_url]
  }
}

# Separate resource to set the Identifier URI using the App Object ID
# This avoids the "Chicken or the Egg" circular dependency error
resource "azuread_application_identifier_uri" "app_uri" {
  application_id = azuread_application.auth_app.id
  identifier_uri = "api://${azuread_application.auth_app.client_id}"
}

resource "azuread_service_principal" "auth_sp" {
  client_id                    = azuread_application.auth_app.client_id
  app_role_assignment_required = true
}

resource "azuread_application_federated_identity_credential" "identity_trust" {
  application_id = azuread_application.auth_app.id
  display_name   = "function-app-trust"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://login.microsoftonline.com/${var.tenant_id}/v2.0"
  subject        = var.managed_identity_principal_id
}