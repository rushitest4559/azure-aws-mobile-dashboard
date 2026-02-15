# User Assigned Managed Identity for Function App
resource "azurerm_user_assigned_identity" "function_identity" {
  name                = var.identity_name
  resource_group_name = var.resource_group_name
  location            = var.location
}

# Allows the identity to read data inside the storage accounts
resource "azurerm_role_assignment" "storage_reader" {
  scope                = "/subscriptions/${var.subscription_id}"
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_user_assigned_identity.function_identity.principal_id
}
