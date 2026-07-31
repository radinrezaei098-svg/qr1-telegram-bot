// scripts/set-webhook.js
// ----------------------------------------------------------------------------
// این اسکریپت رو یک‌بار، بعد از دیپلوی روی Vercel، از روی سیستم خودت اجرا کن
// تا به تلگرام بگی آپدیت‌ها رو کجا بفرسته.
//
// استفاده:
//   BOT_TOKEN=xxxx WEBHOOK_URL=https://your-project.vercel.app/api/webhook \
//   node scripts/set-webhook.js
// ----------------------------------------------------------------------------

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!BOT_TOKEN || !WEBHOOK_URL) {
  console.error('لطفاً هر دو متغیر BOT_TOKEN و WEBHOOK_URL رو ست کن.');
  console.error('مثال: BOT_TOKEN=123:abc WEBHOOK_URL=https://x.vercel.app/api/webhook node scripts/set-webhook.js');
  process.exit(1);
}

(async () => {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      allowed_updates: ['message', 'callback_query'],
    }),
  });

  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));

  if (data.ok) {
    console.log('\n✅ وبهوک با موفقیت روی', WEBHOOK_URL, 'ست شد.');
  } else {
    console.log('\n❌ چیزی درست پیش نرفت، پیام خطای بالا رو ببین.');
  }
})();
