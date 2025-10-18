/**
 * Sistema de Notificações de Engajamento
 * Envia mensagens motivacionais para usuários inativos via Telegram
 */

import mysql from 'mysql2/promise';

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
};

export default async function handler(req, res) {
  // Permitir apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);

    // Buscar usuários inativos (sem login há mais de 7 dias) que têm Telegram configurado
    const [inactiveUsers] = await connection.execute(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.telegram_chat_id,
        u.last_login,
        DATEDIFF(NOW(), u.last_login) as days_inactive
      FROM users u
      WHERE 
        u.telegram_chat_id IS NOT NULL 
        AND u.telegram_chat_id != ''
        AND u.status = 'active'
        AND u.last_login IS NOT NULL
        AND DATEDIFF(NOW(), u.last_login) >= 7
        AND (u.last_engagement_notification IS NULL OR DATEDIFF(NOW(), u.last_engagement_notification) >= 7)
      ORDER BY u.last_login ASC
    `);

    console.log(`📊 Encontrados ${inactiveUsers.length} usuários inativos para engajamento`);

    if (inactiveUsers.length === 0) {
      await connection.end();
      return res.status(200).json({
        success: true,
        message: 'Nenhum usuário inativo encontrado',
        sent: 0
      });
    }

    // Buscar o token do bot do ambiente
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      console.error('❌ TELEGRAM_BOT_TOKEN não configurado');
      await connection.end();
      return res.status(500).json({ error: 'Bot token não configurado' });
    }

    let sentCount = 0;
    let errorCount = 0;

    // Enviar mensagem para cada usuário inativo
    for (const user of inactiveUsers) {
      try {
        const message = generateEngagementMessage(user.name, user.days_inactive);
        
        // Enviar via Telegram
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: user.telegram_chat_id,
              text: message,
              parse_mode: 'HTML'
            })
          }
        );

        const telegramData = await telegramResponse.json();

        if (telegramData.ok) {
          // Atualizar data da última notificação de engajamento
          await connection.execute(
            'UPDATE users SET last_engagement_notification = NOW() WHERE id = ?',
            [user.id]
          );
          
          sentCount++;
          console.log(`✅ Mensagem enviada para ${user.name} (${user.days_inactive} dias inativo)`);
        } else {
          errorCount++;
          console.error(`❌ Erro ao enviar para ${user.name}:`, telegramData.description);
        }

        // Pequeno delay para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        errorCount++;
        console.error(`❌ Erro ao processar ${user.name}:`, error.message);
      }
    }

    await connection.end();

    return res.status(200).json({
      success: true,
      message: 'Notificações de engajamento processadas',
      total: inactiveUsers.length,
      sent: sentCount,
      errors: errorCount
    });

  } catch (error) {
    console.error('❌ Erro no sistema de engajamento:', error);
    return res.status(500).json({
      error: 'Erro ao processar notificações de engajamento',
      details: error.message
    });
  }
}

/**
 * Gera mensagem de engajamento personalizada
 */
function generateEngagementMessage(userName, daysInactive) {
  const firstName = userName.split(' ')[0];
  
  // Mensagens variadas baseadas no tempo de inatividade
  let customMessage = '';
  
  if (daysInactive >= 30) {
    customMessage = 'Faz um tempinho que você não aparece por aqui! Sentimos sua falta. 🥺';
  } else if (daysInactive >= 14) {
    customMessage = 'Notei que você está há algumas semanas sem acessar o sistema.';
  } else {
    customMessage = 'Percebi que você ainda não começou a alavancar sua banca.';
  }

  return `
🤖 <b>Olá, ${firstName}! 😊</b>

${customMessage}

<b>O que está te impedindo de dar esse passo?</b> Alguma dúvida? Alguma funcionalidade que poderia melhorar? <b>Seu feedback é extremamente importante</b> para nós!

💡 <b>Lembre-se:</b> Ninguém fica rico da noite para o dia. O segredo está na consistência – <b>um grão por dia é muito melhor do que arriscar o pacote todo de uma vez.</b> 💎

⚡ O <b>Zeus</b> foi desenvolvido justamente para isso: <b>crescimento sustentável e inteligente</b>. Estratégias comprovadas, automação precisa, e você no controle total.

<b>Vem junto com o Zeus!</b> ⚡

Estou à disposição para qualquer dúvida, sugestão ou apenas para trocar uma ideia sobre suas estratégias.

Um grande abraço e bons trades! 🚀

---
<i>Esta é uma mensagem automática de engajamento. Responda se precisar de ajuda!</i>
  `.trim();
}

