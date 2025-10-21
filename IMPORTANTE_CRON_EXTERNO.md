# ⚠️ IMPORTANTE: CRON JOB EXTERNO OBRIGATÓRIO

## 🚫 PROBLEMA IDENTIFICADO

O Vercel **Hobby (gratuito)** **NÃO SUPORTA** Cron Jobs que rodam a cada minuto.

**Erro ao fazer deploy:**
```
Hobby accounts are limited to daily cron jobs. 
This cron expression (* * * * *) would run more than once per day.
```

---

## ✅ SOLUÇÃO: USAR CRON-JOB.ORG (GRATUITO)

### **PASSO 1: Cadastrar no cron-job.org**

1. Acesse: https://cron-job.org/en/signup.html
2. Crie uma conta gratuita
3. Confirme o email

---

### **PASSO 2: Criar Cron Job**

1. Login em https://cron-job.org
2. Clicar em **"Create cronjob"**
3. Preencher:

| Campo | Valor |
|-------|-------|
| **Title** | Bot Worker MVB |
| **Address (URL)** | `https://mvb-pro.bragantini.com.br/api/bot-worker` |
| **Schedule** | Every **1 minute** |
| **Enabled** | ✅ Sim |

4. Clicar em **"Create cronjob"**

---

### **PASSO 3: Verificar Funcionamento**

Após 1 minuto, verificar logs:

1. No cron-job.org:
   - Ir em **"History"**
   - Deve mostrar status **200 OK**

2. No Vercel:
```bash
vercel logs --follow | grep "bot-worker"
```

Deve aparecer:
```
⏰ Bot Worker executando...
📊 X sessão(ões) ativa(s) encontrada(s)
```

---

## 📊 PLANO GRATUITO - LIMITES

### **cron-job.org Free:**
- ✅ Até **10 Cron Jobs**
- ✅ Frequência mínima: **1 minuto**
- ✅ **Ilimitado** (sem limite de execuções)
- ✅ **100% gratuito** (para sempre)

### **Vercel Hobby:**
- ⏰ Apenas Cron Jobs **diários** (1x por dia)
- ❌ Não suporta execuções a cada minuto

---

## 🎯 ALTERNATIVAS (SE CRON-JOB.ORG NÃO FUNCIONAR)

### **1. UptimeRobot (Gratuito)**
- URL: https://uptimerobot.com
- Frequência mínima: **5 minutos**
- Limite: 50 monitores grátis

**Como configurar:**
1. Criar conta
2. Add New Monitor → HTTP(s)
3. URL: `https://mvb-pro.bragantini.com.br/api/bot-worker`
4. Monitoring Interval: **5 minutes**

---

### **2. EasyCron (Gratuito)**
- URL: https://www.easycron.com
- Frequência mínima: **5 minutos**
- Limite: 10 cron jobs grátis

---

### **3. Google Cloud Scheduler (Gratuito até 3 jobs)**
- URL: https://console.cloud.google.com/cloudscheduler
- Frequência: A cada **1 minuto**
- Limite: 3 jobs grátis

---

## 🔧 CONFIGURAÇÃO COMPLETA

### **1. Deploy está pronto (aguardar 2-3 minutos)**

O último commit removeu o Cron Job do `vercel.json`, então o deploy funcionará agora.

### **2. APIs disponíveis:**

- ✅ `/api/telegram-bot` - Recebe comandos do Telegram
- ✅ `/api/bot-worker` - Executa trades (será chamado pelo cron externo)

### **3. Webhook do Telegram:**

Após o deploy terminar, configurar webhook:
```
https://api.telegram.org/bot8488356513:AAHQf7eRYsqxA02Azckcmqs10Bidik6887k/setWebhook?url=https://mvb-pro.bragantini.com.br/api/telegram-bot
```

### **4. Cron externo:**

Configurar em **cron-job.org** para chamar a cada 1 minuto:
```
https://mvb-pro.bragantini.com.br/api/bot-worker
```

---

## ✅ CHECKLIST FINAL

- [ ] Aguardar deploy terminar (~2-3 min)
- [ ] Testar endpoint: `curl https://mvb-pro.bragantini.com.br/api/telegram-bot`
- [ ] Configurar Webhook Telegram
- [ ] Testar bot: enviar `/help` no Telegram
- [ ] Cadastrar em cron-job.org
- [ ] Criar Cron Job (1 minuto)
- [ ] Verificar logs: bot deve executar a cada 1 min

---

## 🎉 RESULTADO FINAL

Com essa configuração:

- ✅ Bot responde comandos no Telegram (/start, /stop, /status)
- ✅ Bot executa trades em background (via cron externo a cada 1 min)
- ✅ 100% gratuito (nenhum custo)
- ✅ Funciona sem página web aberta
- ✅ Web continua funcionando normalmente (tempo real)

---

**Data:** 21/10/2025  
**Status:** ⚠️ CRON EXTERNO OBRIGATÓRIO (Vercel Hobby não suporta)

