output "aws_role_arn" {
  description = "The ARN of the AWS Role. You need to put this in your Azure Function Environment Variables."
  value       = aws_iam_role.azure_function_role.arn
}

output "oidc_provider_arn" {
  description = "The ARN of the OIDC provider created in AWS"
  value       = aws_iam_openid_connect_provider.azure_msi.arn
}