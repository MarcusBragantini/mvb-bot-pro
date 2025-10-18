# 🚀 Sistema de Engajamento Automático via Telegram

## 📋 Visão Geral

Sistema automático que envia mensagens motivacionais elegantes via Telegram para usuários que:
- ✅ Têm Telegram configurado
- ✅ Estão inativos há **7 dias ou mais**
- ✅ Têm conta ativa
- ✅ Não receberam notificação de engajamento nos últimos 7 dias

---

## 🛠️ Configuração Inicial

### 1️⃣ **Executar Script SQL**

Execute o script `database-add-engagement-fields.sql` no seu banco de dados MySQL:

```sql
-- Adiciona colunas necessárias
ALTER TABLE users ADD COLUMN telegram_chat_id VARCHAR(50) DEFAULT NULL;
ALTER TABLE users ADD COLUMN last_login DATETIME DEFAULT NULL;
ALTER TABLE users ADD COLUMN last_engagement_notification DATETIME DEFAULT NULL;
```

**Via phpMyAdmin:**
1. Acesse seu phpMyAdmin
2. Selecione o banco de dados `mvb_bot_pro`
3. Vá em "SQL"
4. Cole o conteúdo do arquivo `database-add-engagement-fields.sql`
5. Clique em "Executar"

---

### 2️⃣ **Configurar Telegram Bot Token**

O token já está configurado no Vercel:
- **Variável:** `TELEGRAM_BOT_TOKEN`
- **Valor:** `8488356513:AAHQf7eRYsqxA02Azckcmqs10Bidik6887k`

✅ **Nenhuma ação necessária!**

---

### 3️⃣ **Ativar Cron Job no Vercel**

O arquivo `vercel.json` já foi criado e configurado para executar **diariamente às 10h da manhã**.

**Para ativar:**
1. Faça commit das mudanças:
   ```bash
   git add .
   git commit -m "Adicionar sistema de engajamento automático"
   git push origin master
   ```

2. O Vercel irá detectar automaticamente o `vercel.json` e ativar o cron job.

3. Verifique no painel do Vercel:
   - Dashboard → Seu Projeto → Settings → Cron Jobs

---

## 📊 Como Funciona

### **Fluxo Automático:**

```
10h da manhã (diariamente)
         ↓
Vercel executa /api/engagement-notifications
         ↓
Busca usuários inativos há ≥7 dias
         ↓
Para cada usuário:
  - Gera mensagem personalizada
  - Envia via Telegram
  - Atualiza data da notificação
         ↓
Retorna relatório
```

---

## 📨 Exemplo de Mensagem Enviada

```
🤖 Olá, Bernardo! 😊

Percebi que você ainda não começou a alavancar sua banca.

O que está te impedindo de dar esse passo? Alguma dúvida? 
Alguma funcionalidade que poderia melhorar? Seu feedback é 
extremamente importante para nós!

💡 Lembre-se: Ninguém fica rico da noite para o dia. O segredo 
está na consistência – um grão por dia é muito melhor do que 
arriscar o pacote todo de uma vez. 💎

⚡ O Zeus foi desenvolvido justamente para isso: crescimento 
sustentável e inteligente. Estratégias comprovadas, automação 
precisa, e você no controle total.

Vem junto com o Zeus! ⚡

Estou à disposição para qualquer dúvida, sugestão ou apenas 
para trocar uma ideia sobre suas estratégias.

Um grande abraço e bons trades! 🚀
```

---

## 🧪 Teste Manual

Para testar o sistema antes do cron automático:

```bash
# Via terminal (depois do deploy)
curl -X POST https://seu-dominio.vercel.app/api/engagement-notifications

# Ou acesse diretamente no navegador (POST)
# Use Postman ou Insomnia
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Notificações de engajamento processadas",
  "total": 5,
  "sent": 5,
  "errors": 0
}
```

---

## 📈 Relatório de Envios

O sistema retorna:
- **total:** Número de usuários inativos encontrados
- **sent:** Número de mensagens enviadas com sucesso
- **errors:** Número de erros

**Logs no Vercel:**
```
📊 Encontrados 3 usuários inativos para engajamento
✅ Mensagem enviada para Bernardo Almeida (8 dias inativo)
✅ Mensagem enviada para João Silva (15 dias inativo)
✅ Mensagem enviada para Maria Santos (30 dias inativo)
```

---

## 🎯 Critérios de Seleção

Usuários são selecionados se:

| Critério | Descrição |
|----------|-----------|
| ✅ Telegram configurado | `telegram_chat_id` não é NULL |
| ✅ Status ativo | `status = 'active'` |
| ✅ Inativo há 7+ dias | `DATEDIFF(NOW(), last_login) >= 7` |
| ✅ Não notificado recentemente | Última notificação há 7+ dias ou nunca |

---

## 🔧 Personalização

### **Alterar Frequência:**

Edite `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/engagement-notifications",
      "schedule": "0 10 * * *"  // ← Mudar aqui
    }
  ]
}
```

**Formatos de schedule (cron):**
- `0 10 * * *` - Diariamente às 10h
- `0 10 * * 1` - Segundas-feiras às 10h
- `0 10,18 * * *` - Diariamente às 10h e 18h
- `0 */6 * * *` - A cada 6 horas

### **Alterar Mensagem:**

Edite a função `generateEngagementMessage()` em `api/engagement-notifications.js`.

---

## 🔍 Monitoramento

### **Ver usuários que serão notificados:**

Execute no banco de dados:
```sql
SELECT 
  name,
  email,
  telegram_chat_id,
  last_login,
  DATEDIFF(NOW(), last_login) as days_inactive,
  last_engagement_notification
FROM users
WHERE 
  telegram_chat_id IS NOT NULL 
  AND status = 'active'
  AND DATEDIFF(NOW(), last_login) >= 7
  AND (last_engagement_notification IS NULL OR DATEDIFF(NOW(), last_engagement_notification) >= 7);
```

---

## ✅ Checklist de Implantação

- [ ] 1. Executar `database-add-engagement-fields.sql`
- [ ] 2. Verificar colunas criadas
- [ ] 3. Fazer commit e push do código
- [ ] 4. Aguardar deploy no Vercel
- [ ] 5. Verificar cron job ativado no Vercel
- [ ] 6. Testar manualmente (opcional)
- [ ] 7. Aguardar primeira execução automática (10h)
- [ ] 8. Verificar logs no Vercel

---

## 🚨 Solução de Problemas

### **Cron não está executando:**
- Verifique se `vercel.json` está na raiz do projeto
- Confirme que o deploy foi bem-sucedido
- Acesse Vercel Dashboard → Settings → Cron Jobs

### **Mensagens não estão sendo enviadas:**
- Verifique se `TELEGRAM_BOT_TOKEN` está configurado
- Confirme que usuários têm `telegram_chat_id` válido
- Veja os logs no Vercel (Runtime Logs)

### **Nenhum usuário encontrado:**
- Confirme que há usuários com `last_login` antigo
- Verifique se `telegram_chat_id` está preenchido
- Execute a query SQL de monitoramento

---

## 📞 Suporte

Se precisar de ajuda:
1. Verifique os logs no Vercel
2. Execute a query SQL de monitoramento
3. Teste manualmente via API

---

**Sistema desenvolvido para engajamento inteligente e sustentável! 🚀⚡**

