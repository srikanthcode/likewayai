# ðŸš€ Deploy Razorpay to Live Server

## Deployment Options

| Platform | Difficulty | Free Tier | Best For |
|----------|------------|-----------|----------|
| **Railway** | Easy | âœ… $5 free | Quick deploy |
| **Render** | Easy | âœ… Free tier | Production apps |
| **Vercel + Railway** | Medium | âœ… Free | Frontend + Backend |
| **DigitalOcean** | Medium | âŒ $200 credit | Full control |
| **AWS** | Advanced | âœ… 12 months free | Enterprise |

---

## Option 1: Railway (Easiest - Recommended)

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub

### Step 2: Push to GitHub
```bash
# In your razorpay-integration folder
git init
git add .
git commit -m "Razorpay payment integration"
git remote add origin https://github.com/YOUR_USERNAME/razorpay-app.git
git push -u origin main
```

### Step 3: Deploy on Railway
1. Click "New Project" â†’ "Deploy from GitHub"
2. Select your repository
3. Add Environment Variables:
   ```
   RAZORPAY_KEY_ID=<YOUR_RAZORPAY_LIVE_KEY_ID>
   RAZORPAY_KEY_SECRET=<YOUR_RAZORPAY_LIVE_KEY_SECRET>
   NODE_ENV=production
   PORT=3000
   ```
4. Railway auto-deploys!
5. Your app URL: `https://your-app.up.railway.app`

---

## Option 2: Render (Free Tier)

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub

### Step 2: Create Web Service
1. Click "New" â†’ "Web Service"
2. Connect your GitHub repo
3. Settings:
   - **Name:** razorpay-payment
   - **Runtime:** Node
   - **Build Command:** `cd server && npm install`
   - **Start Command:** `cd server && node server.js`

### Step 3: Add Environment Variables
```
RAZORPAY_KEY_ID=<YOUR_RAZORPAY_LIVE_KEY_ID>
RAZORPAY_KEY_SECRET=<YOUR_RAZORPAY_LIVE_KEY_SECRET>
NODE_ENV=production
```

### Step 4: Deploy
Click "Create Web Service" - Done!

---

## Option 3: Vercel (Frontend) + Railway (Backend)

### Frontend on Vercel:
1. Go to https://vercel.com
2. Import your GitHub repo
3. Framework: Other
4. Root Directory: `client`
5. Deploy!

### Backend on Railway:
1. Follow Railway steps above
2. Use the Railway URL in your frontend config

---

## âš ï¸ Important: Update Frontend API URL

After deployment, update `client/script.js`:

```javascript
const CONFIG = {
  // Change localhost to your deployed backend URL
  API_URL: 'https://your-backend.up.railway.app/api',
  RAZORPAY_KEY_ID: '<YOUR_RAZORPAY_LIVE_KEY_ID>',
  CURRENCY: 'INR',
  COMPANY_NAME: 'Your Business Name'
};
```

---

## ðŸ”’ Security Checklist

Before going live:

- [ ] Environment variables set on hosting platform
- [ ] `.env` file NOT pushed to GitHub (check .gitignore)
- [ ] Razorpay webhooks configured in dashboard
- [ ] HTTPS enabled (all platforms above provide this)
- [ ] Test with small amount first
- [ ] Set up payment notification emails

---

## ðŸ§ª Test After Deployment

1. Open your deployed URL
2. Make a small test payment (â‚¹1)
3. Check Razorpay dashboard for transaction
4. Verify payment shows in your app

---

## ðŸ“Š Monitor Your App

### Railway Dashboard
- View logs: Real-time logs
- Metrics: CPU, Memory usage
- Deployments: Auto-deploy on git push

### Render Dashboard
- Logs: Real-time streaming
- Metrics: Response times
- Alerts: Set up notifications

---

## ðŸ”„ Auto-Deploy Setup

All platforms auto-deploy when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update payment flow"
git push

# Platform auto-deploys in ~1 minute!
```

---

## ðŸ’° Cost Estimates

| Platform | Free Tier | Paid Plans |
|----------|-----------|------------|
| Railway | $5/month free | $5-20/month |
| Render | 750 hours/month | $7-25/month |
| Vercel | 100GB bandwidth | $20/month |
| DigitalOcean | $200 credit | $5-60/month |

---

## ðŸ†˜ Troubleshooting

### "Application failed to respond"
- Check logs on platform
- Verify start command is correct
- Ensure PORT environment variable is set

### "CORS errors"
- Update FRONTEND_URL in environment variables
- Add your frontend URL to CORS whitelist

### "Payment fails"
- Double-check API keys
- Ensure LIVE mode keys are used
- Check Razorpay dashboard for errors

---

## ðŸ“ž Support

- Railway: https://railway.app/docs
- Render: https://render.com/docs
- Vercel: https://vercel.com/docs

---

**Recommended: Start with Railway - easiest and fastest!**