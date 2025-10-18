-- Script para LIMPAR dados antigos incompletos da tabela user_trades
-- Execute este script no phpMyAdmin

-- ===== OPÇÃO 1: APAGAR APENAS TRADES SEM SYMBOL =====
-- (Recomendado - mantém trades completos)
DELETE FROM user_trades WHERE symbol IS NULL OR symbol = '';

-- ===== OPÇÃO 2: APAGAR TODOS OS TRADES E COMEÇAR LIMPO =====
-- (Descomente a linha abaixo se quiser apagar TUDO)
-- DELETE FROM user_trades;

-- ===== OPÇÃO 3: APAGAR TRADES DE UM USUÁRIO ESPECÍFICO =====
-- (Descomente e substitua USER_ID)
-- DELETE FROM user_trades WHERE user_id = 7;

-- Verificar o que sobrou
SELECT * FROM user_trades ORDER BY created_at DESC LIMIT 10;

-- Contar trades
SELECT COUNT(*) as total_trades FROM user_trades;

