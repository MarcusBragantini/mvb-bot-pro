# 🤖 ZEUS BOT PRO - GUIA COMPLETO

## 📋 **O QUE É ESTE SISTEMA:**

Bot de trading automatizado para Deriv.com com:
- ✅ Interface Web (tempo real)
- ✅ Controle via Telegram (remoto)
- ✅ Trading automático em background
- ✅ Analytics e histórico completo
- ✅ Painel Admin
- ✅ 100% Gratuito

---

## 🚀 **SETUP INICIAL (PRIMEIRA VEZ):**

### **1. Executar SQL no Banco de Dados**

Acesse phpMyAdmin (Hostinger) e execute: **`EXECUTAR_TODOS_OS_SQLS.sql`**

### **2. Configurar Webhook do Telegram**

Abra no navegador (substitua `<SEU_TOKEN>`):
```
https://api.telegram.org/bot<SEU_TOKEN>/setWebhook?url=https://mvb-pro.bragantini.com.br/api/telegram-bot
```

### **3. Configurar Cron Job Externo**

1. Cadastre em: https://cron-job.org (grátis)
2. Crie job:
   - URL: `https://mvb-pro.bragantini.com.br/api/bot-worker`
   - Frequência: A cada 1 minuto
3. Ativar

---

## 💻 **COMO USAR - OPÇÃO 1: WEB**

### **Uso Normal:**
```
1. Login em https://mvb-pro.bragantini.com.br
2. Configurar: Símbolo, Stake, Stops
3. Clicar "▶️ Iniciar Bot"
4. Bot opera em tempo real
5. Pode minimizar (não fechar!)
```

### **Múltiplas Abas (NOVO!):**
```
✅ Pode abrir várias abas simultaneamente
✅ Testar diferentes ativos em paralelo
✅ Cada aba opera independentemente
✅ Ideal para análise comparativa

Exemplo:
Aba 1: R_10 Index
Aba 2: R_25 Index
Aba 3: R_50 Index
→ Testar estratégia em 3 ativos ao mesmo tempo!
```

---

## 📱 **COMO USAR - OPÇÃO 2: TELEGRAM** (Recomendado!)

### **Primeira Configuração:**
```
1. Enviar qualquer mensagem ao bot
2. Copiar chat_id que ele retorna
3. Web → Configurações → Telegram
4. Colar chat_id e Salvar
```

### **Uso Diário:**
```
1. Telegram: /start
2. Escolher opções com botões:
   - Símbolo:
     🎲 Volatility (10, 25, 50, 75, 100)
     📉 Crash (300, 500, 1000)
     📈 Boom (300, 500, 1000)
     🪜 Step Index
     🎯 Jump (10, 25, 50, 75, 100)
   - Conta (Demo/Real)
   - Stake ($0.50, $1, $2...)
   - Duration (5, 10, 15, 20, 30 min)
   - Stops (Conservador/Moderado/Agressivo)
3. Clicar "🚀 Iniciar"
4. Abrir Web (pode minimizar)
5. Web inicia AUTOMATICAMENTE
6. Bot opera!
```

### **Acompanhamento:**
```
/status  → Ver lucro, trades, win rate
/stop    → Parar bot remotamente
```

---

## 🎮 **COMANDOS TELEGRAM:**

| Comando | Descrição |
|---------|-----------|
| `/start` | Abrir wizard de configuração |
| `/stop` | Parar bot |
| `/status` | Ver estatísticas em tempo real |
| `/config stake 2` | Alterar stake para $2 |
| `/config symbol CRASH500N` | Mudar para Crash 500 |
| `/config symbol BOOM1000N` | Mudar para Boom 1000 |
| `/config symbol JD25` | Mudar para Jump 25 |
| `/config account real` | Mudar para conta real |
| `/help` | Menu com botões clicáveis |

---

## 🔄 **SINCRONIZAÇÃO WEB ↔ TELEGRAM:**

| Ação | Resultado |
|------|-----------|
| Configurar na Web | Telegram /start usa essas configs |
| Telegram /start | Web detecta e inicia automaticamente |
| Trade na Web | Telegram /status mostra em tempo real |
| Telegram /stop | Web para (se estiver aberta) |

---

## ⚙️ **CONFIGURAÇÕES IMPORTANTES:**

### **Duração dos Trades:**
- **Padrão:** 15 minutos (recomendado)
- Alterar na Web: Campo "Duration"
- Alterar no Telegram: Wizard → "⏱️ Mudar Duration"

### **Stop Loss/Win:**
- **Conservador:** Win $2 / Loss $-3
- **Moderado:** Win $5 / Loss $-5
- **Agressivo:** Win $10 / Loss $-10

### **Notificações:**
- Notifica: Trade #1, #5, #10, #15...
- Sempre notifica: Resultados (WIN/LOSS)
- Sempre notifica: Stop Loss/Win atingido

---

## 🔍 **SOLUÇÃO DE PROBLEMAS:**

### **Bot não opera via Telegram sozinho**
- **Motivo:** Vercel Serverless não suporta WebSocket
- **Solução:** Abrir Web (pode minimizar)
- **Alternativa:** VPS Oracle Cloud (gratuito)

### **Telegram não responde**
- Verificar webhook configurado
- Ver: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`

### **Web não detecta sessão do Telegram**
- Limpar cache: Ctrl + Shift + R
- Verificar se SQL foi executado
- Ver console: F12

### **Trades não aparecem no Analytics**
- Ir para aba Analytics
- Filtrar por conta (Real/Demo)
- Atualizar página

---

## 📊 **ESTRUTURA DO BANCO:**

### **Tabelas Criadas:**
- `bot_sessions` - Sessões ativas do bot
- `telegram_commands_log` - Log de comandos
- `telegram_wizard_state` - Estado do wizard
- `user_trades` - Histórico de trades
- `users` - Usuários (com telegram_chat_id)

---

## 🔐 **BACKUP E RESTAURAÇÃO:**

### **Backup Criado:**
- Branch: `backup-web-only`
- Tag: `v2.0-stable`

### **Restaurar:**
```bash
git checkout backup-web-only
git push origin backup-web-only:master --force
```

---

## 🆘 **SUPORTE:**

### **Problemas Técnicos:**
- Ver console do navegador (F12)
- Verificar logs: `vercel logs <deployment-url>`

### **Dúvidas:**
- https://mvb-pro.bragantini.com.br
- Telegram: /help

---

## 📈 **MELHORIAS FUTURAS (OPCIONAL):**

1. VPS Oracle Cloud (bot 100% autônomo)
2. Análise mais avançada no worker
3. Múltiplas estratégias
4. Dashboard real-time
5. Gráficos no Telegram

---

**Versão:** v3.3-auto-start  
**Data:** 21/10/2025  
**Status:** ✅ Funcionando

---

## ✅ **CHECKLIST RÁPIDO:**

- [ ] SQL executado (`EXECUTAR_TODOS_OS_SQLS.sql`)
- [ ] Webhook Telegram configurado
- [ ] Cron Job ativo (cron-job.org)
- [ ] Chat ID configurado na Web
- [ ] Tokens Deriv configurados
- [ ] Testado: Telegram /start → Web abre → Inicia automaticamente

---

**🎉 Sistema 100% funcional! Aproveite! 🚀**

