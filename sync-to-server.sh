#!/bin/bash

# 🔄 Script de Sincronização - Envia arquivos corrigidos para o servidor
# Execute na sua máquina local

# Configurações do servidor
SERVER_USER="administrador"
SERVER_HOST="100.100.48.54"
SERVER_PATH="/var/www/zeus"
SERVER_SSH_PORT="22"

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔄 Sincronizando arquivos corrigidos para o servidor...${NC}"
echo ""

# 1. Sincronizar código fonte (src)
echo -e "${GREEN}📁 Enviando pasta src/ (código frontend)...${NC}"
rsync -avz --progress \
    -e "ssh -p ${SERVER_SSH_PORT}" \
    ./src/ ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/src/

# 2. Sincronizar arquivos de configuração
echo -e "${GREEN}⚙️  Enviando arquivos de configuração...${NC}"
rsync -avz --progress \
    -e "ssh -p ${SERVER_SSH_PORT}" \
    ./vite.config.ts \
    ./tsconfig.json \
    ./tsconfig.app.json \
    ./tailwind.config.ts \
    ./postcss.config.js \
    ./index.html \
    ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/

# 3. Sincronizar server (se houver alterações)
echo -e "${GREEN}🔧 Enviando pasta server/ (código backend)...${NC}"
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.env' \
    -e "ssh -p ${SERVER_SSH_PORT}" \
    ./server/ ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/server/

echo ""
echo -e "${YELLOW}🔨 Fazendo build no servidor...${NC}"

# 4. Fazer build no servidor
ssh -p ${SERVER_SSH_PORT} ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
cd /var/www/zeus

# Limpar build antigo
rm -rf dist/

# Build novo
npm run build

# Verificar se criou
if [ -d "dist" ]; then
    echo "✅ Build criado com sucesso!"
    ls -lh dist/assets/ | head -5
else
    echo "❌ Erro ao criar build!"
    exit 1
fi
ENDSSH

# 5. Reiniciar serviços
echo ""
echo -e "${GREEN}🔄 Reiniciando serviços...${NC}"

ssh -p ${SERVER_SSH_PORT} ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
# Reiniciar PM2
pm2 restart bot-mvb-server

# Reiniciar Nginx
sudo systemctl reload nginx

echo "✅ Serviços reiniciados"
ENDSSH

echo ""
echo -e "${GREEN}✅ Sincronização concluída!${NC}"
echo -e "${BLUE}🌐 Acesse: http://${SERVER_HOST}${NC}"
echo ""
echo -e "${YELLOW}💡 Lembre-se de:${NC}"
echo "   1. Limpar localStorage no navegador (F12 → Application → Clear storage)"
echo "   2. Abrir janela anônima (Ctrl+Shift+N)"
echo "   3. Acessar http://${SERVER_HOST}"
echo ""

