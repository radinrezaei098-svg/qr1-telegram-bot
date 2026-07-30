const crypto = require('crypto');

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { initData, imageBase64, caption } = req.body || {};

    const validation = validateInitData(initData, BOT_TOKEN);
    if (!validation.valid) {
      return res.status(401).json({ ok: false, error: 'اعتبارسنجی تلگرام ناموفق بود.' });
    }

    if (!imageBase64) {
      return res.status(400).json({ ok: false, error: 'تصویری ارسال نشده.' });
    }

    const chatId = validation.user.id;
    const buffer = Buffer.from(imageBase64, 'base64');

    const form = new FormData();
    form.append('chat_id', chatId);
    if (caption) form.append('caption', String(caption).slice(0, 1024));
    form.append('photo', new Blob([buffer], { type: 'image/png' }), 'codino.png');

    const response = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: 'POST',
      body: form,
    });
    const data = await response.json();

    if (!data.ok) {
      return res.status(502).json({ ok: false, error: data.description || 'ارسال ناموفق بود.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'خطای داخلی سرور.' });
  }
};

// اعتبارسنجی initData طبق روش رسمی تلگرام برای Mini Apps
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
function validateInitData(initData, botToken) {
  if (!initData || !botToken) return { valid: false };

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { valid: false };
    params.delete('hash');

    const entries = [...params.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const dataCheckString = entries.map(([key, value]) => `${key}=${value}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (computedHash !== hash) return { valid: false };

    const userStr = params.get('user');
    if (!userStr) return { valid: false };

    const user = JSON.parse(userStr);
    if (!user.id) return { valid: false };

    return { valid: true, user };
  } catch (err) {
    console.error('initData validation error:', err);
    return { valid: false };
  }
}
