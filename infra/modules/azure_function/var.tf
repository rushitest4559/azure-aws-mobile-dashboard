variable "function_app_name" {
  description = "Azure Function App name"
  type        = string
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "managed_identity_id" {
  description = "User Assigned Managed Identity ID (from role module)"
  type        = string
}

variable "managed_identity_client_id" {
  
}

variable "aws_role_arn" {
  description = "AWS IAM Role ARN (from aws-oidc module)"
  type        = string
}

variable "backend_path" {
  description = "Path to backend folder with Python code"
  type        = string
  default     = "../backend"
}
