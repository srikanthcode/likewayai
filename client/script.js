/**
 * Razorpay Real-Time Payment - Production Script
 * 
 * ⚠️ LIVE MODE - Real payments will be processed!
 */

// Configuration - LIVE MODE
const CONFIG = {
  API_URL: 'http://localhost:3000/api',
  RAZORPAY_KEY_ID: 'rzp_live_TDeiRBQhY6iUKf', // LIVE KEY
  CURRENCY: 'INR',
  COMPANY_NAME: 'Your Business'
};

// DOM Elements
const DOM = {
  amountBtns: document.querySelectorAll('.amount-btn:not(.custom)'),
  customBtn: document.getElementById('customBtn'),
  customInput: document.getElementById('customInput'),
  customAmount: document.getElementById('customAmount'),
  name: document.getElementById('customerName'),
  email: document.getElementById('customerEmail'),
  phone: document.getElementById('customerPhone'),
  payBtn: document.getElementById('payBtn'),
  payText: document.querySelector('.pay-text'),
  payLoader: document.querySelector('.pay-loader'),
  status: document.getElementById('status'),
  statusIcon: document.querySelector('.status-icon'),
  statusText: document.querySelector('.status-text'),
  paymentCard: document.querySelector('.payment-card'),
  orderCard: document.getElementById('orderCard'),
  orderId: document.getElementById('orderId'),
  paymentId: document.getElementById('paymentId'),
  paidAmount: document.getElementById('paidAmount'),
  newPaymentBtn: document.getElementById('newPaymentBtn')
};

// State
let selectedAmount = 1000;
let isProcessing = false;

/**
 * Initialize
 */
function init() {
  setupAmountSelection();
  setupFormValidation();
  setupPaymentButton();
  updatePayButton();
}

/**
 * Setup amount selection
 */
function setupAmountSelection() {
  // Preset amounts
  DOM.amountBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.amountBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAmount = parseInt(btn.dataset.amount);
      DOM.customInput.style.display = 'none';
      updatePayButton();
    });
  });

  // Custom amount
  DOM.customBtn.addEventListener('click', () => {
    DOM.amountBtns.forEach(b => b.classList.remove('active'));
    DOM.customBtn.classList.add('active');
    DOM.customInput.style.display = 'flex';
    DOM.customAmount.focus();
    updatePayButton();
  });

  // Custom amount input
  DOM.customAmount.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    if (value > 0) {
      selectedAmount = value;
      updatePayButton();
    }
  });
}

/**
 * Setup form validation
 */
function setupFormValidation() {
  [DOM.name, DOM.email, DOM.phone].forEach(input => {
    input.addEventListener('blur', validateField);
    input.addEventListener('input', clearError);
  });
}

/**
 * Validate single field
 */
function validateField(e) {
  const input = e.target;
  const value = input.value.trim();
  
  let valid = true;
  let msg = '';
  
  if (input === DOM.name && value.length < 2) {
    valid = false;
    msg = 'Enter your name';
  } else if (input === DOM.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    valid = false;
    msg = 'Enter valid email';
  } else if (input === DOM.phone && !/^[6-9]\d{9}$/.test(value)) {
    valid = false;
    msg = 'Enter 10-digit phone';
  }
  
  if (!valid && value) {
    input.style.borderColor = '#ef4444';
    input.setAttribute('data-error', msg);
  } else {
    input.style.borderColor = '#e5e7eb';
    input.removeAttribute('data-error');
  }
  
  return valid;
}

/**
 * Clear error on input
 */
function clearError(e) {
  e.target.style.borderColor = '#e5e7eb';
  e.target.removeAttribute('data-error');
}

/**
 * Validate all fields
 */
function validateForm() {
  const nameValid = validateField({ target: DOM.name });
  const emailValid = validateField({ target: DOM.email });
  const phoneValid = validateField({ target: DOM.phone });
  
  return nameValid && emailValid && phoneValid && selectedAmount > 0;
}

/**
 * Update pay button text
 */
function updatePayButton() {
  const formatted = new Intl.NumberFormat('en-IN').format(selectedAmount);
  DOM.payText.textContent = `Pay ₹${formatted}`;
}

/**
 * Setup payment button
 */
function setupPaymentButton() {
  DOM.payBtn.addEventListener('click', handlePayment);
  DOM.newPaymentBtn.addEventListener('click', resetForm);
}

/**
 * Handle payment
 */
async function handlePayment() {
  if (isProcessing || !validateForm()) return;
  
  setProcessing(true);
  showStatus('Creating order...', 'pending');
  
  try {
    // Create order
    const orderRes = await fetch(`${CONFIG.API_URL}/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: selectedAmount,
        currency: CONFIG.CURRENCY
      })
    });
    
    const orderData = await orderRes.json();
    
    if (!orderData.success) {
      throw new Error(orderData.error || 'Order creation failed');
    }
    
    showStatus('Opening payment window...', 'pending');
    
    // Open Razorpay
    const paymentData = await openCheckout(orderData.order);
    
    // Verify payment
    showStatus('Verifying payment...', 'pending');
    
    const verifyRes = await fetch(`${CONFIG.API_URL}/verify-payment`, {
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
      showSuccess(orderData.order.id, paymentData.razorpay_payment_id);
    } else {
      throw new Error('Payment verification failed');
    }
    
  } catch (error) {
    console.error('Payment error:', error);
    showStatus(error.message || 'Payment failed', 'error');
  } finally {
    setProcessing(false);
  }
}

/**
 * Open Razorpay checkout
 */
function openCheckout(order) {
  return new Promise((resolve, reject) => {
    const options = {
      key: CONFIG.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: CONFIG.COMPANY_NAME,
      description: `Payment of ₹${selectedAmount}`,
      order_id: order.id,
      handler: (response) => resolve(response),
      prefill: {
        name: DOM.name.value.trim(),
        email: DOM.email.value.trim(),
        contact: DOM.phone.value.trim()
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
 * Show success screen
 */
function showSuccess(orderId, paymentId) {
  DOM.paymentCard.style.display = 'none';
  DOM.orderCard.style.display = 'block';
  
  DOM.orderId.textContent = orderId;
  DOM.paymentId.textContent = paymentId;
  DOM.paidAmount.textContent = `₹${new Intl.NumberFormat('en-IN').format(selectedAmount)}`;
}

/**
 * Reset form
 */
function resetForm() {
  DOM.paymentCard.style.display = 'block';
  DOM.orderCard.style.display = 'none';
  
  DOM.name.value = '';
  DOM.email.value = '';
  DOM.phone.value = '';
  DOM.customAmount.value = '';
  DOM.customInput.style.display = 'none';
  
  DOM.amountBtns.forEach(b => b.classList.remove('active'));
  document.querySelector('[data-amount="1000"]').classList.add('active');
  selectedAmount = 1000;
  
  updatePayButton();
  hideStatus();
}

/**
 * Set processing state
 */
function setProcessing(processing) {
  isProcessing = processing;
  DOM.payBtn.disabled = processing;
  DOM.payText.style.display = processing ? 'none' : 'inline';
  DOM.payLoader.style.display = processing ? 'inline-flex' : 'none';
}

/**
 * Show status message
 */
function showStatus(message, type) {
  DOM.status.style.display = 'flex';
  DOM.status.className = `status ${type}`;
  DOM.statusText.textContent = message;
  DOM.statusIcon.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : '⏳';
}

/**
 * Hide status
 */
function hideStatus() {
  DOM.status.style.display = 'none';
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);