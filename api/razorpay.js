/**
 * Razorpay API - Vercel Serverless Function
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req.query;

  try {
    // Create Order
    if (method === 'create-order' && req.method === 'POST') {
      const { amount, currency = 'INR' } = req.body;

      if (!amount || amount < 1) {
        return res.status(400).json({ success: false, error: 'Invalid amount' });
      }

      const order = await razorpay.orders.create({
        amount: amount * 100,
        currency,
        receipt: `rcpt_${Date.now()}`
      });

      console.log(`✅ Order created: ${order.id}`);
      return res.json({ success: true, order });
    }

    // Verify Payment
    if (method === 'verify-payment' && req.method === 'POST') {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Missing data' });
      }

      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      if (expectedSignature === razorpay_signature) {
        console.log(`✅ Payment verified: ${razorpay_payment_id}`);
        return res.json({
          success: true,
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id
        });
      } else {
        return res.status(400).json({ success: false, error: 'Invalid signature' });
      }
    }

    // Health Check
    if (method === 'health') {
      return res.json({
        status: 'ok',
        mode: process.env.RAZORPAY_KEY_ID?.includes('live') ? 'live' : 'test',
        hasKeys: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
      });
    }

    return res.status(400).json({ error: 'Invalid method' });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};