/**
 * LikeWay AI - Chat Interface
 */

// Configuration
const CONFIG = {
  API_URL: '/api/razorpay',
  RAZORPAY_KEY_ID: 'rzp_live_TDeiRBQhY6iUKf',
  COMPANY_NAME: 'LikeWay AI',
  // Multi-currency support
  CURRENCIES: {
    INR: { symbol: '₹', name: 'Indian Rupee', country: 'India' },
    USD: { symbol: '$', name: 'US Dollar', country: 'United States' },
    EUR: { symbol: '€', name: 'Euro', country: 'Europe' },
    GBP: { symbol: '£', name: 'British Pound', country: 'United Kingdom' },
    AED: { symbol: 'د.إ', name: 'UAE Dirham', country: 'UAE' },
    SGD: { symbol: 'S$', name: 'Singapore Dollar', country: 'Singapore' },
    AUD: { symbol: 'A$', name: 'Australian Dollar', country: 'Australia' },
    CAD: { symbol: 'C$', name: 'Canadian Dollar', country: 'Canada' },
    MYR: { symbol: 'RM', name: 'Malaysian Ringgit', country: 'Malaysia' },
    PHP: { symbol: '₱', name: 'Philippine Peso', country: 'Philippines' },
    BRL: { symbol: 'R$', name: 'Brazilian Real', country: 'Brazil' },
    JPY: { symbol: '¥', name: 'Japanese Yen', country: 'Japan' },
    KRW: { symbol: '₩', name: 'Korean Won', country: 'South Korea' },
    THB: { symbol: '฿', name: 'Thai Baht', country: 'Thailand' },
    IDR: { symbol: 'Rp', name: 'Indonesian Rupiah', country: 'Indonesia' }
  }
};

// DOM Elements
const DOM = {
  sidebar: document.getElementById('sidebar'),
  menuBtn: document.getElementById('menuBtn'),
  newChatBtn: document.getElementById('newChatBtn'),
  chatArea: document.getElementById('chatArea'),
  welcomeMessage: document.getElementById('welcomeMessage'),
  messagesContainer: document.getElementById('messagesContainer'),
  messageInput: document.getElementById('messageInput'),
  sendBtn: document.getElementById('sendBtn'),
  upgradeBtn: document.getElementById('upgradeBtn'),
  upgradeModal: document.getElementById('upgradeModal'),
  closeModal: document.getElementById('closeModal'),
  userPlan: document.getElementById('userPlan'),
  modelSelect: document.getElementById('modelSelect'),
  suggestionChips: document.querySelectorAll('.chip')
};

// State
let messages = [];
let isProcessing = false;

/**
 * Initialize
 */
function init() {
  setupEventListeners();
  checkUserPlan();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Menu toggle
  DOM.menuBtn.addEventListener('click', toggleSidebar);

  // New chat
  DOM.newChatBtn.addEventListener('click', startNewChat);

  // Send message
  DOM.sendBtn.addEventListener('click', sendMessage);
  DOM.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  DOM.messageInput.addEventListener('input', autoResize);

  // Suggestion chips
  DOM.suggestionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      DOM.messageInput.value = chip.dataset.prompt;
      autoResize();
      sendMessage();
    });
  });

  // Upgrade modal
  DOM.upgradeBtn.addEventListener('click', () => {
    DOM.upgradeModal.style.display = 'flex';
    updateModalPlans(); // Update plans when modal opens
  });

  DOM.closeModal.addEventListener('click', () => {
    DOM.upgradeModal.style.display = 'none';
  });

  // Currency selector
  const currencySelect = document.getElementById('currencySelect');
  if (currencySelect) {
    currencySelect.addEventListener('change', updateModalPlans);
  }
}

/**
 * Toggle sidebar
 */
function toggleSidebar() {
  DOM.sidebar.classList.toggle('open');
}

/**
 * Start new chat
 */
function startNewChat() {
  messages = [];
  DOM.messagesContainer.innerHTML = '';
  DOM.welcomeMessage.style.display = 'flex';
  DOM.messageInput.value = '';
  DOM.messageInput.focus();
}

/**
 * Auto-resize textarea
 */
function autoResize() {
  DOM.messageInput.style.height = 'auto';
  DOM.messageInput.style.height = Math.min(DOM.messageInput.scrollHeight, 200) + 'px';
  DOM.sendBtn.disabled = !DOM.messageInput.value.trim();
}

/**
 * Send message
 */
async function sendMessage() {
  const content = DOM.messageInput.value.trim();
  if (!content || isProcessing) return;

  // Hide welcome message
  DOM.welcomeMessage.style.display = 'none';

  // Add user message
  addMessage('user', content);

  // Clear input
  DOM.messageInput.value = '';
  autoResize();

  // Show typing indicator
  isProcessing = true;
  const typingId = showTypingIndicator();

  try {
    // Get AI response
    const response = await generateAIResponse(content);
    
    // Remove typing indicator
    removeTypingIndicator(typingId);

    // Add assistant message
    addMessage('assistant', response);

  } catch (error) {
    removeTypingIndicator(typingId);
    addMessage('assistant', 'Sorry, something went wrong. Please try again.');
  } finally {
    isProcessing = false;
  }
}

