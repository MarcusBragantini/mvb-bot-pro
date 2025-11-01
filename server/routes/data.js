const express = require('express');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

const router = express.Router();

// Chave de criptografia (deve ser mantida em segredo)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'mvb-pro-encryption-key-2024-super-secret-change-in-production';
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_IV_LENGTH = 16;

// Funções de criptografia
function encrypt(text) {
  if (!text) return null;
  
  const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  if (!text) return '';
  
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Erro ao descriptografar:', error);
    return '';
  }
}

// Database Configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bot_mvb_saas',
  port: process.env.DB_PORT || 3306,
  connectionLimit: 5,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Criar pool global
let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG);
    console.log('✅ Connection pool criado');
  }
  return pool;
}

// Middleware para todas as rotas
router.use(async (req, res, next) => {
  try {
    req.dbPool = getPool();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// USER SETTINGS
router.get('/settings', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id é obrigatório' });
    }

    const connection = await req.dbPool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT settings, deriv_token_demo, deriv_token_real FROM user_settings WHERE user_id = ?',
        [user_id]
      );

      if (rows.length === 0) {
        return res.status(200).json({ 
          settings: {},
          deriv_token_demo: '',
          deriv_token_real: ''
        });
      }

      const settings = JSON.parse(rows[0].settings || '{}');
      
      // Descriptografar tokens antes de enviar
      settings.derivTokenDemo = decrypt(rows[0].deriv_token_demo) || '';
      settings.derivTokenReal = decrypt(rows[0].deriv_token_real) || '';
      
      console.log('🔓 Tokens descriptografados para usuário:', {
        user_id,
        hasDemo: !!settings.derivTokenDemo,
        hasReal: !!settings.derivTokenReal
      });
      
      return res.status(200).json({ settings });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const { user_id, settings } = req.body;
    
    if (!user_id || !settings) {
      return res.status(400).json({ error: 'user_id e settings são obrigatórios' });
    }

    const connection = await req.dbPool.getConnection();
    
    try {
      // Extrair tokens das settings
      const derivTokenDemo = settings.derivTokenDemo || null;
      const derivTokenReal = settings.derivTokenReal || null;
      
      // Criptografar tokens antes de salvar
      const encryptedTokenDemo = derivTokenDemo ? encrypt(derivTokenDemo) : null;
      const encryptedTokenReal = derivTokenReal ? encrypt(derivTokenReal) : null;
      
      console.log('🔐 Criptografando tokens para usuário:', {
        user_id,
        hasDemo: !!derivTokenDemo,
        hasReal: !!derivTokenReal,
        demoLength: derivTokenDemo?.length || 0,
        realLength: derivTokenReal?.length || 0
      });
      
      // Remover tokens do objeto settings para salvar apenas configs do bot
      const settingsWithoutTokens = { ...settings };
      delete settingsWithoutTokens.derivTokenDemo;
      delete settingsWithoutTokens.derivTokenReal;
      
      const settingsJson = JSON.stringify(settingsWithoutTokens);
      
      await connection.execute(
        `INSERT INTO user_settings (user_id, settings, deriv_token_demo, deriv_token_real, updated_at) 
         VALUES (?, ?, ?, ?, NOW()) 
         ON DUPLICATE KEY UPDATE 
         settings = VALUES(settings),
         deriv_token_demo = VALUES(deriv_token_demo),
         deriv_token_real = VALUES(deriv_token_real),
         updated_at = NOW()`,
        [user_id, settingsJson, encryptedTokenDemo, encryptedTokenReal]
      );

      console.log(`✅ Configurações salvas para usuário ${user_id} (tokens CRIPTOGRAFADOS no banco)`);

      return res.status(200).json({ 
        message: 'Configurações salvas com sucesso',
        settings 
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Erro ao salvar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// USER LICENSES
router.get('/licenses', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id é obrigatório' });
    }

    const connection = await req.dbPool.getConnection();
    
    try {
      // RETORNAR LICENÇA MAIS RECENTE (ATIVA OU EXPIRADA)
      const [licenses] = await connection.execute(
        `SELECT 
          id,
          license_key,
          license_type,
          expires_at,
          max_devices,
          is_active,
          created_at,
          DATEDIFF(expires_at, NOW()) as days_remaining,
          CASE 
            WHEN expires_at <= NOW() THEN 'expirada'
            WHEN license_type = 'free' AND TIMESTAMPDIFF(MINUTE, NOW(), expires_at) <= 5 THEN 'expirando'
            WHEN DATEDIFF(expires_at, NOW()) = 0 THEN 'expira hoje'
            WHEN DATEDIFF(expires_at, NOW()) <= 7 THEN 'expirando'
            WHEN is_active = 1 THEN 'ativa'
            ELSE 'inativa'
          END as status
         FROM licenses 
         WHERE user_id = ? 
         AND is_active = 1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [user_id]
      );

      // Adicionar contagem de dispositivos ativos e ajustar cálculo de tempo
      for (let license of licenses) {
        const [devices] = await connection.execute(
          'SELECT COUNT(*) as count FROM device_sessions WHERE license_id = ?',
          [license.id]
        );
        license.active_devices = devices[0].count;
        
        // Para licenças "free", calcular minutos restantes (mesmo se expirada)
        if (license.license_type === 'free') {
          const now = new Date();
          const expiresAt = new Date(license.expires_at);
          const minutesRemaining = Math.floor((expiresAt - now) / (1000 * 60));
          
          license.days_remaining = minutesRemaining; // Pode ser negativo se expirada
        }
      }

      return res.status(200).json({ licenses });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Erro ao buscar licenças:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// TELEGRAM TOKEN
router.get('/telegram-token', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id é obrigatório' });
    }

    const connection = await req.dbPool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT telegram_token FROM users WHERE id = ?',
        [user_id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      return res.status(200).json({ 
        token: rows[0].telegram_token || 'Token não configurado'
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Erro ao buscar token do Telegram:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// CHECK ACTIVE SESSION
router.get('/check-active-session', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id é obrigatório' });
    }
    
    const connection = await req.dbPool.getConnection();
    
    try {
      const [sessions] = await connection.execute(
        `SELECT id, source, symbol, account_type, stake, duration, stop_win, stop_loss, 
                current_profit, trades_count, wins_count, losses_count, started_at
         FROM bot_sessions 
         WHERE user_id = ? AND is_active = TRUE
         LIMIT 1`,
        [user_id]
      );
      
      return res.status(200).json({
        has_active_session: sessions.length > 0,
        session: sessions.length > 0 ? sessions[0] : null
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Erro ao verificar sessão:', error);
    res.status(500).json({ 
      error: 'Erro ao verificar sessão',
      details: error.message 
    });
  }
});

module.exports = router;

