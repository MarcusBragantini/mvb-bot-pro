// API de teste de conexão com banco de dados
const mysql = require('mysql2/promise');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const testResults = {
    timestamp: new Date().toISOString(),
    vercel_ip: req.headers['x-forwarded-for'] || 'unknown',
    tests: []
  };

  // Teste 1: Verificar variáveis de ambiente
  testResults.tests.push({
    name: 'Variáveis de Ambiente',
    DB_HOST: process.env.DB_HOST || 'srv806.hstgr.io',
    DB_USER: process.env.DB_USER || 'u950457610_bot_mvb_saas',
    DB_NAME: process.env.DB_NAME || 'u950457610_bot_mvb_saas',
    DB_PORT: process.env.DB_PORT || 3306,
    has_password: !!(process.env.DB_PASSWORD || 'Mvb985674')
  });

  // Teste 2: Tentar conectar ao banco
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'srv806.hstgr.io',
      user: process.env.DB_USER || 'u950457610_bot_mvb_saas',
      password: process.env.DB_PASSWORD || 'Mvb985674%081521',
      database: process.env.DB_NAME || 'u950457610_bot_mvb_saas',
      port: process.env.DB_PORT || 3306,
      connectTimeout: 10000
    });

    testResults.tests.push({
      name: 'Conexão ao Banco',
      status: '✅ SUCESSO',
      message: 'Conectado com sucesso!'
    });

    // Teste 3: Executar uma query simples
    try {
      const [rows] = await connection.execute('SELECT 1 as test');
      testResults.tests.push({
        name: 'Query Teste',
        status: '✅ SUCESSO',
        result: rows
      });
    } catch (queryError) {
      testResults.tests.push({
        name: 'Query Teste',
        status: '❌ ERRO',
        error: queryError.message
      });
    }

    // Teste 4: Verificar tabelas
    try {
      const [tables] = await connection.execute('SHOW TABLES');
      testResults.tests.push({
        name: 'Tabelas do Banco',
        status: '✅ SUCESSO',
        count: tables.length,
        tables: tables.map(t => Object.values(t)[0])
      });
    } catch (tableError) {
      testResults.tests.push({
        name: 'Tabelas do Banco',
        status: '❌ ERRO',
        error: tableError.message
      });
    }

    await connection.end();

  } catch (error) {
    testResults.tests.push({
      name: 'Conexão ao Banco',
      status: '❌ ERRO',
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
  }

  return res.status(200).json(testResults);
};

