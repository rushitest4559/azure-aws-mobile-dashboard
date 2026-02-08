### 1. Define the Permissions (Data Source)
# Add new actions to this list as you expand your library to S3, IAM, etc.
data "aws_iam_policy_document" "resource_fetcher_policy_doc" {
  statement {
    sid    = "AllowMultiResourceDiscovery"
    effect = "Allow"

    actions = [
      # Standard EC2 & Networking
      "ec2:DescribeInstances",
      "ec2:DescribeRegions",
      "ec2:DescribeSecurityGroups",
      "ec2:DescribeKeyPairs",
      "ec2:DescribeNetworkInterfaces",
      "ec2:DescribeImages",        # For AMIs
      
      # Storage
      "ec2:DescribeVolumes",
      "ec2:DescribeSnapshots",
      
      # Load Balancing (ELBv2)
      "elasticloadbalancing:DescribeLoadBalancers",
      "elasticloadbalancing:DescribeTargetGroups",
      
      # Auto Scaling
      "autoscaling:DescribeAutoScalingGroups"
    ]

    resources = ["*"]
  }
}

### 2. Create the Custom Managed Policy
# This policy holds the specific "Least Privilege" permissions for the library
resource "aws_iam_policy" "resource_fetcher_policy" {
  name        = "LambdaResourceDiscoveryPolicy"
  description = "Granular permissions for fetching AWS resource metadata across regions."
  policy      = data.aws_iam_policy_document.resource_fetcher_policy_doc.json
}

### 3. Create the IAM Role for the Lambda
# This is the identity the Lambda will assume
resource "aws_iam_role" "lambda_main_role" {
  name = "app-resource-fetcher-lambda-role"

  # Trust Relationship: Specifically allows the Lambda service to use this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

### 4. Attach Custom Policy to Role
resource "aws_iam_role_policy_attachment" "attach_custom_logic" {
  role       = aws_iam_role.lambda_main_role.name
  policy_arn = aws_iam_policy.resource_fetcher_policy.arn
}

### 5. Attach Basic Execution Policy
# Required for the Lambda to write logs to CloudWatch (essential for debugging)
resource "aws_iam_role_policy_attachment" "attach_base_logs" {
  role       = aws_iam_role.lambda_main_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}