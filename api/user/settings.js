const { openDb } = require('../lib/database.js');

module.exports = async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = await openDb();
    
    if (req.method === 'GET') {
      // Buscar configurações do usuário
      const { user_id } = req.query;
      
      if (!user_id) {
        return res.status(400).json({ error: 'user_id é obrigatório' });
      }

      const [rows] = await db.execute(
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
      await db.execute(
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
  }
};
