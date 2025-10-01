-- SQL para adicionar colunas de token na tabela user_settings
-- Execute este script no phpMyAdmin do Hostinger

-- Adicionar coluna deriv_token_demo
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS deriv_token_demo TEXT AFTER settings;

-- Adicionar coluna deriv_token_real
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS deriv_token_real TEXT AFTER deriv_token_demo;

-- Verificar estrutura da tabela
DESCRIBE user_settings;

SELECT 'Colunas de token adicionadas com sucesso!' AS status;
