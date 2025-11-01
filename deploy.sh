#!/bin/bash

# 🚀 Deploy Automatizado - Bot MVB Pro
# Edite as linhas abaixo com os dados do seu servidor

SERVER_USER="administrador"
SERVER_HOST="100.100.48.54"
SERVER_PATH="/var/www/zeus"
SERVER_SSH_PORT="22"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Deploy Bot MVB Pro${NC}"
echo ""

# Build do frontend
echo -e "${GREEN}🔨 Build do frontend...${NC}"
npm run build || exit 1

# Sincronizar arquivos
echo -e "${GREEN}📡 Enviando arquivos do projeto...${NC}"
rsync -az \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude '.vscode' \
    --exclude 'dist' \
    -e "ssh -p ${SERVER_SSH_PORT}" \
    ./ ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/

# Sincronizar pasta dist separadamente
echo -e "${GREEN}📦 Enviando build (dist)...${NC}"
rsync -az --delete \
    -e "ssh -p ${SERVER_SSH_PORT}" \
    ./dist/ ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/dist/

# Tornar script de diagnóstico executável
chmod +x check-server.sh 2>/dev/null || true

# Instalar e reiniciar
echo -e "${GREEN}🔄 Reiniciando servidor...${NC}"
ssh -p ${SERVER_SSH_PORT} ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
cd /var/www/zeus/server
npm install --production
pm2 restart bot-mvb-server
pm2 save
chmod +x /var/www/zeus/check-server.sh 2>/dev/null || true
echo ""
echo "✅ Servidor reiniciado"
ENDSSH

echo ""
echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo -e "${BLUE}URL: http://${SERVER_HOST}${NC}"
echo ""
echo -e "${YELLOW}💡 Para diagnosticar o servidor:${NC}"
echo -e "   ssh ${SERVER_USER}@${SERVER_HOST} 'bash /var/www/zeus/check-server.sh'"

