pipeline{
    agent any

    environment{
        IMAGE = "muhammadraihanthaffanh/devops-lab"
        TAG = "${env.BUILD_NUMBER}"
    }

    tools {
        nodejs 'nodejs'
    }

    stages{
        stage('Test'){
            steps{
                sh 'npm ci'
                sh 'npm test'
            }
        }

        stage('SonarQube'){
            steps{
                script{
                    def scannerHome = tool 'sonar-scanner'
                    withSonarQubeEnv('sonarqube'){
                        sh "${scannerHome}/bin/sonar-scanner"
                    }
                }
            }
        }

        stage('Quality Gate'){
            steps{
                timeout(time: 5, unit: 'MINUTES'){
                    waitForQualityGate abortPipeline: true
                }
            }
        }
        stage('Build'){
            steps{
                sh 'docker build -t $IMAGE:$TAG -t $IMAGE:latest .'
            }
        }

        stage('Push'){
            steps{
                withCredentials([usernamePassword(credentialsId: 'registry-cred',
                usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]){
                sh 'echo $REG_PASS | docker login -u $REG_USER --password-stdin'
                sh 'docker push $IMAGE:$TAG'
                sh 'docker push $IMAGE:latest'
                }
            }
        }
        stage ('Deploy'){
            steps{
              sshagent(['vps-ssh']){
                sh '''
                ssh -o StrictHostKeyChecking=no ubuntu@43.173.15.95 \
                    "cd ~/devops-lab && git pull origin main && docker compose pull && docker compose up -d "  
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