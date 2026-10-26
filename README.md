# devops-lab
Todo list kecil untuk latihan DevOps: Docker, Jenkins, SonarQube, Prometheus/Grafana, lalu
 Kubernetes dan Terraform.
## Endpoint
| Endpoint | Fungsi |
|---|---|
| `GET /` | Halaman web todo list |
| `GET /api/tasks` | Daftar tugas (JSON) |
| `POST /api/tasks` | Tambah tugas, body `{"title": "..."}` |
| `PATCH /api/tasks/:id` | Toggle selesai/belum |
| `DELETE /api/tasks/:id` | Hapus tugas |
| `GET /health` | Health check (untuk probe Kubernetes) |
| `GET /metrics` | Metrics Prometheus |
Data disimpan di memori, jadi hilang saat aplikasi restart (sengaja, supaya app tetap
 stateless).
## Jalankan lokal
```bash
npm install
npm test
npm start # http://localhost:3000
```
## Jalankan dengan Docker
```bash
docker build -t devops-lab:dev .
docker run -d --name devops-lab -p 3000:3000 devops-lab:dev
curl localhost:3000/health
# atau
docker compose up -d --build
```
## Metrics custom
- `tasks_created_total` : jumlah tugas yang pernah dibuat
- `tasks_current` : jumlah tugas saat ini
- `http_requests_total` dan `http_request_duration_seconds` : traffic dan latency per route
- Plus metrics bawaan Node.js (CPU, memori, event loop)
## Yang perlu kamu ganti sebelum dipakai
- `Jenkinsfile`: `IMAGE`, `user@IP_VPS`, dan ID credentials (`registry-cred`, `vps-ssh`)
- `sonar-project.properties`: sesuaikan `projectKey` jika perlu
