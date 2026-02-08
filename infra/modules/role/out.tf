output "role_arn" {
  description = "The ARN of the IAM role for the Lambda function"
  value       = aws_iam_role.lambda_main_role.arn
}

output "role_name" {
  description = "The name of the IAM role"
  value       = aws_iam_role.lambda_main_role.name
}