# 🔧 REORGANIZAR PROJETOS NO VERCEL

## 🎯 OBJETIVO

- ❌ **Excluir:** `mvb-bot-pro-1` (projeto duplicado/conflitante)
- ✅ **Manter:** `mvb-bot-pro` (projeto correto)
- 🔗 **Linkar:** Este repositório ao projeto `mvb-bot-pro`

---

## 📝 PASSO 1: EXCLUIR PROJETO `mvb-bot-pro-1`

1. **Acesse:** https://vercel.com/marcus-projects-032a47c8/mvb-bot-pro-1/settings

2. **Role até o final da página**

3. **Encontre:** "Delete Project"

4. **Clique em:** "Delete..."

5. **Digite:** `mvb-bot-pro-1` para confirmar

6. **Clique em:** "Delete"

---

## 📝 PASSO 2: ATUALIZAR VARIÁVEIS NO PROJETO `mvb-bot-pro`

1. **Acesse:** https://vercel.com/marcus-projects-032a47c8/mvb-bot-pro/settings/environment-variables

2. **Verifique/Atualize estas variáveis:**

| Variável | Valor |
|----------|-------|
| `DB_HOST` | `srv806.hstgr.io` |
| `DB_USER` | `u950457610_bot_mvb_saas` |
| `DB_PASSWORD` | `Mvb985674%081521` ⚠️ **NOVA SENHA** |
| `DB_NAME` | `u950457610_bot_mvb_saas` |
| `DB_PORT` | `3306` |
| `JWT_SECRET` | `mvb-pro-jwt-secret-2024-super-secret-change-in-production` |
| `ENCRYPTION_KEY` | `mvb-pro-encryption-key-2024-super-secret-change-in-production` |
| `TELEGRAM_BOT_TOKEN` | `7788529453:AAG5jZ16dH7MLBaRy7f4DZWYgT7qcC_FHBk` |

**Para cada variável:**
- Marque: ✅ Production, ✅ Preview, ✅ Development

---

## 📝 PASSO 3: LINKAR REPOSITÓRIO

**No seu PC, execute:**

```bash
cd C:\www\mvb-bot-pro-1
vercel link
```

**Quando perguntar:**

1. **"Set up and deploy?"** → Escolha: **`marcus-projects-032a47c8`** (sua equipe)
2. **"Link to existing project?"** → Digite: **`Y`** (Yes)
3. **"What's the name of your existing project?"** → Digite: **`mvb-bot-pro`**

---

## 📝 PASSO 4: CONFIGURAR DOMÍNIO

1. **Acesse:** https://vercel.com/marcus-projects-032a47c8/mvb-bot-pro/settings/domains

2. **Verifique se está configurado:**
   - `mvb-pro.bragantini.com.br`

3. **Se NÃO estiver:**
   - Clique em **"Add Domain"**
   - Digite: `mvb-pro.bragantini.com.br`
   - Siga as instruções de configuração DNS

---

## 📝 PASSO 5: FAZER DEPLOY

Após linkar o projeto, execute:

```bash
git push origin master
```

O Vercel vai fazer deploy automático para o projeto `mvb-bot-pro`!

---

## ✅ RESULTADO ESPERADO

- ❌ Projeto `mvb-bot-pro-1` excluído
- ✅ Projeto `mvb-bot-pro` ativo e funcionando
- 🔗 Repositório linkado corretamente
- 🌐 Domínio `mvb-pro.bragantini.com.br` apontando para `mvb-bot-pro`
- 🗄️ Banco de dados conectando com senha correta

---

## 🧪 TESTE FINAL

Após o deploy, acesse:

1. **Teste de conexão DB:**
   ```
   https://mvb-pro.bragantini.com.br/api/test-db
   ```
   Deve mostrar: `"status": "✅ SUCESSO"`

2. **Login:**
   ```
   https://mvb-pro.bragantini.com.br
   ```
   Faça login e verifique se carrega tudo corretamente!

---

**Siga os passos na ordem e me avise se tiver alguma dúvida! 🚀**



