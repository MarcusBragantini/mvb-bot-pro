# 🔧 Configuração para Servidor com Tailscale

## ⚠️ Importante: Tailscale usa IPs 100.x.x.x

Seu servidor está acessível via Tailscale no IP `100.100.48.54`. Isso requer configurações específicas.

## 📝 Configurações no Servidor Ubuntu

### 1. Verifique se Tailscale está ativo

```bash
ssh administrador@100.100.48.54
tailscale status
```

### 2. Configure o servidor Node para escutar em todas as interfaces

O arquivo `server/app.js` já está configurado para escutar em `0.0.0.0` (linha 83).
Isso permite conexões via Tailscale.

### 3. Configure o Nginx

Execute no servidor:

```bash
# Copiar configuração do Nginx
sudo cp /var/www/zeus/nginx-config.conf /etc/nginx/sites-available/zeus

# Ativar site
sudo ln -sf /etc/nginx/sites-available/zeus /etc/nginx/sites-enabled/zeus

# Remover configuração padrão
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Se passou, reinicie
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 4. Firewall - Permitir tráfego Tailscale

```bash
# O Tailscale usa a interface tailscale0
# Permitir tráfego HTTP/HTTPS
sudo ufw allow in on tailscale0 to any port 80
sudo ufw allow in on tailscale0 to any port 443
sudo ufw allow in on tailscale0 to any port 3001

# Ou permitir todo tráfego Tailscale (mais simples)
sudo ufw allow in on tailscale0

# Verificar
sudo ufw status
```

### 5. Configurar arquivo .env no servidor

```bash
cd /var/www/zeus/server
nano .env
```

Cole e edite:

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=SUA_SENHA_MYSQL
DB_NAME=bot_mvb_saas
DB_PORT=3306

# JWT
JWT_SECRET=sua-chave-jwt-super-secreta-aleatoria-aqui

# Encryption
ENCRYPTION_KEY=outra-chave-criptografia-diferente-aqui

# Server
PORT=3001
NODE_ENV=production

# Admin
ADMIN_EMAIL=admin@zeus.com
ADMIN_PASSWORD=senha_admin_forte_aqui
```

Salve: `Ctrl+X`, `Y`, `Enter`

### 6. Iniciar/Reiniciar PM2

```bash
cd /var/www/zeus/server

# Se PM2 não estiver rodando
pm2 start app.js --name bot-mvb-server

# Se já estiver rodando
pm2 restart bot-mvb-server

# Salvar configuração
pm2 save

# Auto-start ao reiniciar servidor
pm2 startup
# Execute o comando que ele mostrar (começa com sudo)
```

## 🧪 Testar Conexões

### No servidor (via SSH):

```bash
# 1. Teste direto na porta 3001
curl http://localhost:3001/api/health

# 2. Teste via Nginx na porta 80
curl http://100.100.48.54/api/health

# 3. Ver logs do PM2
pm2 logs bot-mvb-server --lines 50

# 4. Ver logs do Nginx
sudo tail -f /var/log/nginx/zeus.error.log

# 5. Status dos serviços
pm2 status
sudo systemctl status nginx
sudo systemctl status mysql
```

### Na sua máquina (via Tailscale):

```bash
# Teste a API
curl http://100.100.48.54/api/health

# Deve retornar:
# {"status":"OK","timestamp":"...","version":"1.0.0"}
```

## 🚀 Fazer Deploy

Na sua máquina local:

```bash
npm run deploy
```

## 🔍 Diagnóstico de Problemas

### Problema: ERR_CONNECTION_REFUSED

**Causa**: Servidor Node não está rodando ou firewall bloqueando

**Solução**:
```bash
ssh administrador@100.100.48.54

# Verificar PM2
pm2 status

# Se offline, iniciar
pm2 start bot-mvb-server

# Ver logs de erro
pm2 logs bot-mvb-server --err --lines 50
```

### Problema: 502 Bad Gateway

**Causa**: Nginx não consegue conectar ao Node (porta 3001)

**Solução**:
```bash
# Verificar se Node está na porta 3001
sudo netstat -tlnp | grep 3001

# Deve mostrar algo como:
# tcp6  0  0 :::3001  :::*  LISTEN  12345/node

# Se não mostrar, PM2 não está rodando
pm2 start bot-mvb-server
```

### Problema: 404 Not Found

**Causa**: Nginx não configurado ou frontend não foi feito build

**Solução**:
```bash
# Verificar se dist existe
ls -la /var/www/zeus/dist/

# Fazer deploy completo
npm run deploy
```

### Problema: CORS Error

**Causa**: Frontend tentando acessar API de origem diferente

**Verificar**: O arquivo `src/lib/config.ts` tem o IP correto?
```typescript
BASE_URL: 'http://100.100.48.54/api'
```

## 📊 Checklist de Verificação

```bash
# No servidor (via SSH)
ssh administrador@100.100.48.54

# ✅ Tailscale ativo?
tailscale status

# ✅ Node rodando?
pm2 status
curl http://localhost:3001/api/health

# ✅ Nginx ativo?
sudo systemctl status nginx

# ✅ Firewall configurado?
sudo ufw status

# ✅ MySQL rodando?
sudo systemctl status mysql

# ✅ Arquivos do frontend existem?
ls -la /var/www/zeus/dist/index.html
```

## 💡 Dica: Acesso apenas via Tailscale

Se quiser que o servidor seja acessível **APENAS** via Tailscale (mais seguro):

```bash
# Bloquear acesso público, permitir apenas Tailscale
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow in on tailscale0
sudo ufw allow 22  # SSH (cuidado!)
sudo ufw enable
```

Isso garante que apenas dispositivos na sua rede Tailscale podem acessar.

## 🎯 Resumo do Fluxo

1. **Sua máquina** (Tailscale) → IP `100.100.48.54`
2. **Nginx** (porta 80) → recebe requisição
3. **Frontend** (`/var/www/zeus/dist`) → serve arquivos estáticos
4. **API** (`/api/*`) → Nginx faz proxy para `localhost:3001`
5. **Node.js** (porta 3001) → processa requisição
6. **MySQL** (porta 3306) → banco de dados

---

✅ **Tudo configurado!** Agora acesse: `http://100.100.48.54`


