-- Script SQL para ATUALIZAR a tabela user_trades existente
-- Execute este script no phpMyAdmin do Hostinger

-- ===== OPÇÃO 1: ATUALIZAR TABELA EXISTENTE (Mantém dados existentes) =====

-- Verificar se colunas existem antes de adicionar
-- Execute este bloco completo de uma vez

-- Adicionar symbol
ALTER TABLE user_trades ADD COLUMN symbol VARCHAR(50) DEFAULT 'R_10' COMMENT 'Ativo operado' AFTER user_id;

-- Renomear trade_type para signal (se necessário) ou adicionar signal
ALTER TABLE user_trades ADD COLUMN signal VARCHAR(10) DEFAULT 'CALL' COMMENT 'CALL ou PUT' AFTER symbol;

-- Copiar dados de trade_type para signal
UPDATE user_trades SET signal = trade_type WHERE trade_type IS NOT NULL;

-- Adicionar stake
ALTER TABLE user_trades ADD COLUMN stake DECIMAL(10, 2) DEFAULT 1.00 COMMENT 'Valor de entrada' AFTER signal;

-- Adicionar result
ALTER TABLE user_trades ADD COLUMN result VARCHAR(10) DEFAULT 'WIN' COMMENT 'WIN ou LOSS' AFTER stake;

-- Atualizar profit
ALTER TABLE user_trades MODIFY COLUMN profit DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Lucro ou prejuízo';

-- Adicionar confidence
ALTER TABLE user_trades ADD COLUMN confidence DECIMAL(5, 2) DEFAULT 0.00 COMMENT 'Confiança (%)' AFTER profit;

-- Adicionar contract_id
ALTER TABLE user_trades ADD COLUMN contract_id VARCHAR(100) COMMENT 'ID do contrato Deriv' AFTER confidence;

-- Adicionar índices (ignora se já existirem)
ALTER TABLE user_trades ADD INDEX idx_symbol (symbol);
ALTER TABLE user_trades ADD INDEX idx_result (result);
ALTER TABLE user_trades ADD INDEX idx_created_at (created_at);

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

