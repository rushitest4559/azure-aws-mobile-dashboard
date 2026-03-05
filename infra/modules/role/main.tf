# User Assigned Managed Identity for Function App
resource "azurerm_user_assigned_identity" "function_identity" {
  name                = var.identity_name
  resource_group_name = var.resource_group_name
  location            = var.location
}

# ✅ KEEP: Subscription Reader (covers Function Apps list + Azure Storage)
resource "azurerm_role_assignment" "storage_reader" {
  scope                = "/subscriptions/${var.subscription_id}"
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.function_identity.principal_id
}

# ✅ KEEP: Managed Identity Operator (good)
resource "azurerm_role_assignment" "identity_operator" {
  scope                = azurerm_user_assigned_identity.function_identity.id
  role_definition_name = "Managed Identity Operator"
  principal_id         = azurerm_user_assigned_identity.function_identity.principal_id
}

# 🆕 NEW: Monitoring Reader (for Function App metrics/logs)
resource "azurerm_role_assignment" "monitoring_reader" {
  scope                = "/subscriptions/${var.subscription_id}"
  role_definition_name = "Monitoring Reader"
  principal_id         = azurerm_user_assigned_identity.function_identity.principal_id
}
