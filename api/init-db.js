const { initializeDatabase } = require('./lib/database.js');

module.exports = async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('🚀 Inicializando banco de dados...');
    await initializeDatabase();
    
    res.status(200).json({ 
      message: 'Banco de dados inicializado com sucesso!',
      tables: [
        'users',
        'licenses', 
        'device_sessions',
        'user_settings'
      ]
    });
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
    res.status(500).json({ 
      error: 'Erro ao inicializar banco de dados', 
      details: error.message 
    });
  }
};
