variable "kubeconfig_path" {
  description = "Lokasi file kubeconfig"
  type        = string
  default     = "~/.kube/config"
}

variable "kubeconfig_context" {
  description = "Context kubeconfig yang digunakan (kosongkan jika default)"
  type        = string
  default     = ""
}

variable "namespace" {
  description = "Kubernetes namespace untuk aplikasi"
  type        = string
  default     = "devops-lab"
}

variable "app_name" {
  description = "Nama aplikasi"
  type        = string
  default     = "devops-lab"
}

variable "app_image" {
  description = "Image Docker yang digunakan"
  type        = string
  default     = "muhammadraihanthaffanh/devops-lab:latest"
}

variable "replica_count" {
  description = "Jumlah replica Pod"
  type        = number
  default     = 2
}

variable "container_port" {
  description = "Port container aplikasi"
  type        = number
  default     = 3000
}

variable "service_node_port" {
  description = "Port NodePort Service"
  type        = number
  default     = 30080
}

