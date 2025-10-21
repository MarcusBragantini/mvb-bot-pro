// =====================================================
// API: Telegram Wizard - Sistema de configuração interativa
// Gerencia estado da conversa e botões inline
// =====================================================

const mysql = require('mysql2/promise');

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

// ===== ENVIAR MENSAGEM COM BOTÕES =====
async function sendMessage(chatId, text, keyboard = null) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;

  try {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    };

    if (keyboard) {
      payload.reply_markup = { inline_keyboard: keyboard };
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    return false;
  }
}

// ===== EDITAR MENSAGEM (para atualizar botões) =====
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

// ===== RESPONDER CALLBACK QUERY =====
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

// ===== WIZARD: TELA INICIAL =====
function getStartWizard(config) {
  const text = `⚙️ <b>Configuração do Bot Zeus</b>

Configure o bot antes de iniciar ou use configurações padrão:

<b>Configurações Atuais:</b>
📊 Símbolo: <b>${config.symbol || 'R_10'}</b>
💼 Conta: <b>${config.account_type?.toUpperCase() || 'DEMO'}</b>
💰 Stake: <b>$${config.stake || '1.00'}</b>
⏱️ Duration: <b>${config.duration || '15'} min</b>
🟢 Stop Win: <b>$${config.stop_win || '3.00'}</b>
🔴 Stop Loss: <b>$${config.stop_loss || '-5.00'}</b>

<b>Escolha uma opção:</b>`;

  const keyboard = [
    [
      { text: '🚀 Iniciar com Essas Configurações', callback_data: 'wizard_start_now' }
    ],
    [
      { text: '📊 Mudar Símbolo', callback_data: 'wizard_symbol' },
      { text: '💼 Mudar Conta', callback_data: 'wizard_account' }
    ],
    [
      { text: '💰 Mudar Stake', callback_data: 'wizard_stake' },
      { text: '⏱️ Mudar Duration', callback_data: 'wizard_duration' }
    ],
    [
      { text: '🎯 Stops (Win/Loss)', callback_data: 'wizard_stops' }
    ],
    [
      { text: '❌ Cancelar', callback_data: 'wizard_cancel' }
    ]
  ];

  return { text, keyboard };
}

// ===== WIZARD: ESCOLHER SÍMBOLO =====
function getSymbolWizard() {
  const text = `📊 <b>Escolha o Símbolo</b>

Selecione o ativo que deseja operar:`;

  const keyboard = [
    [
      { text: 'Volatility 10', callback_data: 'symbol_R_10' },
      { text: 'Volatility 25', callback_data: 'symbol_R_25' }
    ],
    [
      { text: 'Volatility 50', callback_data: 'symbol_R_50' },
      { text: 'Volatility 75', callback_data: 'symbol_R_75' }
    ],
    [
      { text: 'Volatility 100', callback_data: 'symbol_R_100' }
    ],
    [
      { text: '🔙 Voltar', callback_data: 'wizard_back' }
    ]
  ];

  return { text, keyboard };
}

// ===== WIZARD: ESCOLHER TIPO DE CONTA =====
function getAccountWizard() {
  const text = `💼 <b>Escolha o Tipo de Conta</b>

⚠️ <b>ATENÇÃO:</b> Certifique-se de ter configurado o token correto na Web!`;

  const keyboard = [
    [
      { text: '💎 Conta DEMO (Virtual)', callback_data: 'account_demo' }
    ],
    [
      { text: '💰 Conta REAL (Dinheiro Real)', callback_data: 'account_real' }
    ],
    [
      { text: '🔙 Voltar', callback_data: 'wizard_back' }
    ]
  ];

  return { text, keyboard };
}

