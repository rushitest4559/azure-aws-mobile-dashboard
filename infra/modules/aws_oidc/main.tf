resource "aws_iam_openid_connect_provider" "azure_msi" {
  url             = "https://login.microsoftonline.com/${var.azure_tenant_id}/v2.0"
  client_id_list  = ["api://AzureADTokenExchange"] # This must match the 'aud' in Azure
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"] 

  tags = { Name = var.oidc_provider_name }
}

resource "aws_iam_role" "azure_function_role" {
  name = var.aws_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.azure_msi.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            # Use the provider URL (minus https://) as the key
            "login.microsoftonline.com/${var.azure_tenant_id}/v2.0:aud" = "api://AzureADTokenExchange"
            "login.microsoftonline.com/${var.azure_tenant_id}/v2.0:sub" = var.managed_identity_principal_id
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "s3_read_access" {
  name = "S3ReadAccessForAzure"
  role = aws_iam_role.azure_function_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "s3:ListAllMyBuckets",
          "s3:GetBucketLocation",
          "s3:ListBucket"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "arn:aws:s3:::*/*"
      }
    ]
  })
}