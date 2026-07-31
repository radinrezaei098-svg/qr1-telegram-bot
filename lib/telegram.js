// lib/telegram.js
// ----------------------------------------------------------------------------
// یه لایه‌ی کوچیک روی Telegram Bot API، تا توی webhook.js مجبور نباشیم
// هی fetch و JSON.stringify تکرار کنیم و کد تمیزتر بمونه.
// مستندات کامل: https://core.telegram.org/bots/api
// ----------------------------------------------------------------------------

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function callTelegram(method, payload) {
  if (!BOT_TOKEN) {
    throw new Error('BOT_TOKEN تنظیم نشده - این متغیر محیطی رو توی Vercel اضافه کن.');
  }
  const res = await fetch(`${API_BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!data || data.ok !== true) {
    console.error(`تلگرام برای متد ${method} خطا داد:`, data);
  }

  return data;
}

function sendMessage(chatId, text, options = {}) {
  return callTelegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...options,
  });
}

function editMessageText(chatId, messageId, text, options = {}) {
  return callTelegram('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    ...options,
  });
}

function answerCallbackQuery(callbackQueryId, options = {}) {
  return callTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...options,
  });
}

function deleteMessage(chatId, messageId) {
  return callTelegram('deleteMessage', {
    chat_id: chatId,
    message_id: messageId,
  });
}

module.exports = {
  sendMessage,
  editMessageText,
  answerCallbackQuery,
  deleteMessage,
};
