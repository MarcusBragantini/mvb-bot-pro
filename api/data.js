const mysql = require('mysql2/promise');

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
          'SELECT settings FROM user_settings WHERE user_id = ?',
          [user_id]
        );

        if (rows.length === 0) {
          return res.status(200).json({ settings: {} });
        }

        const settings = JSON.parse(rows[0].settings || '{}');
        return res.status(200).json({ settings });
      }

      if (req.method === 'POST' || req.method === 'PUT') {
        const { user_id, settings } = req.body;
        
        if (!user_id || !settings) {
          return res.status(400).json({ error: 'user_id e settings são obrigatórios' });
        }

        const settingsJson = JSON.stringify(settings);
        
        await connection.execute(
          `INSERT INTO user_settings (user_id, settings, updated_at) 
           VALUES (?, ?, NOW()) 
           ON DUPLICATE KEY UPDATE 
           settings = VALUES(settings), 
           updated_at = NOW()`,
          [user_id, settingsJson]
        );

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
            WHEN DATEDIFF(expires_at, NOW()) < 0 THEN 'expirada'
            WHEN DATEDIFF(expires_at, NOW()) = 0 THEN 'expira hoje'
            WHEN DATEDIFF(expires_at, NOW()) <= 7 THEN 'expirando'
            WHEN is_active = 1 THEN 'ativa'
            ELSE 'inativa'
          END as status
         FROM licenses 
         WHERE user_id = ? 
         ORDER BY is_active DESC, created_at DESC`,
        [user_id]
      );

      // Adicionar contagem de dispositivos ativos
      for (let license of licenses) {
        const [devices] = await connection.execute(
          'SELECT COUNT(*) as count FROM device_sessions WHERE license_id = ?',
          [license.id]
        );
        license.active_devices = devices[0].count;
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
