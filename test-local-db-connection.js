// Script para testar conexão local com o banco Hostinger
const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('🔍 Testando conexão com banco de dados Hostinger...\n');
  
  const config = {
    host: 'srv806.hstgr.io',
    user: 'u950457610_bot_mvb_saas',
    password: 'Mvb985674',
    database: 'u950457610_bot_mvb_saas',
    port: 3306,
    connectTimeout: 10000
  };

  console.log('📊 Configuração:');
  console.log('  Host:', config.host);
  console.log('  User:', config.user);
  console.log('  Database:', config.database);
  console.log('  Port:', config.port);
  console.log('');

  try {
    console.log('⏳ Conectando...');
    const connection = await mysql.createConnection(config);
    console.log('✅ Conexão estabelecida com sucesso!\n');

    // Teste 1: Query simples
    console.log('🧪 Teste 1: SELECT 1');
    const [rows1] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query executada:', rows1);
    console.log('');

    // Teste 2: Listar tabelas
    console.log('🧪 Teste 2: SHOW TABLES');
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('✅ Tabelas encontradas:', tables.length);
    tables.forEach(table => {
      console.log('  -', Object.values(table)[0]);
    });
    console.log('');

    // Teste 3: Contar usuários
    console.log('🧪 Teste 3: SELECT COUNT(*) FROM users');
    const [users] = await connection.execute('SELECT COUNT(*) as total FROM users');
    console.log('✅ Total de usuários:', users[0].total);
    console.log('');

    // Teste 4: Contar licenças
    console.log('🧪 Teste 4: SELECT COUNT(*) FROM licenses');
    const [licenses] = await connection.execute('SELECT COUNT(*) as total FROM licenses');
    console.log('✅ Total de licenças:', licenses[0].total);
    console.log('');

    await connection.end();
    console.log('✅ TODOS OS TESTES PASSARAM!\n');
    console.log('🎯 CONCLUSÃO: Conexão do SEU PC com Hostinger está OK!');
    console.log('   Se o Vercel falhar, é porque o IP do Vercel está bloqueado.\n');

  } catch (error) {
    console.error('❌ ERRO na conexão:');
    console.error('   Mensagem:', error.message);
    console.error('   Código:', error.code);
    console.error('   Errno:', error.errno);
    console.error('');
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('🔐 ERRO DE ACESSO: Credenciais incorretas ou IP bloqueado');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.log('🌐 ERRO DE REDE: Não conseguiu alcançar o servidor');
    }
    
    process.exit(1);
  }
}

testConnection();



