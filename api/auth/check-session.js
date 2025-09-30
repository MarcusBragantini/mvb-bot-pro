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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);

    if (req.method === 'POST') {
      // Criar/Atualizar sessão e invalidar outras
      const { user_id, session_token, device_info } = req.body;

      if (!user_id || !session_token) {
        return res.status(400).json({ error: 'user_id e session_token são obrigatórios' });
      }

      // Invalidar todas as sessões anteriores deste usuário
      await connection.execute(
        'UPDATE user_sessions SET is_active = 0, invalidated_at = NOW() WHERE user_id = ? AND is_active = 1',
        [user_id]
      );

      // Criar nova sessão
      await connection.execute(
        `INSERT INTO user_sessions (user_id, session_token, device_info, is_active, created_at, last_activity)
         VALUES (?, ?, ?, 1, NOW(), NOW())`,
        [user_id, session_token, device_info || 'Unknown']
      );

      console.log(`✅ Nova sessão criada para usuário ${user_id}, sessões antigas invalidadas`);

      res.status(200).json({ 
        success: true,
        message: 'Sessão criada com sucesso',
        session_token 
      });

    } else if (req.method === 'GET') {
      // Verificar se sessão é válida
      const { user_id, session_token } = req.query;

      if (!user_id || !session_token) {
        return res.status(400).json({ error: 'user_id e session_token são obrigatórios' });
      }

      const [rows] = await connection.execute(
        `SELECT id, is_active, created_at, last_activity 
         FROM user_sessions 
         WHERE user_id = ? AND session_token = ? AND is_active = 1`,
        [user_id, session_token]
      );

      if (rows.length === 0) {
        return res.status(401).json({ 
          valid: false, 
          message: 'Sessão inválida ou expirada. Você foi desconectado porque entrou em outro dispositivo.' 
        });
      }

      // Atualizar última atividade
      await connection.execute(
        'UPDATE user_sessions SET last_activity = NOW() WHERE id = ?',
        [rows[0].id]
      );

      res.status(200).json({ 
        valid: true, 
        message: 'Sessão válida',
        session: rows[0]
      });

    } else {
      res.status(405).json({ error: 'Método não permitido' });
    }

  } catch (error) {
    console.error('❌ Erro na API de sessões:', error);
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
