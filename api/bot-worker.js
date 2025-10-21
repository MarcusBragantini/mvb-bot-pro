// =====================================================
// API: Bot Worker - Executa trades em background
// Endpoint: /api/bot-worker
// Método: GET (chamado por Cron Job a cada 1 minuto)
// =====================================================

const mysql = require('mysql2/promise');
const WebSocket = require('ws');

// ===== CONFIGURAÇÃO DO BANCO DE DADOS =====
const DB_CONFIG = {
  host: process.env.DB_HOST || 'srv806.hstgr.io',
  user: process.env.DB_USER || 'u950457610_bot_mvb_saas',
  password: process.env.DB_PASSWORD || 'Mvb985674%081521',
  database: process.env.DB_NAME || 'u950457610_bot_mvb_saas',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  connectTimeout: 10000,
  acquireTimeout: 10000
};

// ===== FUNÇÃO: ENVIAR NOTIFICAÇÃO TELEGRAM =====
async function sendTelegramNotification(chatId, message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !chatId) return false;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    return response.ok;
  } catch (error) {
    console.error('❌ Erro ao enviar Telegram:', error);
    return false;
  }
}

// ===== FUNÇÃO: EXECUTAR BOT PARA UMA SESSÃO =====
async function executeBotSession(connection, session) {
  console.log(`🤖 Processando sessão ${session.id} do usuário ${session.user_id}`);

  try {
    // Buscar token do usuário
    const [settings] = await connection.execute(
      'SELECT deriv_token_demo, deriv_token_real FROM user_settings WHERE user_id = ?',
      [session.user_id]
    );

    if (settings.length === 0) {
      console.error(`❌ Configurações não encontradas para usuário ${session.user_id}`);
      return;
    }

    const token = session.account_type === 'demo' 
      ? settings[0].deriv_token_demo 
      : settings[0].deriv_token_real;

    if (!token) {
      console.error(`❌ Token não configurado para conta ${session.account_type}`);
      
      // Notificar usuário
      if (session.telegram_chat_id) {
        await sendTelegramNotification(
          session.telegram_chat_id,
          `❌ <b>Erro no Bot</b>\n\nToken da conta ${session.account_type.toUpperCase()} não configurado.\n\nConfigure em: https://mvb-pro.bragantini.com.br`
        );
      }
      
      // Desativar sessão
      await connection.execute(
        'UPDATE bot_sessions SET is_active = FALSE WHERE id = ?',
        [session.id]
      );
      return;
    }

    // TODO: Implementar lógica de trading
    // Por enquanto, apenas simular um trade
    console.log(`📊 Analisando ${session.symbol} em conta ${session.account_type}...`);

    // Verificar Stop Loss / Stop Win
    if (session.current_profit <= session.stop_loss) {
      console.log(`🔴 Stop Loss atingido: $${session.current_profit}`);
      
      await connection.execute(
        'UPDATE bot_sessions SET is_active = FALSE, stopped_at = NOW() WHERE id = ?',
        [session.id]
      );

      if (session.telegram_chat_id) {
        await sendTelegramNotification(
          session.telegram_chat_id,
          `🔴 <b>Stop Loss Atingido</b>\n\n💰 Lucro final: $${session.current_profit.toFixed(2)}\n📈 Trades: ${session.trades_count}\n\nBot parado automaticamente.`
        );
      }
      return;
    }

    if (session.current_profit >= session.stop_win) {
      console.log(`🟢 Stop Win atingido: $${session.current_profit}`);
      
      await connection.execute(
        'UPDATE bot_sessions SET is_active = FALSE, stopped_at = NOW() WHERE id = ?',
        [session.id]
      );

      if (session.telegram_chat_id) {
        await sendTelegramNotification(
          session.telegram_chat_id,
          `🟢 <b>Stop Win Atingido</b>\n\n💰 Lucro final: $${session.current_profit.toFixed(2)}\n📈 Trades: ${session.trades_count}\n\n🎉 Parabéns! Meta alcançada!`
        );
      }
      return;
    }

    // Aqui seria a lógica real de trading
    // Por enquanto, apenas manter sessão ativa
    await connection.execute(
      'UPDATE bot_sessions SET updated_at = NOW() WHERE id = ?',
      [session.id]
    );

    console.log(`✅ Sessão ${session.id} processada com sucesso`);

  } catch (error) {
    console.error(`❌ Erro ao processar sessão ${session.id}:`, error);
  }
}

// ===== HANDLER PRINCIPAL =====
module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let connection;
  const startTime = Date.now();

  try {
    console.log('⏰ Bot Worker executando...');

    // Conectar ao banco
    connection = await mysql.createConnection(DB_CONFIG);

    // Buscar sessões ativas
    const [sessions] = await connection.execute(
      `SELECT bs.*, u.name as user_name, u.email as user_email
       FROM bot_sessions bs
       JOIN users u ON bs.user_id = u.id
       WHERE bs.is_active = TRUE
       ORDER BY bs.started_at ASC`
    );

    console.log(`📊 ${sessions.length} sessão(ões) ativa(s) encontrada(s)`);

    if (sessions.length === 0) {
      const duration = Date.now() - startTime;
      return res.status(200).json({
        success: true,
        message: 'Nenhuma sessão ativa',
        sessions_processed: 0,
        duration_ms: duration
      });
    }

    // Processar cada sessão (máximo 10s no Vercel)
    const maxDuration = 8000; // 8 segundos (margem de segurança)
    let processedCount = 0;

    for (const session of sessions) {
      const elapsed = Date.now() - startTime;
      
      if (elapsed > maxDuration) {
        console.log('⏱️ Tempo limite atingido, parando processamento');
        break;
      }

      await executeBotSession(connection, session);
      processedCount++;
    }

    const duration = Date.now() - startTime;

    res.status(200).json({
      success: true,
      message: 'Worker executado com sucesso',
      sessions_found: sessions.length,
      sessions_processed: processedCount,
      duration_ms: duration
    });

  } catch (error) {
    console.error('❌ Erro no bot-worker:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

