// api/webhook.js
// ----------------------------------------------------------------------------
// این فایل خودکار به آدرس /api/webhook در Vercel تبدیل می‌شه.
// تلگرام هر آپدیت جدید (پیام، دستور، کلیک روی دکمه و ...) رو با POST به همین
// آدرس می‌فرسته.
//
// ساختار این بات:
//   /start و /help  -> پیام خوش‌آمد + منوی اصلی با دکمه‌های شیشه‌ای
//   دکمه‌ها (callback_query) -> جابه‌جایی بین منوها (تنظیمات، رنگ، درباره)
//   تغییر اسم بات و رنگ تم -> ذخیره می‌شه (به ازای هر چت) و توی پیام‌ها استفاده می‌شه
//
// ذخیره‌سازی از طریق lib/store.js انجام می‌شه (با Vercel KV یا fallback حافظه‌ای).
// ----------------------------------------------------------------------------

const {
  getUserSettings,
  updateUserSettings,
  getState,
  setState,
  clearState,
  COLORS,
} = require('../lib/store');

const { sendMessage, editMessageText, answerCallbackQuery } = require('../lib/telegram');
const { mainMenu, settingsMenu, colorMenu, cancelRenameMenu } = require('../lib/keyboards');
const texts = require('../lib/texts');

// ----------------------------------------------------------------------------
// هندلرهای دستورات متنی (/start ، /help ، ...)
// ----------------------------------------------------------------------------

async function handleStart(chatId) {
  const settings = await getUserSettings(chatId);
  await clearState(chatId);
  await sendMessage(chatId, texts.welcomeText(settings), {
    reply_markup: mainMenu(settings),
  });
}

async function handleHelp(chatId) {
  await sendMessage(chatId, texts.helpText());
}

async function handleSettingsCommand(chatId) {
  const settings = await getUserSettings(chatId);
  await sendMessage(chatId, texts.settingsText(settings), {
    reply_markup: settingsMenu(settings),
  });
}

// وقتی کاربر توی حالت "در انتظار اسم جدید" باشه، پیام متنی بعدیش رو این‌جا می‌گیریم.
async function handleAwaitingRename(chatId, text) {
  const trimmed = (text || '').trim();

  if (trimmed.length < 1 || trimmed.length > 32) {
    await sendMessage(chatId, texts.invalidNameText(), {
      reply_markup: cancelRenameMenu(),
    });
    return;
  }

  const settings = await updateUserSettings(chatId, { displayName: trimmed });
  await clearState(chatId);
  await sendMessage(chatId, texts.nameChangedText(settings), {
    reply_markup: mainMenu(settings),
  });
}

async function handleTextMessage(msg) {
  const chatId = msg.chat.id;
  const text = typeof msg.text === 'string' ? msg.text : '';

  if (text.startsWith('/start')) {
    return handleStart(chatId);
  }
  if (text.startsWith('/help')) {
    return handleHelp(chatId);
  }
  if (text.startsWith('/settings')) {
    return handleSettingsCommand(chatId);
  }

  // اگه دستور نبود، ببینیم کاربر توی وسط یه مکالمه‌ی چندمرحله‌ای هست یا نه
  const state = await getState(chatId);
  if (state && state.step === 'awaiting_name') {
    return handleAwaitingRename(chatId, text);
  }

  // پیام ناشناخته - راهنمای کوتاه بفرست
  return sendMessage(chatId, 'برای شروع از دستور /start استفاده کن 🙂');
}

// ----------------------------------------------------------------------------
// هندلرهای دکمه‌های شیشه‌ای (callback_query)
// ----------------------------------------------------------------------------

async function handleCallbackQuery(query) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data || '';

  // همیشه اول به تلگرام جواب بده تا لودینگ روی دکمه متوقف بشه
  await answerCallbackQuery(query.id);

  const settings = await getUserSettings(chatId);

  if (data === 'menu:main') {
    await clearState(chatId);
    return editMessageText(chatId, messageId, texts.welcomeText(settings), {
      reply_markup: mainMenu(settings),
    });
  }

  if (data === 'menu:settings') {
    await clearState(chatId);
    return editMessageText(chatId, messageId, texts.settingsText(settings), {
      reply_markup: settingsMenu(settings),
    });
  }

  if (data === 'menu:about') {
    return editMessageText(chatId, messageId, texts.aboutText(settings), {
      reply_markup: settingsMenu(settings).inline_keyboard
        ? { inline_keyboard: [[{ text: '↩️ برگشت', callback_data: 'menu:main' }]] }
        : undefined,
    });
  }

  if (data === 'settings:colors') {
    return editMessageText(chatId, messageId, texts.colorMenuText(settings), {
      reply_markup: colorMenu(settings.color),
    });
  }

  if (data.startsWith('color:')) {
    const colorKey = data.split(':')[1];
    if (!COLORS[colorKey]) {
      return answerCallbackQuery(query.id, { text: 'رنگ نامعتبره.', show_alert: true });
    }
    const updated = await updateUserSettings(chatId, { color: colorKey });
    return editMessageText(chatId, messageId, texts.colorChangedText(updated), {
      reply_markup: colorMenu(updated.color),
    });
  }

  if (data === 'settings:rename') {
    await setState(chatId, { step: 'awaiting_name' });
    return editMessageText(chatId, messageId, texts.askNewNameText(settings), {
      reply_markup: cancelRenameMenu(),
    });
  }

  if (data === 'settings:cancel_rename') {
    await clearState(chatId);
    return editMessageText(chatId, messageId, texts.settingsText(settings), {
      reply_markup: settingsMenu(settings),
    });
  }

  // callback ناشناخته - چیزی نشکنه، فقط لاگ کن
  console.warn('callback_data ناشناخته دریافت شد:', data);
}

// ----------------------------------------------------------------------------
// نقطه‌ی ورود اصلی که Vercel صداش می‌زنه
// ----------------------------------------------------------------------------

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(200).send('ربات کُدینو زنده‌ست ✅');
    return;
  }

  try {
    const update = req.body;

    if (update?.message) {
      await handleTextMessage(update.message);
    } else if (update?.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('webhook error:', err);
    // همیشه به تلگرام 200 برگردون، وگرنه دوباره و دوباره همون آپدیت رو می‌فرسته
    res.status(200).json({ ok: true });
  }
};
