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

# NEW: EC2 Read Access
resource "aws_iam_role_policy" "ec2_read_access" {
  name = "EC2ReadOnlyAccess"
  role = aws_iam_role.azure_function_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeInstanceTypes",
          "ec2:DescribeRegions",
          "ec2:DescribeAvailabilityZones",
          "ec2:DescribeImages"
        ]
        Resource = "*"
      }
    ]
  })
}

# NEW: RDS Read Access  
resource "aws_iam_role_policy" "rds_read_access" {
  name = "RDSReadOnlyAccess"
  role = aws_iam_role.azure_function_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds:DescribeDBInstances",
          "rds:DescribeDBClusters",
          "rds:ListTagsForResource",
          "rds:DescribeDBSubnetGroups",
          "rds:DescribeDBSecurityGroups"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeRegions",
          "ec2:DescribeAvailabilityZones"
        ]
        Resource = "*"
      }
    ]
  })
}

# NEW: EKS Read Access
resource "aws_iam_role_policy" "eks_read_access" {
  name = "EKSReadOnlyAccess"
  role = aws_iam_role.azure_function_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters",
          "eks:ListTagsForCluster",
          "eks:DescribeAddon",
          "eks:ListAddons"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "eks:AccessKubernetesApi"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "eks:arn" = "arn:aws:eks:*:*:cluster/*"
          }
        }
      }
    ]
  })
}

# NEW: Supporting Services (Regions, etc.)
resource "aws_iam_role_policy" "supporting_services" {
  name = "AWSSupportingServicesRead"
  role = aws_iam_role.azure_function_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeRegions"
        ]
        Resource = "*"
      }
    ]
  })
}
