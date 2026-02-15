output "AZURE_CLIENT_ID" {
  value = module.auth_setup.client_id
}

output "AZURE_TENANT_ID" {
  value = var.tenant_id
}

output "AWS_ROLE_ARN" {
  value = module.aws_oidc.aws_role_arn
}