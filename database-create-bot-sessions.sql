-- =====================================================
-- TABELA: bot_sessions
-- DESCRIÇÃO: Armazena sessões ativas do bot (Web + Telegram)
-- DATA: 21/10/2025
-- =====================================================

CREATE TABLE IF NOT EXISTS bot_sessions (
  id INT(11) PRIMARY KEY AUTO_INCREMENT,
  user_id INT(11) NOT NULL,
  telegram_chat_id VARCHAR(50) DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  source ENUM('web', 'telegram') DEFAULT 'web',
  
  -- Configurações da sessão
  symbol VARCHAR(20) DEFAULT 'R_10',
  account_type ENUM('demo', 'real') DEFAULT 'demo',
  stake DECIMAL(10,2) DEFAULT 1.00,
  martingale DECIMAL(10,2) DEFAULT 2.00,
  duration INT(11) DEFAULT 15,
  stop_win DECIMAL(10,2) DEFAULT 3.00,
  stop_loss DECIMAL(10,2) DEFAULT -5.00,
  confidence INT(11) DEFAULT 70,
  strategy VARCHAR(50) DEFAULT 'martingale',
  
  -- Estatísticas da sessão
  current_profit DECIMAL(10,2) DEFAULT 0.00,
  trades_count INT(11) DEFAULT 0,
  wins_count INT(11) DEFAULT 0,
  losses_count INT(11) DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_trade_at TIMESTAMP NULL DEFAULT NULL,
  stopped_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Chave estrangeira
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Índices para performance
  INDEX idx_user_active (user_id, is_active),
  INDEX idx_telegram_chat (telegram_chat_id),
  INDEX idx_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABELA: telegram_commands_log
-- DESCRIÇÃO: Log de comandos recebidos do Telegram (debug)
-- =====================================================

CREATE TABLE IF NOT EXISTS telegram_commands_log (
  id INT(11) PRIMARY KEY AUTO_INCREMENT,
  user_id INT(11) DEFAULT NULL,
  telegram_chat_id VARCHAR(50) NOT NULL,
  telegram_username VARCHAR(100) DEFAULT NULL,
  command VARCHAR(50) NOT NULL,
  parameters TEXT DEFAULT NULL,
  response TEXT DEFAULT NULL,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_chat_id (telegram_chat_id),
  INDEX idx_command (command),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- QUERY DE TESTE
-- =====================================================

-- Verificar se tabelas foram criadas
SHOW TABLES LIKE 'bot_sessions';
SHOW TABLES LIKE 'telegram_commands_log';

-- Ver estrutura
DESCRIBE bot_sessions;
DESCRIBE telegram_commands_log;

