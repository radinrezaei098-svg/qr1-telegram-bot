import QRCode from 'qrcode';
import { Redis } from '@upstash/redis';
import { Resvg } from '@resvg/resvg-js';
import path from 'path';

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const redis = Redis.fromEnv();

const FONT_PATH = path.join(process.cwd(), 'fonts', 'Vazirmatn-Regular.ttf');

const SIZES = [
  { label: 'کوچک (256px)', value: 256 },
  { label: 'متوسط (512px)', value: 512 },
  { label: 'بزرگ (1024px)', value: 1024 },
];

const COLORS = [
  { label: '⚫️ مشکی', value: '#000000' },
  { label: '🔵 آبی', value: '#1e40af' },
  { label: '🔴 قرمز', value: '#dc2626' },
  { label: '🟢 سبز', value: '#16a34a' },
  { label: '🟣 بنفش', value: '#7c3aed' },
  { label: '🟤 قهوه‌ای', value: '#78350f' },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(200).json({ status: 'QR Bot is running ✅' });
    return;
  }

  try {
    const update = req.body;

    if (update.callback_query) {
      await handleCallback(update.callback_query);
    } else if (update.message && update.message.text) {
      await handleMessage(update.message);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(200).json({ ok: true });
  }
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = message.text.trim();

  if (text === '/start') {
    await clearSession(chatId);
    await sendMessage(
      chatId,
      'سلام! 👋\n\nبه بات *کیوارکد ساز* خوش اومدی.\n\nهر متن یا لینکی بفرستی، ازت می‌پرسم چه شکلی می‌خوایش (متن زیرش، اندازه، رنگ) و بعد کیوارکدت رو می‌سازم. ⚡️'
    );
    return;
  }

  if (text === '/help') {
    await sendMessage(
      chatId,
      'کافیه هر متنی رو بفرستی. بعدش سه تا سوال ازت می‌پرسم:\n\n📝 می‌خوای زیر کیوارکد متنی نوشته بشه؟\n📏 چه اندازه‌ای؟\n🎨 چه رنگی؟\n\nو بعد کیوارکد نهایی رو برات می‌سازم.'
    );
    return;
  }

  const session = await getSession(chatId);

  if (session?.step === 'awaiting_caption') {
    session.caption = text.slice(0, 60);
    session.step = 'awaiting_size';
    await saveSession(chatId, session);
    await sendMessage(chatId, '📏 چه اندازه‌ای می‌خوای؟', sizeKeyboard());
    return;
  }

  // پیام جدید = درخواست کیوارکد جدید (هر سشن قبلی رو بی‌خیال می‌شیم)
  await saveSession(chatId, { text, step: 'awaiting_caption_choice' });
  await sendMessage(chatId, '📝 می‌خوای زیر کیوارکد یه متن نوشته بشه؟', captionChoiceKeyboard());
}

async function handleCallback(callback) {
  const chatId = callback.message.chat.id;
  const messageId = callback.message.message_id;
  const data = callback.data;
  const session = await getSession(chatId);

  if (!session) {
    await answerCallback(callback.id, 'این درخواست منقضی شده، یه متن جدید بفرست.');
    return;
  }

  if (data === 'cap|yes') {
    session.step = 'awaiting_caption';
    await saveSession(chatId, session);
    await answerCallback(callback.id);
    await editMessage(chatId, messageId, '✏️ متنی که می‌خوای زیر کیوارکد نوشته بشه رو بفرست (حداکثر ۶۰ کاراکتر):');
  } else if (data === 'cap|no') {
    session.caption = null;
    session.step = 'awaiting_size';
    await saveSession(chatId, session);
    await answerCallback(callback.id);
    await editMessage(chatId, messageId, '📏 چه اندازه‌ای می‌خوای؟', sizeKeyboard());
  } else if (data.startsWith('size|')) {
    session.size = Number(data.replace('size|', ''));
    session.step = 'awaiting_color';
    await saveSession(chatId, session);
    await answerCallback(callback.id);
    await editMessage(chatId, messageId, '🎨 چه رنگی می‌خوای؟', colorKeyboard());
  } else if (data.startsWith('color|')) {
    session.color = data.replace('color|', '');
    await answerCallback(callback.id, '⏳ در حال ساخت کیوارکد...');
    await editMessage(chatId, messageId, '⏳ در حال ساخت کیوارکد...');
    await generateFinal(chatId, session);
    await clearSession(chatId);
  } else {
    await answerCallback(callback.id);
  }
}

