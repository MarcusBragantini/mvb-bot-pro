-- =====================================================
-- EXECUTAR TODOS OS SQLs DE UMA VEZ
-- Cole este arquivo completo no phpMyAdmin e execute
-- =====================================================

-- 1. ADICIONAR CAMPOS DE ENGAJAMENTO
ALTER TABLE users
ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50) DEFAULT NULL COMMENT 'Chat ID do Telegram do usuário';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login DATETIME DEFAULT NULL COMMENT 'Data do último login do usuário';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_engagement_notification DATETIME DEFAULT NULL COMMENT 'Data da última notificação de engajamento enviada';

CREATE INDEX IF NOT EXISTS idx_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_telegram_chat_id ON users(telegram_chat_id);

-- 2. CRIAR TABELA DE SESSÕES DO BOT
CREATE TABLE IF NOT EXISTS bot_sessions (
  id INT(11) PRIMARY KEY AUTO_INCREMENT,
  user_id INT(11) NOT NULL,
  telegram_chat_id VARCHAR(50) DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  source ENUM('web', 'telegram') DEFAULT 'web',
  
  symbol VARCHAR(20) DEFAULT 'R_10',
  account_type ENUM('demo', 'real') DEFAULT 'demo',
  stake DECIMAL(10,2) DEFAULT 1.00,
  martingale DECIMAL(10,2) DEFAULT 2.00,
  duration INT(11) DEFAULT 15,
  stop_win DECIMAL(10,2) DEFAULT 3.00,
  stop_loss DECIMAL(10,2) DEFAULT -5.00,
  confidence INT(11) DEFAULT 70,
  strategy VARCHAR(50) DEFAULT 'martingale',
  
  current_profit DECIMAL(10,2) DEFAULT 0.00,
  trades_count INT(11) DEFAULT 0,
  wins_count INT(11) DEFAULT 0,
  losses_count INT(11) DEFAULT 0,
  
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_trade_at TIMESTAMP NULL DEFAULT NULL,
  stopped_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_user_active (user_id, is_active),
  INDEX idx_telegram_chat (telegram_chat_id),
  INDEX idx_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. CRIAR TABELA DE LOG DE COMANDOS
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

-- 4. ADICIONAR CAMPOS PARA CONTRATOS PENDENTES
ALTER TABLE bot_sessions
ADD COLUMN IF NOT EXISTS pending_contract_id VARCHAR(50) DEFAULT NULL COMMENT 'ID do contrato aguardando resultado';

ALTER TABLE bot_sessions
ADD COLUMN IF NOT EXISTS pending_contract_open_time TIMESTAMP NULL DEFAULT NULL COMMENT 'Horário de abertura do contrato pendente';

ALTER TABLE bot_sessions
ADD COLUMN IF NOT EXISTS pending_contract_signal VARCHAR(10) DEFAULT NULL COMMENT 'Sinal do contrato pendente (CALL/PUT)';

CREATE INDEX IF NOT EXISTS idx_pending_contract ON bot_sessions(pending_contract_id);

-- 5. CRIAR TABELA DO WIZARD
CREATE TABLE IF NOT EXISTS telegram_wizard_state (
  id INT(11) PRIMARY KEY AUTO_INCREMENT,
  user_id INT(11) NOT NULL UNIQUE,
  config TEXT NOT NULL COMMENT 'Configurações em JSON',
  step VARCHAR(50) DEFAULT 'start' COMMENT 'Etapa atual do wizard',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- FIM - Todas as tabelas criadas!
-- =====================================================

-- VERIFICAR TABELAS CRIADAS:
SHOW TABLES LIKE 'bot_sessions';
SHOW TABLES LIKE 'telegram_commands_log';
SHOW TABLES LIKE 'telegram_wizard_state';

-- VER ESTRUTURA:
DESCRIBE bot_sessions;
DESCRIBE telegram_wizard_state;

