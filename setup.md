# Setup & Dokumentasi Pipeline DevOps Lab

Dokumen ini berisi rangkuman arsitektur, alur pipeline CI/CD, konfigurasi lengkap, dan panduan langkah demi langkah (*step-by-step*) yang telah diimplementasikan pada proyek **devops-lab**.

---

## 1. Arsitektur & Alur Kerja (Workflow)

```
[ Developer ]
      │  git push origin main
      ▼
[ GitHub Repository ]
      │  Webhook / Poll SCM
      ▼
[ Jenkins Pipeline ]
      │── 1. Test (npm ci && npm test with Jest coverage)
      │── 2. SonarQube Scanner (Code analysis & Coverage upload)
      │── 3. Quality Gate Check (Blokir build jika kriteria kualitas gagal)
      │── 4. Build Docker Image (Tagged $BUILD_NUMBER & latest)
      │── 5. Push to Docker Hub (muhammadraihanthaffanh/devops-lab)
      └── 6. Deploy ke VPS via SSH (SSH Agent 'vps-ssh')
            │
            ▼
      [ VPS Target: 43.173.15.95 ]
            │── cd ~/devops-lab
            │── git pull origin main
            │── docker compose pull
            └── docker compose up -d (Port 3003:3000)
```

---

## 2. Komponen Proyek & Konfigurasi

### A. Aplikasi (Node.js & Express)
- **File Utama**: `app/server.js`
- **Frontend**: `app/public/index.html`
- **Testing**: `tests/app.test.js` (Jest & Supertest)
- **Monitoring Metric**: `prom-client` menyediakan endpoint `/metrics`
- **Healthcheck**: Endpoint `/health`

### B. Dockerfile (Multi-stage Build)
File: `Dockerfile`
```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=deps /app/node_modules node_modules
COPY package.json ./
COPY app ./app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "app/server.js"]
```

### C. Docker Compose
File: `docker-compose.yml`
```yaml
services:
  web:
    build: .
    image: muhammadraihanthaffanh/devops-lab:latest
    container_name: devops-lab-web
    ports:
      - "3003:3000"
    environment:
      - PORT=3000
    networks:
      - monitoring_monitoring
    restart: unless-stopped

networks:
  monitoring_monitoring:
    external: true
```
> **Catatan**: Network `monitoring_monitoring` disiapkan agar container aplikasi dapat di-scrape oleh Prometheus.

### D. SonarQube Scanner
File: `sonar-project.properties`
```ini
sonar.projectKey=devops-lab
sonar.sources=app
sonar.tests=tests
sonar.exclusions=app/public/**
sonar.javascript.lcov.reportPaths=coverage/lcov.info
```

### E. Jenkins Pipeline
File: `Jenkinsfile`
```groovy
pipeline {
    agent any

    environment {
        IMAGE = "muhammadraihanthaffanh/devops-lab"
        TAG = "${env.BUILD_NUMBER}"
    }

    tools {
        nodejs 'nodejs'
    }

    stages {
        stage('Test') {
            steps {
                sh 'npm ci'
                sh 'npm test'
            }
        }

        stage('SonarQube') {
            steps {
                script {
                    def scannerHome = tool 'sonar-scanner'
                    withSonarQubeEnv('sonarqube') {
                        sh "${scannerHome}/bin/sonar-scanner"
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build') {
            steps {
                sh 'docker build -t $IMAGE:$TAG -t $IMAGE:latest .'
            }
        }

        stage('Push') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'registry-cred',
                usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
                    sh 'echo $REG_PASS | docker login -u $REG_USER --password-stdin'
                    sh 'docker push $IMAGE:$TAG'
                    sh 'docker push $IMAGE:latest'
                }
            }
        }

        stage('Deploy') {
            steps {
                sshagent(['vps-ssh']) {
                    sh '''
                    ssh -o StrictHostKeyChecking=no ubuntu@43.173.15.95 \
                        "cd ~/devops-lab && git pull origin main && docker compose pull && docker compose up -d"
                    '''
                }
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
        }
    }
}
```

---

## 3. Langkah Demi Langkah (Step-by-Step Setup)

### Langkah 1: Persiapan Environment Lokal
1. Install dependencies lokal:
   ```bash
   npm install
   ```
2. Jalankan unit test dan periksa report coverage:
   ```bash
   npm test
   ```
3. Tes jalankan aplikasi secara lokal:
   ```bash
   npm start
   # Buka http://localhost:3000
   ```

