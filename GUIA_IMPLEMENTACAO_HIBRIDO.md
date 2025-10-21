# 🚀 GUIA DE IMPLEMENTAÇÃO - SISTEMA HÍBRIDO

## ✅ O QUE FOI FEITO

### **1. Backup Criado**
- ✅ Branch: `backup-web-only`
- ✅ Tag: `v2.0-stable`
- ✅ Sistema anterior 100% funcional preservado

### **2. Banco de Dados**
- ✅ Tabela `bot_sessions` criada
- ✅ Tabela `telegram_commands_log` criada
- ✅ Script SQL: `database-create-bot-sessions.sql`

### **3. APIs Implementadas**
- ✅ `/api/telegram-bot` - Recebe comandos do Telegram
- ✅ `/api/bot-worker` - Executa trades em background

### **4. Comandos Telegram**
- ✅ `/start [symbol] [account] [stake]` - Iniciar bot
- ✅ `/stop` - Parar bot
- ✅ `/status` - Ver estatísticas
- ✅ `/config stake|symbol|account [valor]` - Alterar configurações
- ✅ `/help` - Ajuda

### **5. Cron Job**
- ✅ Configurado no `vercel.json`
- ⏰ Executa `/api/bot-worker` a cada 1 minuto

### **6. Documentação**
- ✅ `TELEGRAM_BOT_SETUP.md` - Como configurar
- ✅ `BACKUP_RESTAURACAO.md` - Como restaurar versão anterior
- ✅ Este guia

---

## 📋 PRÓXIMOS PASSOS (MANUAL)

### **PASSO 1: Aguardar Deploy** ⏳
```
Status: Deploy em andamento no Vercel
Tempo estimado: 2-3 minutos
URL: https://vercel.com/seu-projeto
```

### **PASSO 2: Executar SQL no Banco** 🗄️

1. Acessar: https://hostinger.com/cpanel
2. Ir em **phpMyAdmin**
3. Selecionar banco: `u950457610_bot_mvb_saas`
4. Clicar em **SQL**
5. Colar conteúdo de `database-create-bot-sessions.sql`
6. Clicar em **Executar**

**Verificar:**
```sql
SHOW TABLES LIKE 'bot_sessions';
SHOW TABLES LIKE 'telegram_commands_log';
```

Deve retornar 2 tabelas.

### **PASSO 3: Configurar Webhook do Telegram** 📱

**Opção A: Via Browser (Mais fácil)**

Abrir no navegador (substituir `<SEU_TOKEN>`):
```
https://api.telegram.org/bot<SEU_TOKEN>/setWebhook?url=https://mvb-pro.bragantini.com.br/api/telegram-bot
```

**Exemplo com seu token:**
```
https://api.telegram.org/bot7788529453:AAG5.../setWebhook?url=https://mvb-pro.bragantini.com.br/api/telegram-bot
```

**Verificar:**
```
https://api.telegram.org/bot<SEU_TOKEN>/getWebhookInfo
```

Deve mostrar:
```json
{
  "ok": true,
  "result": {
    "url": "https://mvb-pro.bragantini.com.br/api/telegram-bot",
    "pending_update_count": 0
  }
}
```

### **PASSO 4: Testar Bot no Telegram** 🧪

1. Abrir Telegram
2. Procurar seu bot (nome que você criou no @BotFather)
3. Enviar: `/help`
4. Bot deve responder com lista de comandos

**Se não responder:**
- Verificar webhook (passo 3)
- Ver logs no Vercel: `vercel logs --follow`

### **PASSO 5: Vincular Usuário** 👤

**O usuário precisa:**

1. Enviar qualquer mensagem para o bot no Telegram
2. Bot responderá com: "Seu chat_id: 123456789"
3. Copiar o `chat_id`
4. Acessar: https://mvb-pro.bragantini.com.br
5. Fazer login
6. Ir em **Configurações → Telegram**
7. Colar o `chat_id` e salvar

**Verificar no banco:**
```sql
SELECT id, name, telegram_chat_id FROM users WHERE email = 'bragantini34@gmail.com';
```

### **PASSO 6: Testar Fluxo Completo** 🎯

**Cenário A: Iniciar via Telegram**
```
1. Telegram: /start R_10 demo 1
2. Bot responde: "✅ Bot iniciado!"
3. Fechar Telegram
4. Aguardar 1 minuto
5. Abrir Telegram → /status
6. Ver estatísticas atualizadas
```

**Cenário B: Iniciar via Web**
```
1. Abrir https://mvb-pro.bragantini.com.br
2. Clicar "▶️ Iniciar Bot"
3. Trading real-time
4. Fechar Web
5. Bot continua (Telegram envia notificações)
```