// ===== WIZARD: ESCOLHER STAKE =====
function getStakeWizard() {
  const text = `💰 <b>Escolha o Valor de Entrada (Stake)</b>

Selecione quanto deseja investir por trade:`;

  const keyboard = [
    [
      { text: '$0.50', callback_data: 'stake_0.5' },
      { text: '$1.00', callback_data: 'stake_1' },
      { text: '$2.00', callback_data: 'stake_2' }
    ],
    [
      { text: '$5.00', callback_data: 'stake_5' },
      { text: '$10.00', callback_data: 'stake_10' },
      { text: '$20.00', callback_data: 'stake_20' }
    ],
    [
      { text: '🔙 Voltar', callback_data: 'wizard_back' }
    ]
  ];

  return { text, keyboard };
}

// ===== WIZARD: ESCOLHER DURATION =====
function getDurationWizard() {
  const text = `⏱️ <b>Escolha a Duração do Trade</b>

Quanto tempo cada trade deve durar:`;

  const keyboard = [
    [
      { text: '5 min', callback_data: 'duration_5' },
      { text: '10 min', callback_data: 'duration_10' },
      { text: '15 min ⭐', callback_data: 'duration_15' }
    ],
    [
      { text: '20 min', callback_data: 'duration_20' },
      { text: '30 min', callback_data: 'duration_30' }
    ],
    [
      { text: '🔙 Voltar', callback_data: 'wizard_back' }
    ]
  ];

  return { text, keyboard };
}

// ===== WIZARD: CONFIGURAR STOPS =====
function getStopsWizard() {
  const text = `🎯 <b>Configurar Stop Win e Stop Loss</b>

Escolha quando o bot deve parar automaticamente:`;

  const keyboard = [
    [
      { text: 'Conservador ($2 / $-3)', callback_data: 'stops_conservative' }
    ],
    [
      { text: 'Moderado ($5 / $-5)', callback_data: 'stops_moderate' }
    ],
    [
      { text: 'Agressivo ($10 / $-10)', callback_data: 'stops_aggressive' }
    ],
    [
      { text: 'Personalizado...', callback_data: 'stops_custom' }
    ],
    [
      { text: '🔙 Voltar', callback_data: 'wizard_back' }
    ]
  ];

  return { text, keyboard };
}

