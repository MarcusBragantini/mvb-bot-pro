-- =====================================================
-- TABELA: telegram_wizard_state
-- DESCRIÇÃO: Armazena estado temporário do wizard de configuração
-- =====================================================

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

