const QRCode = require('qrcode');

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// جداکننده‌ای که برای پنهان کردن متن اصلی داخل پیام "انتخاب فرمت" استفاده می‌کنیم
// (اینجوری بدون نیاز به دیتابیس یا حافظه‌ی موقت، متن کاربر رو نگه می‌داریم)
const START_TAG = '📄 متن:\n';
const END_TAG = '\n\n🎨';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).send('✅ QR Telegram Bot در حال اجراست.');
  }

  try {
    const update = req.body;

    // مدیریت کلیک روی دکمه‌های شیشه‌ای (انتخاب فرمت)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return res.status(200).json({ ok: true });
    }

    const message = update.message;
    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    if (text === '/start') {
      await sendMessage(
        chatId,
        '🎉 سلاااام رفیق خودم!\n\n' +
        '📱 من ربات کیوآرکدسازتم! هر متن، لینک، شماره یا هر چیزی که دلت بخواد رو برام بفرست 📩\n\n' +
        '✨ همون لحظه یه کیوآرکد خوشگل برات می‌سازم و می‌تونی فرمت خروجیش رو هم خودت انتخاب کنی 🎨\n\n' +
        '🚀 بزن بریم! یه پیام برام بفرست 👇'
      );
      return res.status(200).json({ ok: true });
    }

    if (text === '/help') {
      await sendMessage(
        chatId,
        '📖 راهنمای ربات:\n\n' +
        '1️⃣ هر متن یا لینکی بفرستی، یه منو باز می‌شه\n' +
        '2️⃣ از بین دکمه‌ها فرمت خروجی رو انتخاب کن (PNG، PNG شفاف یا SVG)\n' +
        '3️⃣ کیوآرکدت آماده می‌شه، دانلودش کن و لذت ببر 😄'
      );
      return res.status(200).json({ ok: true });
    }

    if (!text.length) {
      await sendMessage(chatId, '🤔 متنت خالیه‌ها! یه چیزی بفرست تا برات کیوآرکد بسازم 😉');
      return res.status(200).json({ ok: true });
    }

    if (text.length > 1200) {
      await sendMessage(
        chatId,
        '⚠️ اوپس! این متن یکم خیلی طولانیه و کیوآرکد نمی‌تونه جاش بده.\n' +
        '✂️ لطفاً یه متن کوتاه‌تر (حداکثر حدود ۱۲۰۰ کاراکتر) بفرست 🙏'
      );
      return res.status(200).json({ ok: true });
    }

    // پیام انتخاب فرمت با دکمه‌های شیشه‌ای (inline keyboard)
    await sendMessage(
      chatId,
      '🔍 محتوات شناسایی شد!\n\n' +
      `${START_TAG}${text}${END_TAG} فرمت خروجی رو انتخاب کن:`,
      {
        inline_keyboard: [
          [
            { text: '🖼 PNG', callback_data: 'qr_png' },
            { text: '🪟 PNG شفاف', callback_data: 'qr_png_transparent' },
          ],
          [{ text: '✒️ SVG (وکتور)', callback_data: 'qr_svg' }],
        ],
      }
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('❌ خطا:', err);
    return res.status(200).json({ ok: true }); // به تلگرام همیشه 200 برگردون
  }
};

async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const format = callbackQuery.data;
  const originalText = extractOriginalText(callbackQuery.message.text);

  // همیشه اول callback رو جواب بده تا حالت "در حال بارگذاری" دکمه برداشته بشه
  await answerCallbackQuery(callbackQuery.id, '⏳ دارم کیوآرکدت رو می‌سازم...');

  if (!originalText) {
    await sendMessage(chatId, '😕 متأسفانه متن اصلی پیدا نشد. لطفاً دوباره متنت رو بفرست.');
    return;
  }

  try {
    if (format === 'qr_svg') {
      const svgString = await QRCode.toString(originalText, {
        type: 'svg',
        width: 512,
        margin: 2,
      });
      await sendDocument(chatId, Buffer.from(svgString, 'utf-8'), 'qrcode.svg', originalText);
    } else {
      const isTransparent = format === 'qr_png_transparent';
      const qrBuffer = await QRCode.toBuffer(originalText, {
        type: 'png',
        width: 512,
        margin: 2,
        color: isTransparent
          ? { dark: '#000000ff', light: '#00000000' } // پس‌زمینه‌ی کاملاً شفاف
          : undefined,
      });
      await sendPhoto(chatId, qrBuffer, originalText);
    }

    // دکمه‌ها رو از پیام قبلی برمی‌داریم تا کاربر دوباره روشون کلیک نکنه
    await editMessageReplyMarkup(chatId, messageId);
  } catch (err) {
    console.error('❌ خطا در ساخت کیوآرکد:', err);
    await sendMessage(chatId, '😵 یه مشکلی توی ساخت کیوآرکد پیش اومد! لطفاً دوباره امتحان کن 🙏');
  }
}

function extractOriginalText(fullMessageText) {
  if (!fullMessageText) return null;
  const startIndex = fullMessageText.indexOf(START_TAG);
  const endIndex = fullMessageText.indexOf(END_TAG);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) return null;
  return fullMessageText.slice(startIndex + START_TAG.length, endIndex);
}

async function sendMessage(chatId, text, replyMarkup) {
  const body = { chat_id: chatId, text };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.error('❌ خطا در sendMessage:', await response.text());
  }
}

async function sendPhoto(chatId, buffer, originalText) {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append(
    'caption',
    `✅ کیوآرکدت آماده شد! 🎯\n\n📄 محتوا:\n${originalText}\n\n💾 ذخیره‌ش کن و هر جا خواستی استفاده‌ش کن 😉`.slice(0, 1024)
  );
  form.append('photo', new Blob([buffer], { type: 'image/png' }), 'qrcode.png');

  const response = await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    console.error('❌ خطا در sendPhoto:', await response.text());
  }
}

async function sendDocument(chatId, buffer, filename, originalText) {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append(
    'caption',
    `✅ کیوآرکد وکتوریت آماده شد! 🎯\n\n📄 محتوا:\n${originalText}\n\n💾 ذخیره‌ش کن 😉`.slice(0, 1024)
  );
  form.append('document', new Blob([buffer], { type: 'image/svg+xml' }), filename);

  const response = await fetch(`${TELEGRAM_API}/sendDocument`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    console.error('❌ خطا در sendDocument:', await response.text());
  }
}

async function answerCallbackQuery(callbackQueryId, text) {
  const response = await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });

  if (!response.ok) {
    console.error('❌ خطا در answerCallbackQuery:', await response.text());
  }
}

async function editMessageReplyMarkup(chatId, messageId) {
  const response = await fetch(`${TELEGRAM_API}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    }),
  });

  if (!response.ok) {
    console.error('❌ خطا در editMessageReplyMarkup:', await response.text());
  }
}
