#!/bin/bash

# 🚀 Deploy estilo Caprover - Simples e direto
# Execute: npm run captain

# Configurações
SERVER_USER="administrador"
SERVER_HOST="100.100.48.54"
SERVER_PATH="/var/www/zeus"

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Captain Deploy - Bot MVB Pro${NC}"
echo ""

# 1. Build local
echo -e "${GREEN}📦 Building application...${NC}"
npm run build

# 2. Enviar tudo (exceto node_modules)
echo -e "${GREEN}🚢 Deploying to production...${NC}"
rsync -az --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude '.vscode' \
    ./ ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/

# 3. Executar comandos no servidor
echo -e "${GREEN}⚙️  Setting up on server...${NC}"
ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
cd /var/www/zeus/server
npm install --production
pm2 restart bot-mvb-server
pm2 save
ENDSSH

echo ""
echo -e "${GREEN}✅ Deployed successfully!${NC}"
echo -e "${BLUE}🌐 Your app: http://${SERVER_HOST}${NC}"
echo ""

