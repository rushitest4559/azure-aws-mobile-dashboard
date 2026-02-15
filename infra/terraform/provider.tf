terraform {
  required_version = ">= 1.5.0"

  backend "azurerm" {
    resource_group_name  = "tf-state-rg"
    storage_account_name = "tfstate73e553d8"
    container_name       = "tfstate-container"
    key                  = "terraform.tfstate"
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
    # ADDED: Necessary for App Registrations and Entra ID resources
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.47"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
}

# ADDED: Configuration for the AzureAD provider
provider "azuread" {
  tenant_id = var.tenant_id
}

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