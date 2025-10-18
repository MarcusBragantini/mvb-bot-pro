# ⚙️ Configuração de Variáveis de Ambiente

## 📋 **Variáveis Necessárias**

### **TELEGRAM_BOT_TOKEN** (Obrigatório)

Token do bot do Telegram usado para enviar notificações automáticas.

#### **Como obter:**

1. Abra o Telegram e procure por **@BotFather**
2. Envie o comando `/newbot`
3. Siga as instruções:
   - Digite um nome para o bot (ex: "MVB Trading Bot")
   - Digite um username (deve terminar com "bot", ex: "mvb_pro_bot")
4. O @BotFather enviará seu token. Exemplo:
   ```
   8488356513:AAHQf7eRYsqxA02Azckcmqs10Bidik6887k
   ```
5. **IMPORTANTE:** Guarde este token em segurança!

---

## 🚀 **Configuração no Vercel**

### **Passo 1: Acessar o Painel**
1. Acesse [vercel.com](https://vercel.com)
2. Selecione seu projeto **mvb-bot-pro**
3. Vá em **Settings** → **Environment Variables**

### **Passo 2: Adicionar Variável**
1. Clique em **"Add New"**
2. **Name:** `TELEGRAM_BOT_TOKEN`
3. **Value:** Cole o token do seu bot
4. **Environment:** Selecione todas (Production, Preview, Development)
5. Clique em **"Save"**

### **Passo 3: Fazer Redeploy**
1. Vá em **Deployments**
2. Clique nos três pontos (...) do último deployment
3. Selecione **"Redeploy"**
4. Aguarde o deploy finalizar

---

## 💻 **Configuração Local (Desenvolvimento)**

### **Opção 1: Arquivo `.env`**

Crie um arquivo `.env` na raiz do projeto:

```env
TELEGRAM_BOT_TOKEN=seu_token_aqui
```

**⚠️ IMPORTANTE:** Nunca faça commit do arquivo `.env`! Ele já está no `.gitignore`.

### **Opção 2: Variáveis de Ambiente do Sistema**

**Windows (PowerShell):**
```powershell
$env:TELEGRAM_BOT_TOKEN="seu_token_aqui"
```

**Linux/Mac (Bash):**
```bash
export TELEGRAM_BOT_TOKEN="seu_token_aqui"
```

---

## ✅ **Verificar Configuração**

### **Teste 1: Verificar se a variável está configurada**

Acesse a API:
```
https://seu-dominio.vercel.app/api/telegram-config
```

**Resposta esperada:**
```json
{
  "success": true,
  "botToken": "8488356513:AAH..."
}
```

**Se der erro:**
```json
{
  "error": "Bot token not configured",
  "message": "Configure TELEGRAM_BOT_TOKEN nas variáveis de ambiente do servidor"
}
```
→ A variável não foi configurada corretamente

---

### **Teste 2: Enviar mensagem de teste**

1. Configure suas notificações no sistema
2. Digite seu Chat ID
3. Clique em **"Testar"**
4. Verifique se recebeu a mensagem no Telegram

---

## 🔒 **Segurança**

### **Boas Práticas:**

✅ **NUNCA** compartilhe seu token publicamente  
✅ **NUNCA** faça commit do token no código  
✅ **SEMPRE** use variáveis de ambiente  
✅ **REVOGUE** o token se suspeitar de vazamento  

### **Como revogar um token:**

1. Abra @BotFather no Telegram
2. Envie `/mybots`
3. Selecione seu bot
4. Clique em **"API Token"**
5. Clique em **"Revoke current token"**
6. Gere um novo token
7. Atualize nas variáveis de ambiente

---

## ❓ **Problemas Comuns**

### **"Bot token not configured"**
**Causa:** Variável `TELEGRAM_BOT_TOKEN` não foi configurada  
**Solução:** Siga os passos de configuração acima

### **"Unauthorized" (401)**
**Causa:** Token inválido ou revogado  
**Solução:** Gere um novo token com @BotFather

### **"Chat not found" (400)**
**Causa:** Cliente não iniciou conversa com o bot  
**Solução:** Enviar `/start` para o bot antes de tentar receber mensagens

---

## 📚 **Documentação Adicional**

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [BotFather Documentation](https://core.telegram.org/bots#6-botfather)

---

## 🆘 **Suporte**

Se tiver problemas:
1. Verifique se a variável está configurada corretamente
2. Faça redeploy após adicionar a variável
3. Teste a API `/telegram-config` para confirmar
4. Verifique os logs do Vercel em caso de erro

