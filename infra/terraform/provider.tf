terraform {
  required_version = ">= 1.5.0"

  # 1. Backend Configuration (Stores state in S3 and locks via DynamoDB)
  backend "s3" {
    bucket         = "aws-mobile-dashboard-tf-state"
    key            = "backend.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "aws-mobile-dashboard-lock-table"
  }

  # 2. Provider Version Locking (Standardizes the environment)
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0" # Allows minor updates but locks major version
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

# 3. Provider Configuration with Default Tags
provider "aws" {
  region = "ap-south-1"

  default_tags {
    tags = {
      Project     = "AWS-Mobile-Dashboard"
      Environment = "Dev"
      ManagedBy   = "Terraform"
      Owner       = "Admin"
    }
  }
}