/**
 * LikeWay AI - Pricing & Payment Script
 * 
 * Handles plan selection, payment, and feature unlock
 */

// Configuration
const CONFIG = {
  API_URL: '/api/razorpay',
  RAZORPAY_KEY_ID: 'rzp_live_TDeiRBQhY6iUKf',
  COMPANY_NAME: 'LikeWay AI'
};

// Plan Details
const PLANS = {
  core: {
    name: 'Core',
    amount: 0,
    models: 2,
    responses: '200/day',
    features: ['Basic AI models', 'Web search', 'Voice input', 'Code snippets']
  },
  go: {
    name: 'Go',
    amount: 299,
    models: 5,
    responses: 'Unlimited',
    features: ['5 advanced models', 'Unlimited messages', 'Tool execution', 'File upload']
  },
  plus: {
    name: 'Plus',
    amount: 799,
    models: 10,
    responses: 'Unlimited',
    features: ['10 elite models', 'Deep Research', 'Image generation', 'Custom instructions']
  },
  pro: {
    name: 'Pro',
    amount: 1999,
    models: 12,
    responses: 'Unlimited',
    features: ['All 12 models', 'Early access', 'Voice Assistant', 'Priority support']
  }
};

// DOM Elements
const DOM = {
  planCards: document.querySelectorAll('.pricing-card'),
  planBtns: document.querySelectorAll('.plan-btn'),
  orderCard: document.getElementById('orderCard'),
  purchasedPlan: document.getElementById('purchasedPlan'),
  orderId: document.getElementById('orderId'),
  paymentId: document.getElementById('paymentId'),
  paidAmount: document.getElementById('paidAmount'),
  unlockText: document.getElementById('unlockText'),
  continueBtn: document.getElementById('continueBtn')
};

// State
let selectedPlan = null;
let isProcessing = false;

/**
 * Initialize
 */
function init() {
  setupPlanSelection();
  setupButtons();
}

/**
 * Setup plan selection
 */
function setupPlanSelection() {
  DOM.planBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (isProcessing) return;
      const plan = btn.dataset.plan;
      const amount = parseInt(btn.dataset.amount);
      handlePlanSelect(plan, amount);
    });
  });
}

/**
 * Handle plan selection
 */
function handlePlanSelect(plan, amount) {
  // If free plan, just activate
  if (amount === 0) {
    activatePlan(plan);
    return;
  }

  // Paid plan - open payment
  selectedPlan = plan;
  processPayment(plan, amount);
}

/**
 * Process payment for plan
 */
async function processPayment(plan, amount) {
  setProcessing(true, plan);

  try {
    // Create order
    const orderRes = await fetch(`${CONFIG.API_URL}?method=create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency: 'INR' })
    });

    const orderData = await orderRes.json();

    if (!orderData.success) {
      throw new Error(orderData.error || 'Order creation failed');
    }

    // Open Razorpay
    const paymentData = await openCheckout(orderData.order, plan);

    // Verify payment
    const verifyRes = await fetch(`${CONFIG.API_URL}?method=verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature
      })
    });

    const verifyData = await verifyRes.json();

    if (verifyData.success) {
      // Activate plan and redirect
      activatePlan(plan, orderData.order.id, paymentData.razorpay_payment_id);
    } else {
      throw new Error('Payment verification failed');
    }

  } catch (error) {
    console.error('Payment error:', error);
    alert(error.message || 'Payment failed. Please try again.');
  } finally {
    setProcessing(false);
  }
}

/**
 * Open Razorpay checkout
 */
function openCheckout(order, plan) {
  return new Promise((resolve, reject) => {
    const options = {
      key: CONFIG.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: CONFIG.COMPANY_NAME,
      description: `${PLANS[plan].name} Plan - ₹${PLANS[plan].amount}/month`,
      order_id: order.id,
      handler: (response) => resolve(response),
      prefill: {
        name: '',
        email: '',
        contact: ''
      },
      theme: {
        color: '#667eea'
      },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled'))
      }
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', (response) => {
      reject(new Error(response.error.description || 'Payment failed'));
    });
    rzp.open();
  });
}

/**
 * Activate plan after payment
 */
function activatePlan(plan, orderId = null, paymentId = null) {
  const planData = PLANS[plan];

  // Save to localStorage
  localStorage.setItem('lw_plan', plan);
  localStorage.setItem('lw_plan_name', planData.name);
  localStorage.setItem('lw_models', planData.models);
  localStorage.setItem('lw_responses', planData.responses);
  localStorage.setItem('lw_features', JSON.stringify(planData.features));
  localStorage.setItem('lw_activated', new Date().toISOString());

  if (orderId) localStorage.setItem('lw_order_id', orderId);
  if (paymentId) localStorage.setItem('lw_payment_id', paymentId);

  // Show success and redirect to chat
  showSuccess(plan);
}

/**
 * Show success screen and redirect to chat
 */
function showSuccess(plan) {
  const planData = PLANS[plan];

  // Hide pricing cards
  DOM.planCards.forEach(card => card.style.display = 'none');

  // Show success card
  DOM.orderCard.style.display = 'block';
  DOM.purchasedPlan.textContent = planData.name + ' Plan';
  DOM.paidAmount.textContent = planData.amount === 0 ? 'Free' : `₹${planData.amount}/month`;
  DOM.unlockText.textContent = `${planData.name} Plan Activated! 🎉`;

  // Redirect to chat after 2 seconds
  setTimeout(() => {
    window.location.href = '/chat';
  }, 2000);
}

/**
 * Setup button handlers
 */
function setupButtons() {
  if (DOM.continueBtn) {
    DOM.continueBtn.addEventListener('click', () => {
      window.location.href = '/chat';
    });
  }
}

/**
 * Set processing state
 */
function setProcessing(processing, plan = null) {
  isProcessing = processing;

  DOM.planBtns.forEach(btn => {
    if (btn.dataset.plan !== 'core') {
      btn.disabled = processing;
      if (processing && btn.dataset.plan === plan) {
        btn.innerHTML = '<span class="spinner"></span> Processing...';
      } else if (!processing) {
        // Restore original text
        const planName = btn.dataset.plan;
        btn.innerHTML = `Upgrade to ${planName.charAt(0).toUpperCase() + planName.slice(1)}`;
      }
    }
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', init);

// Export for debugging
window.likeWayPay = {
  getCurrentPlan: () => localStorage.getItem('lw_plan'),
  clearPlan: () => {
    localStorage.removeItem('lw_plan');
    localStorage.removeItem('lw_plan_name');
    localStorage.removeItem('lw_models');
    localStorage.removeItem('lw_responses');
    localStorage.removeItem('lw_features');
    localStorage.removeItem('lw_activated');
    localStorage.removeItem('lw_order_id');
    localStorage.removeItem('lw_payment_id');
    location.reload();
  }
};