# 🔐 ATUALIZAR VARIÁVEL DE AMBIENTE NO VERCEL

## ⚠️ IMPORTANTE

A senha do banco de dados foi alterada de `Mvb985674` para `Mvb985674%081521`.

---

## 📝 PASSO A PASSO

1. **Acesse:** https://vercel.com/marcus-projects-032a47c8/mvb-bot-pro-1/settings/environment-variables

2. **Localize a variável:** `DB_PASSWORD`

3. **Clique em:** "Edit" (ícone de lápis)

4. **Altere o valor para:** `Mvb985674%081521`

5. **Marque todos os ambientes:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

6. **Clique em:** "Save"

---

## 🚀 APÓS SALVAR

O Vercel vai automaticamente fazer **redeploy** quando o limite de tempo acabar.

**OU** você pode forçar um redeploy manualmente:
1. Vá em: **Deployments**
2. Clique nos **3 pontos** do último deploy
3. Clique em **"Redeploy"**

---

## ✅ CONFIRMAÇÃO

Após o deploy, teste acessando:
- `https://mvb-pro.bragantini.com.br/api/test-db`

Deve mostrar:
```json
{
  "tests": [
    {
      "name": "Conexão ao Banco",
      "status": "✅ SUCESSO"
    }
  ]
}
```

---

**Problema:** Caracter `#` na senha original (`Mvb985674#`) estava sendo interpretado como comentário em algumas configurações, causando erro de autenticação.

**Solução:** Nova senha sem caracteres problemáticos: `Mvb985674%081521`



