# 🚀 Quick Setup Guide

## ⚠️ IMPORTANT: Security First

**You shared LIVE API keys! Immediately:**
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys)
2. Regenerate both keys
3. Use NEW keys in this project

---

## 📋 Step-by-Step Setup

### Step 1: Install Dependencies

```bash
cd razorpay-integration/server
npm install
```

### Step 2: Configure Environment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your **NEW** API keys:
   ```
   RAZORPAY_KEY_ID=rzp_live_YOUR_NEW_KEY
   RAZORPAY_KEY_SECRET=YOUR_NEW_SECRET
   ```

### Step 3: Update Frontend Key

Edit `client/script.js` and replace the Razorpay key:

```javascript
const CONFIG = {
  RAZORPAY_KEY_ID: 'rzp_live_YOUR_NEW_KEY', // Use same key as backend
  // ...
};
```

### Step 4: Start the Server

```bash
cd server
npm start
```

You should see:
```
🚀 Razorpay Payment Server Running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 URL: http://localhost:3000
🔑 API Key: ✅ Configured
🔐 Secret: ✅ Configured
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 5: Test Payment

1. Open browser: `http://localhost:3000`
2. Enter test details
3. Click "Pay Now"
4. Use test card: `4111 1111 1111 1111`
5. CVV: `123`, Expiry: Any future date

---

## 🧪 Test Cards

| Card Number | Result |
|-------------|--------|
| 4111 1111 1111 1111 | ✅ Success |
| 4000 0000 0000 0002 | ❌ Failure |
| 4000 0000 0000 0003 | ❌ Failure |

---

## 🔧 Troubleshooting

### Error: "Key ID missing"
- Check `.env` file exists
- Verify `RAZORPAY_KEY_ID` is set

### Error: "Invalid signature"
- Ensure `RAZORPAY_KEY_SECRET` matches your dashboard
- Check for extra spaces

### Error: "CORS error"
- Server must run on `localhost:3000`
- Frontend must be served from same origin

### Payment popup doesn't open
- Check browser console for errors
- Verify Razorpay script is loaded
- Ensure amount is in paise (₹100 = 10000 paise)

---

## 📚 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/create-order` | Create new order |
| POST | `/api/verify-payment` | Verify payment |
| GET | `/api/payment/:id` | Get payment details |
| GET | `/api/order/:id` | Get order details |
| POST | `/api/webhook` | Razorpay webhook |
| POST | `/api/refund` | Refund payment |
| GET | `/api/health` | Health check |

---

## 🚀 Production Checklist

Before going live:

- [ ] Use HTTPS (SSL certificate)
- [ ] Set up webhooks in Razorpay Dashboard
- [ ] Use environment variables (never hardcode keys)
- [ ] Enable payment signature verification
- [ ] Set up database for order storage
- [ ] Add rate limiting
- [ ] Set up error monitoring
- [ ] Test with real (small) amounts
- [ ] Configure refund policies
- [ ] Set up email notifications

---

## 📖 Resources

- [Razorpay Docs](https://razorpay.com/docs/)
- [API Reference](https://razorpay.com/docs/api/)
- [Test Cards](https://razorpay.com/docs/payments/testing/)

---

## ⚠️ Final Reminder

**NEVER commit your API keys to Git!**

Always use `.env` file and add it to `.gitignore`.