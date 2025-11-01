# 🚀 Guia de Deploy - Bot MVB Pro

## 📋 Pré-requisitos

1. **Servidor Ubuntu** 20.04+ (DigitalOcean, AWS, VPS, etc)
2. **Acesso SSH** ao servidor
3. **Domínio** (opcional, pode usar IP)

## ⚡ Deploy Rápido (Para quem já tem servidor configurado)

```bash
# 1. Edite deploy.sh com dados do seu servidor (linhas 6-9)
nano deploy.sh

# 2. Execute
chmod +x deploy.sh
npm run deploy
```

Pronto! 🎉

## 🔧 Passo 1: Configuração do Servidor

### Execute no servidor DigitalOcean:

```bash
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
```

## 🗄️ Passo 2: Configuração do MySQL

```bash
# Configurar MySQL
sudo mysql_secure_installation

# Acessar MySQL
sudo mysql -u root -p

# Criar banco de dados
CREATE DATABASE bot_mvb_saas;
CREATE USER 'bot_mvb_user'@'localhost' IDENTIFIED BY 'sua_senha_segura';
GRANT ALL PRIVILEGES ON bot_mvb_saas.* TO 'bot_mvb_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 📁 Passo 3: Upload dos Arquivos

```bash
# Criar diretório
sudo mkdir -p /var/www/bot-mvb-pro
sudo chown -R $USER:$USER /var/www/bot-mvb-pro

# Upload dos arquivos (use SCP, SFTP ou Git)
# Exemplo com Git:
cd /var/www/bot-mvb-pro
git clone https://github.com/seu-usuario/bot-mvb-pro.git .

# Ou copie os arquivos manualmente
```

## ⚙️ Passo 4: Configuração do Backend

```bash
# Instalar dependências do servidor
cd /var/www/bot-mvb-pro/server
npm install

# Criar arquivo .env
nano .env
```

### Conteúdo do arquivo `.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=bot_mvb_user
DB_PASSWORD=sua_senha_segura
DB_NAME=bot_mvb_saas
DB_PORT=3306

# JWT Secret
JWT_SECRET=sua-chave-jwt-super-secreta-aqui

# Encryption Key
ENCRYPTION_KEY=sua-chave-de-criptografia-super-secreta-aqui

# Server Configuration
PORT=3001
NODE_ENV=production

# Admin Configuration
ADMIN_EMAIL=admin@seu-dominio.com
ADMIN_PASSWORD=senha_admin_segura
```

```bash
# Configurar banco de dados
npm run setup-db

# Testar servidor
npm start
```

## 🎨 Passo 5: Build do Frontend

```bash
# Instalar dependências do frontend
cd /var/www/bot-mvb-pro
npm install

# Build para produção
npm run build
```

## 🔄 Passo 6: Configuração do PM2

```bash
# Copiar configuração do PM2
cp ecosystem.config.js /var/www/bot-mvb-pro/server/

# Iniciar aplicação com PM2
cd /var/www/bot-mvb-pro/server
pm2 start ecosystem.config.js --env production

# Configurar PM2 para iniciar com o sistema
pm2 startup
pm2 save
```

## 🌐 Passo 7: Configuração do Nginx

```bash
# Copiar configuração do Nginx
sudo cp nginx-config.conf /etc/nginx/sites-available/bot-mvb-pro

# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/bot-mvb-pro /etc/nginx/sites-enabled/

# Remover configuração padrão
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔍 Passo 8: Verificação

### Verificar se tudo está funcionando:

```bash
# Verificar PM2
pm2 status
pm2 logs bot-mvb-server

# Verificar Nginx
sudo systemctl status nginx

# Verificar MySQL
sudo systemctl status mysql

# Testar API
curl http://localhost:3001/api/health
curl http://167.71.93.87/api/health
```

## 🔧 Comandos Úteis

### Gerenciamento da Aplicação:

```bash
# Ver logs
pm2 logs bot-mvb-server

# Reiniciar aplicação
pm2 restart bot-mvb-server

# Parar aplicação
pm2 stop bot-mvb-server

# Iniciar aplicação
pm2 start bot-mvb-server

# Monitorar recursos
pm2 monit
```

### Gerenciamento do Nginx:

```bash
# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs
sudo tail -f /var/log/nginx/bot-mvb-pro.access.log
sudo tail -f /var/log/nginx/bot-mvb-pro.error.log

# Testar configuração
sudo nginx -t
```

## 🚨 Solução de Problemas

### Erro 404 na API:
- Verificar se o servidor Express está rodando na porta 3001
- Verificar configuração do Nginx
- Verificar logs: `pm2 logs bot-mvb-server`

### Erro de CORS:
- Verificar configuração CORS no `server/app.js`
- Verificar headers no Nginx

### Erro de Banco de Dados:
- Verificar configuração do MySQL
- Verificar arquivo `.env`
- Verificar logs: `pm2 logs bot-mvb-server`

### Frontend não carrega:
- Verificar se o build foi feito corretamente
- Verificar permissões do diretório `/var/www/bot-mvb-pro/dist`
- Verificar configuração do Nginx

## 📝 Notas Importantes

1. **Segurança**: Altere todas as senhas padrão
2. **SSL**: Configure SSL com Let's Encrypt para produção
3. **Backup**: Configure backup regular do banco de dados
4. **Monitoramento**: Configure monitoramento com PM2 Plus
5. **Logs**: Configure rotação de logs

## 🎯 URLs de Acesso

- **Frontend**: `http://167.71.93.87`
- **API**: `http://167.71.93.87/api`
- **Health Check**: `http://167.71.93.87/api/health`

## 🔄 Deploy de Alterações (Uso Diário)

Depois da configuração inicial, para enviar alterações use:

```bash
npm run deploy
```

Isso vai:
- ✅ Fazer build do frontend
- ✅ Sincronizar arquivos com servidor
- ✅ Instalar dependências
- ✅ Reiniciar aplicação com PM2

**Edite `deploy.sh`** (linhas 6-9) com os dados do seu servidor:
```bash
SERVER_USER="root"
SERVER_HOST="167.71.93.87"      # ← SEU IP AQUI
SERVER_PATH="/var/www/bot-mvb-pro"
SERVER_SSH_PORT="22"
```

## 📞 Suporte

Em caso de problemas, verifique:
1. Logs do PM2: `pm2 logs bot-mvb-server`
2. Logs do Nginx: `sudo tail -f /var/log/nginx/bot-mvb-pro.error.log`
3. Status dos serviços: `sudo systemctl status nginx mysql`
4. Portas abertas: `sudo netstat -tlnp`

