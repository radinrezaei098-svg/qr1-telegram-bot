# ربات تلگرام کیوآرکدساز (Serverless روی Vercel)

## مراحل راه‌اندازی

### ۱. ساخت ربات در تلگرام
1. با @BotFather در تلگرام چت کن.
2. دستور `/newbot` رو بزن و اسم و یوزرنیم ربات رو بده.
3. توکنی که میده رو ذخیره کن (چیزی شبیه `123456:ABC-DEF...`).

### ۲. آپلود پروژه روی GitHub
```bash
cd telegram-qr-bot
git init
git add .
git commit -m "اولین نسخه ربات کیوآرکدساز"
git branch -M main
git remote add origin https://github.com/USERNAME/telegram-qr-bot.git
git push -u origin main
```

### ۳. دیپلوی روی Vercel
1. به vercel.com برو و با گیت‌هاب لاگین کن.
2. روی "Add New Project" بزن و ریپازیتوری `telegram-qr-bot` رو انتخاب کن.
3. تو قسمت Environment Variables یک متغیر اضافه کن:
   - Name: `BOT_TOKEN`
   - Value: توکنی که از BotFather گرفتی
4. دکمه Deploy رو بزن.
5. بعد از دیپلوی، آدرسی شبیه این می‌گیری:
   `https://telegram-qr-bot.vercel.app`

### ۴. تنظیم Webhook تلگرام
این آدرس رو تو مرورگر باز کن (به جای TOKEN و آدرس، مقادیر خودت رو بذار):
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://telegram-qr-bot.vercel.app/api/webhook
```
اگه پاسخ `"ok":true` گرفتی یعنی وصل شده.

### ۵. تست
تو تلگرام به ربات پیام بده، مثلاً یک لینک یا متن دلخواه، و باید عکس کیوآرکدش رو برات بفرسته.

## نکات
- هر بار که کد رو تغییر بدی و push کنی، Vercel خودکار دوباره دیپلویش می‌کنه.
- اگه خواستی از polling به جای webhook استفاده کنی، روی Vercel امکانش نیست چون serverless است و فرآیند دائمی نگه‌داشته نمیشه؛ webhook روش درسته.
- برای دیدن لاگ‌های اجرا: تو داشبورد Vercel بخش Logs پروژه رو ببین.
