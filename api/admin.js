const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

// Database configuration
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

// Middleware para verificar se é admin
const verifyAdmin = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'Token não fornecido' };
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'admin') {
      return { valid: false, error: 'Acesso negado: apenas administradores' };
    }

    return { valid: true, userId: decoded.id };
  } catch (error) {
    return { valid: false, error: 'Token inválido' };
  }
};

module.exports = async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verificar se é admin
  const auth = verifyAdmin(req);
  if (!auth.valid) {
    return res.status(403).json({ error: auth.error });
  }

  const path = req.url.split('?')[0].replace('/api/admin', '');
  let connection;

  try {
    connection = await mysql.createConnection(DB_CONFIG);

    // ===== GET DASHBOARD STATS =====
    if (path === '/dashboard' && req.method === 'GET') {
      // Total de usuários
      const [usersCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
      
      // Total de licenças
      const [licensesCount] = await connection.execute('SELECT COUNT(*) as count FROM licenses');
      
      // Licenças ativas (mais recente por usuário)
      const [activeLicensesCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM (
          SELECT l1.user_id
          FROM licenses l1
          WHERE l1.id = (
            SELECT l2.id 
            FROM licenses l2 
            WHERE l2.user_id = l1.user_id 
            ORDER BY l2.created_at DESC 
            LIMIT 1
          ) AND l1.is_active = 1 AND l1.expires_at > NOW()
        ) as active_licenses
      `);
      
      // Licenças expiradas (mais recente por usuário)
      const [expiredLicensesCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM (
          SELECT l1.user_id
          FROM licenses l1
          WHERE l1.id = (
            SELECT l2.id 
            FROM licenses l2 
            WHERE l2.user_id = l1.user_id 
            ORDER BY l2.created_at DESC 
            LIMIT 1
          ) AND l1.expires_at <= NOW()
        ) as expired_licenses
      `);

      // Usuários recentes
      const [recentUsers] = await connection.execute(`
        SELECT 
          u.id,
          u.email,
          u.name,
          u.role,
          u.status,
          u.created_at,
          COUNT(l.id) as license_count,
          MAX(l.expires_at) as latest_license_expiry
        FROM users u
        LEFT JOIN licenses l ON u.id = l.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT 5
      `);

      const stats = {
        totalUsers: usersCount[0].count,
        totalLicenses: licensesCount[0].count,
        activeLicenses: activeLicensesCount[0].count,
        expiredLicenses: expiredLicensesCount[0].count
      };

      return res.status(200).json({
        stats,
        totalUsers: stats.totalUsers,
        activeLicenses: stats.activeLicenses,
        totalRevenue: 0, // Pode implementar cálculo de receita depois
        recentUsers
      });
    }

    // ===== GET ALL USERS =====
    if (path === '/users' && req.method === 'GET') {
      const [users] = await connection.execute(`
        SELECT 
          u.id,
          u.email,
          u.name,
          u.role,
          u.status,
          u.created_at,
          l.id as license_id,
          l.license_key,
          l.license_type,
          l.expires_at,
          l.is_active,
          DATEDIFF(l.expires_at, NOW()) as days_remaining,
          CASE 
            WHEN l.id IS NULL THEN 'sem_licenca'
            WHEN l.expires_at <= NOW() THEN 'expirada'
            WHEN DATEDIFF(l.expires_at, NOW()) <= 7 THEN 'expirando'
            ELSE 'ativa'
          END as license_status
        FROM users u
        LEFT JOIN (
          SELECT l1.*
          FROM licenses l1
          WHERE l1.id = (
            SELECT l2.id 
            FROM licenses l2 
            WHERE l2.user_id = l1.user_id 
            ORDER BY l2.created_at DESC 
            LIMIT 1
          )
        ) l ON u.id = l.user_id
        ORDER BY u.created_at DESC
      `);

      return res.status(200).json(users);
    }

    // ===== UPDATE USER STATUS =====
    if (path.startsWith('/users/') && path.endsWith('/status') && req.method === 'PUT') {
      const userId = path.split('/')[2];
      const { status } = req.body;

      if (!status || !['active', 'suspended', 'expired'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
      }

      await connection.execute(
        'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, userId]
      );

      return res.status(200).json({ message: 'Status atualizado com sucesso' });
    }

    // ===== GET ALL LICENSES =====
    if (path === '/licenses' && req.method === 'GET') {
      // ✅ MOSTRAR APENAS LICENÇAS ATIVAS E NÃO EXPIRADAS
      const [licenses] = await connection.execute(`
        SELECT 
          l.*,
          u.email,
          u.name,
          DATEDIFF(l.expires_at, NOW()) as days_remaining,
          (SELECT COUNT(*) FROM device_sessions WHERE license_id = l.id) as active_devices
        FROM licenses l
        JOIN users u ON l.user_id = u.id
        WHERE l.is_active = 1 AND l.expires_at > NOW()
        ORDER BY l.created_at DESC
      `);

      return res.status(200).json(licenses);
    }

    // ===== LIMPAR TODAS AS LICENÇAS EXPIRADAS =====
    if (path === '/licenses/cleanup' && req.method === 'POST') {
      const [result] = await connection.execute(`
        UPDATE licenses 
        SET is_active = 0, updated_at = NOW() 
        WHERE expires_at <= NOW() OR is_active = 0
      `);

      console.log(`🗑️ ${result.affectedRows} licenças expiradas foram desativadas`);

      return res.status(200).json({ 
        message: 'Licenças expiradas removidas com sucesso',
        count: result.affectedRows 
      });
    }

    // ===== CREATE LICENSE =====
    if (path === '/licenses' && req.method === 'POST') {
      const { user_id, license_type, duration_days, max_devices } = req.body;

      if (!user_id || !license_type || !duration_days) {
        return res.status(400).json({ error: 'Dados incompletos' });
      }

      // Gerar chave de licença única
      const generateLicenseKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let key = '';
        for (let i = 0; i < 4; i++) {
          let segment = '';
          for (let j = 0; j < 4; j++) {
            segment += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          key += segment;
          if (i < 3) key += '-';
        }
        return key;
      };

      // ✅ REMOVER TODAS AS LICENÇAS ANTERIORES DO USUÁRIO (1 USUÁRIO = 1 LICENÇA)
      await connection.execute(
        `DELETE FROM licenses WHERE user_id = ?`,
        [user_id]
      );
      
      console.log(`🗑️ Todas as licenças anteriores do usuário ${user_id} foram REMOVIDAS`);

      const licenseKey = generateLicenseKey();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(duration_days));

      const [result] = await connection.execute(
        `INSERT INTO licenses (user_id, license_key, license_type, expires_at, max_devices, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [user_id, licenseKey, license_type, expiresAt, max_devices || 1]
      );

      const [newLicense] = await connection.execute(
        `SELECT 
          l.*,
          u.email,
          u.name,
          DATEDIFF(l.expires_at, NOW()) as days_remaining,
          0 as active_devices
        FROM licenses l
        JOIN users u ON l.user_id = u.id
        WHERE l.id = ?`,
        [result.insertId]
      );

      console.log(`✅ Admin criou licença: ${licenseKey} para usuário ${user_id}`);

      return res.status(201).json(newLicense[0]);
    }

    // ===== DEACTIVATE LICENSE =====
    if (path.match(/^\/licenses\/\d+$/) && req.method === 'DELETE') {
      const licenseId = path.split('/')[2];

      await connection.execute(
        'UPDATE licenses SET is_active = 0, updated_at = NOW() WHERE id = ?',
        [licenseId]
      );

      console.log(`✅ Admin desativou licença ID: ${licenseId}`);

      return res.status(200).json({ message: 'Licença desativada com sucesso' });
    }

    // ===== EXTEND LICENSE =====
    if (path.match(/^\/licenses\/\d+\/extend$/) && req.method === 'PUT') {
      const licenseId = path.split('/')[2];
      const { additional_days } = req.body;

      if (!additional_days || additional_days < 1) {
        return res.status(400).json({ error: 'Número de dias inválido' });
      }

      // Buscar licença atual
      const [currentLicense] = await connection.execute(
        'SELECT expires_at FROM licenses WHERE id = ?',
        [licenseId]
      );

      if (currentLicense.length === 0) {
        return res.status(404).json({ error: 'Licença não encontrada' });
      }

      // Calcular nova data de expiração
      const currentExpiry = new Date(currentLicense[0].expires_at);
      const now = new Date();
      const baseDate = currentExpiry > now ? currentExpiry : now;
      
      baseDate.setDate(baseDate.getDate() + parseInt(additional_days));

      await connection.execute(
        'UPDATE licenses SET expires_at = ?, updated_at = NOW() WHERE id = ?',
        [baseDate, licenseId]
      );

      const [updatedLicense] = await connection.execute(
        `SELECT 
          l.*,
          u.email,
          u.name,
          DATEDIFF(l.expires_at, NOW()) as days_remaining,
          (SELECT COUNT(*) FROM device_sessions WHERE license_id = l.id) as active_devices
        FROM licenses l
        JOIN users u ON l.user_id = u.id
        WHERE l.id = ?`,
        [licenseId]
      );

      console.log(`✅ Admin estendeu licença ID ${licenseId} por ${additional_days} dias`);

      return res.status(200).json(updatedLicense[0]);
    }

    return res.status(404).json({ error: 'Rota não encontrada' });

  } catch (error) {
    console.error('❌ Erro na API admin:', error);
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

