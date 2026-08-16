pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/24104080-cloud/Fuel-delivery-pipeline'
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm ci || npm install'
            }
        }

        stage('Build') {
            steps {
                bat 'npm run build'
            }
        }

        stage('Deploy') {
            steps {
                bat '''
                if not exist "C:\\ProgramData\\Jenkins\\.jenkins\\userContent\\fuel-delivery-pipeline" mkdir "C:\\ProgramData\\Jenkins\\.jenkins\\userContent\\fuel-delivery-pipeline"
                xcopy /E /I /Y "dist\\*" "C:\\ProgramData\\Jenkins\\.jenkins\\userContent\\fuel-delivery-pipeline\\"
                '''
            }
        }
    }
}