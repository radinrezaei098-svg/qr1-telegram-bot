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
      await sendMessage(chatId, 'سلام! هر متن یا لینکی برام بفرست تا برات کیوآرکدش رو بسازم.');
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
  form.append('caption', `کیوآرکد برای:\n${caption}`.slice(0, 1024));
  form.append('photo', new Blob([buffer], { type: 'image/png' }), 'qrcode.png');

  await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: 'POST',
    body: form,
  });
}
