# Terraform AWS Provider Configuration
# Office Management SaaS - ECS EC2 Deployment

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Uncomment for remote state (recommended for production)
  # backend "s3" {
  #   bucket         = "office-management-terraform-state"
  #   key            = "terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-state-lock"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "office-management"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

provider "random" {}
