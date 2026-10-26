pipeline{
    agent any

    environment{
        IMAGE = "raihan9102/devops-lab"
        TAG = "${env.BUILD_NUMBER}"
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


    }



}