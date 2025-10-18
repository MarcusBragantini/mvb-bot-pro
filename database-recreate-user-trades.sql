-- Script SQL para RECRIAR a tabela user_trades (APAGA DADOS EXISTENTES)
-- Execute este script no phpMyAdmin do Hostinger

-- ===== PASSO 1: APAGAR TABELA EXISTENTE =====
DROP TABLE IF EXISTS user_trades;

-- ===== PASSO 2: CRIAR NOVA TABELA =====
CREATE TABLE user_trades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  symbol VARCHAR(50) NOT NULL DEFAULT 'R_10',
  trade_signal VARCHAR(10) NOT NULL DEFAULT 'CALL',
  stake DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
  result VARCHAR(10) NOT NULL DEFAULT 'WIN',
  profit DECIMAL(10, 2) DEFAULT 0.00,
  confidence DECIMAL(5, 2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'completed',
  contract_id VARCHAR(100),
  trade_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_trades (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_symbol (symbol),
  INDEX idx_result (result),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===== PASSO 3: VERIFICAR =====
DESCRIBE user_trades;

SELECT 'Tabela user_trades recriada com sucesso!' AS mensagem;

