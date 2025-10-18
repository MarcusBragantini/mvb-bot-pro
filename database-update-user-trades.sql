-- Script SQL para ATUALIZAR a tabela user_trades existente
-- Execute este script no phpMyAdmin do Hostinger

-- ===== OPÇÃO 1: ATUALIZAR TABELA EXISTENTE (Mantém dados existentes) =====

-- Adicionar campos faltantes
ALTER TABLE user_trades 
ADD COLUMN IF NOT EXISTS symbol VARCHAR(50) DEFAULT 'R_10' COMMENT 'Ativo operado' AFTER user_id;

ALTER TABLE user_trades 
ADD COLUMN IF NOT EXISTS signal VARCHAR(10) DEFAULT 'CALL' COMMENT 'CALL ou PUT' AFTER symbol;

ALTER TABLE user_trades 
ADD COLUMN IF NOT EXISTS stake DECIMAL(10, 2) DEFAULT 1.00 COMMENT 'Valor de entrada' AFTER signal;

ALTER TABLE user_trades 
ADD COLUMN IF NOT EXISTS result VARCHAR(10) DEFAULT 'WIN' COMMENT 'WIN ou LOSS' AFTER stake;

ALTER TABLE user_trades 
MODIFY COLUMN profit DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Lucro ou prejuízo';

ALTER TABLE user_trades 
ADD COLUMN IF NOT EXISTS confidence DECIMAL(5, 2) DEFAULT 0.00 COMMENT 'Confiança (%)' AFTER profit;

ALTER TABLE user_trades 
ADD COLUMN IF NOT EXISTS contract_id VARCHAR(100) COMMENT 'ID do contrato Deriv' AFTER confidence;

-- Atualizar coluna trade_type (já existe mas pode estar vazia)
UPDATE user_trades SET trade_type = 'CALL' WHERE trade_type IS NULL OR trade_type = '';

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_symbol ON user_trades(symbol);
CREATE INDEX IF NOT EXISTS idx_result ON user_trades(result);
CREATE INDEX IF NOT EXISTS idx_created_at ON user_trades(created_at);

-- Verificar estrutura atualizada
DESCRIBE user_trades;

SELECT 'Tabela user_trades atualizada com sucesso!' AS status;


-- ===== OPÇÃO 2: RECRIAR TABELA DO ZERO (APAGA DADOS EXISTENTES) =====
-- ⚠️ CUIDADO: Isso vai APAGAR TODOS os dados da tabela!
-- ⚠️ Descomente as linhas abaixo APENAS se quiser começar do zero

-- DROP TABLE IF EXISTS user_trades;
-- 
-- CREATE TABLE user_trades (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   user_id INT NOT NULL,
--   symbol VARCHAR(50) NOT NULL DEFAULT 'R_10' COMMENT 'Ativo operado (R_10, EUR/USD, etc)',
--   signal VARCHAR(10) NOT NULL DEFAULT 'CALL' COMMENT 'CALL ou PUT',
--   stake DECIMAL(10, 2) NOT NULL DEFAULT 1.00 COMMENT 'Valor de entrada',
--   result VARCHAR(10) NOT NULL DEFAULT 'WIN' COMMENT 'WIN ou LOSS',
--   profit DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Lucro ou prejuízo',
--   confidence DECIMAL(5, 2) DEFAULT 0.00 COMMENT 'Confiança do sinal (%)',
--   status VARCHAR(20) DEFAULT 'completed' COMMENT 'Status da operação',
--   contract_id VARCHAR(100) COMMENT 'ID do contrato na Deriv (opcional)',
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data e hora da operação',
--   
--   INDEX idx_user_trades (user_id),
--   INDEX idx_created_at (created_at),
--   INDEX idx_symbol (symbol),
--   INDEX idx_result (result),
--   
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Histórico de operações de trading';
-- 
-- SELECT 'Tabela user_trades recriada com sucesso!' AS status;


-- ===== VERIFICAÇÕES =====

-- Ver todos os trades
SELECT * FROM user_trades ORDER BY created_at DESC LIMIT 10;

-- Contar trades por usuário
SELECT 
  user_id, 
  COUNT(*) as total_trades,
  SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as wins,
  SUM(profit) as total_profit
FROM user_trades 
GROUP BY user_id;

