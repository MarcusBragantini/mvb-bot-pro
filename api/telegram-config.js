// API para fornecer configurações do Telegram (apenas o token do bot)
// O token é armazenado de forma segura no servidor

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Token do bot vindo das variáveis de ambiente
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.error('❌ TELEGRAM_BOT_TOKEN não configurado nas variáveis de ambiente');
      return res.status(500).json({ 
        error: 'Bot token not configured',
        message: 'Configure TELEGRAM_BOT_TOKEN nas variáveis de ambiente do servidor'
      });
    }

    // Retornar apenas o token (sem expor outras informações sensíveis)
    return res.status(200).json({
      success: true,
      botToken: botToken
    });

  } catch (error) {
    console.error('❌ Erro ao obter configurações do Telegram:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