// ===== HANDLER PRINCIPAL =====
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let connection;

  try {
    const update = req.body;
    
    // Verificar se é callback query (clique em botão)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id.toString();
      const messageId = callbackQuery.message.message_id;
      const data = callbackQuery.data;

      console.log(`🔘 Callback: ${data} de ${chatId}`);

      // Conectar ao banco
      connection = await mysql.createConnection(DB_CONFIG);

      // Buscar usuário
      const [users] = await connection.execute(
        'SELECT id FROM users WHERE telegram_chat_id = ?',
        [chatId]
      );

      if (users.length === 0) {
        await answerCallback(callbackQuery.id, 'Configure seu Chat ID na Web primeiro!');
        return res.status(200).json({ ok: true });
      }

      const userId = users[0].id;

      // Buscar ou criar configuração temporária do wizard
      const [wizardStates] = await connection.execute(
        'SELECT config FROM telegram_wizard_state WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
        [userId]
      );

      let config = wizardStates.length > 0 
        ? JSON.parse(wizardStates[0].config) 
        : { symbol: 'R_10', account_type: 'demo', stake: 1, duration: 15, stop_win: 3, stop_loss: -5 };

      // Processar callback
      let responseData;

      if (data === 'wizard_start_now') {
        // INICIAR BOT COM CONFIGURAÇÕES
        await answerCallback(callbackQuery.id, '🚀 Iniciando bot...');
        
        // Criar sessão (código do /start)
        await connection.execute(
          `INSERT INTO bot_sessions 
           (user_id, telegram_chat_id, is_active, source, symbol, account_type, stake, 
            martingale, duration, stop_win, stop_loss, confidence, strategy)
           VALUES (?, ?, TRUE, 'telegram', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, chatId, config.symbol, config.account_type, config.stake,
           2, config.duration, config.stop_win, config.stop_loss, 70, 'zeus']
        );

        await editMessage(chatId, messageId, 
          `✅ <b>Bot Zeus Iniciado!</b>\n\n📊 ${config.symbol} | ${config.account_type.toUpperCase()}\n💰 Stake: $${config.stake}\n⏱️ Duration: ${config.duration} min\n🟢 Stop Win: $${config.stop_win}\n🔴 Stop Loss: $${config.stop_loss}\n\n🤖 Bot rodando em background!\n\nUse /status para acompanhar.`
        );

        // Limpar estado do wizard
        await connection.execute(
          'DELETE FROM telegram_wizard_state WHERE user_id = ?',
          [userId]
        );

        return res.status(200).json({ ok: true });
      }

      // ESCOLHER SÍMBOLO
      if (data.startsWith('symbol_')) {
        const symbol = data.replace('symbol_', '');
        config.symbol = symbol;
        await answerCallback(callbackQuery.id, `✅ Símbolo: ${symbol}`);
      }

      // ESCOLHER CONTA
      else if (data.startsWith('account_')) {
        const accountType = data.replace('account_', '');
        config.account_type = accountType;
        await answerCallback(callbackQuery.id, `✅ Conta: ${accountType.toUpperCase()}`);
      }

      // ESCOLHER STAKE
      else if (data.startsWith('stake_')) {
        const stake = parseFloat(data.replace('stake_', ''));
        config.stake = stake;
        await answerCallback(callbackQuery.id, `✅ Stake: $${stake}`);
      }

      // ESCOLHER DURATION
      else if (data.startsWith('duration_')) {
        const duration = parseInt(data.replace('duration_', ''));
        config.duration = duration;
        await answerCallback(callbackQuery.id, `✅ Duration: ${duration} min`);
      }

      // ESCOLHER STOPS
      else if (data.startsWith('stops_')) {
        const preset = data.replace('stops_', '');
        if (preset === 'conservative') {
          config.stop_win = 2;
          config.stop_loss = -3;
        } else if (preset === 'moderate') {
          config.stop_win = 5;
          config.stop_loss = -5;
        } else if (preset === 'aggressive') {
          config.stop_win = 10;
          config.stop_loss = -10;
        }
        await answerCallback(callbackQuery.id, `✅ Stops configurados`);
      }

      // ABRIR SUBMENUS
      else if (data === 'wizard_symbol') {
        responseData = getSymbolWizard();
        await answerCallback(callbackQuery.id);
      }
      else if (data === 'wizard_account') {
        responseData = getAccountWizard();
        await answerCallback(callbackQuery.id);
      }
      else if (data === 'wizard_stake') {
        responseData = getStakeWizard();
        await answerCallback(callbackQuery.id);
      }
      else if (data === 'wizard_duration') {
        responseData = getDurationWizard();
        await answerCallback(callbackQuery.id);
      }
      else if (data === 'wizard_stops') {
        responseData = getStopsWizard();
        await answerCallback(callbackQuery.id);
      }
      else if (data === 'wizard_back' || data === 'wizard_cancel') {
        await answerCallback(callbackQuery.id);
        responseData = getStartWizard(config);
      }

      // Salvar estado do wizard
      await connection.execute(
        `INSERT INTO telegram_wizard_state (user_id, config, updated_at) 
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE config = ?, updated_at = NOW()`,
        [userId, JSON.stringify(config), JSON.stringify(config)]
      );

      // Atualizar mensagem se houver nova tela
      if (responseData) {
        await editMessage(chatId, messageId, responseData.text, responseData.keyboard);
      } else {
        // Voltar para tela principal com config atualizada
        responseData = getStartWizard(config);
        await editMessage(chatId, messageId, responseData.text, responseData.keyboard);
      }

      return res.status(200).json({ ok: true });
    }

    // Se não for callback, ignorar
    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('❌ Erro no wizard:', error);
    return res.status(500).json({ error: error.message });
  } finally {
    if (connection) await connection.end();
  }
};

