-- Script SQL para criar tabela user_trades
-- Execute este script no phpMyAdmin do Hostinger

-- Criar tabela user_trades (histórico de operações)
CREATE TABLE IF NOT EXISTS user_trades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  symbol VARCHAR(50) NOT NULL COMMENT 'Ativo operado (R_10, EUR/USD, etc)',
  trade_type VARCHAR(10) NOT NULL COMMENT 'CALL ou PUT',
  stake DECIMAL(10, 2) NOT NULL COMMENT 'Valor de entrada',
  result VARCHAR(10) NOT NULL COMMENT 'WIN ou LOSS',
  profit DECIMAL(10, 2) DEFAULT 0 COMMENT 'Lucro ou prejuízo',
  confidence DECIMAL(5, 2) DEFAULT 0 COMMENT 'Confiança do sinal (%)',
  status VARCHAR(20) DEFAULT 'completed' COMMENT 'Status da operação',
  contract_id VARCHAR(100) COMMENT 'ID do contrato na Deriv (opcional)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data e hora da operação',
  
  INDEX idx_user_trades (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_symbol (symbol),
  INDEX idx_result (result),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Histórico de operações de trading';

-- Verificar se a tabela foi criada
SELECT 'Tabela user_trades criada com sucesso!' AS status;

-- Ver estrutura da tabela
DESCRIBE user_trades;

-- Exemplos de consultas úteis:

-- 1. Ver todos os trades de um usuário
-- SELECT * FROM user_trades WHERE user_id = 1 ORDER BY created_at DESC LIMIT 100;

-- 2. Calcular estatísticas de um usuário
-- SELECT 
--   COUNT(*) as total_trades,
--   SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as wins,
--   SUM(CASE WHEN result = 'LOSS' THEN 1 ELSE 0 END) as losses,
--   ROUND(SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as win_rate,
--   SUM(profit) as total_profit
-- FROM user_trades 
-- WHERE user_id = 1;

-- 3. Ver performance por ativo
-- SELECT 
--   symbol,
--   COUNT(*) as trades,
--   SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as wins,
--   ROUND(SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as win_rate,
--   SUM(profit) as profit
-- FROM user_trades 
-- WHERE user_id = 1
-- GROUP BY symbol;

-- 4. Trades dos últimos 7 dias
-- SELECT * FROM user_trades 
-- WHERE user_id = 1 
-- AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
-- ORDER BY created_at DESC;