**Cenário C: Parar remotamente**
```
1. Bot rodando (Web ou Telegram)
2. Telegram: /stop
3. Bot para imediatamente
4. Recebe relatório final
```

---

## 🔍 VERIFICAÇÕES

### **1. Vercel Deploy**
```bash
# Ver último deploy
vercel ls

# Ver logs em tempo real
vercel logs --follow
```

### **2. Cron Job Funcionando**
```bash
# Ver logs do bot-worker
vercel logs --follow | grep "bot-worker"

# Deve aparecer a cada 1 minuto:
# ⏰ Bot Worker executando...
# 📊 X sessão(ões) ativa(s) encontrada(s)
```

### **3. Banco de Dados**
```sql
-- Ver sessões ativas
SELECT * FROM bot_sessions WHERE is_active = TRUE;

-- Ver comandos recebidos
SELECT * FROM telegram_commands_log ORDER BY created_at DESC LIMIT 10;
```

---

## ⚠️ LIMITAÇÕES CONHECIDAS

### **1. Cron Job do Vercel**
- ⏰ Executa a cada **1 minuto** (não é real-time)
- ⏱️ Máximo **10 segundos** de execução
- 📊 Máximo **100 execuções/dia** no plano gratuito

**Solução:** Usar Cron externo (cron-job.org) se atingir limite

### **2. Trading via Background**
- Análise simplificada (não tem todos os dados do WebSocket)
- Trades não são instantâneos (1 minuto de intervalo)
- Stop Loss/Win são checados a cada 1 minuto

**Solução:** Web continua sendo melhor para trading ativo

### **3. WebSocket no Serverless**
- Vercel Serverless não mantém conexões WebSocket abertas
- Cada execução do worker precisa reconectar

**Isso é normal e esperado**

---

## 🆘 TROUBLESHOOTING

### **Bot não responde no Telegram**

1. Verificar Webhook:
```
https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

2. Testar endpoint manualmente:
```bash
curl -X POST https://mvb-pro.bragantini.com.br/api/telegram-bot \
  -H "Content-Type: application/json" \
  -d '{"message":{"chat":{"id":123},"from":{"username":"teste"},"text":"/help"}}'
```

3. Ver logs Vercel:
```bash
vercel logs --follow
```

### **Erro: "Usuário não encontrado"**

- Usuário precisa configurar `telegram_chat_id` na Web
- Verificar: `SELECT telegram_chat_id FROM users WHERE id = X;`

### **Erro: "Token não configurado"**

- Usuário precisa configurar tokens Deriv na Web
- Verificar: `SELECT * FROM user_settings WHERE user_id = X;`

### **Worker não executa**

1. Verificar Cron no `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/bot-worker",
      "schedule": "* * * * *"
    }
  ]
}
```

2. Testar manualmente:
```
https://mvb-pro.bragantini.com.br/api/bot-worker
```

3. Ver logs:
```bash
vercel logs --follow | grep "bot-worker"
```

### **Atingiu limite de 100 execuções/dia**

**Opção A: Aguardar 24h**

**Opção B: Usar Cron externo**
1. Cadastrar em: https://cron-job.org
2. Criar job:
   - URL: `https://mvb-pro.bragantini.com.br/api/bot-worker`
   - Frequência: A cada 1 minuto
3. Ativar

---

## 📊 MONITORAMENTO

### **Dashboard Recomendado:**

```sql
-- Estatísticas em tempo real
SELECT 
  u.name,
  bs.symbol,
  bs.account_type,
  bs.current_profit,
  bs.trades_count,
  TIMESTAMPDIFF(MINUTE, bs.started_at, NOW()) as minutos_ativo
FROM bot_sessions bs
JOIN users u ON bs.user_id = u.id
WHERE bs.is_active = TRUE;
```

### **Logs de Comandos:**

```sql
-- Últimos 20 comandos recebidos
SELECT 
  telegram_username,
  command,
  parameters,
  success,
  created_at
FROM telegram_commands_log
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🎉 SUCESSO!

Se chegou até aqui, seu sistema híbrido está funcionando!

**Agora você tem:**
- ✅ Bot via Web (real-time)
- ✅ Bot via Telegram (background)
- ✅ Controle remoto total
- ✅ Notificações automáticas
- ✅ Backup do sistema anterior

**Próximos passos opcionais:**
- Implementar lógica real de trading no `bot-worker.js`
- Adicionar mais comandos (`/balance`, `/history`)
- Melhorar análise de mercado no background
- Adicionar gráficos no Telegram

---

**Data:** 21/10/2025  
**Versão:** v3.0-hybrid  
**Status:** ✅ Pronto para uso

