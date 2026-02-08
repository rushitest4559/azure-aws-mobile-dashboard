# 1. Create the Security Identity & Permissions
module "role" {
  source = "../modules/role"
}

# 2. Package and Create the Lambda Function
module "lambda" {
  source          = "../modules/lambda"
  lambda_role_arn = module.role.role_arn
}

# 3. Create the API Front-end
module "apigateway" {
  source               = "../modules/apigateway"
  lambda_invoke_arn    = module.lambda.invoke_arn
  lambda_function_name = module.lambda.function_name
}