const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

const JWT_SECRET = process.env.JWT_SECRET || 'mvb-bot-pro-secret-key-2024';

module.exports = async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;
  let connection;

  try {
    connection = await mysql.createConnection(DB_CONFIG);

    // ===== REGISTER =====
    if (action === 'register' && req.method === 'POST') {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
      }

      // Verificar se usuário já existe
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 12);

      // Inserir usuário
      await connection.execute(
        'INSERT INTO users (name, email, password, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [name, email, hashedPassword, 'user', 'active']
      );

      return res.status(201).json({ message: 'Usuário criado com sucesso' });
    }

    // ===== LOGIN =====
    if (action === 'login' && req.method === 'POST') {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      // Buscar usuário
      const [users] = await connection.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const user = users[0];

      // Verificar senha
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Gerar token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }

    // ===== VALIDATE LICENSE =====
    if (action === 'validate-license' && req.method === 'POST') {
      const { license_key, device_fingerprint } = req.body;

      if (!license_key) {
        return res.status(400).json({ error: 'Chave de licença é obrigatória' });
      }

      // Buscar licença
      const [licenses] = await connection.execute(
        'SELECT * FROM licenses WHERE license_key = ? AND is_active = 1',
        [license_key]
      );

      if (licenses.length === 0) {
        return res.status(404).json({ 
          valid: false, 
          message: 'Licença não encontrada ou inativa' 
        });
      }

      const license = licenses[0];

      // Verificar expiração
      if (new Date(license.expires_at) < new Date()) {
        return res.status(403).json({ 
          valid: false, 
          message: 'Licença expirada' 
        });
      }

      // Verificar dispositivos se device_fingerprint fornecido
      if (device_fingerprint) {
        const [sessions] = await connection.execute(
          'SELECT COUNT(*) as count FROM device_sessions WHERE license_id = ?',
          [license.id]
        );

        if (sessions[0].count >= license.max_devices) {
          const [existingDevice] = await connection.execute(
            'SELECT id FROM device_sessions WHERE license_id = ? AND device_fingerprint = ?',
            [license.id, device_fingerprint]
          );

          if (existingDevice.length === 0) {
            return res.status(403).json({ 
              valid: false, 
              message: `Limite de ${license.max_devices} dispositivo(s) atingido` 
            });
          }
        }

        // Registrar/atualizar dispositivo
        await connection.execute(
          `INSERT INTO device_sessions (license_id, device_fingerprint, last_active, created_at)
           VALUES (?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE last_active = NOW()`,
          [license.id, device_fingerprint]
        );
      }

      return res.status(200).json({
        valid: true,
        license: {
          id: license.id,
          license_key: license.license_key,
          license_type: license.license_type,
          expires_at: license.expires_at,
          max_devices: license.max_devices
        }
      });
    }

    // ===== CHECK SESSION =====
    if (action === 'check-session') {
      if (req.method === 'POST') {
        const { user_id, session_token, device_info } = req.body;

        if (!user_id || !session_token) {
          return res.status(400).json({ error: 'user_id e session_token são obrigatórios' });
        }

        // Invalidar sessões antigas
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

        return res.status(200).json({ 
          success: true,
          message: 'Sessão criada com sucesso',
          session_token 
        });
      }

      if (req.method === 'GET') {
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
            message: 'Sessão inválida ou expirada' 
          });
        }

        // Atualizar última atividade
        await connection.execute(
          'UPDATE user_sessions SET last_activity = NOW() WHERE id = ?',
          [rows[0].id]
        );

        return res.status(200).json({ 
          valid: true, 
          message: 'Sessão válida',
          session: rows[0]
        });
      }
    }

    return res.status(400).json({ error: 'Ação inválida' });

  } catch (error) {
    console.error('❌ Erro na API de autenticação:', error);
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
