variable "lambda_role_arn" {
  description = "The ARN of the IAM role for the Lambda function (passed from role module)"
  type        = string
}

variable "lambda_function_name" {
  description = "Name of the Lambda function"
  type        = string
  default     = "app-resource-fetcher"
}

variable "python_runtime" {
  description = "Python version to use"
  type        = string
  default     = "python3.12"
}