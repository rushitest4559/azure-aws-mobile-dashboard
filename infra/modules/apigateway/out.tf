output "base_url" {
  description = "The URL to invoke the API Gateway"
  # This combines the generated ID, region, and stage name
  value = aws_api_gateway_stage.prod.invoke_url
}