/**
 * Add message to chat
 */
function addMessage(role, content) {
  const message = { role, content, timestamp: new Date() };
  messages.push(message);

  const messageEl = createMessageElement(message);
  DOM.messagesContainer.appendChild(messageEl);

  // Scroll to bottom
  DOM.chatArea.scrollTop = DOM.chatArea.scrollHeight;
}

/**
 * Create message element
 */
function createMessageElement(message) {
  const div = document.createElement('div');
  div.className = `message ${message.role}`;

  const avatar = message.role === 'user' ? '👤' : '🤖';
  const roleName = message.role === 'user' ? 'You' : 'LikeWay AI';
  const time = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  div.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">
      <div class="message-header">
        <span class="message-role">${roleName}</span>
        <span class="message-time">${time}</span>
      </div>
      <div class="message-text">${formatMessage(message.content)}</div>
      <div class="message-actions">
        <button class="action-btn" onclick="copyMessage(this)">
          📋 Copy
        </button>
        <button class="action-btn" onclick="regenerateMessage(this)">
          🔄 Regenerate
        </button>
      </div>
    </div>
  `;

  return div;
}

/**
 * Format message content
 */
function formatMessage(content) {
  // Simple markdown-like formatting
  let formatted = content;

  // Code blocks
  formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

  // Inline code
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Line breaks
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'message assistant';
  div.id = id;

  div.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content">
      <div class="message-header">
        <span class="message-role">LikeWay AI</span>
      </div>
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;

  DOM.messagesContainer.appendChild(div);
  DOM.chatArea.scrollTop = DOM.chatArea.scrollHeight;

  return id;
}

/**
 * Remove typing indicator
 */
function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

/**
 * Generate AI response (simulated)
 */
async function generateAIResponse(query) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

  // Simple pattern-based responses
  const responses = {
    greeting: "Hello! I'm LikeWay AI, your intelligent assistant. How can I help you today?",
    
    help: "I can help you with:\n\n• **Answering questions** on any topic\n• **Writing code** in multiple languages\n• **Explaining concepts** from simple to advanced\n• **Creating content** like emails, articles, and more\n• **Analyzing data** and providing insights\n\nJust ask me anything!",
    
    code: "Here's an example code snippet:\n\n```javascript\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet('World'));\n```\n\nThis function takes a name as input and returns a greeting message.",
    
    default: `I understand you're asking about: "${query}"...\n\nHere's my response:\n\nThis is a simulated AI response. In production, this would connect to a real AI model like GPT-4 or Claude to provide intelligent answers.\n\n**Key Points:**\n• I process your query\n• I generate a relevant response\n• I format it for easy reading\n\nWould you like me to elaborate on any specific aspect?`
  };

  // Simple intent detection
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('hey')) {
    return responses.greeting;
  }
  
  if (lowerQuery.includes('help') || lowerQuery.includes('what can you do')) {
    return responses.help;
  }
  
  if (lowerQuery.includes('code') || lowerQuery.includes('function') || lowerQuery.includes('program')) {
    return responses.code;
  }

  return responses.default;
}

/**
 * Copy message to clipboard
 */
function copyMessage(btn) {
  const messageText = btn.closest('.message-content').querySelector('.message-text').innerText;
  navigator.clipboard.writeText(messageText);
  
  const originalText = btn.innerHTML;
  btn.innerHTML = '✓ Copied!';
  setTimeout(() => btn.innerHTML = originalText, 2000);
}

/**
 * Regenerate message
 */
function regenerateMessage(btn) {
  // Get the last user message
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (lastUserMessage) {
    // Remove last assistant message
    const lastAssistant = messages.pop();
    DOM.messagesContainer.lastElementChild.remove();
    
    // Resend
    DOM.messageInput.value = lastUserMessage.content;
    sendMessage();
  }
}

/**
 * Check user plan
 */
function checkUserPlan() {
  const plan = localStorage.getItem('lw_plan') || 'core';
  const planName = localStorage.getItem('lw_plan_name') || 'Free Plan';
  
  DOM.userPlan.querySelector('.plan-name').textContent = planName;
  
  if (plan !== 'core') {
    DOM.upgradeBtn.textContent = '✓ Active';
    DOM.upgradeBtn.style.background = '#10a37f';
  }
}

/**
 * Get user's currency based on location
 */
async function getUserCurrency() {
  try {
    // Try to detect currency from browser timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const currencyMap = {
      'Asia/Kolkata': 'INR',
      'Asia/Calcutta': 'INR',
      'America/New_York': 'USD',
      'America/Los_Angeles': 'USD',
      'America/Chicago': 'USD',
      'Europe/London': 'GBP',
      'Europe/Paris': 'EUR',
      'Europe/Berlin': 'EUR',
      'Asia/Dubai': 'AED',
      'Asia/Singapore': 'SGD',
      'Australia/Sydney': 'AUD',
      'America/Toronto': 'CAD',
      'Asia/Kuala_Lumpur': 'MYR',
      'Asia/Manila': 'PHP',
      'America/Sao_Paulo': 'BRL',
      'Asia/Tokyo': 'JPY',
      'Asia/Seoul': 'KRW',
      'Asia/Bangkok': 'THB',
      'Asia/Jakarta': 'IDR'
    };

    return currencyMap[timezone] || 'INR';
  } catch {
    return 'INR';
  }
}

/**
 * Format price with currency symbol
 */
function formatPrice(amount, currency = 'INR') {
  const curr = CONFIG.CURRENCIES[currency] || CONFIG.CURRENCIES.INR;
  return `${curr.symbol}${amount.toLocaleString()}`;
}

/**
 * Process payment
 */
async function processPayment(plan, amount, currency = 'INR') {
  try {
    // Detect user's currency
    const userCurrency = await getUserCurrency();
    const selectedCurrency = currency || userCurrency;

    // Create order with user's currency
    const orderRes = await fetch(`${CONFIG.API_URL}?method=create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        amount, 
        currency: selectedCurrency 
      })
    });

    const orderData = await orderRes.json();

    if (!orderData.success) {
      throw new Error(orderData.error);
    }

    // Open Razorpay with currency
    const paymentData = await openCheckout(orderData.order, plan, selectedCurrency);

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
      // Save plan with currency info
      localStorage.setItem('lw_plan', plan);
      localStorage.setItem('lw_plan_name', plan.charAt(0).toUpperCase() + plan.slice(1));
      localStorage.setItem('lw_currency', selectedCurrency);
      localStorage.setItem('lw_activated', new Date().toISOString());
      
      // Close modal and refresh
      DOM.upgradeModal.style.display = 'none';
      checkUserPlan();
      alert(`${plan.charAt(0).toUpperCase() + plan.slice(1)} plan activated successfully!`);
    }

  } catch (error) {
    console.error('Payment error:', error);
    alert(error.message || 'Payment failed');
  }
}

