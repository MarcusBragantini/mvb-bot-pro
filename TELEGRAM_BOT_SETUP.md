# 🤖 CONFIGURAÇÃO DO BOT TELEGRAM

## 📋 PRÉ-REQUISITOS

- ✅ Bot já criado (@BotFather)
- ✅ Token do bot já configurado (TELEGRAM_BOT_TOKEN no Vercel)
- ✅ Deploy do projeto funcionando

---

## 🔧 PASSO 1: CONFIGURAR WEBHOOK

### **Opção A: Via Browser** (Mais fácil)

1. Abra o navegador
2. Cole esta URL (substitua `<SEU_TOKEN>`):

```
https://api.telegram.org/bot<SEU_TOKEN>/setWebhook?url=https://mvb-pro.bragantini.com.br/api/telegram-bot
```

**Exemplo:**
```
https://api.telegram.org/bot7788529453:AAG5.../setWebhook?url=https://mvb-pro.bragantini.com.br/api/telegram-bot
```

3. Você verá:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

---

### **Opção B: Via Terminal** (PowerShell)

```powershell
$token = "7788529453:AAG5..."
$url = "https://mvb-pro.bragantini.com.br/api/telegram-bot"

Invoke-WebRequest -Uri "https://api.telegram.org/bot$token/setWebhook?url=$url"
```

---

### **Opção C: Via cURL** (Linux/Mac)

```bash
curl "https://api.telegram.org/bot<SEU_TOKEN>/setWebhook?url=https://mvb-pro.bragantini.com.br/api/telegram-bot"
```

---

## ✅ PASSO 2: VERIFICAR WEBHOOK

Abra no navegador:
```
https://api.telegram.org/bot<SEU_TOKEN>/getWebhookInfo
```

Deve retornar:
```json
{
  "ok": true,
  "result": {
    "url": "https://mvb-pro.bragantini.com.br/api/telegram-bot",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

## 🧪 PASSO 3: TESTAR BOT

1. Abra o Telegram
2. Procure seu bot: `@ZeusBotMVB` (ou o nome que você deu)
3. Envie: `/help`
4. Bot deve responder com lista de comandos

---

## 📱 PASSO 4: VINCULAR USUÁRIO

### **Para que o bot funcione, o usuário precisa:**

1. Descobrir seu `chat_id`:
   - Envie qualquer mensagem para o bot
   - O bot responderá com: "Seu chat_id: 123456789"

2. Ir em: https://mvb-pro.bragantini.com.br
3. Fazer login
4. Ir em **Configurações → Telegram**
5. Colar o `chat_id` e salvar

Depois disso, o usuário pode usar `/start` no Telegram!

---

## 🤖 COMANDOS DISPONÍVEIS

### **Controles Básicos:**
```
/start R_10 demo 1    → Iniciar bot
/stop                 → Parar bot
/status               → Ver estatísticas
```

### **Configurações:**
```
/config stake 2       → Alterar stake
/config symbol R_25   → Alterar ativo
/config account real  → Mudar para conta real
```

### **Informações:**
```
/balance              → Ver saldo
/help                 → Ajuda
```

---

## 🔍 TROUBLESHOOTING

### **Bot não responde**

1. Verificar Webhook:
```
https://api.telegram.org/bot<SEU_TOKEN>/getWebhookInfo
```

2. Ver logs no Vercel:
```bash
vercel logs --follow
```

3. Testar endpoint manualmente:
```bash
curl -X POST https://mvb-pro.bragantini.com.br/api/telegram-bot \
  -H "Content-Type: application/json" \
  -d '{"message":{"chat":{"id":123},"text":"/help"}}'
```

### **Erro: "Usuário não encontrado"**

- Usuário precisa configurar `telegram_chat_id` na Web
- Ver tabela `users` no banco:
```sql
SELECT id, name, telegram_chat_id FROM users;
```

### **Erro: "Token não configurado"**

- Usuário precisa configurar token Deriv na Web
- Ver tabela `user_settings`:
```sql
SELECT user_id, deriv_token_demo, deriv_token_real FROM user_settings;
```

---

## 📊 LOGS E MONITORAMENTO

### **Ver comandos recebidos:**
```sql
SELECT * FROM telegram_commands_log 
ORDER BY created_at DESC 
LIMIT 20;
```

### **Ver sessões ativas:**
```sql
SELECT bs.*, u.name 
FROM bot_sessions bs
JOIN users u ON bs.user_id = u.id
WHERE bs.is_active = TRUE;
```

---

## 🚀 CRON JOB (Bot Worker)

### **Vercel Cron (Incluído no deploy)**
- ✅ Já configurado em `vercel.json`
- ⏰ Executa a cada 1 minuto
- 📍 Endpoint: `/api/bot-worker`

### **Cron Externo (Backup - Recomendado)**

Se atingir limite de 100 execuções/dia no Vercel:

1. Cadastrar em: https://cron-job.org (grátis)
2. Criar novo job:
   - **URL:** `https://mvb-pro.bragantini.com.br/api/bot-worker`
   - **Frequência:** A cada 1 minuto
   - **Método:** GET
3. Ativar

---

## 🔐 SEGURANÇA

### **Variáveis de Ambiente (Vercel):**

Certifique-se de que estas variáveis estão configuradas:

```
TELEGRAM_BOT_TOKEN=7788529453:AAG5...
DB_HOST=srv806.hstgr.io
DB_USER=u950457610_bot_mvb_saas
DB_PASSWORD=Mvb985674%081521
DB_NAME=u950457610_bot_mvb_saas
```

---

**Última atualização:** 21/10/2025

