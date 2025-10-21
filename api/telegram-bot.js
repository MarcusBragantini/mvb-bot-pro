// =====================================================
// API: Telegram Bot - Recebe comandos do usuário
// Endpoint: /api/telegram-bot
// Método: POST (Webhook do Telegram)
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

// ===== FUNÇÃO: ENVIAR MENSAGEM TELEGRAM =====
async function sendTelegramMessage(chatId, text, parseMode = 'HTML') {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN não configurado');
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: parseMode
      })
    });

    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem Telegram:', error);
    return false;
  }
}

// ===== FUNÇÃO: LOG DE COMANDO =====
async function logCommand(connection, chatId, username, command, params, response, success, error = null) {
  try {
    await connection.execute(
      `INSERT INTO telegram_commands_log 
       (telegram_chat_id, telegram_username, command, parameters, response, success, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [chatId, username, command, JSON.stringify(params), response, success, error]
    );
  } catch (err) {
    console.error('❌ Erro ao salvar log:', err);
  }
}

// ===== COMANDO: /start =====
async function handleStart(connection, chatId, username, params) {
  try {
    // Buscar usuário pelo telegram_chat_id
    const [users] = await connection.execute(
      'SELECT id, name, email FROM users WHERE telegram_chat_id = ?',
      [chatId]
    );

    if (users.length === 0) {
      return `❌ <b>Usuário não encontrado</b>

Para usar o bot via Telegram, você precisa:
1. Acessar https://mvb-pro.bragantini.com.br
2. Fazer login
3. Ir em Configurações → Telegram
4. Inserir seu chat_id: <code>${chatId}</code>

Depois disso, volte aqui e envie /start novamente.`;
    }

    const user = users[0];
    
    // Verificar se já tem sessão ativa
    const [sessions] = await connection.execute(
      'SELECT id FROM bot_sessions WHERE user_id = ? AND is_active = TRUE',
      [user.id]
    );

    if (sessions.length > 0) {
      return `⚠️ <b>Você já tem um bot ativo!</b>

Use /status para ver estatísticas
Use /stop para parar o bot`;
    }

    // Parâmetros do comando: /start R_10 demo 1
    const symbol = params[0] || 'R_10';
    const accountType = params[1] || 'demo';
    const stake = parseFloat(params[2]) || 1.00;

    // Validações
    if (!['demo', 'real'].includes(accountType.toLowerCase())) {
      return `❌ <b>Tipo de conta inválido</b>

Use: <code>demo</code> ou <code>real</code>
Exemplo: <code>/start R_10 demo 1</code>`;
    }

    // Buscar configurações do usuário
    const [userSettings] = await connection.execute(
      'SELECT deriv_token_demo, deriv_token_real FROM user_settings WHERE user_id = ?',
      [user.id]
    );

    const tokenField = accountType.toLowerCase() === 'demo' ? 'deriv_token_demo' : 'deriv_token_real';
    const hasToken = userSettings.length > 0 && userSettings[0][tokenField];

    if (!hasToken) {
      return `❌ <b>Token não configurado</b>

Configure seu token da conta <b>${accountType.toUpperCase()}</b>:
1. Acesse https://mvb-pro.bragantini.com.br
2. Vá em Configurações
3. Insira seu Token Deriv (${accountType})

Depois envie /start novamente.`;
    }

    // Criar sessão
    await connection.execute(
      `INSERT INTO bot_sessions 
       (user_id, telegram_chat_id, is_active, source, symbol, account_type, stake)
       VALUES (?, ?, TRUE, 'telegram', ?, ?, ?)`,
      [user.id, chatId, symbol, accountType.toLowerCase(), stake]
    );

    return `✅ <b>Bot Zeus Iniciado!</b>

👤 Usuário: ${user.name}
📊 Símbolo: ${symbol}
💼 Conta: ${accountType.toUpperCase()}
💰 Stake: $${stake.toFixed(2)}
⚙️ Estratégia: Zeus

🤖 O bot está rodando em <b>background</b>
📱 Você pode fechar o Telegram

<b>Comandos disponíveis:</b>
/status - Ver estatísticas
/stop - Parar bot
/config - Alterar configurações`;
  } catch (error) {
    console.error('❌ Erro no /start:', error);
    return `❌ <b>Erro ao iniciar bot</b>

${error.message}

Tente novamente ou contate o suporte.`;
  }
}

// ===== COMANDO: /stop =====
async function handleStop(connection, chatId, username) {
  try {
    const [users] = await connection.execute(
      'SELECT id, name FROM users WHERE telegram_chat_id = ?',
      [chatId]
    );

    if (users.length === 0) {
      return `❌ Usuário não encontrado. Use /start primeiro.`;
    }

    const user = users[0];

    // Buscar sessão ativa
    const [sessions] = await connection.execute(
      `SELECT id, current_profit, trades_count, wins_count, losses_count, started_at 
       FROM bot_sessions 
       WHERE user_id = ? AND is_active = TRUE`,
      [user.id]
    );

    if (sessions.length === 0) {
      return `⚠️ Nenhum bot ativo encontrado.`;
    }

    const session = sessions[0];
    const accuracy = session.trades_count > 0 
      ? ((session.wins_count / session.trades_count) * 100).toFixed(2)
      : '0.00';

    const duration = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000 / 60);
    const currentProfit = parseFloat(session.current_profit) || 0;

    // Parar sessão
    await connection.execute(
      'UPDATE bot_sessions SET is_active = FALSE, stopped_at = NOW() WHERE id = ?',
      [session.id]
    );

    return `⏹️ <b>Bot Zeus Parado</b>

📊 <b>Resumo da Sessão:</b>
💰 Lucro: $${currentProfit.toFixed(2)}
📈 Trades: ${session.trades_count} (${session.wins_count}W / ${session.losses_count}L)
🎯 Precisão: ${accuracy}%
⏱️ Duração: ${duration} minutos

Obrigado por usar o Zeus Bot! 🚀`;
  } catch (error) {
    console.error('❌ Erro no /stop:', error);
    return `❌ Erro ao parar bot: ${error.message}`;
  }
}

// ===== COMANDO: /status =====
async function handleStatus(connection, chatId, username) {
  try {
    const [users] = await connection.execute(
      'SELECT id, name FROM users WHERE telegram_chat_id = ?',
      [chatId]
    );

    if (users.length === 0) {
      return `❌ Usuário não encontrado. Use /start primeiro.`;
    }

    const user = users[0];

    const [sessions] = await connection.execute(
      `SELECT * FROM bot_sessions 
       WHERE user_id = ? AND is_active = TRUE`,
      [user.id]
    );

    if (sessions.length === 0) {
      return `⚠️ Nenhum bot ativo.

Use /start para iniciar.`;
    }

    const session = sessions[0];
    const accuracy = session.trades_count > 0 
      ? ((session.wins_count / session.trades_count) * 100).toFixed(2)
      : '0.00';

    const duration = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000 / 60);
    const lastTrade = session.last_trade_at 
      ? new Date(session.last_trade_at).toLocaleString('pt-BR')
      : 'Nenhum trade ainda';

    // Converter para números (podem vir como string do banco)
    const stake = parseFloat(session.stake) || 0;
    const currentProfit = parseFloat(session.current_profit) || 0;
    const stopLoss = parseFloat(session.stop_loss) || 0;
    const stopWin = parseFloat(session.stop_win) || 0;

    return `📊 <b>Status do Bot Zeus</b>

🤖 Status: <b>ATIVO</b> ✅
📊 Símbolo: ${session.symbol}
💼 Conta: ${session.account_type.toUpperCase()}
💰 Stake: $${stake.toFixed(2)}

<b>Estatísticas:</b>
💵 Lucro: $${currentProfit.toFixed(2)}
📈 Trades: ${session.trades_count} (${session.wins_count}W / ${session.losses_count}L)
🎯 Precisão: ${accuracy}%
⏱️ Tempo ativo: ${duration} min
🕐 Último trade: ${lastTrade}

<b>Stop Loss/Win:</b>
🔴 Stop Loss: $${stopLoss.toFixed(2)}
🟢 Stop Win: $${stopWin.toFixed(2)}`;
  } catch (error) {
    console.error('❌ Erro no /status:', error);
    return `❌ Erro ao buscar status: ${error.message}`;
  }
}

// ===== COMANDO: /config =====
async function handleConfig(connection, chatId, username, params) {
  try {
    const [users] = await connection.execute(
      'SELECT id FROM users WHERE telegram_chat_id = ?',
      [chatId]
    );

    if (users.length === 0) {
      return `❌ Usuário não encontrado. Use /start primeiro.`;
    }

    const user = users[0];

    // Buscar sessão ativa
    const [sessions] = await connection.execute(
      'SELECT id FROM bot_sessions WHERE user_id = ? AND is_active = TRUE',
      [user.id]
    );

    if (sessions.length === 0) {
      return `⚠️ Nenhum bot ativo. Use /start primeiro.`;
    }

    const session = sessions[0];

    // Validar parâmetros
    if (params.length < 2) {
      return `❌ <b>Uso incorreto</b>

<b>Exemplos:</b>
<code>/config stake 2</code>
<code>/config symbol R_25</code>
<code>/config account real</code>`;
    }

    const configType = params[0].toLowerCase();
    const configValue = params[1];

    switch (configType) {
      case 'stake': {
        const stake = parseFloat(configValue);
        if (isNaN(stake) || stake <= 0) {
          return `❌ Valor inválido. Use um número maior que 0.`;
        }
        
        await connection.execute(
          'UPDATE bot_sessions SET stake = ? WHERE id = ?',
          [stake, session.id]
        );
        
        return `✅ <b>Stake atualizado</b>\n\n💰 Novo valor: $${stake.toFixed(2)}`;
      }

      case 'symbol': {
        const validSymbols = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100', 'BOOM_1000', 'CRASH_1000'];
        if (!validSymbols.includes(configValue.toUpperCase())) {
          return `❌ Símbolo inválido.\n\n<b>Símbolos válidos:</b>\n${validSymbols.join(', ')}`;
        }
        
        await connection.execute(
          'UPDATE bot_sessions SET symbol = ? WHERE id = ?',
          [configValue.toUpperCase(), session.id]
        );
        
        return `✅ <b>Símbolo atualizado</b>\n\n📊 Novo ativo: ${configValue.toUpperCase()}`;
      }

      case 'account': {
        if (!['demo', 'real'].includes(configValue.toLowerCase())) {
          return `❌ Tipo inválido. Use <code>demo</code> ou <code>real</code>.`;
        }
        
        await connection.execute(
          'UPDATE bot_sessions SET account_type = ? WHERE id = ?',
          [configValue.toLowerCase(), session.id]
        );
        
        return `✅ <b>Tipo de conta atualizado</b>\n\n💼 Nova conta: ${configValue.toUpperCase()}`;
      }

      default:
        return `❌ Configuração desconhecida: ${configType}\n\nUse: stake, symbol ou account`;
    }

  } catch (error) {
    console.error('❌ Erro no /config:', error);
    return `❌ Erro ao alterar configuração: ${error.message}`;
  }
}

// ===== COMANDO: /help =====
function handleHelp() {
  return `🤖 <b>Zeus Bot - Comandos Disponíveis</b>

<b>Controles Básicos:</b>
/start [symbol] [account] [stake] - Iniciar bot
  Exemplo: <code>/start R_10 demo 1</code>

/stop - Parar bot

/status - Ver estatísticas em tempo real

<b>Configurações:</b>
/config stake [valor] - Alterar stake
  Exemplo: <code>/config stake 2</code>

/config symbol [símbolo] - Alterar ativo
  Exemplo: <code>/config symbol R_25</code>

/config account [tipo] - Alterar conta
  Exemplo: <code>/config account real</code>

<b>Informações:</b>
/balance - Ver saldo da conta Deriv

/help - Mostrar esta mensagem

<b>Suporte:</b>
Em caso de dúvidas: https://mvb-pro.bragantini.com.br`;
}

// ===== HANDLER PRINCIPAL =====
module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let connection;

  try {
    const update = req.body;
    
    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = update.message.chat.id.toString();
    const username = update.message.from.username || update.message.from.first_name || 'Unknown';
    const text = update.message.text.trim();

    console.log(`📱 Telegram: ${username} (${chatId}): ${text}`);

    // Conectar ao banco
    connection = await mysql.createConnection(DB_CONFIG);

    // Parsear comando
    const parts = text.split(' ');
    const command = parts[0].toLowerCase();
    const params = parts.slice(1);

    let response = '';

    // Executar comando
    switch (command) {
      case '/start':
        response = await handleStart(connection, chatId, username, params);
        break;
      
      case '/stop':
        response = await handleStop(connection, chatId, username);
        break;
      
      case '/status':
        response = await handleStatus(connection, chatId, username);
        break;
      
      case '/config':
        response = await handleConfig(connection, chatId, username, params);
        break;
      
      case '/help':
        response = handleHelp();
        break;
      
      default:
        response = `❓ Comando não reconhecido: ${command}

Use /help para ver comandos disponíveis.`;
    }

    // Enviar resposta
    await sendTelegramMessage(chatId, response);

    // Log do comando
    await logCommand(connection, chatId, username, command, params, response, true);

    res.status(200).json({ ok: true });

  } catch (error) {
    console.error('❌ Erro no telegram-bot:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

