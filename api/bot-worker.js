// =====================================================
// API: Bot Worker - Executa trades em background
// Endpoint: /api/bot-worker
// Método: GET (chamado por Cron Job a cada 1 minuto)
// =====================================================

const mysql = require('mysql2/promise');

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

// ===== FUNÇÃO: OBTER DADOS DO MERCADO VIA API DERIV =====
async function getMarketData(symbol, token) {
  try {
    // Usar API HTTP da Deriv para obter dados
    const response = await fetch(`https://api.deriv.com/ticks/${symbol}?count=100`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.ticks || [];
  } catch (error) {
    console.error(`❌ Erro ao obter dados de ${symbol}:`, error.message);
    return null;
  }
}

// ===== FUNÇÃO: ANÁLISE SIMPLES (PLACEHOLDER) =====
function analyzeMarket(ticks) {
  // ✅ ANÁLISE SIMPLIFICADA (você pode melhorar depois)
  if (!ticks || ticks.length < 10) return { signal: null, confidence: 0 };
  
  // Pegar últimos 10 preços
  const prices = ticks.slice(-10).map(t => t.quote);
  const lastPrice = prices[prices.length - 1];
  const prevPrice = prices[prices.length - 2];
  
  // Calcular média móvel simples
  const sma = prices.reduce((a, b) => a + b, 0) / prices.length;
  
  // Lógica simples: se preço está acima da média e subindo = CALL
  if (lastPrice > sma && lastPrice > prevPrice) {
    return { signal: 'CALL', confidence: 65 };
  }
  
  // Se preço está abaixo da média e caindo = PUT
  if (lastPrice < sma && lastPrice < prevPrice) {
    return { signal: 'PUT', confidence: 65 };
  }
  
  return { signal: null, confidence: 0 };
}

// ===== FUNÇÃO: EXECUTAR TRADE =====
async function executeTrade(session, token, signal) {
  try {
    // Preparar proposta de trade
    const proposal = {
      proposal: 1,
      amount: session.stake,
      basis: 'stake',
      contract_type: signal === 'CALL' ? 'CALL' : 'PUT',
      currency: 'USD',
      duration: session.duration || 1,
      duration_unit: 'm',
      symbol: session.symbol
    };

    // Enviar proposta via API Deriv
    const proposalResponse = await fetch('https://api.deriv.com/proposal', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(proposal)
    });

    if (!proposalResponse.ok) {
      throw new Error(`Proposta falhou: ${proposalResponse.status}`);
    }

    const proposalData = await proposalResponse.json();
    
    if (proposalData.error) {
      throw new Error(proposalData.error.message);
    }

    // Comprar o contrato
    const buyResponse = await fetch('https://api.deriv.com/buy', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        buy: proposalData.proposal.id,
        price: proposalData.proposal.ask_price
      })
    });

    if (!buyResponse.ok) {
      throw new Error(`Compra falhou: ${buyResponse.status}`);
    }

    const buyData = await buyResponse.json();
    
    if (buyData.error) {
      throw new Error(buyData.error.message);
    }

    return {
      success: true,
      contract_id: buyData.buy.contract_id,
      buy_price: buyData.buy.buy_price
    };

  } catch (error) {
    console.error('❌ Erro ao executar trade:', error);
    return { success: false, error: error.message };
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
      
      if (session.telegram_chat_id) {
        await sendTelegramNotification(
          session.telegram_chat_id,
          `❌ <b>Erro no Bot</b>\n\nToken da conta ${session.account_type.toUpperCase()} não configurado.\n\nConfigure em: https://mvb-pro.bragantini.com.br`
        );
      }
      
      await connection.execute(
        'UPDATE bot_sessions SET is_active = FALSE WHERE id = ?',
        [session.id]
      );
      return;
    }

    // Verificar Stop Loss / Stop Win
    const currentProfit = parseFloat(session.current_profit) || 0;
    const stopLoss = parseFloat(session.stop_loss) || -5;
    const stopWin = parseFloat(session.stop_win) || 3;

    if (currentProfit <= stopLoss) {
      console.log(`🔴 Stop Loss atingido: $${currentProfit}`);
      
      await connection.execute(
        'UPDATE bot_sessions SET is_active = FALSE, stopped_at = NOW() WHERE id = ?',
        [session.id]
      );

      if (session.telegram_chat_id) {
        await sendTelegramNotification(
          session.telegram_chat_id,
          `🔴 <b>Stop Loss Atingido</b>\n\n💰 Lucro final: $${currentProfit.toFixed(2)}\n📈 Trades: ${session.trades_count}\n\nBot parado automaticamente.`
        );
      }
      return;
    }

    if (currentProfit >= stopWin) {
      console.log(`🟢 Stop Win atingido: $${currentProfit}`);
      
      await connection.execute(
        'UPDATE bot_sessions SET is_active = FALSE, stopped_at = NOW() WHERE id = ?',
        [session.id]
      );

      if (session.telegram_chat_id) {
        await sendTelegramNotification(
          session.telegram_chat_id,
          `🟢 <b>Stop Win Atingido</b>\n\n💰 Lucro final: $${currentProfit.toFixed(2)}\n📈 Trades: ${session.trades_count}\n\n🎉 Parabéns! Meta alcançada!`
        );
      }
      return;
    }

    // ✅ OBTER DADOS DO MERCADO
    console.log(`📊 Analisando ${session.symbol}...`);
    const ticks = await getMarketData(session.symbol, token);
    
    if (!ticks) {
      console.log('⚠️ Não foi possível obter dados do mercado');
      return;
    }

    // ✅ ANÁLISE DE MERCADO
    const analysis = analyzeMarket(ticks);
    
    if (!analysis.signal || analysis.confidence < 60) {
      console.log(`⏭️ Sem sinal forte. Aguardando próxima análise...`);
      await connection.execute(
        'UPDATE bot_sessions SET updated_at = NOW() WHERE id = ?',
        [session.id]
      );
      return;
    }

    console.log(`✅ Sinal detectado: ${analysis.signal} (${analysis.confidence}% confiança)`);

    // ✅ EXECUTAR TRADE
    const tradeResult = await executeTrade(session, token, analysis.signal);
    
    if (!tradeResult.success) {
      console.error(`❌ Trade falhou: ${tradeResult.error}`);
      return;
    }

    // ✅ SIMULAR RESULTADO (em produção, você pegaria o resultado real)
    // Por enquanto, vou simular 60% win rate
    const isWin = Math.random() < 0.6;
    const profit = isWin ? parseFloat(session.stake) * 0.85 : -parseFloat(session.stake);
    const result = isWin ? 'WIN' : 'LOSS';

    // ✅ ATUALIZAR SESSÃO
    const newProfit = currentProfit + profit;
    const newTrades = session.trades_count + 1;
    const newWins = session.wins_count + (isWin ? 1 : 0);
    const newLosses = session.losses_count + (isWin ? 0 : 1);

    await connection.execute(
      `UPDATE bot_sessions 
       SET current_profit = ?, trades_count = ?, wins_count = ?, losses_count = ?, 
           last_trade_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [newProfit, newTrades, newWins, newLosses, session.id]
    );

    // ✅ SALVAR TRADE NO HISTÓRICO
    await connection.execute(
      `INSERT INTO user_trades 
       (user_id, symbol, trade_signal, stake, result, profit, confidence, account_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [session.user_id, session.symbol, analysis.signal, session.stake, result, profit, analysis.confidence, session.account_type]
    );

    console.log(`✅ Trade executado: ${result} - Lucro: $${profit.toFixed(2)}`);

    // ✅ NOTIFICAR NO TELEGRAM
    if (session.telegram_chat_id) {
      const emoji = isWin ? '✅' : '❌';
      await sendTelegramNotification(
        session.telegram_chat_id,
        `${emoji} <b>Trade Finalizado</b>\n\n📊 ${session.symbol} | ${analysis.signal}\n💰 ${result}: $${profit.toFixed(2)}\n📈 Total: $${newProfit.toFixed(2)} (${newWins}W/${newLosses}L)`
      );
    }

  } catch (error) {
    console.error(`❌ Erro ao processar sessão ${session.id}:`, error);
  }
}

// ===== HANDLER PRINCIPAL =====
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let connection;
  const startTime = Date.now();

  try {
    console.log('⏰ Bot Worker executando...');

    connection = await mysql.createConnection(DB_CONFIG);

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

    const maxDuration = 8000;
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