// ---------- ساخت کیوارکد نهایی ----------

async function generateFinal(chatId, session) {
  await sendChatAction(chatId, 'upload_photo');

  const qrBuffer = await QRCode.toBuffer(session.text, {
    type: 'png',
    width: session.size,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: session.color, light: '#ffffffff' },
  });

  if (!session.caption) {
    await sendPhoto(chatId, qrBuffer, 'کیوارکدت آماده‌ست ✅');
    return;
  }

  try {
    const finalBuffer = composeWithCaption(qrBuffer, session.size, session.caption, session.color);
    await sendPhoto(chatId, finalBuffer, 'کیوارکدت آماده‌ست ✅');
  } catch (err) {
    console.error('Compose error:', err);
    // اگه ترکیب تصویر و متن به هر دلیلی خطا داد، حداقل خود کیوارکد رو با کپشن تلگرام می‌فرستیم
    await sendPhoto(chatId, qrBuffer, `کیوارکدت آماده‌ست ✅\n\n${session.caption}`);
  }
}

function composeWithCaption(qrBuffer, qrSize, caption, color) {
  const qrBase64 = qrBuffer.toString('base64');
  const lines = wrapText(caption, 22);
  const lineHeight = Math.round(qrSize * 0.055);
  const fontSize = Math.round(qrSize * 0.05);
  const paddingTop = Math.round(qrSize * 0.06);
  const captionHeight = paddingTop + lines.length * lineHeight + paddingTop;
  const totalHeight = qrSize + captionHeight;

  const tspans = lines
    .map((line, i) => `<tspan x="${qrSize / 2}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join('');

  const svg = `
<svg width="${qrSize}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <image href="data:image/png;base64,${qrBase64}" x="0" y="0" width="${qrSize}" height="${qrSize}"/>
  <text x="${qrSize / 2}" y="${qrSize + paddingTop + fontSize}" font-family="Vazirmatn" font-size="${fontSize}" fill="${color}" text-anchor="middle">${tspans}</text>
</svg>`;

  const resvg = new Resvg(svg, {
    font: {
      fontFiles: [FONT_PATH],
      loadSystemFonts: false,
      defaultFontFamily: 'Vazirmatn',
    },
    background: 'white',
  });

  const pngData = resvg.render();
  return pngData.asPng();
}

function wrapText(text, maxCharsPerLine) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    const candidate = (current + ' ' + w).trim();
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current.trim());
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 3);
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ---------- Session storage (Redis) ----------

async function getSession(chatId) {
  return await redis.get(`session:${chatId}`);
}

async function saveSession(chatId, session) {
  await redis.set(`session:${chatId}`, session, { ex: 600 });
}

async function clearSession(chatId) {
  await redis.del(`session:${chatId}`);
}

// ---------- Keyboards ----------

function captionChoiceKeyboard() {
  return {
    inline_keyboard: [[
      { text: '✅ بله', callback_data: 'cap|yes' },
      { text: '❌ نه، فقط کیوارکد', callback_data: 'cap|no' },
    ]],
  };
}

function sizeKeyboard() {
  return { inline_keyboard: SIZES.map((s) => [{ text: s.label, callback_data: `size|${s.value}` }]) };
}

function colorKeyboard() {
  const rows = [];
  for (let i = 0; i < COLORS.length; i += 2) {
    rows.push(COLORS.slice(i, i + 2).map((c) => ({ text: c.label, callback_data: `color|${c.value}` })));
  }
  return { inline_keyboard: rows };
}

// ---------- Telegram API helpers ----------

async function sendMessage(chatId, text, replyMarkup) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', reply_markup: replyMarkup }),
  });
}

async function editMessage(chatId, messageId, text, replyMarkup) {
  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, reply_markup: replyMarkup }),
  });
}

async function answerCallback(callbackId, text) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

async function sendChatAction(chatId, action) {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action }),
  });
}

async function sendPhoto(chatId, buffer, caption) {
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('caption', caption);
  formData.append('photo', new Blob([buffer], { type: 'image/png' }), 'qrcode.png');

  await fetch(`${TELEGRAM_API}/sendPhoto`, { method: 'POST', body: formData });
}
