variable "aws_region" {
  description = "The AWS region to deploy all resources into"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "The name of the project, used for naming and tagging"
  type        = string
  default     = "aws-mobile-dashboard"
}

variable "environment" {
  description = "Deployment environment (e.g. Dev, Prod)"
  type        = string
  default     = "Dev"
}