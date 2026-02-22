data "azuread_client_config" "current" {}

# 1. Create the Application
resource "azuread_application" "auth_app" {
  display_name     = "azure-aws-mobile-dashboard-app"
  owners           = [data.azuread_client_config.current.object_id]
  sign_in_audience = "AzureADMyOrg"

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

# 2. Attach the Identifier URI (Avoids self-reference error)
resource "azuread_application_identifier_uri" "app_uri" {
  application_id = azuread_application.auth_app.id
  identifier_uri = "api://${azuread_application.auth_app.client_id}"
}

# 3. Create Service Principal
resource "azuread_service_principal" "auth_sp" {
  client_id                    = azuread_application.auth_app.client_id
  app_role_assignment_required = false
}

# 4. Pre-authorize the Frontend (Self-authorization for SPA)
resource "azuread_application_pre_authorized" "frontend_preauth" {
  application_id       = azuread_application.auth_app.id
  authorized_client_id = azuread_application.auth_app.client_id
  permission_ids       = ["74060851-f703-4554-942b-58d0422205c6"]
}

# 5. Grant Admin Consent (Automates the 'Grant admin consent' button)
resource "azuread_service_principal_delegated_permission_grant" "admin_consent" {
  service_principal_object_id          = azuread_service_principal.auth_sp.object_id
  resource_service_principal_object_id = azuread_service_principal.auth_sp.object_id
  claim_values                         = ["user_impersonation"]
}

# 6. Federated Identity for AWS Bridge
resource "azuread_application_federated_identity_credential" "identity_trust" {
  application_id = azuread_application.auth_app.id
  display_name   = "function-app-trust"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://login.microsoftonline.com/${var.tenant_id}/v2.0"
  subject        = var.managed_identity_principal_id
  
  # Ensure the App and URI exist before creating trust
  depends_on = [azuread_application_identifier_uri.app_uri]
}