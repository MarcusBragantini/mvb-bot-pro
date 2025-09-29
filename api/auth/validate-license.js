const { openDb } = require('../lib/database.js');

module.exports = async function handler(req, res) {
  // Configure CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { license_key, device_fingerprint } = req.body;

    if (!license_key || !device_fingerprint) {
      return res.status(400).json({ error: 'Chave de licença e fingerprint do dispositivo são obrigatórios' });
    }

    const db = await openDb();
    
    // Find license with user info
    const license = await db.get(`
      SELECT l.*, u.name, u.email 
      FROM licenses l
      JOIN users u ON l.user_id = u.id
      WHERE l.license_key = ? AND l.is_active = 1
    `, [license_key]);

    if (!license) {
      return res.status(404).json({ 
        valid: false, 
        message: 'Licença não encontrada ou inativa' 
      });
    }

    // Check if license is expired
    const now = new Date();
    const expiresAt = new Date(license.expires_at);
    
    if (now > expiresAt) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Licença expirada' 
      });
    }

    // Check device limit
    const deviceCount = await db.get(
      'SELECT COUNT(*) as count FROM device_sessions WHERE license_id = ? AND is_active = 1',
      [license.id]
    );

    if (deviceCount.count >= license.max_devices) {
      // Check if this device is already registered
      const existingDevice = await db.get(
        'SELECT * FROM device_sessions WHERE license_id = ? AND device_fingerprint = ? AND is_active = 1',
        [license.id, device_fingerprint]
      );

      if (!existingDevice) {
        return res.status(400).json({ 
          valid: false, 
          message: 'Limite de dispositivos atingido' 
        });
      }
    } else {
      // Register new device
      await db.run(
        `INSERT OR REPLACE INTO device_sessions 
         (license_id, device_fingerprint, last_seen, is_active, created_at)
         VALUES (?, ?, datetime('now'), 1, datetime('now'))`,
        [license.id, device_fingerprint]
      );
    }

    // Update last seen
    await db.run(
      'UPDATE device_sessions SET last_seen = datetime(\'now\') WHERE license_id = ? AND device_fingerprint = ?',
      [license.id, device_fingerprint]
    );

    // Calculate days remaining
    const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    const licenseData = {
      id: license.id,
      user_id: license.user_id,
      license_key: license.license_key,
      license_type: license.license_type,
      expires_at: license.expires_at,
      max_devices: license.max_devices,
      is_active: license.is_active,
      email: license.email,
      name: license.name,
      active_devices: deviceCount.count,
      days_remaining: daysRemaining
    };

    res.status(200).json({
      valid: true,
      license: licenseData,
      message: 'Licença válida'
    });

  } catch (error) {
    console.error('License validation error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}