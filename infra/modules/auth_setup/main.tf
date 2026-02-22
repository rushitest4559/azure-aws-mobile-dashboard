data "azuread_client_config" "current" {}

# 1. Create the Application
resource "azuread_application" "auth_app" {
  display_name     = "azure-aws-mobile-dashboard-app"
  owners           = [data.azuread_client_config.current.object_id]
  sign_in_audience = "AzureADMyOrg"

  # Setting the URI here directly is more robust than a separate resource
  identifier_uris  = ["api://${azuread_application.auth_app.client_id}"]

  single_page_application {
    redirect_uris = var.frontend_urls
  }

  api {
    requested_access_token_version = 2

    oauth2_permission_scope {
      id                         = "74060851-f703-4554-942b-58d0422205c6"
      value                      = "user_impersonation"
      admin_consent_display_name = "Access Dashboard API"
      admin_consent_description  = "Allow the app to access the dashboard API"
      enabled                    = true
      type                       = "User"
    }
  }
}

# 2. Create Service Principal (This is what Entra "looks for" when validating a resource)
resource "azuread_service_principal" "auth_sp" {
  client_id                    = azuread_application.auth_app.client_id
  app_role_assignment_required = false
  
  # This ensures the SP knows it handles the api:// URI
  alternative_names = ["api://${azuread_application.auth_app.client_id}"]
}

# 3. Pre-authorize the Frontend 
resource "azuread_application_pre_authorized" "frontend_preauth" {
  application_id       = azuread_application.auth_app.id
  authorized_client_id = azuread_application.auth_app.client_id
  permission_ids       = ["74060851-f703-4554-942b-58d0422205c6"]
}

# 4. Grant Admin Consent
resource "azuread_service_principal_delegated_permission_grant" "admin_consent" {
  service_principal_object_id          = azuread_service_principal.auth_sp.object_id
  resource_service_principal_object_id = azuread_service_principal.auth_sp.object_id
  claim_values                         = ["user_impersonation"]
}

# 5. Federated Identity for AWS Bridge
resource "azuread_application_federated_identity_credential" "identity_trust" {
  application_id = azuread_application.auth_app.id
  display_name   = "function-app-trust"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://login.microsoftonline.com/${var.tenant_id}/v2.0"
  subject        = var.managed_identity_principal_id
}