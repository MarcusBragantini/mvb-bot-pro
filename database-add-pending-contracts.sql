-- =====================================================
-- ADICIONAR CAMPO PARA RASTREAR CONTRATOS PENDENTES
-- =====================================================

ALTER TABLE bot_sessions
ADD COLUMN IF NOT EXISTS pending_contract_id VARCHAR(50) DEFAULT NULL COMMENT 'ID do contrato aguardando resultado';

ALTER TABLE bot_sessions
ADD COLUMN IF NOT EXISTS pending_contract_open_time TIMESTAMP NULL DEFAULT NULL COMMENT 'Horário de abertura do contrato pendente';

ALTER TABLE bot_sessions
ADD COLUMN IF NOT EXISTS pending_contract_signal VARCHAR(10) DEFAULT NULL COMMENT 'Sinal do contrato pendente (CALL/PUT)';

-- Índice para buscar contratos pendentes
CREATE INDEX IF NOT EXISTS idx_pending_contract ON bot_sessions(pending_contract_id);

