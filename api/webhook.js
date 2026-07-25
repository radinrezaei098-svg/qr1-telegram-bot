import QRCode from 'qrcode';

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export default async function handler(req, res) {
  // برای تست دستی و بررسی سلامت سرویس
  if (req.method !== 'POST') {
    res.status(200).json({ status: 'QR Bot is running ✅' });
    return;
  }

  try {
    const update = req.body;
    const message = update?.message;

    // فقط پیام‌های متنی رو پردازش می‌کنیم
    if (!message || !message.text) {
      res.status(200).json({ ok: true });
      return;
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    if (text === '/start') {
      await sendMessage(
        chatId,
        'سلام! 👋\n\nبه بات *کیوارکد ساز* خوش اومدی.\nهر متن، لینک، شماره تلفن یا هر اطلاعاتی که برام بفرستی، براش یه کیوارکد می‌سازم و همون لحظه برات ارسال می‌کنم. ⚡️\n\nبرای راهنما دستور /help رو بفرست.'
      );
    } else if (text === '/help') {
      await sendMessage(
        chatId,
        'کافیه هر متنی رو مستقیم برام بفرستی، مثلاً:\n\n🔗 یک لینک: `https://example.com`\n📞 یک شماره: `+989123456789`\n📝 یا هر متن دلخواه دیگه\n\nو کیوارکدش رو براش می‌سازم.'
      );
    } else if (text.length > 2000) {
      await sendMessage(chatId, 'متن خیلی طولانیه 😅 لطفاً یه متن کوتاه‌تر (حداکثر ۲۰۰۰ کاراکتر) بفرست.');
    } else {
      await sendChatAction(chatId, 'upload_photo');

      const qrBuffer = await QRCode.toBuffer(text, {
        type: 'png',
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'M',
      });

      const caption =
        text.length > 100 ? `کیوارکد برای:\n${text.slice(0, 100)}...` : `کیوارکد برای:\n${text}`;

      await sendPhoto(chatId, qrBuffer, caption);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    // به تلگرام همیشه 200 برمی‌گردونیم تا دوباره ریتری نکنه
    res.status(200).json({ ok: true });
  }
}

async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
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

  await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: 'POST',
    body: formData,
  });
}
