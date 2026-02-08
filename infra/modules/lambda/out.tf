output "function_name" {
  description = "The name of the Lambda function"
  value       = aws_lambda_function.resource_fetcher.function_name
}

output "function_arn" {
  description = "The ARN of the Lambda function"
  value       = aws_lambda_function.resource_fetcher.arn
}

output "invoke_arn" {
  description = "The ARN used to invoke the Lambda function from API Gateway"
  value       = aws_lambda_function.resource_fetcher.invoke_arn
}