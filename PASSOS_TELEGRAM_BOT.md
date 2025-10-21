# 🤖 PASSOS PARA USAR O BOT TELEGRAM

## ✅ **PASSO 1: Aguardar Deploy** (2-3 minutos)

O deploy está em andamento. Aguarde a conclusão.

---

## 📄 **PASSO 2: Executar SQL no Banco de Dados**

**IMPORTANTE:** Este passo é obrigatório para criar as colunas necessárias na tabela `users`.

1. Acesse: https://hostinger.com/cpanel
2. Login com suas credenciais
3. Ir em **phpMyAdmin**
4. Selecionar banco: `u950457610_bot_mvb_saas`
5. Clicar na aba **SQL**
6. Copiar e colar o conteúdo do arquivo: `database-add-engagement-fields.sql`
7. Clicar em **Executar**

### **SQL a executar:**

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50) DEFAULT NULL COMMENT 'Chat ID do Telegram do usuário';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login DATETIME DEFAULT NULL COMMENT 'Data do último login do usuário';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_engagement_notification DATETIME DEFAULT NULL COMMENT 'Data da última notificação de engajamento enviada';

CREATE INDEX IF NOT EXISTS idx_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_telegram_chat_id ON users(telegram_chat_id);
```

**Depois executar também:** `database-create-bot-sessions.sql` (para criar tabela de sessões)

---

## 🌐 **PASSO 3: Configurar seu Chat ID na Web**

1. Acesse: https://mvb-pro.bragantini.com.br
2. Fazer **login**
3. Ir em **Configurações** (Settings)
4. Rolar até **Configurações do Telegram**
5. No campo **"Seu Chat ID do Telegram"**, inserir: `5034947899`
6. Clicar em **"Salvar"**

**Agora o Chat ID está salvo no banco de dados!** ✅

---

## 📱 **PASSO 4: Testar Bot no Telegram**

1. Abrir Telegram
2. Procurar seu bot: `@Zeus_Bot_Pro_bot` (ou o nome que você configurou)
3. Enviar: `/help`
4. **Bot deve responder com lista de comandos!** 🎉

---

## 🚀 **PASSO 5: Iniciar Bot via Telegram**

Agora você pode iniciar o bot remotamente:

```
/start R_10 demo 1
```

O bot responderá:
```
✅ Bot Zeus Iniciado!

👤 Usuário: Seu Nome
📊 Símbolo: R_10
💼 Conta: DEMO
💰 Stake: $1.00
⚙️ Estratégia: Zeus

🤖 O bot está rodando em background
📱 Você pode fechar o Telegram

Comandos disponíveis:
/status - Ver estatísticas
/stop - Parar bot
/config - Alterar configurações
```

---

## 📊 **PASSO 6: Verificar Status**

A qualquer momento, envie:
```
/status
```

Verá:
```
📊 Status do Bot Zeus

🤖 Status: ATIVO ✅
📊 Símbolo: R_10
💼 Conta: DEMO
💰 Stake: $1.00

Estatísticas:
💵 Lucro: $0.00
📈 Trades: 0 (0W / 0L)
🎯 Precisão: 0.00%
⏱️ Tempo ativo: 2 min
```

---

## ⏰ **NOTA IMPORTANTE: Cron Job**

O bot em **background** depende do **Cron Job externo** que você configurou em cron-job.org.

- ✅ Se o cron estiver ativo: Bot executará trades a cada 1 minuto
- ❌ Se não tiver cron: Bot só enviará notificações, mas não executará trades automaticamente

---

## 🎯 **COMANDOS DISPONÍVEIS:**

```
/start R_10 demo 1    → Iniciar bot
/stop                 → Parar bot
/status               → Ver estatísticas
/config stake 2       → Alterar stake para $2
/config symbol R_25   → Alterar ativo para R_25
/config account real  → Mudar para conta REAL
/help                 → Ajuda
```

---

## 🔍 **SOLUÇÃO DE PROBLEMAS:**

### **Erro: "Usuário não encontrado"**
- ✅ Executou o SQL no banco? (Passo 2)
- ✅ Salvou o Chat ID na Web? (Passo 3)
- ✅ Usou o Chat ID correto? (5034947899)

### **Bot não responde**
- Aguardar 2-3 minutos após o deploy
- Verificar se webhook está configurado:
  ```
  https://api.telegram.org/bot8488356513:AAHQf7eRYsqxA02Azckcmqs10Bidik6887k/getWebhookInfo
  ```

### **Bot responde mas não executa trades**
- Verificar se Cron Job está ativo em cron-job.org
- Verificar tokens Deriv configurados na Web

---

**Data:** 21/10/2025  
**Última atualização:** Deploy em andamento

