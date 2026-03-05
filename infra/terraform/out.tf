output "AZURE_APP_CLIENT_ID" {
  value = module.auth_setup.client_id
}

output "AZURE_MANAGED_IDENTITY_CLIENT_ID" {
  value = module.role.managed_identity_client_id
}

output "AZURE_TENANT_ID" {
  value = var.tenant_id
}

output "AWS_ROLE_ARN" {
  value = module.aws_oidc.aws_role_arn
}

output "function_app_url" {
  description = "The base URL for APIM backend configuration"
  value       = module.azure_function.function_app_url
}