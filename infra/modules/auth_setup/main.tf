data "azuread_client_config" "current" {}

# 1. Create the Base Application
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

# 2. Set the Identifier URI (Fixed to avoid circular reference)
resource "azuread_application_identifier_uri" "app_uri" {
  application_id = azuread_application.auth_app.id
  identifier_uri = "api://${azuread_application.auth_app.client_id}"
}

# 3. Create Service Principal
resource "azuread_service_principal" "auth_sp" {
  client_id                    = azuread_application.auth_app.client_id
  app_role_assignment_required = false
}

# 4. FIX: Pre-authorize the Frontend (Replaces the broken block)
resource "azuread_application_pre_authorized" "frontend_preauth" {
  application_id       = azuread_application.auth_app.id
  authorized_client_id = azuread_application.auth_app.client_id
  permission_ids       = ["74060851-f703-4554-942b-58d0422205c6"]
}

# 5. AUTOMATE: Grant Admin Consent
resource "azuread_service_principal_delegated_permission_grant" "admin_consent" {
  service_principal_object_id          = azuread_service_principal.auth_sp.object_id
  resource_service_principal_object_id = azuread_service_principal.auth_sp.object_id
  claim_values                         = ["user_impersonation"]
}

# 6. Federated Trust (Keep as is)
resource "azuread_application_federated_identity_credential" "identity_trust" {
  application_id = azuread_application.auth_app.id
  display_name   = "function-app-trust"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://login.microsoftonline.com/${var.tenant_id}/v2.0"
  subject        = var.managed_identity_principal_id
}