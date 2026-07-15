/**
 * Razorpay Real-Time Payment Server - Production
 * 
 * ⚠️ LIVE MODE - Real payments will be processed!
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../client'));

// Initialize Razorpay with LIVE keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// In-memory storage (use database in production)
const orders = new Map();

/**
 * Create Order
 */
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency,
      receipt: `rcpt_${Date.now()}`
    });

    orders.set(order.id, {
      ...order,
      status: 'created',
      created_at: new Date()
    });

    console.log(`✅ Order created: ${order.id} | ₹${amount}`);

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      }
    });

  } catch (error) {
    console.error('❌ Order error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Verify Payment
 */
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing verification data'
      });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // Update order status
      const order = orders.get(razorpay_order_id);
      if (order) {
        order.status = 'paid';
        order.payment_id = razorpay_payment_id;
        order.paid_at = new Date();
      }

      console.log(`✅ Payment verified: ${razorpay_payment_id}`);

      res.json({
        success: true,
        message: 'Payment verified',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id
      });

    } else {
      console.log(`❌ Signature mismatch: ${razorpay_order_id}`);
      res.status(400).json({
        success: false,
        error: 'Invalid signature'
      });
    }

  } catch (error) {
    console.error('❌ Verify error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get Payment Details
 */
app.get('/api/payment/:paymentId', async (req, res) => {
  try {
    const payment = await razorpay.payments.fetch(req.params.paymentId);
    
    res.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Webhook Handler
 */
app.post('/api/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    console.log(`📨 Webhook: ${event}`);

    // Handle events
    switch (event) {
      case 'payment.captured':
        console.log('💰 Payment captured');
        break;
      case 'payment.failed':
        console.log('❌ Payment failed');
        break;
    }

    res.json({ success: true });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Webhook failed' });
  }
});

/**
 * Health Check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'live',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔴 RAZORPAY LIVE MODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Server:  http://localhost:${PORT}
  Key ID:  ${process.env.RAZORPAY_KEY_ID}
  Secret:  ${process.env.RAZORPAY_KEY_SECRET ? '✅ Set' : '❌ Missing'}
  Mode:    LIVE (Real payments)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});