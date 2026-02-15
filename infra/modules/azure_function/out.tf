output "function_app_url" {
  description = "The base URL for APIM backend configuration"
  value       = "https://${azurerm_linux_function_app.function_app.default_hostname}"
}

output "function_app_name" {
  description = "Needed if managing function keys via Terraform"
  value       = azurerm_linux_function_app.function_app.name
}