const mysql = require('mysql2/promise');

// Hostinger Database Configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'srv806.hstgr.io',
  user: process.env.DB_USER || 'u950457610_bot_mvb_saas',
  password: process.env.DB_PASSWORD || 'Mvb985674',
  database: process.env.DB_NAME || 'u950457610_bot_mvb_saas',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000
};

module.exports = async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    
    if (req.method === 'GET') {
      // Buscar configurações do usuário
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
      res.status(200).json({ settings });

    } else if (req.method === 'POST' || req.method === 'PUT') {
      // Salvar configurações do usuário
      const { user_id, settings } = req.body;
      
      if (!user_id || !settings) {
        return res.status(400).json({ error: 'user_id e settings são obrigatórios' });
      }

      const settingsJson = JSON.stringify(settings);
      
      // Usar INSERT ... ON DUPLICATE KEY UPDATE para MySQL/MariaDB
      await connection.execute(
        `INSERT INTO user_settings (user_id, settings, updated_at) 
         VALUES (?, ?, NOW()) 
         ON DUPLICATE KEY UPDATE 
         settings = VALUES(settings), 
         updated_at = NOW()`,
        [user_id, settingsJson]
      );

      res.status(200).json({ 
        message: 'Configurações salvas com sucesso',
        settings 
      });

    } else {
      res.status(405).json({ error: 'Método não permitido' });
    }

  } catch (error) {
    console.error('Erro na API de configurações:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error.message 
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};
