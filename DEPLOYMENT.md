# LikeWay Production Deployment Guide

## Quick Start

### 1. Set Environment Variables in Vercel

Go to your Vercel Dashboard → Project → Settings → Environment Variables and add:

```
MONGODB_URI=<your MongoDB Atlas connection string>
MONGODB_DB_NAME=likeway_ai
JWT_SECRET=<generate a strong secret - see below>
GROQ_KEYS=<your keys>
MISTRAL_API_KEY=<your key>
GOOGLE_CLIENT_ID=<production value>
GOOGLE_CLIENT_SECRET=<production value>
RAZORPAY_KEY_ID=<live key>
RAZORPAY_KEY_SECRET=<live secret>
NEXT_PUBLIC_APP_URL=https://likeway.in
```

**Important:** Never commit your MongoDB URI to git. Keep it only in Vercel Environment Variables.

### 2. Generate Strong JWT Secret

Run this locally to generate a secure secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Select your cluster → Database Access
3. Create a database user with **readWrite** access to `likeway_ai` database
4. Go to Network Access → Add IP Address
5. Add `0.0.0.0/0` (Vercel uses dynamic IPs) or Vercel's IP ranges

### 4. Deploy to Vercel

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login
vercel login

# Deploy to production
vercel --prod
```

Or connect your GitHub repo to Vercel for automatic deployments.

---

## Environment Variables Checklist

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | ✅ | Database name (`likeway_ai`) |
| `JWT_SECRET` | ✅ | Strong random secret (64+ chars) |
| `GROQ_KEYS` | ✅ | AI provider keys |
| `MISTRAL_API_KEY` | ✅ | Mistral AI key |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `RAZORPAY_KEY_ID` | ✅ | Razorpay live key ID |
| `RAZORPAY_KEY_SECRET` | ✅ | Razorpay live key secret |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://likeway.in` |
| `STRIPE_SECRET_KEY` | ⬜ | If using Stripe |
| `TAVILY_API_KEY` | ⬜ | For web search feature |

---

## Post-Deployment Steps

### 1. Verify MongoDB Connection
Check Vercel Function Logs for:
```
[MongoDB] Connected successfully
```

If you see mock data warnings, MongoDB URI is not set correctly.

### 2. Test Authentication
- Visit `https://likeway.in/login`
- Test Google OAuth login
- Test email/password registration

### 3. Test Payments
- Use Razorpay test mode first
- Then switch to live keys

### 4. Custom Domain (Vercel)
1. Go to Project → Settings → Domains
2. Add `likeway.in`
3. Configure DNS as instructed by Vercel

---

## Security Checklist

- [ ] `.env.local` is NOT committed to git
- [ ] JWT_SECRET is a strong random string (64+ chars)
- [ ] Using LIVE Razorpay keys (not test keys)
- [ ] MongoDB has proper access controls
- [ ] Google OAuth redirect URIs include production domain
- [ ] All secrets are in Vercel Environment Variables, not in code

---

## Troubleshooting

### "MongoDB URI not set" warning
- Ensure `MONGODB_URI` is set in Vercel Dashboard
- Check for typos in the connection string

### Google OAuth fails
- Add `https://likeway.in` to authorized redirect URIs in Google Cloud Console
- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are production values

### Razorpay payments fail
- Ensure you're using **live** keys, not test keys
- Verify webhook endpoint: `https://likeway.in/api/webhook/razorpay`
