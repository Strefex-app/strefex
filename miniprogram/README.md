# PitchBook — Football Training WeChat Mini Program

WeChat mini program for **training scheduling**, **football session booking**, and **mobile payments** (WeChat Pay + Alipay). Backend API lives in the STREFEX FastAPI service under `/api/v1/football`.

## Features

- Weekly training schedule with session counts per day
- Browse and filter sessions (skills, fitness, tactics, youth)
- Session detail, booking confirmation, and my bookings
- WeChat login (`wx.login` → backend `jscode2session`)
- Payment sheet: **WeChat Pay** (native `wx.requestPayment`) and **Alipay** (WAP link / copy flow)
- Dev mock payments when merchant credentials are not configured

## Project structure

```
miniprogram/
  app.js / app.json / app.wxss
  config/index.js          # API base URL
  pages/                   # index, schedule, sessions, booking, payment, bookings, profile
  components/              # session-card, schedule-week, payment-sheet
  services/                # auth, session, booking API clients
  utils/                   # request, payment, formatting helpers
backend/app/api/v1/football_training.py   # REST API
```

## Quick start (WeChat DevTools)

**Web preview:** run the STREFEX frontend (`npm run dev`) and open [`/pitchbook`](http://localhost:5173/pitchbook) for an interactive browser demo of the mini program UI.

1. Install [WeChat Developer Tools](https://developers.weixin.qq.com/miniprogram/en/dev/devtools/download.html).
2. Open the `miniprogram/` folder as a mini program project.
3. Set your AppID in `project.config.json` (`appid` field) or use test AppID.
4. Generate tab bar icons (once):

   ```bash
   node miniprogram/scripts/generate-icons.mjs
   ```

5. Start the backend API (from repo root):

   ```bash
   cd backend
   pip install -r requirements.txt
   DEBUG=true uvicorn app.main:app --reload --port 8000
   ```

6. In DevTools: **Details → Local settings → Do not verify合法域名** (development only).
7. Update `miniprogram/config/index.js` if your API host differs from `http://localhost:8000/api/v1/football`.

## Backend environment variables

Add to `backend/.env` for production:

| Variable | Purpose |
|----------|---------|
| `WECHAT_MINI_APP_ID` | Mini program AppID |
| `WECHAT_MINI_APP_SECRET` | Mini program secret (for `jscode2session`) |
| `WECHAT_PAY_MCH_ID` | WeChat Pay merchant ID |
| `WECHAT_PAY_API_KEY` | WeChat Pay API v3 key / cert setup |
| `WECHAT_PAY_NOTIFY_URL` | Payment notify webhook URL |
| `ALIPAY_APP_ID` | Alipay application ID |
| `ALIPAY_PRIVATE_KEY` | RSA private key for signing |
| `ALIPAY_NOTIFY_URL` | Alipay async notify URL |
| `ALIPAY_RETURN_URL` | Return URL after WAP pay |

Without payment credentials, the API returns `mock: true` and the mini program simulates payment (requires `DEBUG=true` on the backend for `/payments/mock-confirm`).

## API overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/wechat-login` | Exchange `code` for JWT + user |
| GET | `/sessions` | List sessions (`date`, `category`, `level`) |
| GET | `/sessions/{id}` | Session detail |
| GET | `/schedule` | Session counts by date range |
| POST | `/bookings` | Create booking (auth) |
| GET | `/bookings` | List user bookings |
| POST | `/payments/wechat` | WeChat Pay unified order |
| POST | `/payments/alipay` | Alipay order / pay URL |
| POST | `/payments/mock-confirm` | Dev payment confirmation |

## Production checklist

1. Register mini program and configure **request合法域名** to your API host.
2. Enable WeChat Pay JSAPI for the mini program; upload API certs to your server.
3. Configure Alipay WAP / app pay and notify URLs.
4. Replace in-memory `FootballTrainingStore` with PostgreSQL tables and migrations.
5. Set `DEBUG=false` and disable `mock-confirm` in production.
6. Add WeChat / Alipay payment notify handlers to confirm bookings server-side.

## License

MIT (same as STREFEX platform)
