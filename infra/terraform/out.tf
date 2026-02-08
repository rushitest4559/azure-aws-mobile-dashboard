output "api_endpoint_url" {
  description = "The live URL to access your AWS Resource Dashboard"
  # We construct a friendly URL by appending your specific path to the base URL
  value = "${module.apigateway.base_url}/aws/ec2/list"
}

output "lambda_function_name" {
  description = "The name of the deployed Lambda function"
  value       = module.lambda.function_name
}

output "iam_role_arn" {
  description = "The ARN of the IAM role being used by the Lambda"
  value       = module.role.role_arn
}