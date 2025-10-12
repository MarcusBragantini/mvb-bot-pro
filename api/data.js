const mysql = require('mysql2/promise');
const crypto = require('crypto');

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

// Hostinger Database Configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'srv806.hstgr.io',
  user: process.env.DB_USER || 'u950457610_bot_mvb_saas',
  password: process.env.DB_PASSWORD || 'Mvb985674',
  database: process.env.DB_NAME || 'u950457610_bot_mvb_saas',
  port: process.env.DB_PORT || 3306,
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 60000
};

module.exports = async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;
  let connection;

  try {
    connection = await mysql.createConnection(DB_CONFIG);

    // ===== USER SETTINGS =====
    if (action === 'settings') {
      if (req.method === 'GET') {
        const { user_id } = req.query;
        
        if (!user_id) {
          return res.status(400).json({ error: 'user_id é obrigatório' });
        }

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
      }

      if (req.method === 'POST' || req.method === 'PUT') {
        const { user_id, settings } = req.body;
        
        if (!user_id || !settings) {
          return res.status(400).json({ error: 'user_id e settings são obrigatórios' });
        }

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
      }
    }

    // ===== USER LICENSES =====
    if (action === 'licenses' && req.method === 'GET') {
      const { user_id } = req.query;
      
      if (!user_id) {
        return res.status(400).json({ error: 'user_id é obrigatório' });
      }

      // ✅ RETORNAR LICENÇA MAIS RECENTE (ATIVA OU EXPIRADA)
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
          
          // LOGS DETALHADOS PARA DEBUG
          console.log('🔍 DEBUG - Validação Licença FREE:');
          console.log('  📅 Agora (UTC):', now.toISOString());
          console.log('  🇧🇷 Brasil (UTC-3):', new Date(now.getTime() - (3 * 60 * 60 * 1000)).toISOString());
          console.log('  🎯 Expira (do banco):', license.expires_at);
          console.log('  🎯 Expira (Date):', expiresAt.toISOString());
          console.log('  ⏱️ Minutos restantes:', minutesRemaining);
          console.log('  ✅ Válida?', minutesRemaining > 0);
          
          license.days_remaining = minutesRemaining; // Pode ser negativo se expirada
        }
      }

      return res.status(200).json({ licenses });
    }

    // ===== SETUP DATABASE =====
    if (action === 'setup' && req.method === 'POST') {
      // Criar tabela user_settings
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS user_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          settings JSON,
          deriv_token_demo TEXT,
          deriv_token_real TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_user_settings (user_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // Criar tabela user_sessions
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          session_token VARCHAR(255) NOT NULL,
          device_info VARCHAR(500),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          invalidated_at TIMESTAMP NULL,
          INDEX idx_user_session (user_id, session_token),
          INDEX idx_active_sessions (user_id, is_active),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      return res.status(200).json({ 
        success: true,
        message: 'Tabelas criadas com sucesso',
        tables: ['user_settings', 'user_sessions']
      });
    }

    // ===== BOT PERFORMANCE =====
    if (action === 'performance') {
      if (req.method === 'GET') {
        const { user_id } = req.query;
        
        if (!user_id) {
          return res.status(400).json({ error: 'user_id é obrigatório' });
        }

        const [rows] = await connection.execute(
          'SELECT * FROM bot_performance WHERE user_id = ?',
          [user_id]
        );

        if (rows.length === 0) {
          // Criar registro inicial se não existir
          await connection.execute(
            'INSERT INTO bot_performance (user_id) VALUES (?)',
            [user_id]
          );
          return res.status(200).json({
            total_profit: 0,
            total_trades: 0,
            wins: 0,
            losses: 0,
            win_rate: 0,
            monthly_return: 0,
            last_session_profit: 0,
            last_session_trades: 0
          });
        }

        return res.status(200).json(rows[0]);
      }

      if (req.method === 'POST') {
        const { user_id, performance_data } = req.body;
        
        if (!user_id || !performance_data) {
          return res.status(400).json({ error: 'user_id e performance_data são obrigatórios' });
        }

        const {
          total_profit = 0,
          total_trades = 0,
          wins = 0,
          losses = 0,
          win_rate = 0,
          monthly_return = 0,
          last_session_profit = 0,
          last_session_trades = 0
        } = performance_data;

        await connection.execute(
          `INSERT INTO bot_performance 
           (user_id, total_profit, total_trades, wins, losses, win_rate, monthly_return, last_session_profit, last_session_trades, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()) 
           ON DUPLICATE KEY UPDATE 
           total_profit = VALUES(total_profit),
           total_trades = VALUES(total_trades),
           wins = VALUES(wins),
           losses = VALUES(losses),
           win_rate = VALUES(win_rate),
           monthly_return = VALUES(monthly_return),
           last_session_profit = VALUES(last_session_profit),
           last_session_trades = VALUES(last_session_trades),
           updated_at = NOW()`,
          [user_id, total_profit, total_trades, wins, losses, win_rate, monthly_return, last_session_profit, last_session_trades]
        );

        console.log(`✅ Performance atualizada para usuário ${user_id}`);

        return res.status(200).json({
          success: true,
          message: 'Performance atualizada com sucesso'
        });
      }
    }

    // ===== DERIV BALANCE =====
    if (action === 'deriv_balance') {
      if (req.method === 'GET') {
        const { user_id } = req.query;

        if (!user_id) {
          return res.status(400).json({ error: 'user_id é obrigatório' });
        }

        try {
          // ✅ CORREÇÃO: Verificar se tabela existe antes de usar
          try {
            const [rows] = await connection.execute(`
              SELECT 
                deriv_balance,
                deriv_updated_at
              FROM user_deriv_account 
              WHERE user_id = ?
            `, [user_id]);

            if (rows.length === 0) {
              // Se não há dados, retornar valor padrão
              return res.status(200).json({ 
                balance: "0.00",
                message: "Nenhum saldo da Deriv encontrado. Configure sua conta Deriv."
              });
            }

            return res.status(200).json({ 
              balance: rows[0].deriv_balance,
              updated_at: rows[0].deriv_updated_at
            });
          } catch (tableError) {
            // Se tabela não existe, retornar valor padrão
            console.log('Tabela user_deriv_account não encontrada, retornando valor padrão');
            return res.status(200).json({ 
              balance: "0.00",
              message: "Integração com Deriv não configurada ainda."
            });
          }
        } catch (error) {
          console.error('Erro ao buscar saldo da Deriv:', error);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
      }
    }

    // ===== TRADING HISTORY =====
    if (action === 'trading_history') {
      if (req.method === 'GET') {
        const { user_id } = req.query;

        if (!user_id) {
          return res.status(400).json({ error: 'user_id é obrigatório' });
        }

        try {
          // ✅ CORREÇÃO: Verificar se tabela existe antes de usar
          try {
            const [rows] = await connection.execute(`
              SELECT 
                id,
                trade_type,
                profit,
                created_at,
                status
              FROM user_trades 
              WHERE user_id = ?
              ORDER BY created_at DESC
              LIMIT 1000
            `, [user_id]);

            // Se não há trades, retornar array vazio
            if (rows.length === 0) {
              return res.status(200).json({ 
                trades: [],
                message: "Nenhum trade encontrado. Configure seu histórico de trading."
              });
            }

            // Processar trades para calcular estatísticas
            const trades = rows.map(trade => ({
              id: trade.id,
              type: trade.trade_type,
              profit: parseFloat(trade.profit) || 0,
              created_at: trade.created_at,
              status: trade.status
            }));

            return res.status(200).json({ 
              trades: trades,
              total_trades: trades.length,
              winning_trades: trades.filter(t => t.profit > 0).length,
              total_profit: trades.reduce((sum, t) => sum + t.profit, 0)
            });
          } catch (tableError) {
            // Se tabela não existe, retornar dados vazios
            console.log('Tabela user_trades não encontrada, retornando dados vazios');
            return res.status(200).json({ 
              trades: [],
              message: "Histórico de trading não configurado ainda."
            });
          }
        } catch (error) {
          console.error('Erro ao buscar histórico de trading:', error);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
      }
    }

    // Se nenhuma ação foi processada, retornar erro
    return res.status(400).json({ error: 'Ação inválida' });

  } catch (error) {
    console.error('❌ Erro na API de dados:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error.message 
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};
