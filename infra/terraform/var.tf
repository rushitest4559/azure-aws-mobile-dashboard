variable "subscription_id" { type = string }
variable "tenant_id"       { type = string }
variable "location"        { default = "East US" }
variable "resource_group_name" { default = "rg-mobile-dashboard" }
variable "function_app_name"   { default = "func-mobile-dashboard" }
variable "identity_name"       { default = "id-mobile-dashboard" }
variable "frontend_url"        { default = "https://staticweb-project.vercel.app/" }