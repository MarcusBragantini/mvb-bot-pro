#!/bin/bash

# 🔍 Script de Diagnóstico do Servidor
# Execute no servidor via SSH para verificar tudo de uma vez

echo "🔍 Diagnóstico do Servidor Zeus"
echo "================================"
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Tailscale
echo "1️⃣ Verificando Tailscale..."
if command -v tailscale &> /dev/null; then
    tailscale status | head -5
    echo -e "${GREEN}✅ Tailscale instalado${NC}"
else
    echo -e "${RED}❌ Tailscale não encontrado${NC}"
fi
echo ""

# 2. PM2
echo "2️⃣ Verificando PM2..."
if command -v pm2 &> /dev/null; then
    pm2 status
    echo -e "${GREEN}✅ PM2 instalado${NC}"
else
    echo -e "${RED}❌ PM2 não encontrado - Instale: sudo npm install -g pm2${NC}"
fi
echo ""

# 3. Node.js na porta 3001
echo "3️⃣ Verificando Node.js na porta 3001..."
if netstat -tlnp 2>/dev/null | grep -q ':3001'; then
    echo -e "${GREEN}✅ Servidor rodando na porta 3001${NC}"
    netstat -tlnp 2>/dev/null | grep ':3001'
else
    echo -e "${RED}❌ Nenhum processo na porta 3001${NC}"
    echo "   Execute: pm2 start /var/www/zeus/server/app.js --name bot-mvb-server"
fi
echo ""

# 4. Nginx
echo "4️⃣ Verificando Nginx..."
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx ativo${NC}"
    sudo nginx -t 2>&1 | tail -2
else
    echo -e "${RED}❌ Nginx não está rodando${NC}"
    echo "   Execute: sudo systemctl start nginx"
fi
echo ""

# 5. MySQL
echo "5️⃣ Verificando MySQL..."
if systemctl is-active --quiet mysql; then
    echo -e "${GREEN}✅ MySQL ativo${NC}"
else
    echo -e "${RED}❌ MySQL não está rodando${NC}"
    echo "   Execute: sudo systemctl start mysql"
fi
echo ""

# 6. Firewall
echo "6️⃣ Verificando Firewall..."
sudo ufw status | head -10
echo ""

# 7. Arquivos do frontend
echo "7️⃣ Verificando arquivos do frontend..."
if [ -f "/var/www/zeus/dist/index.html" ]; then
    echo -e "${GREEN}✅ Frontend build encontrado${NC}"
    ls -lh /var/www/zeus/dist/ | head -5
else
    echo -e "${RED}❌ Frontend não encontrado em /var/www/zeus/dist/${NC}"
    echo "   Execute deploy: npm run deploy"
fi
echo ""

# 8. Arquivo .env
echo "8️⃣ Verificando arquivo .env..."
if [ -f "/var/www/zeus/server/.env" ]; then
    echo -e "${GREEN}✅ Arquivo .env existe${NC}"
    echo "   Variáveis configuradas:"
    grep -v "PASSWORD\|SECRET\|KEY" /var/www/zeus/server/.env 2>/dev/null || echo "   (arquivo vazio ou sem permissão)"
else
    echo -e "${RED}❌ Arquivo .env não encontrado${NC}"
    echo "   Crie em: /var/www/zeus/server/.env"
fi
echo ""

# 9. Teste API local
echo "9️⃣ Testando API (localhost:3001)..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API respondendo:${NC}"
    curl -s http://localhost:3001/api/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3001/api/health
else
    echo -e "${RED}❌ API não responde em localhost:3001${NC}"
fi
echo ""

# 10. Teste via Nginx
echo "🔟 Testando via Nginx (porta 80)..."
if curl -s http://100.100.48.54/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx funcionando:${NC}"
    curl -s http://100.100.48.54/api/health | python3 -m json.tool 2>/dev/null || curl -s http://100.100.48.54/api/health
else
    echo -e "${YELLOW}⚠️  Nginx não responde via IP Tailscale${NC}"
    echo "   Verifique: sudo tail -f /var/log/nginx/zeus.error.log"
fi
echo ""

# Resumo
echo "================================"
echo "📊 RESUMO"
echo "================================"
echo ""
echo "Para ver logs:"
echo "  PM2: pm2 logs bot-mvb-server"
echo "  Nginx: sudo tail -f /var/log/nginx/zeus.error.log"
echo "  MySQL: sudo tail -f /var/log/mysql/error.log"
echo ""
echo "URLs de acesso:"
echo "  Frontend: http://100.100.48.54"
echo "  API: http://100.100.48.54/api"
echo "  Health: http://100.100.48.54/api/health"
echo ""


