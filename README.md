# راهنمای راه‌اندازی بات کیوارکد ساز تلگرام (Vercel)

## مرحله ۱: ساخت بات در تلگرام
۱. توی تلگرام برو سراغ [@BotFather](https://t.me/BotFather)
۲. دستور `/newbot` رو بفرست
۳. یه اسم و یه یوزرنیم (باید به `bot` ختم بشه) براش انتخاب کن
۴. یه توکن به این شکل بهت می‌ده، نگهش دار:
   `123456789:AAExampleTokenxxxxxxxxxxxxxxxxxxxxx`

## مرحله ۲: آپلود پروژه روی GitHub
۱. یه ریپازیتوری جدید توی GitHub بساز (مثلاً `qr-telegram-bot`)
۲. فایل‌های این پروژه (`api/webhook.js`, `package.json`, `vercel.json`) رو توش آپلود کن

## مرحله ۳: دیپلوی روی Vercel
۱. برو به [vercel.com](https://vercel.com) و با اکانت GitHub لاگین کن
۲. روی **Add New → Project** بزن و ریپازیتوری‌ای که ساختی رو انتخاب کن
۳. قبل از دیپلوی، برو توی بخش **Environment Variables** و این مقدار رو اضافه کن:
   - نام: `BOT_TOKEN`
   - مقدار: همون توکنی که از BotFather گرفتی
۴. روی **Deploy** بزن و صبر کن تا تموم بشه

بعد از دیپلوی، یه آدرس مثل این بهت می‌ده:
```
https://qr-telegram-bot-xxxx.vercel.app
```

## مرحله ۴: وصل کردن Webhook تلگرام به پروژه
یکی از این دو راه رو انتخاب کن:

**روش ۱ - از طریق مرورگر:**
این آدرس رو با مقادیر خودت پر کن و توی مرورگر باز کن:
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<PROJECT-URL>.vercel.app/api/webhook
```

**روش ۲ - از طریق ترمینال (curl):**
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<PROJECT-URL>.vercel.app/api/webhook"
```

اگه پیام `{"ok":true,"result":true,...}` رو دیدی، یعنی همه‌چی درسته ✅

## مرحله ۵: تست بات
برو توی تلگرام سراغ بات خودت، بزن `/start` و بعد یه متن یا لینک دلخواه بفرست.
باید کیوارکدش رو به صورت عکس برات بفرسته.

---

## نکات مهم
- این بات **استیت (state) نداره** — هر پیام مستقل پردازش می‌شه، پس مناسب سرورلسه.
- برای دیدن وضعیت webhook در هر لحظه:
  ```
  https://api.telegram.org/bot<TOKEN>/getWebhookInfo
  ```
- اگه خواستی webhook رو حذف کنی (مثلاً برای دیباگ):
  ```
  https://api.telegram.org/bot<TOKEN>/deleteWebhook
  ```
- توکن بات رو هیچ‌وقت مستقیم توی کد ننویس — همیشه از Environment Variable استفاده کن (همینطور که توی این پروژه انجام شده).
