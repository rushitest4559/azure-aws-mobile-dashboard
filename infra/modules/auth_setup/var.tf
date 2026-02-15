variable "frontend_url" {
  type    = string
  default = "https://staticweb-project.vercel.app/"
}

variable "tenant_id" {
  type = string
}

variable "managed_identity_principal_id" {
  description = "Principal ID from the Function App's SystemAssigned Identity"
  type        = string
}

