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
async function getMarketData(symbol) {
  try {
    // Usar API pública da Deriv (não requer autenticação)
    const response = await fetch(`https://api.deriv.com/ticks_history?ticks_history=${symbol}&count=50&end=latest&style=ticks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ API Deriv retornou ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.error(`❌ Erro da API Deriv: ${data.error.message}`);
      return null;
    }
    
    if (!data.history || !data.history.prices) {
      console.error('❌ Dados de mercado inválidos');
      return null;
    }
    
    // Converter para formato de ticks
    const ticks = data.history.prices.map((price, index) => ({
      quote: price,
      epoch: data.history.times[index]
    }));
    
    console.log(`✅ Obtidos ${ticks.length} ticks de ${symbol}`);
    return ticks;
    
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

// ===== FUNÇÃO: EXECUTAR TRADE REAL VIA API DERIV =====
async function executeTrade(session, token, signal) {
  try {
    console.log(`🔄 Executando trade ${signal} em ${session.symbol}...`);
    
    // 1. OBTER PROPOSTA
    const proposalParams = {
      proposal: 1,
      amount: parseFloat(session.stake),
      basis: 'stake',
      contract_type: signal,
      currency: 'USD',
      duration: parseInt(session.duration) || 1,
      duration_unit: 'm',
      symbol: session.symbol
    };
    
    const proposalUrl = `https://api.deriv.com/api/v3/proposal?${new URLSearchParams({
      ...proposalParams,
      authorize: token
    })}`;
    
    const proposalResponse = await fetch(proposalUrl);
    const proposalData = await proposalResponse.json();
    
    if (proposalData.error) {
      console.error(`❌ Erro na proposta: ${proposalData.error.message}`);
      return { success: false, error: proposalData.error.message };
    }
    
    if (!proposalData.proposal || !proposalData.proposal.id) {
      console.error('❌ Proposta inválida');
      return { success: false, error: 'Proposta inválida' };
    }
    
    console.log(`✅ Proposta aceita: ID ${proposalData.proposal.id}, Preço: $${proposalData.proposal.ask_price}`);
    
    // 2. COMPRAR CONTRATO
    const buyUrl = `https://api.deriv.com/api/v3/buy?${new URLSearchParams({
      buy: proposalData.proposal.id,
      price: proposalData.proposal.ask_price,
      authorize: token
    })}`;
    
    const buyResponse = await fetch(buyUrl);
    const buyData = await buyResponse.json();
    
    if (buyData.error) {
      console.error(`❌ Erro na compra: ${buyData.error.message}`);
      return { success: false, error: buyData.error.message };
    }
    
    if (!buyData.buy || !buyData.buy.contract_id) {
      console.error('❌ Compra falhou');
      return { success: false, error: 'Compra falhou' };
    }
    
    console.log(`✅ Trade executado! Contrato: ${buyData.buy.contract_id}`);
    
    return {
      success: true,
      contract_id: buyData.buy.contract_id,
      buy_price: buyData.buy.buy_price,
      payout: buyData.buy.payout
    };

  } catch (error) {
    console.error('❌ Erro ao executar trade:', error.message);
    return { success: false, error: error.message };
  }
}

// ===== FUNÇÃO: VERIFICAR RESULTADO DO CONTRATO =====
async function checkContractResult(contractId, token) {
  try {
    const url = `https://api.deriv.com/api/v3/proposal_open_contract?${new URLSearchParams({
      proposal_open_contract: 1,
      contract_id: contractId,
      authorize: token
    })}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error(`❌ Erro ao buscar contrato: ${data.error.message}`);
      return null;
    }
    
    if (!data.proposal_open_contract) {
      console.error('❌ Contrato não encontrado');
      return null;
    }
    
    const contract = data.proposal_open_contract;
    
    // Verificar se contrato já foi finalizado
    if (contract.is_settleable || contract.is_sold || contract.status === 'sold') {
      const profit = parseFloat(contract.profit) || 0;
      const result = profit > 0 ? 'WIN' : 'LOSS';
      
      return {
        finished: true,
        result: result,
        profit: profit,
        sell_price: contract.sell_price,
        buy_price: contract.buy_price
      };
    }
    
    // Contrato ainda em andamento
    return { finished: false };
    
  } catch (error) {
    console.error('❌ Erro ao verificar contrato:', error.message);
    return null;
  }
}