### Langkah 2: Persiapan VPS / Server Target (`43.173.15.95`)
1. Masuk ke VPS:
   ```bash
   ssh ubuntu@43.173.15.95
   ```
2. Pastikan Docker dan Docker Compose plugin sudah terinstall.
3. Buat external network untuk integrasi Prometheus:
   ```bash
   docker network create monitoring_monitoring
   ```
4. Clone repositori ke direktori home VPS:
   ```bash
   git clone https://github.com/muhammadraihanthaffanh/devops-lab.git ~/devops-lab
   ```
5. Tambahkan public key (`jenkins_deploy.pub`) ke `~/.ssh/authorized_keys` di VPS agar Jenkins bisa deploy via SSH tanpa password.

### Langkah 3: Konfigurasi di Jenkins Server
1. **Plugin Jenkins yang Dibutuhkan**:
   - `NodeJS Plugin`
   - `SonarQube Scanner for Jenkins`
   - `SSH Agent Plugin`
   - `Docker Pipeline` / `Credentials Binding Plugin`
2. **Global Tool Configuration**:
   - **NodeJS**: Tambahkan instalasi dengan nama `nodejs` (Node.js 20/22).
   - **SonarQube Scanner**: Tambahkan instalasi dengan nama `sonar-scanner`.
3. **Configure System (System Settings)**:
   - Tambahkan Server SonarQube dengan nama Server URL SonarQube Anda dan nama environment `sonarqube`.
4. **Credentials Jenkins**:
   - ID `registry-cred`: Tipe *Username with password* (Username & Password Docker Hub).
   - ID `vps-ssh`: Tipe *SSH Username with private key* (User: `ubuntu`, Private key dari `jenkins_deploy`).

### Langkah 4: Trigger Pipeline
1. Lakukan perubahan kode di branch `main`.
2. Commit dan push ke GitHub:
   ```bash
   git add .
   git commit -m "feat: your changes"
   git push origin main
   ```
3. Jalankan Job di Jenkins (`Build Now`) atau biarkan webhook memicu otomatis.
4. Verifikasi bahwa semua stages: `Test` -> `SonarQube` -> `Quality Gate` -> `Build` -> `Push` -> `Deploy` berstatus hijau / sukses.
5. Akses aplikasi di VPS: `http://43.173.15.95:3003`.



---

## 4. Kubernetes (K8s) Deployment

Aplikasi sudah dilengkapi manifes K8s di folder `k8s/` dengan fitur:
- Multi-replica Pod (2 Pod) dengan Rolling Update
- Readiness & Liveness Probe mengarah ke `/health`
- Resource requests & limits
- Service NodePort (Port `30080` -> Container `3000`)
- Ingress (`devops-lab.local`)
- Horizontal Pod Autoscaler (HPA) berdasarkan CPU (70%) & Memory (80%)
- Kustomization untuk deploy sekaligus

### Cara Deploy ke Kubernetes via `kubectl`:
```bash
# 1. Pastikan cluster aktif (Minikube / Kind / K3s / Cloud K8s)
kubectl cluster-info

# 2. Deploy semua resource sekaligus dengan Kustomize
kubectl apply -k k8s/

# 3. Cek status resource di namespace devops-lab
kubectl get all -n devops-lab

# 4. Tes akses aplikasi:
# Jika menggunakan NodePort di Minikube:
minikube service devops-lab-service -n devops-lab

# Atau port-forward manual ke lokal port 8080:
kubectl port-forward -n devops-lab svc/devops-lab-service 8080:80
# Akses di browser: http://localhost:8080

# Untuk menghapus deployment:
kubectl delete -k k8s/
```

---

## 5. Infrastructure as Code (IaC) dengan Terraform

Folder `terraform/` memungkinkan manajemen infrastruktur dan deployment Kubernetes secara deklaratif menggunakan Terraform.

### Cara Menjalankan Terraform:
```bash
cd terraform

# 1. Inisialisasi provider
terraform init

# 2. Buat file variabel lokal dari contoh jika ingin kustomisasi (opsional)
cp terraform.tfvars.example terraform.tfvars

# 3. Preview rencana perubahan infrastruktur
terraform plan

# 4. Terapkan (Apply) konfigurasi
terraform apply -auto-approve

# 5. Lihat output hasil deploy
terraform output

# 6. Menghapus resource jika sudah selesai latihan
terraform destroy -auto-approve
```
