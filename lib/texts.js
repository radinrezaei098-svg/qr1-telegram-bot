// lib/texts.js
// ----------------------------------------------------------------------------
// متن پیام‌های هر منو، جدا از منطق اصلی. اگه خواستی متن‌ها رو عوض کنی
// (مثلاً لحن بات رو رسمی‌تر کنی) فقط همین فایل رو ویرایش کن.
// ----------------------------------------------------------------------------

const { COLORS } = require('./store');

function welcomeText(settings) {
  return (
    `به <b>${settings.displayName}</b> خوش اومدی 👋\n\n` +
    `هر کیوآرکدی که بسازی رو می‌تونم مستقیم همین‌جا برات بفرستم.\n` +
    `از دکمه‌های پایین می‌تونی ربات رو باز کنی یا تنظیماتش رو تغییر بدی.`
  );
}

function settingsText(settings) {
  const color = COLORS[settings.color];
  return (
    `⚙️ <b>تنظیمات</b>\n\n` +
    `• اسم فعلی بات: <b>${settings.displayName}</b>\n` +
    `• رنگ فعلی تم: ${color?.emoji || ''} <b>${color?.label || '-'}</b>\n\n` +
    `کدوم رو می‌خوای عوض کنی؟`
  );
}

function colorMenuText(settings) {
  return (
    `🎨 یه رنگ برای تم ${settings.displayName} انتخاب کن.\n` +
    `تیک ✅ کنار رنگیه که الان فعاله.`
  );
}

function colorChangedText(settings) {
  const color = COLORS[settings.color];
  return `${color.emoji} رنگ تم به «<b>${color.label}</b>» تغییر کرد.`;
}

function askNewNameText(settings) {
  return (
    `✏️ اسم دلخواه جدید برای بات رو تایپ کن و بفرست.\n` +
    `(اسم فعلی: <b>${settings.displayName}</b>، حداکثر ۳۲ کاراکتر)\n\n` +
    `اگه پشیمون شدی، «انصراف» رو بزن.`
  );
}

function nameChangedText(settings) {
  return `✅ از این به بعد اسم بات میشه: <b>${settings.displayName}</b>`;
}

function invalidNameText() {
  return '⚠️ اسم باید بین ۱ تا ۳۲ کاراکتر باشه و خالی نباشه. یه بار دیگه امتحان کن:';
}

function aboutText(settings) {
  return (
    `ℹ️ <b>درباره ${settings.displayName}</b>\n\n` +
    `این بات با Node.js نوشته شده و روی Vercel (Serverless Functions) اجرا می‌شه.\n` +
    `کد کامل و متن‌باز توی مخزن گیت‌هاب پروژه موجوده.`
  );
}

function helpText() {
  return (
    `<b>راهنما</b>\n\n` +
    `/start — نمایش منوی اصلی\n` +
    `/settings — رفتن مستقیم به تنظیمات\n` +
    `/help — همین راهنما\n\n` +
    `از دکمه‌های زیر پیام‌ها هم می‌تونی همین کارها رو انجام بدی.`
  );
}

module.exports = {
  welcomeText,
  settingsText,
  colorMenuText,
  colorChangedText,
  askNewNameText,
  nameChangedText,
  invalidNameText,
  aboutText,
  helpText,
};
