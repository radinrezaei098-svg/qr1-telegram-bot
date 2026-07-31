const QRCode = require('qrcode');
const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).send('QR Telegram Bot is running.');
  }
  try {
    const update = req.body;
    const message = update.message;
    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }
    const chatId = message.chat.id;
    const text = message.text.trim();

    if (text === '/start') {
      await sendMessage(
        chatId,
        '🎉 سلاااام رفیق!\n\n' +
        '📱 من ربات کیوآرکدسازتم! هر متن، لینک، شماره یا هرچی که دلت بخواد رو برام بفرست 📩\n\n' +
        '✨ همون لحظه یه کیوآرکد خوشگل و آماده‌ی استفاده برات می‌سازم 🚀\n\n' +
        'بزن بریم! 😄👇'
      );
      return res.status(200).json({ ok: true });
    }

    // تولید کیوآرکد به صورت بافر PNG
    const qrBuffer = await QRCode.toBuffer(text, {
      type: 'png',
      width: 512,
      margin: 2,
    });
    await sendPhoto(chatId, qrBuffer, text);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(200).json({ ok: true }); // به تلگرام همیشه 200 برگردون
  }
};

async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function sendPhoto(chatId, buffer, caption) {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append(
    'caption',
    `✅ کیوآرکدت آماده شد! 🎯\n\n📄 محتوا:\n${caption}\n\n💾 ذخیره‌ش کن و هر جا خواستی استفاده‌ش کن 😉`.slice(0, 1024)
  );
  form.append('photo', new Blob([buffer], { type: 'image/png' }), 'qrcode.png');
  await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: 'POST',
    body: form,
  });
}
