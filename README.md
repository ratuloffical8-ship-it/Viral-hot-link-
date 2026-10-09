# Monetag Viral Link System

ছবি + ক্যাপশন দিয়ে শর্ট লিংক বানান (`/v/abc123`)। শেয়ার করলে WhatsApp/Telegram/Facebook-এ প্রিভিউ দেখায়, ক্লিক করলে নিজস্ব Intermediate Page (`/go/abc123`) খোলে। Dashboard চলে Telegram Mini App হিসেবে।

## ফোল্ডার
- `backend/`  Express API + OG preview + keep-alive
- `frontend/` React (Vite): Dashboard, Create Link, Intermediate Page
- রুট `package.json` Render-এর build/start চালায় (একটাই সার্ভিস)

## সেটআপ ধাপ (এই ক্রমে করুন)

### 1) GitHub
1. `monetag-viral-link` নামে রেপো বানিয়ে পুরো প্রজেক্ট push করুন (`.env` push করবেন না)।
2. ব্যাকগ্রাউন্ড ছবির জন্য আলাদা **public** রেপো বানান (যেমন `bg-images`)। তাতে `images/1.jpg` থেকে `images/10.jpg` আপলোড করুন।
3. ছবি খোলে কিনা চেক করুন: `https://raw.githubusercontent.com/USER/bg-images/main/images/1.jpg`

### 2) Firebase
1. console.firebase.google.com → Add project।
2. Build → **Realtime Database** → Create database। এরপর Rules ট্যাবে এটা দিয়ে Publish করুন (সব অ্যাক্সেস ব্যাকএন্ডের মাধ্যমে, তাই পাবলিক বন্ধ):
   ```json
   { "rules": { ".read": false, ".write": false } }
   ```
3. ডাটাবেসের URL কপি করুন → `FIREBASE_DATABASE_URL`।
4. Project settings → Service accounts → **Generate new private key** → JSON ডাউনলোড।
5. JSON-কে base64 করুন:
   - Mac/Linux: `base64 -w 0 serviceAccountKey.json`
   - Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccountKey.json"))`
   
   আউটপুট → `FIREBASE_SERVICE_ACCOUNT_BASE64`।

### 3) ImgBB
api.imgbb.com → Get API key → `IMGBB_API_KEY`।

### 4) Telegram Bot
1. @BotFather → `/newbot` → টোকেন → `BOT_TOKEN`।
2. @userinfobot দিয়ে দুই অ্যাডমিনের numeric ID নিন → `ADMIN_TELEGRAM_IDS=111,222`।
3. Render deploy শেষে: BotFather → `/mybots` → বট → Bot Settings → Menu Button → Configure → আপনার সাইট URL দিন। এতে বটের চ্যাটে Mini App বাটন আসবে।

### 5) Render
1. render.com → New → **Web Service** → GitHub রেপো সিলেক্ট।
2. Name: `monetag-viral-link` (URL হবে `https://monetag-viral-link.onrender.com`)।
3. Runtime: Node · Plan: Free · Root Directory: খালি রাখুন।
4. Build Command: `npm run build` · Start Command: `npm start`।
5. Health Check Path: `/ping`।
6. Environment-এ নিচের ভেরিয়েবলগুলো বসান, তারপর Deploy।
7. প্রথম deploy-র পর URL পাবেন। `APP_BASE_URL` সেই URL দিয়ে সেট করে আবার Deploy করুন।

### 6) Monetag
1. Monetag-এ আপনার সাইট হিসেবে Render URL যোগ করুন।
2. Meta Tag ভেরিফিকেশন নিজে থেকেই হবে: সার্ভার `MONETAG_META_CONTENT` পেজে বসায়।
3. `frontend/public/sw.js` ফাইলে Monetag-এর domain ও zoneId আছে। Zone বদলালে এই ফাইলটি নিজে এডিট করে আবার push করতে হবে।
4. Dashboard → Monetag Settings থেকে Zone/Domain/Meta/Direct Link পরিবর্তন করা যায়। এটি ENV-এর উপরে প্রাধান্য পায় (তবে `sw.js` আলাদা)।

## Environment Variables (Render)

| Key | মান |
|---|---|
| NODE_VERSION | 20 |
| NODE_ENV | production |
| APP_BASE_URL | https://monetag-viral-link.onrender.com |
| BOT_TOKEN | BotFather-এর টোকেন |
| ADMIN_TELEGRAM_IDS | 111111111,222222222 |
| FIREBASE_DATABASE_URL | Firebase RTDB URL |
| FIREBASE_SERVICE_ACCOUNT_BASE64 | base64 JSON |
| IMGBB_API_KEY | ImgBB key |
| GITHUB_USER | GitHub ইউজারনেম |
| GITHUB_REPO | bg-images |
| GITHUB_BRANCH | main |
| GITHUB_IMAGES_PATH | images |
| BACKGROUND_IMAGE_COUNT | 10 |
| BACKGROUND_IMAGE_EXT | jpg |
| MONETAG_DOMAIN | 3nbf4.com |
| MONETAG_ZONE_ID | 11984257 |
| MONETAG_META_CONTENT | c5d47a0233493b07fc81743d5b51c253 |
| MONETAG_DIRECT_LINK | https://uplcm.com/4/11984259 |
| KEEP_ALIVE_ENABLED | true |
| KEEP_ALIVE_INTERVAL_MINUTES | 3 |

ঐচ্ছিক: `SITE_NAME`, `TIMEZONE` (ডিফল্ট Asia/Dhaka), `CORS_ORIGIN`। `PORT` সেট করবেন না (Render নিজে দেয়)।

## লোকাল রান
```bash
cp backend/.env.example backend/.env   # মান বসান, NODE_ENV=development
npm run install:all
npm run dev:backend     # টার্মিনাল 1
npm run dev:frontend    # টার্মিনাল 2 (http://localhost:5173)
```
`frontend/.env.local`-এ `VITE_DEV_ADMIN_ID=আপনার_telegram_id` দিলে Telegram ছাড়া লোকালে Dashboard খোলা যাবে।

## সমস্যা হলে
- **প্রিভিউ ছবি আসছে না:** Facebook Sharing Debugger / Telegram-এ লিংক পাঠিয়ে নতুন করে স্ক্র্যাপ করান। পুরনো ক্যাশ থাকলে কিছুক্ষণ লাগে।
- **Dashboard "Open from Telegram" দেখাচ্ছে:** Telegram-এর বটের Menu Button থেকে খুলুন, সরাসরি ব্রাউজার থেকে নয়।
- **403:** আপনার Telegram ID `ADMIN_TELEGRAM_IDS`-এ নেই।
- **Firebase error:** base64 ঠিক আছে কিনা এবং `FIREBASE_DATABASE_URL` সঠিক কিনা দেখুন।
- **সার্ভার ঘুমিয়ে যাচ্ছে:** `APP_BASE_URL` সঠিক সেট আছে কিনা দেখুন। ব্যাকআপ হিসেবে UptimeRobot-এ `/ping` প্রতি ৫ মিনিটে যোগ করতে পারেন।
- **Monetag অ্যাড আসছে না:** সাইট Monetag-এ অনুমোদিত কিনা, `sw.js`-এর domain/zoneId ঠিক কিনা, আর AdBlock বন্ধ কিনা দেখুন।
