// lib/keyboards.js
// ----------------------------------------------------------------------------
// همه‌ی دکمه‌های شیشه‌ای (inline keyboard) بات این‌جا تعریف می‌شن، تا اگه خواستی
// یه دکمه اضافه/کم کنی، فقط کافیه همین فایل رو ویرایش کنی.
// ----------------------------------------------------------------------------

const { COLORS } = require('./store');

const MINI_APP_URL = process.env.MINI_APP_URL;

function mainMenu(settings) {
  const colorEmoji = COLORS[settings.color]?.emoji || '🔵';
  const rows = [];

  if (MINI_APP_URL) {
    rows.push([{ text: `🚀 باز کردن ${settings.displayName}`, web_app: { url: MINI_APP_URL } }]);
  }

  rows.push([
    { text: '⚙️ تنظیمات', callback_data: 'menu:settings' },
    { text: 'ℹ️ درباره', callback_data: 'menu:about' },
  ]);
  rows.push([
    { text: `${colorEmoji} رنگ فعلی: ${COLORS[settings.color]?.label || '-'}`, callback_data: 'menu:settings' },
  ]);

  return { inline_keyboard: rows };
}

function settingsMenu(settings) {
  return {
    inline_keyboard: [
      [{ text: '✏️ تغییر اسم بات', callback_data: 'settings:rename' }],
      [{ text: '🎨 تغییر رنگ تم', callback_data: 'settings:colors' }],
      [{ text: '↩️ برگشت به منوی اصلی', callback_data: 'menu:main' }],
    ],
  };
}

function colorMenu(currentColor) {
  const entries = Object.entries(COLORS);
  const rows = [];

  for (let i = 0; i < entries.length; i += 2) {
    const chunk = entries.slice(i, i + 2).map(([key, info]) => {
      const check = key === currentColor ? ' ✅' : '';
      return { text: `${info.emoji} ${info.label}${check}`, callback_data: `color:${key}` };
    });
    rows.push(chunk);
  }

  rows.push([{ text: '↩️ برگشت به تنظیمات', callback_data: 'menu:settings' }]);
  return { inline_keyboard: rows };
}

function cancelRenameMenu() {
  return {
    inline_keyboard: [[{ text: '❌ انصراف', callback_data: 'settings:cancel_rename' }]],
  };
}

function backToMainMenu() {
  return {
    inline_keyboard: [[{ text: '↩️ برگشت به منوی اصلی', callback_data: 'menu:main' }]],
  };
}

module.exports = {
  mainMenu,
  settingsMenu,
  colorMenu,
  cancelRenameMenu,
  backToMainMenu,
};
