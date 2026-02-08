### 1. Package the Python Code
# This zips your entire backend folder so the Lambda has access to methods/
data "archive_file" "lambda_package" {
  type        = "zip"
  source_dir  = "${path.root}/../../backend" # Points to your root backend folder
  output_path = "${path.module}/files/resource_fetcher.zip"
  
  # Exclude unnecessary local files to keep the ZIP small
  excludes = [
    "__pycache__",
    "venv",
    ".env",
    ".gitignore"
  ]
}

### 2. Create the Lambda Function
resource "aws_lambda_function" "resource_fetcher" {
  function_name = "app-resource-fetcher"
  description   = "Fetches AWS resource metadata across all regions"
  
  # Code configuration
  filename         = data.archive_file.lambda_package.output_path
  source_code_hash = data.archive_file.lambda_package.output_base64sha256
  
  # Runtime configuration
  runtime = "python3.12"
  handler = "main.router" # Calls the router function in your main.py
  timeout = 30            # Increased timeout for multi-region API calls
  memory_size = 128

  # Security Identity (Passed from the Role module)
  role = var.lambda_role_arn

  environment {
    variables = {
      LOG_LEVEL = "INFO"
    }
  }
}

### 3. CloudWatch Log Group
# It's professional to manage logs explicitly so they aren't kept forever
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.resource_fetcher.function_name}"
  retention_in_days = 7
}