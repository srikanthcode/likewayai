/**
 * Payment Verification Utility
 * 
 * Use this to verify payments independently
 */

const crypto = require('crypto');

class PaymentVerifier {
  constructor(keySecret) {
    this.keySecret = keySecret;
  }

  /**
   * Verify Razorpay signature
   * @param {string} orderId - Order ID
   * @param {string} paymentId - Payment ID
   * @param {string} signature - Signature from Razorpay
   * @returns {boolean} - Is signature valid
   */
  verifySignature(orderId, paymentId, signature) {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Verify payment and return result
   * @param {Object} paymentData - Payment data from frontend
   * @returns {Object} - Verification result
   */
  verifyPayment(paymentData) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

    // Validate inputs
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return {
        success: false,
        error: 'Missing required payment data',
        code: 'MISSING_DATA'
      };
    }

    // Verify signature
    const isValid = this.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (isValid) {
      return {
        success: true,
        message: 'Payment verified successfully',
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      };
    } else {
      return {
        success: false,
        error: 'Payment verification failed - invalid signature',
        code: 'INVALID_SIGNATURE'
      };
    }
  }

  /**
   * Verify webhook signature
   * @param {string} body - Raw request body
   * @param {string} signature - Webhook signature
   * @param {string} webhookSecret - Webhook secret
   * @returns {boolean} - Is webhook valid
   */
  verifyWebhook(body, signature, webhookSecret) {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    return expectedSignature === signature;
  }
}

// Usage example
const verifier = new PaymentVerifier('YOUR_KEY_SECRET');

// Verify a payment
const result = verifier.verifyPayment({
  razorpay_order_id: 'order_123',
  razorpay_payment_id: 'pay_456',
  razorpay_signature: 'abc123'
});

console.log('Verification result:', result);

module.exports = PaymentVerifier;