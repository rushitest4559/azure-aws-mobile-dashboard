### 1. The REST API Container
resource "aws_api_gateway_rest_api" "main" {
  name        = "aws-resource-dashboard-api"
  description = "API to fetch AWS resources via Lambda"
}

### 2. The Resource (The Path)
# "{proxy+}" is a special variable that catches ALL sub-paths
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "{proxy+}"
}

### 3. The Method (The Action)
# "ANY" allows GET, POST, DELETE, etc.
resource "aws_api_gateway_method" "proxy_method" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE" # You can add Cognito/IAM here later
}

### 4. The Integration (The Connection to Lambda)
resource "aws_api_gateway_integration" "lambda_integration" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy_method.http_method
  integration_http_method = "POST" # Lambda MUST be called via POST
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arn
}

### 5. Deployment & Stage
# This makes the API live. We use a 'trigger' so it redeploys if the code changes.
resource "aws_api_gateway_deployment" "main" {
  depends_on = [aws_api_gateway_integration.lambda_integration]
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.proxy_method.id,
      aws_api_gateway_integration.lambda_integration.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "prod"
}

### 6. Permission (Allow API Gateway to call Lambda)
resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "apigateway.amazonaws.com"

  # Restricts permission to this specific API Gateway
  source_arn = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}