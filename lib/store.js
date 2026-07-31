// lib/store.js
// ----------------------------------------------------------------------------
// این فایل مسئول ذخیره‌سازی تنظیمات هر کاربره (اسم دلخواه، رنگ تم، مرحله‌ی مکالمه).
//
// دو حالت داره:
//  1) اگه متغیرهای محیطی KV_REST_API_URL و KV_REST_API_TOKEN ست شده باشن
//     (یعنی از Vercel KV / Upstash Redis استفاده کردی)، اطلاعات واقعی و دائمی
//     ذخیره می‌شن و بعد از هر بار باز شدن سرد سرورلس (cold start) هم از بین نمی‌رن.
//  2) اگه ست نشده باشن، یه Map توی حافظه‌ی همون instance استفاده می‌شه؛ بات کامل
//     کار می‌کنه ولی ممکنه بعد از مدتی بی‌کاری (که Vercel لامبدا رو ری‌استارت می‌کنه)
//     تنظیمات پاک بشه. برای پروداکشن واقعی، حتماً Vercel KV رو وصل کن (توضیحش تو README هست).
// ----------------------------------------------------------------------------

const HAS_KV = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

let kvClient = null;
if (HAS_KV) {
  try {
    // این پکیج توی package.json اضافه شده؛ اگه نصب نشده باشه یا env نداشته باشیم
    // میریم سراغ fallback حافظه‌ای و برنامه کرش نمی‌کنه.
    // eslint-disable-next-line global-require
    const { kv } = require('@vercel/kv');
    kvClient = kv;
  } catch (err) {
    console.warn('پکیج @vercel/kv در دسترس نیست، از حافظه‌ی موقت استفاده می‌شه:', err.message);
  }
}

// حافظه‌ی موقت (fallback) - فقط وقتی KV نداریم استفاده می‌شه.
const memoryStore = new Map();

function memGet(key) {
  return memoryStore.has(key) ? memoryStore.get(key) : null;
}

function memSet(key, value) {
  memoryStore.set(key, value);
}

async function getJSON(key) {
  if (kvClient) {
    try {
      const value = await kvClient.get(key);
      return value ?? null;
    } catch (err) {
      console.error('خطا در خواندن از KV:', err.message);
      return memGet(key);
    }
  }
  return memGet(key);
}

async function setJSON(key, value) {
  if (kvClient) {
    try {
      await kvClient.set(key, value);
      return;
    } catch (err) {
      console.error('خطا در نوشتن روی KV:', err.message);
    }
  }
  memSet(key, value);
}

// ----------------------------------------------------------------------------
// API عمومی این ماژول
// ----------------------------------------------------------------------------

const DEFAULT_SETTINGS = {
  displayName: 'کُدینو',
  color: 'blue',
};

const COLORS = {
  blue: { label: 'آبی', emoji: '🔵' },
  red: { label: 'قرمز', emoji: '🔴' },
  green: { label: 'سبز', emoji: '🟢' },
  purple: { label: 'بنفش', emoji: '🟣' },
  orange: { label: 'نارنجی', emoji: '🟠' },
  yellow: { label: 'زرد', emoji: '🟡' },
};

async function getUserSettings(chatId) {
  const data = await getJSON(`settings:${chatId}`);
  return { ...DEFAULT_SETTINGS, ...(data || {}) };
}

async function updateUserSettings(chatId, patch) {
  const current = await getUserSettings(chatId);
  const updated = { ...current, ...patch };
  await setJSON(`settings:${chatId}`, updated);
  return updated;
}

// "state" برای مکالمه‌های چندمرحله‌ای استفاده می‌شه، مثلاً وقتی منتظریم
// کاربر اسم دلخواه جدید رو تایپ کنه.
async function getState(chatId) {
  return getJSON(`state:${chatId}`);
}

async function setState(chatId, state) {
  await setJSON(`state:${chatId}`, state);
}

async function clearState(chatId) {
  await setJSON(`state:${chatId}`, null);
}

module.exports = {
  HAS_KV,
  COLORS,
  getUserSettings,
  updateUserSettings,
  getState,
  setState,
  clearState,
};