// ===== FUNÇÃO: EXECUTAR BOT PARA UMA SESSÃO =====
async function executeBotSession(connection, session) {
  console.log(`🤖 Processando sessão ${session.id} do usuário ${session.user_id}`);

  try {
    // ✅ VERIFICAR SE HÁ CONTRATO PENDENTE
    if (session.pending_contract_id && session.pending_contract_open_time) {
      const minutosPassados = Math.floor((Date.now() - new Date(session.pending_contract_open_time).getTime()) / 1000 / 60);
      
      console.log(`⏱️ Contrato pendente há ${minutosPassados} minutos`);
      
      // Se já passou tempo suficiente (15+ minutos), verificar resultado
      if (minutosPassados >= 15) {
        console.log(`🔍 Verificando resultado do contrato ${session.pending_contract_id}...`);
        
        // Buscar token
        const [settings] = await connection.execute(
          'SELECT deriv_token_demo, deriv_token_real FROM user_settings WHERE user_id = ?',
          [session.user_id]
        );
        
        if (settings.length === 0) {
          console.error('❌ Configurações não encontradas');
          return;
        }
        
        const token = session.account_type === 'demo' 
          ? settings[0].deriv_token_demo 
          : settings[0].deriv_token_real;
        
        if (!token) {
          console.error('❌ Token não configurado');
          return;
        }
        
        const contractResult = await checkContractResult(session.pending_contract_id, token);
        
        if (contractResult && contractResult.finished) {
          console.log(`✅ Resultado: ${contractResult.result} - Lucro: $${contractResult.profit.toFixed(2)}`);
          
          // Atualizar sessão
          const currentProfit = parseFloat(session.current_profit) || 0;
          const newProfit = currentProfit + contractResult.profit;
          const newTrades = session.trades_count + 1;
          const newWins = session.wins_count + (contractResult.result === 'WIN' ? 1 : 0);
          const newLosses = session.losses_count + (contractResult.result === 'LOSS' ? 1 : 0);
          
          await connection.execute(
            `UPDATE bot_sessions 
             SET current_profit = ?, trades_count = ?, wins_count = ?, losses_count = ?,
                 pending_contract_id = NULL, pending_contract_open_time = NULL, pending_contract_signal = NULL,
                 updated_at = NOW()
             WHERE id = ?`,
            [newProfit, newTrades, newWins, newLosses, session.id]
          );
          
          // Salvar no histórico
          await connection.execute(
            `INSERT INTO user_trades 
             (user_id, symbol, trade_signal, stake, result, profit, confidence, account_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [session.user_id, session.symbol, session.pending_contract_signal, session.stake, 
             contractResult.result, contractResult.profit, 0, session.account_type]
          );
          
          // Notificar no Telegram
          if (session.telegram_chat_id) {
            const emoji = contractResult.result === 'WIN' ? '✅' : '❌';
            const accuracy = newTrades > 0 ? ((newWins / newTrades) * 100).toFixed(1) : '0';
            
            await sendTelegramNotification(
              session.telegram_chat_id,
              `${emoji} <b>Trade Finalizado</b>\n\n📊 ${session.symbol} | ${session.pending_contract_signal}\n💰 ${contractResult.result}: $${contractResult.profit.toFixed(2)}\n📈 Total: $${newProfit.toFixed(2)}\n🎯 Win Rate: ${accuracy}% (${newWins}W/${newLosses}L)`
            );
          }
          
          // Verificar Stop Loss/Win
          const stopLoss = parseFloat(session.stop_loss) || -5;
          const stopWin = parseFloat(session.stop_win) || 3;
          
          if (newProfit <= stopLoss) {
            console.log(`🔴 Stop Loss atingido: $${newProfit}`);
            await connection.execute(
              'UPDATE bot_sessions SET is_active = FALSE, stopped_at = NOW() WHERE id = ?',
              [session.id]
            );
            
            if (session.telegram_chat_id) {
              await sendTelegramNotification(
                session.telegram_chat_id,
                `🔴 <b>Stop Loss Atingido</b>\n\n💰 Lucro final: $${newProfit.toFixed(2)}\n📈 Trades: ${newTrades}\n\nBot parado automaticamente.`
              );
            }
            return;
          }
          
          if (newProfit >= stopWin) {
            console.log(`🟢 Stop Win atingido: $${newProfit}`);
            await connection.execute(
              'UPDATE bot_sessions SET is_active = FALSE, stopped_at = NOW() WHERE id = ?',
              [session.id]
            );
            
            if (session.telegram_chat_id) {
              await sendTelegramNotification(
                session.telegram_chat_id,
                `🟢 <b>Stop Win Atingido</b>\n\n💰 Lucro final: $${newProfit.toFixed(2)}\n📈 Trades: ${newTrades}\n\n🎉 Parabéns! Meta alcançada!`
              );
            }
            return;
          }
        } else if (contractResult && !contractResult.finished) {
          console.log(`⏳ Contrato ainda em andamento`);
          return; // Aguardar mais
        } else {
          console.error(`❌ Não foi possível verificar contrato`);
          // Limpar contrato pendente após muitas tentativas
          if (minutosPassados >= 30) {
            await connection.execute(
              'UPDATE bot_sessions SET pending_contract_id = NULL, pending_contract_open_time = NULL, pending_contract_signal = NULL WHERE id = ?',
              [session.id]
            );
          }
          return;
        }
      } else {
        console.log(`⏳ Aguardando contrato expirar (faltam ${15 - minutosPassados} min)`);
        return; // Ainda não passou 15 min
      }
    }
    
    // ✅ SE NÃO HÁ CONTRATO PENDENTE, ANALISAR E ABRIR NOVO TRADE
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

    // ✅ EXECUTAR TRADE REAL
    const tradeResult = await executeTrade(session, token, analysis.signal);
    
    if (!tradeResult.success) {
      console.error(`❌ Trade falhou: ${tradeResult.error}`);
      
      // Notificar erro no Telegram
      if (session.telegram_chat_id) {
        await sendTelegramNotification(
          session.telegram_chat_id,
          `❌ <b>Erro ao Executar Trade</b>\n\n${tradeResult.error}\n\nVerifique suas configurações e token Deriv.`
        );
      }
      return;
    }

    console.log(`✅ Trade executado com sucesso! Contrato: ${tradeResult.contract_id}`);

    // ✅ SALVAR CONTRATO PENDENTE
    await connection.execute(
      `UPDATE bot_sessions 
       SET pending_contract_id = ?, 
           pending_contract_open_time = NOW(), 
           pending_contract_signal = ?,
           updated_at = NOW(), 
           last_trade_at = NOW() 
       WHERE id = ?`,
      [tradeResult.contract_id, analysis.signal, session.id]
    );

    // ✅ NOTIFICAR TRADE ABERTO NO TELEGRAM
    if (session.telegram_chat_id) {
      await sendTelegramNotification(
        session.telegram_chat_id,
        `🔵 <b>Trade Aberto</b>\n\n📊 ${session.symbol} | ${analysis.signal}\n💰 Stake: $${session.stake}\n🎯 Confiança: ${analysis.confidence}%\n📝 Contrato: ${tradeResult.contract_id}\n\n⏳ Aguardando 15 minutos para resultado...`
      );
    }
    
    console.log(`ℹ️ Contrato salvo. Resultado será verificado em 15 minutos.`)

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
