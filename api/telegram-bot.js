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
async function sendTelegramMessage(chatId, text, parseMode = 'HTML', keyboard = null) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN não configurado');
    return false;
  }

  try {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: parseMode
    };

    // Adicionar teclado inline se fornecido
    if (keyboard) {
      payload.reply_markup = { inline_keyboard: keyboard };
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem Telegram:', error);
    return false;
  }
}

// ===== FUNÇÃO: EDITAR MENSAGEM =====
async function editMessage(chatId, messageId, text, keyboard = null) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;

  try {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'HTML'
    };

    if (keyboard) {
      payload.reply_markup = { inline_keyboard: keyboard };
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('❌ Erro ao editar mensagem:', error);
    return false;
  }
}

// ===== FUNÇÃO: RESPONDER CALLBACK QUERY =====
async function answerCallback(callbackId, text = null) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;

  try {
    const payload = { callback_query_id: callbackId };
    if (text) payload.text = text;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('❌ Erro ao responder callback:', error);
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

    // ✅ BUSCAR CONFIGURAÇÕES DA ÚLTIMA SESSÃO (sincronizar com Web)
    const [lastSession] = await connection.execute(
      `SELECT symbol, account_type, stake, martingale, duration, stop_win, stop_loss, confidence, strategy
       FROM bot_sessions 
       WHERE user_id = ?
       ORDER BY started_at DESC
       LIMIT 1`,
      [user.id]
    );

    // Usar configurações da última sessão (Web) ou permitir override via parâmetros
    const defaultConfig = lastSession.length > 0 ? lastSession[0] : {
      symbol: 'R_10',
      account_type: 'demo',
      stake: 1.00,
      martingale: 2.00,
      duration: 15,
      stop_win: 3.00,
      stop_loss: -5.00,
      confidence: 70,
      strategy: 'zeus'
    };

    // Parâmetros do comando: /start [symbol] [account] [stake]
    // Se não passar parâmetros, usa configurações da Web
    const symbol = params[0] || defaultConfig.symbol;
    const accountType = params[1] || defaultConfig.account_type;
    const stake = params[2] ? parseFloat(params[2]) : parseFloat(defaultConfig.stake);

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

    // Criar sessão com TODAS as configurações (sincronizadas com Web)
    await connection.execute(
      `INSERT INTO bot_sessions 
       (user_id, telegram_chat_id, is_active, source, symbol, account_type, stake, 
        martingale, duration, stop_win, stop_loss, confidence, strategy)
       VALUES (?, ?, TRUE, 'telegram', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, chatId, symbol, accountType.toLowerCase(), stake,
       parseFloat(defaultConfig.martingale), parseInt(defaultConfig.duration),
       parseFloat(defaultConfig.stop_win), parseFloat(defaultConfig.stop_loss),
       parseInt(defaultConfig.confidence), defaultConfig.strategy]
    );

    // Mensagem detalhada com todas as configurações
    const configMessage = lastSession.length > 0 
      ? '\n\n✅ <b>Usando configurações da Web</b>'
      : '\n\n⚙️ <b>Usando configurações padrão</b>';

    return `✅ <b>Bot Zeus Iniciado!</b>

👤 Usuário: ${user.name}
📊 Símbolo: ${symbol}
💼 Conta: ${accountType.toUpperCase()}
💰 Stake: $${stake.toFixed(2)}
⏱️ Duration: ${defaultConfig.duration} min
🔴 Stop Loss: $${parseFloat(defaultConfig.stop_loss).toFixed(2)}
🟢 Stop Win: $${parseFloat(defaultConfig.stop_win).toFixed(2)}
⚙️ Estratégia: Zeus${configMessage}

🤖 O bot está rodando em <b>background</b>
📱 Você pode fechar o Telegram

<b>Comandos:</b>
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
function handleHelp(chatId) {
  const message = `🤖 <b>Zeus Bot - Menu Principal</b>

Escolha uma opção abaixo ou use comandos:

<b>📱 Controle Rápido:</b>
• /start - Iniciar bot (usa configurações da Web)
• /stop - Parar bot
• /status - Ver estatísticas

<b>⚙️ Configuração:</b>
• Todas as configurações da Web são sincronizadas!
• Use /config para alterar manualmente

<b>💡 Dica:</b>
Configure tudo na Web e use apenas /start aqui!

https://mvb-pro.bragantini.com.br`;

  const keyboard = [
    [
      { text: '▶️ Iniciar Bot', callback_data: 'cmd_start' },
      { text: '⏹️ Parar Bot', callback_data: 'cmd_stop' }
    ],
    [
      { text: '📊 Ver Status', callback_data: 'cmd_status' },
      { text: '⚙️ Configurações', callback_data: 'cmd_config' }
    ],
    [
      { text: '🌐 Abrir Web', url: 'https://mvb-pro.bragantini.com.br' }
    ]
  ];

  return { message, keyboard };
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
    
    // Conectar ao banco
    connection = await mysql.createConnection(DB_CONFIG);

    // ===== PROCESSAR CALLBACK QUERY (CLIQUES NOS BOTÕES) =====
    if (update.callback_query) {
      const callback = update.callback_query;
      const chatId = callback.message.chat.id.toString();
      const messageId = callback.message.message_id;
      const data = callback.data;
      const username = callback.from.username || callback.from.first_name || 'Unknown';

      console.log(`🔘 Callback: ${data} de ${chatId}`);

      // Responder callback imediatamente
      await answerCallback(callback.id);

      // Buscar usuário
      const [users] = await connection.execute(
        'SELECT id FROM users WHERE telegram_chat_id = ?',
        [chatId]
      );

      if (users.length === 0) {
        await sendTelegramMessage(chatId, '❌ Configure seu Chat ID na Web primeiro!');
        return res.status(200).json({ ok: true });
      }

      const userId = users[0].id;

      // Buscar configuração atual do wizard
      const [wizardStates] = await connection.execute(
        'SELECT config FROM telegram_wizard_state WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
        [userId]
      );

      let config = wizardStates.length > 0 
        ? JSON.parse(wizardStates[0].config) 
        : { symbol: 'R_10', account_type: 'demo', stake: 1.00, duration: 15, stop_win: 3.00, stop_loss: -5.00 };

      let newText = null;
      let newKeyboard = null;

      // ===== BOTÃO: INICIAR BOT =====
      if (data.startsWith('start_')) {
        // Verificar se já tem sessão ativa
        const [activeSessions] = await connection.execute(
          'SELECT id FROM bot_sessions WHERE user_id = ? AND is_active = TRUE',
          [userId]
        );

        if (activeSessions.length > 0) {
          await editMessage(chatId, messageId, 
            '⚠️ <b>Você já tem um bot ativo!</b>\n\nUse /stop para parar antes de iniciar outro.');
          return res.status(200).json({ ok: true });
        }

        // Verificar token
        const [settings] = await connection.execute(
          'SELECT deriv_token_demo, deriv_token_real FROM user_settings WHERE user_id = ?',
          [userId]
        );

        const tokenField = config.account_type === 'demo' ? 'deriv_token_demo' : 'deriv_token_real';
        const hasToken = settings.length > 0 && settings[0][tokenField];

        if (!hasToken) {
          await editMessage(chatId, messageId, 
            `❌ <b>Token não configurado</b>\n\nConfigure seu token da conta <b>${config.account_type.toUpperCase()}</b> na Web:\n\nhttps://mvb-pro.bragantini.com.br`);
          return res.status(200).json({ ok: true });
        }

        // Criar sessão
        await connection.execute(
          `INSERT INTO bot_sessions 
           (user_id, telegram_chat_id, is_active, source, symbol, account_type, stake, 
            martingale, duration, stop_win, stop_loss, confidence, strategy)
           VALUES (?, ?, TRUE, 'telegram', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, chatId, config.symbol, config.account_type, config.stake,
           2, config.duration, config.stop_win, config.stop_loss, 70, 'zeus']
        );

        await editMessage(chatId, messageId, 
          `✅ <b>Bot Zeus Iniciado!</b>\n\n📊 ${config.symbol} | ${config.account_type.toUpperCase()}\n💰 Stake: $${config.stake}\n⏱️ Duration: ${config.duration} min\n🟢 Stop Win: $${config.stop_win}\n🔴 Stop Loss: $${config.stop_loss}\n\n🤖 Bot rodando em background!\n\nUse /status para acompanhar.`);

        // Limpar wizard
        await connection.execute('DELETE FROM telegram_wizard_state WHERE user_id = ?', [userId]);
        return res.status(200).json({ ok: true });
      }

      // ===== SUBMENU: SÍMBOLO =====
      if (data.startsWith('cfg_symbol_')) {
        newText = `📊 <b>Escolha o Símbolo</b>\n\nSelecione o ativo que deseja operar:`;
        newKeyboard = [
          [{ text: 'Volatility 10', callback_data: 'set_symbol_R_10' }, { text: 'Volatility 25', callback_data: 'set_symbol_R_25' }],
          [{ text: 'Volatility 50', callback_data: 'set_symbol_R_50' }, { text: 'Volatility 75', callback_data: 'set_symbol_R_75' }],
          [{ text: 'Volatility 100', callback_data: 'set_symbol_R_100' }],
          [{ text: '🔙 Voltar', callback_data: 'back_main' }]
        ];
      }

      // ===== SUBMENU: CONTA =====
      else if (data.startsWith('cfg_account_')) {
        newText = `💼 <b>Escolha o Tipo de Conta</b>\n\n⚠️ <b>ATENÇÃO:</b> Certifique-se de ter configurado o token correto na Web!`;
        newKeyboard = [
          [{ text: '💎 Conta DEMO (Virtual)', callback_data: 'set_account_demo' }],
          [{ text: '💰 Conta REAL (Dinheiro Real)', callback_data: 'set_account_real' }],
          [{ text: '🔙 Voltar', callback_data: 'back_main' }]
        ];
      }

      // ===== SUBMENU: STAKE =====
      else if (data.startsWith('cfg_stake_')) {
        newText = `💰 <b>Escolha o Valor de Entrada (Stake)</b>\n\nSelecione quanto deseja investir por trade:`;
        newKeyboard = [
          [{ text: '$0.50', callback_data: 'set_stake_0.5' }, { text: '$1.00', callback_data: 'set_stake_1' }, { text: '$2.00', callback_data: 'set_stake_2' }],
          [{ text: '$5.00', callback_data: 'set_stake_5' }, { text: '$10.00', callback_data: 'set_stake_10' }],
          [{ text: '🔙 Voltar', callback_data: 'back_main' }]
        ];
      }

      // ===== SUBMENU: DURATION =====
      else if (data.startsWith('cfg_duration_')) {
        newText = `⏱️ <b>Escolha a Duração do Trade</b>\n\nQuanto tempo cada trade deve durar:`;
        newKeyboard = [
          [{ text: '5 min', callback_data: 'set_duration_5' }, { text: '10 min', callback_data: 'set_duration_10' }],
          [{ text: '15 min ⭐', callback_data: 'set_duration_15' }, { text: '20 min', callback_data: 'set_duration_20' }],
          [{ text: '🔙 Voltar', callback_data: 'back_main' }]
        ];
      }

      // ===== SUBMENU: STOPS =====
      else if (data.startsWith('cfg_stops_')) {
        newText = `🎯 <b>Configurar Stop Win e Stop Loss</b>\n\nEscolha quando o bot deve parar automaticamente:`;
        newKeyboard = [
          [{ text: 'Conservador (Win $2 / Loss $-3)', callback_data: 'set_stops_2_-3' }],
          [{ text: 'Moderado (Win $5 / Loss $-5)', callback_data: 'set_stops_5_-5' }],
          [{ text: 'Agressivo (Win $10 / Loss $-10)', callback_data: 'set_stops_10_-10' }],
          [{ text: '🔙 Voltar', callback_data: 'back_main' }]
        ];
      }

      // ===== SETAR VALORES =====
      else if (data.startsWith('set_symbol_')) {
        config.symbol = data.replace('set_symbol_', '');
        await answerCallback(callback.id, `✅ Símbolo: ${config.symbol}`);
      }
      else if (data.startsWith('set_account_')) {
        config.account_type = data.replace('set_account_', '');
        await answerCallback(callback.id, `✅ Conta: ${config.account_type.toUpperCase()}`);
      }
      else if (data.startsWith('set_stake_')) {
        config.stake = parseFloat(data.replace('set_stake_', ''));
        await answerCallback(callback.id, `✅ Stake: $${config.stake}`);
      }
      else if (data.startsWith('set_duration_')) {
        config.duration = parseInt(data.replace('set_duration_', ''));
        await answerCallback(callback.id, `✅ Duration: ${config.duration} min`);
      }
      else if (data.startsWith('set_stops_')) {
        const values = data.replace('set_stops_', '').split('_');
        config.stop_win = parseFloat(values[0]);
        config.stop_loss = parseFloat(values[1]);
        await answerCallback(callback.id, `✅ Stops configurados`);
      }

      // ===== VOLTAR AO MENU PRINCIPAL =====
      if (data === 'back_main' || data.startsWith('set_')) {
        newText = `⚙️ <b>Configuração do Bot Zeus</b>\n\nConfigure o bot antes de iniciar ou use configurações padrão:\n\n<b>Configurações Atuais:</b>\n📊 Símbolo: <b>${config.symbol}</b>\n💼 Conta: <b>${config.account_type.toUpperCase()}</b>\n💰 Stake: <b>$${parseFloat(config.stake).toFixed(2)}</b>\n⏱️ Duration: <b>${config.duration} min</b>\n🟢 Stop Win: <b>$${parseFloat(config.stop_win).toFixed(2)}</b>\n🔴 Stop Loss: <b>$${parseFloat(config.stop_loss).toFixed(2)}</b>\n\n<b>Escolha uma opção:</b>`;
        
        newKeyboard = [
          [{ text: '🚀 Iniciar com Essas Configurações', callback_data: `start_${userId}` }],
          [{ text: '📊 Mudar Símbolo', callback_data: `cfg_symbol_${userId}` }, { text: '💼 Mudar Conta', callback_data: `cfg_account_${userId}` }],
          [{ text: '💰 Mudar Stake', callback_data: `cfg_stake_${userId}` }, { text: '⏱️ Mudar Duration', callback_data: `cfg_duration_${userId}` }],
          [{ text: '🎯 Stops (Win/Loss)', callback_data: `cfg_stops_${userId}` }],
          [{ text: '❌ Cancelar', callback_data: 'cancel' }]
        ];
      }

      // ===== CANCELAR =====
      if (data === 'cancel') {
        await editMessage(chatId, messageId, '❌ Configuração cancelada.\n\nUse /start para tentar novamente.');
        await connection.execute('DELETE FROM telegram_wizard_state WHERE user_id = ?', [userId]);
        return res.status(200).json({ ok: true });
      }

      // Salvar configuração atualizada
      await connection.execute(
        `INSERT INTO telegram_wizard_state (user_id, config) 
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE config = ?, updated_at = NOW()`,
        [userId, JSON.stringify(config), JSON.stringify(config)]
      );

      // Atualizar mensagem
      if (newText && newKeyboard) {
        await editMessage(chatId, messageId, newText, newKeyboard);
      }

      return res.status(200).json({ ok: true });
    }

    // ===== PROCESSAR MENSAGENS DE TEXTO =====
    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = update.message.chat.id.toString();
    const username = update.message.from.username || update.message.from.first_name || 'Unknown';
    const text = update.message.text.trim();

    console.log(`📱 Telegram: ${username} (${chatId}): ${text}`);

    // Parsear comando
    const parts = text.split(' ');
    const command = parts[0].toLowerCase();
    const params = parts.slice(1);

    let response = '';

    // Executar comando
    switch (command) {
      case '/start': {
        // Se não tiver parâmetros, abrir wizard de configuração
        if (params.length === 0) {
          // Buscar configurações da última sessão
          const [users] = await connection.execute(
            'SELECT id FROM users WHERE telegram_chat_id = ?',
            [chatId]
          );

          if (users.length === 0) {
            response = `❌ Configure seu Chat ID na Web primeiro!\n\nhttps://mvb-pro.bragantini.com.br`;
            break;
          }

          const userId = users[0].id;

          const [lastSession] = await connection.execute(
            `SELECT symbol, account_type, stake, martingale, duration, stop_win, stop_loss
             FROM bot_sessions 
             WHERE user_id = ?
             ORDER BY started_at DESC
             LIMIT 1`,
            [userId]
          );

          const config = lastSession.length > 0 ? lastSession[0] : {
            symbol: 'R_10',
            account_type: 'demo',
            stake: 1.00,
            duration: 15,
            stop_win: 3.00,
            stop_loss: -5.00
          };

          // Mostrar wizard de configuração
          const wizardText = `⚙️ <b>Configuração do Bot Zeus</b>

Configure o bot antes de iniciar ou use configurações padrão:

<b>Configurações Atuais:</b>
📊 Símbolo: <b>${config.symbol}</b>
💼 Conta: <b>${config.account_type.toUpperCase()}</b>
💰 Stake: <b>$${parseFloat(config.stake).toFixed(2)}</b>
⏱️ Duration: <b>${config.duration} min</b>
🟢 Stop Win: <b>$${parseFloat(config.stop_win).toFixed(2)}</b>
🔴 Stop Loss: <b>$${parseFloat(config.stop_loss).toFixed(2)}</b>

<b>Escolha uma opção:</b>`;

          const keyboard = [
            [
              { text: '🚀 Iniciar com Essas Configurações', callback_data: `start_${userId}` }
            ],
            [
              { text: '📊 Mudar Símbolo', callback_data: `cfg_symbol_${userId}` },
              { text: '💼 Mudar Conta', callback_data: `cfg_account_${userId}` }
            ],
            [
              { text: '💰 Mudar Stake', callback_data: `cfg_stake_${userId}` },
              { text: '⏱️ Mudar Duration', callback_data: `cfg_duration_${userId}` }
            ],
            [
              { text: '🎯 Stops (Win/Loss)', callback_data: `cfg_stops_${userId}` }
            ],
            [
              { text: '❌ Cancelar', callback_data: 'cancel' }
            ]
          ];

          await sendTelegramMessage(chatId, wizardText, 'HTML', keyboard);

          // Salvar configuração temporária
          await connection.execute(
            `INSERT INTO telegram_wizard_state (user_id, config) 
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE config = ?, updated_at = NOW()`,
            [userId, JSON.stringify(config), JSON.stringify(config)]
          );

          await logCommand(connection, chatId, username, command, params, 'Wizard aberto', true);
          return res.status(200).json({ ok: true });
        }

        // Se tiver parâmetros, usar fluxo antigo
        response = await handleStart(connection, chatId, username, params);
        break;
      }
      
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
      case '/start@zeus_bot_pro_bot': // Suportar menção ao bot
      case '/menu': {
        const helpData = handleHelp(chatId);
        await sendTelegramMessage(chatId, helpData.message, 'HTML', helpData.keyboard);
        // Log sem incluir response (muito longo)
        await logCommand(connection, chatId, username, command, params, 'Menu enviado', true);
        return res.status(200).json({ ok: true });
      }
      
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

