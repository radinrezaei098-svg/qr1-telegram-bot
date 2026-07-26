const QRCode = require('qrcode');
const Jimp = require('jimp');

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// یه کاراکتر نامرئی که برای مخفی کردن state استفاده می‌کنیم 🕵️
const STATE_MARKER = '\u200b';

const COLORS = {
  black: { label: '⚫ مشکی', hex: '#000000' },
  purple: { label: '🟣 بنفش', hex: '#8e44ad' },
  blue: { label: '🔵 آبی', hex: '#2980b9' },
  red: { label: '🔴 قرمز', hex: '#e74c3c' },
  green: { label: '🟢 سبز', hex: '#27ae60' },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).send('QR Telegram Bot is running. 🤖');
  }

  try {
    const update = req.body;

    if (update.callback_query) {
      await handleCallback(update.callback_query);
      return res.status(200).json({ ok: true });
    }

    if (update.message) {
      await handleMessage(update.message);
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(200).json({ ok: true }); // به تلگرام همیشه 200 برگردون
  }
};

async function handleMessage(message) {
  if (!message.text) return; // فعلاً فقط متن رو هندل می‌کنیم

  const chatId = message.chat.id;
  const text = message.text.trim();

  // آیا این پیام، جواب به سوال "چه متنی زیر بارکد بنویسم؟" هست؟
  const state = message.reply_to_message
    ? decodeState(message.reply_to_message.text)
    : null;

  if (state) {
    // مرحله‌ی نهایی: ساخت بارکد رنگی با کپشن
    const colorInfo = COLORS[state.color] || COLORS.black;
    const caption = text.slice(0, 40);

    try {
      await sendMessage(chatId, 'چشم! دارم می‌سازمش... ⏳✨');
      const buffer = await generateColoredQr(state.text, colorInfo.hex, caption);
      await sendPhoto(chatId, buffer, state.text, caption, colorInfo.label);
    } catch (err) {
      console.error('QR generation error:', err);
      await sendMessage(chatId, 'اوپس! یه مشکلی تو ساختن بارکد پیش اومد 😵‍💫 دوباره امتحان کن.');
    }
    return;
  }

  if (text === '/start') {
    await sendMessage(
      chatId,
      'سلاااام رفیق! 👋😄\n' +
        'من ربات بارکد/کیوآرکد باحالتم 🎨📦\n' +
        'یه متن یا لینک برام بفرست، بعدش رنگش رو انتخاب کن، بعدش بگو زیرش چی بنویسم — تمومه! 🚀'
    );
    return;
  }

  // متن جدید = درخواست ساخت بارکد جدید. اول رنگ رو بپرس 🌈
  await sendMessage(
    chatId,
    'باحاله! 😍 حالا رنگ بارکد رو انتخاب کن 👇',
    buildColorKeyboard(),
    message.message_id
  );
}

async function handleCallback(cq) {
  const chatId = cq.message.chat.id;
  const [, colorKey] = cq.data.split('|');

  const originalMsg = cq.message.reply_to_message;
  if (!originalMsg || !originalMsg.text) {
    await answerCallback(cq.id, 'پیام اصلی پیدا نشد! 😕');
    await sendMessage(chatId, 'یه بار دیگه متنت رو برام بفرست تا از اول شروع کنیم 🙏');
    return;
  }

  await answerCallback(cq.id, '👌');

  const colorInfo = COLORS[colorKey] || COLORS.black;
  const hiddenState = encodeState({ text: originalMsg.text, color: colorKey });

  await sendMessage(
    chatId,
    `عالیه! رنگ ${colorInfo.label} انتخاب شد ✅\n` +
      'حالا بگو چه متن یا کدی رو زیر بارکد بنویسم؟ (مثلاً 22-35) ✍️' +
      hiddenState,
    { force_reply: true, selective: true }
  );
}

function buildColorKeyboard() {
  const keys = Object.keys(COLORS);
  const buttons = [];
  let row = [];
  keys.forEach((key, i) => {
    row.push({ text: COLORS[key].label, callback_data: `color|${key}` });
    if (row.length === 3 || i === keys.length - 1) {
      buttons.push(row);
      row = [];
    }
  });
  return { inline_keyboard: buttons };
}

function encodeState(obj) {
  const b64 = Buffer.from(JSON.stringify(obj), 'utf-8').toString('base64');
  return STATE_MARKER + b64;
}

function decodeState(text) {
  if (!text || !text.includes(STATE_MARKER)) return null;
  try {
    const b64 = text.slice(text.indexOf(STATE_MARKER) + STATE_MARKER.length);
    const json = Buffer.from(b64, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

async function generateColoredQr(text, colorHex, captionText) {
  const qrBuffer = await QRCode.toBuffer(text, {
    type: 'png',
    width: 512,
    margin: 2,
    color: {
      dark: `${colorHex}ff`,
      light: '#ffffffff',
    },
  });

  const qrImage = await Jimp.read(qrBuffer);
  const captionHeight = 90;

  const canvas = new Jimp(qrImage.bitmap.width, qrImage.bitmap.height + captionHeight, '#ffffffff');
  canvas.composite(qrImage, 0, 0);

  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  canvas.print(
    font,
    0,
    qrImage.bitmap.height + (captionHeight - 32) / 2,
    {
      text: captionText,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
      alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
    },
    canvas.bitmap.width,
    captionHeight
  );

  return canvas.getBufferAsync(Jimp.MIME_PNG);
}

async function sendMessage(chatId, text, reply_markup = null, reply_to_message_id = null) {
  const payload = { chat_id: chatId, text };
  if (reply_markup) payload.reply_markup = reply_markup;
  if (reply_to_message_id) payload.reply_to_message_id = reply_to_message_id;

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function answerCallback(callbackQueryId, text) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

async function sendPhoto(chatId, buffer, originalText, caption, colorLabel) {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append(
    'caption',
    `بارکدت آماده‌ست! 🎉\n📝 متن: ${originalText}\n🎨 رنگ: ${colorLabel}\n🔤 نوشته‌ی زیرش: ${caption}`.slice(0, 1024)
  );
  form.append('photo', new Blob([buffer], { type: 'image/png' }), 'qrcode.png');

  await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: 'POST',
    body: form,
  });
}