/**
 * Open Razorpay checkout
 */
function openCheckout(order, plan, currency = 'INR') {
  return new Promise((resolve, reject) => {
    const curr = CONFIG.CURRENCIES[currency] || CONFIG.CURRENCIES.INR;
    
    const options = {
      key: CONFIG.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: currency,
      name: CONFIG.COMPANY_NAME,
      description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - ${curr.symbol}${(order.amount / 100).toLocaleString()}`,
      order_id: order.id,
      handler: (response) => resolve(response),
      prefill: {
        name: '',
        email: '',
        contact: ''
      },
      theme: { color: '#10a37f' },
      modal: { 
        ondismiss: () => reject(new Error('Payment cancelled')),
        confirm_close: true
      },
      config: {
        display: {
          blocks: {
            utib: {
              name: `Pay using ${currency}`,
              instruments: [
                { method: 'upi' },
                { method: 'card' },
                { method: 'netbanking' },
                { method: 'wallet' }
              ]
            }
          },
          sequence: 1,
          preferences: {
            show_default_blocks: true
          }
        }
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
 * Update modal plans based on selected currency
 */
function updateModalPlans() {
  const currencySelect = document.getElementById('currencySelect');
  const modalPlans = document.getElementById('modalPlans');
  
  if (!currencySelect || !modalPlans) return;
  
  const currency = currencySelect.value;
  const curr = CONFIG.CURRENCIES[currency] || CONFIG.CURRENCIES.INR;
  
  // Price conversion rates (approximate)
  const rates = {
    INR: 1,
    USD: 0.012,
    EUR: 0.011,
    GBP: 0.0095,
    AED: 0.044,
    SGD: 0.016,
    AUD: 0.018,
    CAD: 0.016,
    MYR: 0.056,
    PHP: 0.67,
    BRL: 0.06,
    JPY: 1.8,
    KRW: 16,
    THB: 0.42,
    IDR: 190
  };
  
  const basePrices = {
    go: 299,
    plus: 799,
    pro: 1999
  };
  
  // Calculate prices in selected currency
  const prices = {
    go: Math.round(basePrices.go * rates[currency]),
    plus: Math.round(basePrices.plus * rates[currency]),
    pro: Math.round(basePrices.pro * rates[currency])
  };
  
  // Update modal HTML
  modalPlans.innerHTML = `
    <button class="modal-plan-btn" data-plan="go" data-amount="${prices.go}" data-currency="${currency}">
      Go - ${curr.symbol}${prices.go.toLocaleString()}/mo
    </button>
    <button class="modal-plan-btn" data-plan="plus" data-amount="${prices.plus}" data-currency="${currency}">
      Plus - ${curr.symbol}${prices.plus.toLocaleString()}/mo
    </button>
    <button class="modal-plan-btn" data-plan="pro" data-amount="${prices.pro}" data-currency="${currency}">
      Pro - ${curr.symbol}${prices.pro.toLocaleString()}/mo
    </button>
  `;
  
  // Reattach event listeners
  modalPlans.querySelectorAll('.modal-plan-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.dataset.plan;
      const amount = parseInt(btn.dataset.amount);
      const curr = btn.dataset.currency;
      processPayment(plan, amount, curr);
    });
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', init);