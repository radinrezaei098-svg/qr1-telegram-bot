// scripts/delete-webhook.js
// ----------------------------------------------------------------------------
// اگه خواستی موقتاً وبهوک رو حذف کنی (مثلاً برای تست لوکال با polling)، این رو اجرا کن:
//   BOT_TOKEN=xxxx node scripts/delete-webhook.js
// ----------------------------------------------------------------------------

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('لطفاً BOT_TOKEN رو ست کن.');
  process.exit(1);
}

(async () => {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`, {
    method: 'POST',
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
})();
