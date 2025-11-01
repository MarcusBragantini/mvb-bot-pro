#!/bin/bash

# Script de deploy para DigitalOcean
# Execute este script no servidor DigitalOcean

echo "🚀 Iniciando deploy do Bot MVB Pro..."

# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar MySQL
sudo apt install mysql-server -y

# Instalar PM2 para gerenciar processos
sudo npm install -g pm2

# Instalar Nginx
sudo apt install nginx -y

# Configurar firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3001
sudo ufw --force enable

echo "✅ Dependências instaladas com sucesso!"
echo "📝 Próximos passos:"
echo "1. Configure o MySQL: sudo mysql_secure_installation"
echo "2. Crie o banco de dados: mysql -u root -p"
echo "3. Execute: CREATE DATABASE bot_mvb_saas;"
echo "4. Configure o arquivo .env no diretório server/"
echo "5. Execute: npm install na pasta server/"
echo "6. Execute: npm run setup-db na pasta server/"
echo "7. Execute: pm2 start app.js --name bot-mvb-server"
echo "8. Configure o Nginx como proxy reverso"

