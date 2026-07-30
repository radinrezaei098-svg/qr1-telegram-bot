// این فایل خودکار به آدرس  /api/webhook  در Vercel تبدیل می‌شه.
// تلگرام هر آپدیت جدید (پیام، دستور و ...) رو با POST به همین آدرس می‌فرسته (webhook).

const BOT_TOKEN = process.env.BOT_TOKEN;
const MINI_APP_URL = process.env.MINI_APP_URL;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(200).send('ربات کُدینو زنده‌ست ✅');
    return;
  }

  try {
    const update = req.body;
    const msg = update && update.message;

    if (msg && typeof msg.text === 'string' && msg.text.startsWith('/start')) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: msg.chat.id,
          text: 'به کُدینو خوش اومدی 👋\nهر کیوآرکدی که بسازی رو می‌تونم مستقیم همینجا برات بفرستم.',
          reply_markup: {
            inline_keyboard: [[{ text: '🚀 باز کردن کُدینو', web_app: { url: MINI_APP_URL } }]],
          },
        }),
      });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('webhook error:', err);
    // همیشه به تلگرام 200 برگردون، وگرنه دوباره و دوباره همون آپدیت رو می‌فرسته
    res.status(200).json({ ok: true });
  }
};
