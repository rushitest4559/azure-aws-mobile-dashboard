resource "aws_iam_openid_connect_provider" "azure_msi" {
  url             = "https://sts.windows.net/${var.azure_tenant_id}/"   # ← Required: matches actual iss claim (trailing / is mandatory)
  client_id_list  = ["api://sts.amazonaws.com"]                         # Keep this – matches your token aud/scope
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]        # Still correct for Microsoft certs

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
            "sts.windows.net/${var.azure_tenant_id}/:aud" = "api://sts.amazonaws.com"   # ← Key changed to match new issuer
            "sts.windows.net/${var.azure_tenant_id}/:sub" = var.managed_identity_principal_id  # principal_id (object ID) of user-assigned identity
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "s3_read_access" {
  name = "S3FullMetadataAccess"
  role = aws_iam_role.azure_function_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListAllMyBuckets",
          "s3:GetBucketLocation",
          "s3:GetBucketVersioning",
          "s3:GetEncryptionConfiguration",
          "s3:GetBucketTagging",
          "s3:GetBucketLogging",
          "s3:GetPublicAccessBlock",
          "s3:ListBucket"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = ["s3:GetObject"]
        Resource = "arn:aws:s3:::*/*"
      }
    ]
  })
}