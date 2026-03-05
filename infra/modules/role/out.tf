output "managed_identity_id" {
  value = azurerm_user_assigned_identity.function_identity.id
}

output "managed_identity_client_id" {
  value = azurerm_user_assigned_identity.function_identity.client_id
}

output "managed_identity_principal_id" {
  value = azurerm_user_assigned_identity.function_identity.principal_id
}