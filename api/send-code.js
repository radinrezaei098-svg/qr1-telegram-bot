// این فایل خودکار به آدرس  /api/send-qr  در Vercel تبدیل می‌شه.
// مینی‌اپ وقتی دکمه‌ی «ارسال توسط ربات» زده می‌شه، یه POST به همین آدرس می‌فرسته.

const crypto = require('crypto');
const formidable = require('formidable');
const fs = require('fs');
const FormData = require('form-data');

const BOT_TOKEN = process.env.BOT_TOKEN;

/* اعتبارسنجی initData طبق مستندات رسمی تلگرام:
   https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app */
function verifyInitData(initData, botToken) {
  if (!initData) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const sortedKeys = [...params.keys()].sort();
  const dataCheckString = sortedKeys.map((k) => `${k}=${params.get(k)}`).join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) return null;

  const authDate = parseInt(params.get('auth_date'), 10);
  if (!authDate || Date.now() / 1000 - authDate > 86400) return null;

  const userJson = params.get('user');
  if (!userJson) return null;

  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'روش درخواست اشتباهه' });
  }

  const form = formidable({ maxFileSize: 5 * 1024 * 1024 });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ ok: false, error: 'خطا در خوندن فایل آپلودی' });
    }

    const initData = first(fields.initData);
    const user = verifyInitData(initData, BOT_TOKEN);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'احراز هویت نامعتبره. از داخل تلگرام باز کن.' });
    }

    const photoFile = first(files.photo);
    if (!photoFile) {
      return res.status(400).json({ ok: false, error: 'عکسی دریافت نشد.' });
    }

    try {
      const buffer = fs.readFileSync(photoFile.filepath);

      const tgForm = new FormData();
      tgForm.append('chat_id', user.id);
      tgForm.append('caption', '✅ کیوآرکدت آماده‌ست — ساخته‌شده با کُدینو');
      tgForm.append('photo', buffer, { filename: 'kodino-qr.png', contentType: 'image/png' });

      const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: tgForm,
        headers: tgForm.getHeaders(),
      });
      const tgData = await tgRes.json();

      if (!tgData.ok) {
        const desc = tgData.description || '';
        if (/chat not found/i.test(desc)) {
          return res.status(400).json({ ok: false, error: 'اول باید یه بار به ربات /start بزنی.' });
        }
        return res.status(500).json({ ok: false, error: 'تلگرام ارسال رو رد کرد.' });
      }

      res.status(200).json({ ok: true });
    } catch (sendErr) {
      console.error('send-qr error:', sendErr);
      res.status(500).json({ ok: false, error: 'خطای داخلی سرور' });
    }
  });
};
