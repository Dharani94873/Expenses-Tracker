# 💰 Smart Expense Tracker

A secure, full-stack MERN web app for personal finance tracking — built for **Vercel deployment**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

---

## ✨ Features

- 🔐 **Secure Auth** — JWT access/refresh tokens, OTP email verification, optional 2FA, account lockout
- 💸 **Transaction CRUD** — Income & expense with categories, payment method, tags, receipt upload
- 🎯 **Budgets** — Per-category monthly limits with animated progress bars and threshold alerts
- 📊 **Dashboard** — Summary cards, monthly trend line chart, spending pie chart, recent transactions
- 📤 **Reports** — Export as PDF or Excel, yearly/monthly breakdown charts
- 🔔 **Notifications** — In-app + email alerts when budgets approach/exceed limits
- 🔄 **Recurring** — Recurring transactions processed by Vercel Cron daily
- 🌙 **Dark Mode** — Premium glassmorphism design

---

## 🏗️ Architecture

```
Vercel (single deployment)
├── /api/* → Express serverless (server/api/index.js)
└── /*     → React SPA (client/dist/)

MongoDB Atlas (cloud database)
Cloudinary (receipt image storage)
```

---

## 🚀 Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/expense-tracker
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel auto-detects `vercel.json` — no build config needed

### 3. Add Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` | 64-char hex string |
| `JWT_REFRESH_SECRET` | 64-char hex string |
| `JWT_ACCESS_EXPIRE` | `15m` |
| `JWT_REFRESH_EXPIRE` | `7d` |
| `ENCRYPTION_KEY` | 64-char hex string |
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | your Gmail |
| `EMAIL_PASS` | Gmail App Password |
| `EMAIL_FROM` | `ExpenseTracker <your@email.com>` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `CLIENT_URL` | `https://your-project.vercel.app` |
| `CRON_SECRET` | Random secret string |
| `NODE_ENV` | `production` |

### 4. Deploy!

Click **Deploy** — your app will be live at `https://your-project.vercel.app`

**Health check**: `https://your-project.vercel.app/api/health`

---

## 💻 Local Development

```bash
# Clone
git clone https://github.com/yourusername/expense-tracker
cd expense-tracker

# Backend setup
cd server
cp .env.example .env        # Fill in your values
npm install
npm run dev                  # Runs on http://localhost:5000

# Frontend setup (new terminal)
cd ../client
npm install
npm run dev                  # Runs on http://localhost:5173
```

The Vite dev server proxies `/api/*` to `localhost:5000` automatically.

---

## 🔑 Generate Secrets

```bash
# JWT secrets & encryption key
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Run twice for JWT_ACCESS_SECRET and JWT_REFRESH_SECRET
# Run once with randomBytes(32) for ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Recharts |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB Atlas |
| Auth | JWT, bcrypt, speakeasy (2FA) |
| Uploads | Cloudinary |
| Email | Nodemailer (Gmail SMTP) |
| Export | pdfkit, exceljs |
| Hosting | Vercel (frontend + serverless API) |

---

## 📁 Project Structure

```
├── vercel.json          # Routes /api/* → Express, /* → React
├── server/
│   ├── api/index.js     # Vercel serverless entry point
│   ├── app.js           # Express app (no listen())
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── utils/
└── client/
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   ├── context/
    │   └── services/
    └── vite.config.js   # /api proxy for local dev
```

---

## 🛡️ Security Features

- Passwords hashed with bcrypt (12 rounds)
- Access tokens expire in 15 minutes
- Refresh tokens rotated on each use
- Account lockout after 5 failed attempts (30 min)
- Rate limiting: 10 auth / 100 API requests per 15 min
- NoSQL injection protection (express-mongo-sanitize)
- HTTP parameter pollution protection (hpp)
- Security headers (helmet)
- AES-256-GCM encryption for 2FA secrets
- CORS restricted to Vercel domains + localhost

---

## 🕒 Vercel Cron Jobs

| Endpoint | Schedule | Function |
|---|---|---|
| `/api/cron/recurring` | Daily midnight UTC | Auto-creates recurring transactions |
| `/api/cron/budget-check` | Daily 6 AM UTC | Sends budget threshold alerts |

> Cron jobs require Vercel Pro. On free tier, trigger these endpoints manually or remove them.
