variable "azure_tenant_id" {
  description = "The Directory (Tenant) ID of your Azure account"
  type        = string
}

variable "azure_client_id" {
  description = "The Client ID of the App Registration (used for tagging/identification)"
  type        = string
}

variable "managed_identity_principal_id" {
  description = "The Principal (Object) ID of the Azure Function's Managed Identity. Used for the OIDC 'sub' condition."
  type        = string
}

variable "oidc_provider_name" {
  description = "Name for the AWS OIDC Provider tag"
  type        = string
  default     = "Azure-OIDC-Provider"
}

variable "aws_role_name" {
  description = "The name of the IAM role the Azure Function will assume"
  type        = string
  default     = "AzureFunctionS3ReadRole"
}