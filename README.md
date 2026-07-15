# Razorpay Live Payment Integration

## ⚠️ LIVE MODE - Real Payments

This integration is configured for **LIVE MODE**. Real payments will be processed!

---

## 🚀 Quick Start

### Option 1: Double-click start.bat
Just run `start.bat` and open http://localhost:3000

### Option 2: Manual Setup

```bash
# 1. Go to server folder
cd razorpay-integration/server

# 2. Install dependencies
npm install

# 3. Start server
node server.js
```

### Option 3: Using npm
```bash
cd razorpay-integration/server
npm start
```

---

## 📁 Project Structure

```
razorpay-integration/
├── start.bat          ← Double-click to run!
├── .env               ← API keys (DO NOT SHARE)
├── server/
│   ├── server.js      ← Backend API
│   └── package.json
├── client/
│   ├── index.html     ← Payment page
│   ├── script.js      ← Payment logic
│   └── style.css      ← Styling
└── verify/
    └── verify-payment.js
```

---

## 🔑 API Keys Configured

| Key | Status |
|-----|--------|
| RAZORPAY_KEY_ID | ✅ Live Mode |
| RAZORPAY_KEY_SECRET | ✅ Live Mode |
| NODE_ENV | ✅ Production |

---

## 💳 Payment Flow

1. User enters amount and details
2. Click "Pay" → Opens Razorpay popup
3. User completes payment
4. Payment verified server-side
5. Success screen shown

---

## 🧪 Test Before Going Live

If you want to test first, use these test cards:

| Card | Result |
|------|--------|
| 4111 1111 1111 1111 | ✅ Success |
| 4000 0000 0000 0002 | ❌ Declined |

**To switch to test mode:**
1. Get test keys from Razorpay Dashboard
2. Update `.env` file with test keys
3. Update `RAZORPAY_KEY_ID` in `client/script.js`

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/create-order | Create new order |
| POST | /api/verify-payment | Verify payment |
| GET | /api/payment/:id | Get payment details |
| GET | /api/health | Health check |

---

## 🔒 Security

- ✅ API keys stored in `.env` (not in code)
- ✅ Payment signature verification
- ✅ Server-side validation
- ✅ HTTPS ready (add SSL for production)

---

## 🚀 Production Deployment

Before going live:

1. **Add SSL Certificate** (HTTPS required)
2. **Set up Webhooks** in Razorpay Dashboard
3. **Use Environment Variables** on server
4. **Add Database** for order storage
5. **Enable Rate Limiting**

---

## 📞 Support

- Razorpay Docs: https://razorpay.com/docs/
- API Reference: https://razorpay.com/docs/api/

---

## ⚠️ Important Notes

- **LIVE MODE**: Real money will be charged
- **Keep keys secret**: Never share `.env` file
- **Test first**: Use test mode before going live
- **Webhooks**: Set up for production notifications