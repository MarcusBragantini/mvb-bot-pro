-- Script para adicionar campos de engajamento aos usuários
-- Execute este script no seu banco de dados MySQL

-- 1. Adicionar coluna para armazenar o Telegram Chat ID
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50) DEFAULT NULL COMMENT 'Chat ID do Telegram do usuário';

-- 2. Adicionar coluna para controlar o último login
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login DATETIME DEFAULT NULL COMMENT 'Data do último login do usuário';

-- 3. Adicionar coluna para controlar a última notificação de engajamento
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_engagement_notification DATETIME DEFAULT NULL COMMENT 'Data da última notificação de engajamento enviada';

-- 4. Criar índice para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_telegram_chat_id ON users(telegram_chat_id);

-- 5. Verificar as colunas criadas
SHOW COLUMNS FROM users LIKE '%telegram%';
SHOW COLUMNS FROM users LIKE '%last_%';

SELECT 'Script executado com sucesso!' as status;

