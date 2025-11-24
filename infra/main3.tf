resource "aws_cognito_user_pool" "list_resources" {
  name = "User pool - i94z5y"
  auto_verified_attributes = [
    "email"
  ]
  deletion_protection = "ACTIVE"
  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "email"
    required                 = true

    string_attribute_constraints {
      max_length = "2048"
      min_length = "0"
    }
  }
}


resource "aws_cognito_user_pool_client" "list_resources" {
  name         = "My SPA app - i94z5y"
  user_pool_id = aws_cognito_user_pool.list_resources.id
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}


resource "aws_iam_user" "amplify_IAM" {
  name = "amplify_IAM"
  tags = {
    "AKIAVDLSQ5N2YU3YKSXX" = "amplify_access_key_for_staticweb-project"
  }
}

resource "aws_iam_user_policy_attachment" "amplify_IAM" {
  user = "amplify_IAM"
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess-Amplify"
}

resource "aws_iam_user" "test_user" {
  name = "test_user"
  tags = {
    CreateBy = "Terraform"
  }
}