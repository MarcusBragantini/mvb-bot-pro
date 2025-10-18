-- Script para adicionar campo account_type na tabela user_trades
-- Execute este script no seu banco de dados MySQL

-- 1. Adicionar coluna account_type
ALTER TABLE user_trades 
ADD COLUMN IF NOT EXISTS account_type VARCHAR(10) DEFAULT 'demo' COMMENT 'Tipo de conta: real ou demo';

-- 2. Criar índice para melhorar performance de filtros
CREATE INDEX IF NOT EXISTS idx_account_type ON user_trades(account_type);

-- 3. Atualizar trades existentes (opcional - define todos como demo)
-- Descomente a linha abaixo se quiser atualizar os trades antigos
-- UPDATE user_trades SET account_type = 'demo' WHERE account_type IS NULL;

-- 4. Verificar a coluna criada
SHOW COLUMNS FROM user_trades LIKE 'account_type';

SELECT 'Campo account_type adicionado com sucesso!' as status;

