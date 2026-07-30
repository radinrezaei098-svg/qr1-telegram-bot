# کُدینو + ربات تلگرام (نسخه‌ی Vercel)

ساختار پروژه:

```
index.html          → مینی‌اپ کیوآرکدساز (استاتیک)
api/webhook.js       → جواب‌گوی دستور /start ربات (از طریق وبهوک)
api/send-qr.js       → ارسال عکس کیوآرکد به کاربر با Bot API
package.json
```

⚠️ چون Vercel هر تابع رو فقط برای یه درخواست موقت اجرا می‌کنه (و پروسه بین درخواست‌ها زنده نمی‌مونه)،
اینجا به‌جای `polling` از **Webhook** استفاده شده — یعنی تلگرام خودش هر پیام جدید رو با یه POST به آدرس `/api/webhook` می‌فرسته.

## ۱. پوش کردن روی گیت‌هاب

```bash
git init
git add .
git commit -m "کُدینو + ربات تلگرام"
git branch -M main
git remote add origin <آدرس-ریپوی-خودت>
git push -u origin main
```

## ۲. ساخت ربات

- برو پیش [@BotFather](https://t.me/BotFather) → `/newbot` → توکن رو کپی کن

## ۳. ایمپورت پروژه توی Vercel

1. توی [vercel.com](https://vercel.com) → **Add New Project** → ریپوی گیت‌هابت رو انتخاب کن
2. قبل از Deploy، بخش **Environment Variables** رو باز کن و این دو تا رو اضافه کن:

| Name | Value |
|---|---|
| `BOT_TOKEN` | توکنی که از BotFather گرفتی |
| `MINI_APP_URL` | `https://اسم-پروژه‌ات.vercel.app` (بعد از اولین دیپلوی دقیق می‌فهمی چیه) |

3. بزن **Deploy**

بعد از اولین دیپلوی، آدرس نهایی پروژه رو (چیزی مثل `https://kodino.vercel.app`) کپی کن،
برو توی **Settings → Environment Variables** و مقدار `MINI_APP_URL` رو با همون آدرس دقیق (بدون اسلش آخر) آپدیت کن، و یه بار دیگه **Redeploy** بزن.

## ۴. وصل کردن Webhook تلگرام

با یه بار اجرای این دستور (توی ترمینال خودت، نه توی Vercel)، به تلگرام می‌گی که آپدیت‌ها رو کجا بفرسته:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://اسم-پروژه‌ات.vercel.app/api/webhook"
```

اگه جواب `{"ok":true,"result":true,...}` گرفتی یعنی وصل شد.

می‌تونی وضعیتش رو هم چک کنی:
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

## ۵. تنظیم دکمه‌ی مینی‌اپ

پیش BotFather → `/mybots` → ربات خودت → **Bot Settings** → **Menu Button** → همون آدرس Vercel رو بذار.

## جریان کار نهایی

1. کاربر به ربات `/start` می‌زنه → تلگرام این آپدیت رو به `/api/webhook` می‌فرسته → ربات دکمه‌ی «باز کردن کُدینو» رو نشون می‌ده
2. کاربر مینی‌اپ رو باز می‌کنه، کیوآرکدش رو می‌سازه
3. دکمه‌ی «ارسال توسط ربات» → درخواست به `/api/send-qr` → `initData` اعتبارسنجی می‌شه → عکس با Bot API مستقیم توی چت کاربر ارسال می‌شه

## تست محلی (قبل از دیپلوی)

با [Vercel CLI](https://vercel.com/docs/cli) می‌تونی محیط سرورلس رو لوکال شبیه‌سازی کنی:

```bash
npm i -g vercel
vercel dev
```

چون تلگرام فقط به HTTPS پابلیک وبهوک می‌فرسته، برای تست کامل با ربات واقعی
یا باید مستقیم روی Vercel دیپلوی کنی (هر پوش یه Preview URL می‌سازه)، یا از ابزاری مثل ngrok کنار `vercel dev` استفاده کنی.

## خطاهای رایج

| خطا | دلیل | راه‌حل |
|---|---|---|
| `chat not found` | کاربر هنوز به ربات `/start` نزده | باید حتماً یه بار چت با ربات رو باز کرده باشه |
| دکمه‌ی «ارسال توسط ربات» دیده نمی‌شه | صفحه بیرون از تلگرام باز شده | فقط داخل مینی‌اپ واقعی تلگرام کار می‌کنه، چون به `initData` نیاز داره |
| `احراز هویت نامعتبره` | `BOT_TOKEN` روی Vercel با رباتی که مینی‌اپ ازش باز شده یکی نیست | مقدار Environment Variable رو چک کن |
| ربات به `/start` جواب نمی‌ده | Webhook درست ست نشده | دستور بخش ۴ رو دوباره اجرا کن و با `getWebhookInfo` چک کن |
