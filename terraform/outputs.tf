output "namespace" {
  description = "Namespace yang dibuat"
  value       = kubernetes_namespace.app_namespace.metadata[0].name
}

output "service_name" {
  description = "Nama service aplikasi"
  value       = kubernetes_service.app_service.metadata[0].name
}

output "service_node_port" {
  description = "NodePort yang dialokasikan"
  value       = kubernetes_service.app_service.spec[0].port[0].node_port
}

output "deployment_name" {
  description = "Nama Deployment"
  value       = kubernetes_deployment.app_deployment.metadata[0].name
}

