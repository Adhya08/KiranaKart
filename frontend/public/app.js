/**
 * KiranaKart Secure Frontend Application
 * Single Page Application for Customers, Store Owners, Admins, and DPDP Compliance Reviewers
 */

const state = {
  currentUser: null,
  token: localStorage.getItem('kk_token') || null,
  activeTab: 'store', // 'store', 'cart', 'orders', 'privacy', 'store_portal', 'admin', 'scanner'
  products: [],
  categories: [],
  selectedCategory: 'All',
  searchQuery: '',
  cart: JSON.parse(localStorage.getItem('kk_cart') || '[]'),
  userOrders: [],
  activeConsents: { essential: true, order_updates: false, marketing: false, analytics: false },
  selectedLanguage: 'en',
  noticeData: null,
  grievanceTickets: [],
  nominee: null,
  scannerOverview: null,
  storeDashboard: null,
  auditLogs: [],
  adminUsers: []
};

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function createToastContainer() {
  const div = document.createElement('div');
  div.id = 'toast-container';
  div.className = 'toast-container';
  document.body.appendChild(div);
  return div;
}

// API Fetch Helper with Bearer token & Error Handling
async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(state.token ? { 'Authorization': `Bearer ${state.token}` } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

// Initialize Application
async function init() {
  try {
    // 1. Check existing session or default to customer Aarav
    if (state.token) {
      try {
        const res = await api('/api/auth/me');
        state.currentUser = res.user;
      } catch (e) {
        // Fallback login
        await switchPersona('customer');
      }
    } else {
      await switchPersona('customer');
    }

    // 2. Fetch Initial Data
    await loadProducts();
    await loadPrivacyNotice();
    if (state.currentUser) {
      await loadUserPrivacyState();
    }
    await loadScannerOverview();
  } catch (err) {
    console.error('Initialization error:', err);
  }

  render();
}

// Persona Switcher
async function switchPersona(type) {
  const credentials = {
    customer: { identifier: 'aarav@example.com', password: 'Password123!' },
    store_owner: { identifier: 'ramesh@example.com', password: 'Password123!' },
    admin: { identifier: 'admin@example.com', password: 'Password123!' },
    minor: { identifier: 'ananya.minor@example.com', password: 'Password123!' }
  };

  const target = credentials[type];
  if (!target) return;

  try {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(target)
    });

    state.currentUser = res.user;
    state.token = res.token;
    localStorage.setItem('kk_token', res.token);

    // If switching to store_owner, switch tab to store_portal
    if (type === 'store_owner') state.activeTab = 'store_portal';
    else if (type === 'admin') state.activeTab = 'admin';
    else if (type === 'minor') state.activeTab = 'privacy';
    else state.activeTab = 'store';

    await loadUserPrivacyState();
    if (type === 'store_owner' || type === 'admin') await loadStoreDashboard();
    if (type === 'admin') await loadAdminData();

    showToast(`Switched active persona to ${res.user.name} (${res.user.role})`, 'success');
  } catch (err) {
    showToast(`Persona switch failed: ${err.message}`, 'error');
  }

  render();
}

async function loadProducts() {
  try {
    const params = new URLSearchParams();
    if (state.selectedCategory !== 'All') params.append('category', state.selectedCategory);
    if (state.searchQuery) params.append('search', state.searchQuery);

    const res = await api(`/api/catalogue/products?${params.toString()}`);
    state.products = res.products || [];
    state.categories = ['All', ...(res.categories || [])];
  } catch (err) {
    console.error('Failed to load products:', err);
  }
}

async function loadPrivacyNotice() {
  try {
    const res = await api(`/api/privacy/notice?lang=${state.selectedLanguage}`);
    state.noticeData = res;
  } catch (err) {
    console.error('Failed to load notice:', err);
  }
}

async function loadUserPrivacyState() {
  if (!state.currentUser) return;
  try {
    const [cRes, oRes, gRes, nRes] = await Promise.all([
      api('/api/privacy/consent').catch(() => ({ consents: {} })),
      api('/api/orders').catch(() => ({ orders: [] })),
      api('/api/privacy/grievances').catch(() => ({ tickets: [] })),
      api('/api/privacy/nominee').catch(() => ({ nominee: null }))
    ]);

    state.activeConsents = cRes.consents || { essential: true };
    state.userOrders = oRes.orders || [];
    state.grievanceTickets = gRes.tickets || [];
    state.nominee = nRes.nominee || null;
  } catch (err) {
    console.error('Failed to load user privacy state:', err);
  }
}

async function loadScannerOverview() {
  try {
    const res = await api('/api/privacy/sdf-status');
    // Also fetch controls manifest via public mock/admin if available
    state.scannerOverview = {
      sdfStatus: res.sdf_status,
      provisions: res.statutory_provisions
    };
  } catch (e) {
    // Graceful fallback
  }
}

async function loadStoreDashboard() {
  try {
    const res = await api('/api/store/dashboard');
    state.storeDashboard = res;
  } catch (e) {
    console.error('Store dashboard load failed:', e);
  }
}

async function loadAdminData() {
  try {
    const [uRes, aRes, cRes] = await Promise.all([
      api('/api/admin/users'),
      api('/api/admin/audit-logs'),
      api('/api/admin/compliance-overview')
    ]);
    state.adminUsers = uRes.users || [];
    state.auditLogs = aRes.logs || [];
    state.complianceDetails = cRes;
  } catch (e) {
    console.error('Admin load failed:', e);
  }
}

// Cart Actions
function addToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  const existing = state.cart.find(item => item.productId === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      productId: product.id,
      name: product.name,
      price: product.discount_price || product.price,
      unit: product.unit,
      quantity: 1
    });
  }

  localStorage.setItem('kk_cart', JSON.stringify(state.cart));
  showToast(`Added ${product.name} to cart`, 'success');
  render();
}

function updateCartQty(productId, delta) {
  const item = state.cart.find(i => i.productId === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter(i => i.productId !== productId);
  }

  localStorage.setItem('kk_cart', JSON.stringify(state.cart));
  render();
}

async function checkoutOrder() {
  if (state.cart.length === 0) return;
  const address = document.getElementById('delivery-address-input')?.value || 'Flat 402, Green Glen Layout, Bellandur, Bengaluru';
  const coupon = document.getElementById('coupon-code-input')?.value || '';

  try {
    const res = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: state.cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
        deliveryAddress: address,
        couponCode: coupon
      })
    });

    state.cart = [];
    localStorage.removeItem('kk_cart');
    showToast(res.message, 'success');
    state.activeTab = 'orders';
    await loadUserPrivacyState();
    render();
  } catch (err) {
    showToast(`Order failed: ${err.message}`, 'error');
  }
}

// DPDP Consent Toggle
async function toggleConsent(purpose, isGranted) {
  try {
    await api('/api/privacy/consent', {
      method: 'POST',
      body: JSON.stringify({
        purpose,
        status: isGranted ? 'granted' : 'withdrawn'
      })
    });

    state.activeConsents[purpose] = isGranted;
    showToast(`Consent for '${purpose}' ${isGranted ? 'granted' : 'withdrawn'} (Ledger updated)`, 'success');
    render();
  } catch (err) {
    showToast(`Consent update failed: ${err.message}`, 'error');
  }
}

// Right to Erasure Action
async function handleRightToErasure() {
  if (!confirm('DPDP Section 12 Right to Erasure:\n\nAre you sure you want to permanently erase your personal data? Your name, contact details, addresses, and account will be irreversibly expunged.')) {
    return;
  }

  try {
    const res = await api('/api/privacy/request-erasure', { method: 'POST' });
    showToast(res.message, 'success');
    // Log user out
    state.currentUser = null;
    state.token = null;
    localStorage.removeItem('kk_token');
    await switchPersona('customer');
  } catch (err) {
    showToast(`Erasure failed: ${err.message}`, 'error');
  }
}

// Download My Data
function triggerDataDownload() {
  window.open(`/api/privacy/download-my-data?token=${state.token}`, '_blank');
  showToast('DPDP Section 11 export generated. Downloading JSON archive...', 'success');
}

// Parent Consent Verification for Minors
async function verifyParentConsent() {
  if (!state.currentUser?.id) return;
  const otp = prompt('Enter 6-digit Parent Verification OTP (Demo OTP: 123456):', '123456');
  if (!otp) return;

  try {
    const res = await api('/api/auth/verify-parental-consent', {
      method: 'POST',
      body: JSON.stringify({ minorUserId: state.currentUser.id, otp })
    });
    showToast(res.message, 'success');
    state.currentUser.parental_consent_verified = true;
    render();
  } catch (e) {
    showToast(`Verification failed: ${e.message}`, 'error');
  }
}

// Render Functions
function render() {
  const app = document.getElementById('app');
  if (!app) return;

  const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  app.innerHTML = `
    <!-- Top Persona Quick-Switcher -->
    <div class="persona-bar">
      <div>
        <strong>🎭 Active Persona:</strong> ${state.currentUser ? escape(state.currentUser.name) : 'Guest'}
        <span class="status-pill ${state.currentUser?.role === 'admin' ? 'status-danger' : (state.currentUser?.is_minor ? 'status-warning' : 'status-clean')}" style="margin-left: 8px;">
          ${state.currentUser ? (state.currentUser.is_minor ? 'MINOR PRINCIPAL (<18)' : state.currentUser.role.toUpperCase()) : 'NONE'}
        </span>
      </div>
      <div class="persona-buttons">
        <span>Quick Switch:</span>
        <button class="persona-btn ${state.currentUser?.email === 'aarav@example.com' ? 'active' : ''}" onclick="switchPersona('customer')">🛒 Customer (Aarav)</button>
        <button class="persona-btn ${state.currentUser?.email === 'ramesh@example.com' ? 'active' : ''}" onclick="switchPersona('store_owner')">🏪 Store Owner (Ramesh)</button>
        <button class="persona-btn ${state.currentUser?.email === 'admin@example.com' ? 'active' : ''}" onclick="switchPersona('admin')">⚙️ Admin (Meera)</button>
        <button class="persona-btn ${state.currentUser?.email === 'ananya.minor@example.com' ? 'active' : ''}" onclick="switchPersona('minor')">👶 Minor User (Ananya, 15yo)</button>
      </div>
    </div>

    <!-- Main Header -->
    <header>
      <div class="header-container">
        <div class="logo-area" onclick="state.activeTab = 'store'; render();">
          <div class="logo-badge">🛒</div>
          <div>
            <div class="logo-title">KiranaKart <span style="font-size: 13px; font-weight: 700; color: #166534; background: #dcfce7; padding: 2px 8px; border-radius: 6px;">SECURE</span></div>
            <div class="logo-tagline">Hardened, DPDP-Compliant Hyperlocal Groceries</div>
          </div>
        </div>

        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            class="search-input" 
            placeholder="Search fresh produce, dairy, staples, snacks..." 
            value="${escape(state.searchQuery)}"
            oninput="state.searchQuery = this.value; loadProducts().then(render);"
          />
        </div>

        <div class="header-actions">
          <select class="lang-select" onchange="state.selectedLanguage = this.value; loadPrivacyNotice().then(render);">
            <option value="en" ${state.selectedLanguage === 'en' ? 'selected' : ''}>English</option>
            <option value="hi" ${state.selectedLanguage === 'hi' ? 'selected' : ''}>हिन्दी (Hindi)</option>
            <option value="kn" ${state.selectedLanguage === 'kn' ? 'selected' : ''}>ಕನ್ನಡ (Kannada)</option>
            <option value="ta" ${state.selectedLanguage === 'ta' ? 'selected' : ''}>தமிழ் (Tamil)</option>
            <option value="te" ${state.selectedLanguage === 'te' ? 'selected' : ''}>తెలుగు (Telugu)</option>
            <option value="bn" ${state.selectedLanguage === 'bn' ? 'selected' : ''}>বাংলা (Bengali)</option>
          </select>

          <button class="cart-pill" onclick="state.activeTab = 'cart'; render();">
            <span>🛍️ Cart</span>
            <span style="background: white; color: var(--primary); border-radius: 10px; padding: 2px 8px; font-size: 12px;">${cartCount}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Navigation Tabs -->
    <nav class="tab-nav">
      <div class="nav-container">
        <button class="nav-tab ${state.activeTab === 'store' ? 'active' : ''}" onclick="state.activeTab = 'store'; render();">🛒 Grocery Store</button>
        <button class="nav-tab ${state.activeTab === 'cart' ? 'active' : ''}" onclick="state.activeTab = 'cart'; render();">🛍️ Cart & Checkout (${cartCount})</button>
        <button class="nav-tab ${state.activeTab === 'orders' ? 'active' : ''}" onclick="state.activeTab = 'orders'; render();">📦 My Orders (${state.userOrders.length})</button>
        <button class="nav-tab ${state.activeTab === 'privacy' ? 'active' : ''}" onclick="state.activeTab = 'privacy'; render();">🛡️ Privacy & DPDP Center</button>
        ${(state.currentUser?.role === 'store_owner' || state.currentUser?.role === 'admin') ? `
          <button class="nav-tab ${state.activeTab === 'store_portal' ? 'active' : ''}" onclick="state.activeTab = 'store_portal'; loadStoreDashboard().then(render);">🏪 Store Owner Portal</button>
        ` : ''}
        ${state.currentUser?.role === 'admin' ? `
          <button class="nav-tab ${state.activeTab === 'admin' ? 'active' : ''}" onclick="state.activeTab = 'admin'; loadAdminData().then(render);">⚙️ Admin Control Panel</button>
        ` : ''}
        <button class="nav-tab ${state.activeTab === 'scanner' ? 'active' : ''}" onclick="state.activeTab = 'scanner'; render();">🔍 Security & Compliance Benchmark</button>
      </div>
    </nav>

    <!-- Main Content -->
    <main>
      ${renderActiveTab()}
    </main>

    <!-- Footer -->
    <footer>
      <div class="footer-content">
        <div>
          <strong>KiranaKart Technologies Private Limited</strong> • CIN: U72200DL2024PTC998877
          <br>
          Grievance Officer & DPO: Smt. Priyanka Sharma (<code>dpo@kiranakart.local</code>) • 72-Hour Statutory SLA
        </div>
        <div>
          <span>DPDP Act 2023 Compliant</span> • 
          <a href="#" onclick="state.activeTab = 'privacy'; render(); return false;" style="color: var(--primary); text-decoration: none;">Privacy Notice</a> • 
          <a href="https://dpbi.gov.in" target="_blank" style="color: var(--primary); text-decoration: none;">Data Protection Board of India</a>
        </div>
      </div>
    </footer>
  `;
}

function renderActiveTab() {
  switch (state.activeTab) {
    case 'store': return renderStoreTab();
    case 'cart': return renderCartTab();
    case 'orders': return renderOrdersTab();
    case 'privacy': return renderPrivacyTab();
    case 'store_portal': return renderStorePortalTab();
    case 'admin': return renderAdminTab();
    case 'scanner': return renderScannerBenchmarkTab();
    default: return renderStoreTab();
  }
}

// Grocery Store Tab
function renderStoreTab() {
  return `
    <!-- Categories Filter Pills -->
    <div class="category-filter">
      ${state.categories.map(cat => `
        <button class="cat-chip ${state.selectedCategory === cat ? 'active' : ''}" onclick="state.selectedCategory = '${escape(cat)}'; loadProducts().then(render);">
          ${escape(cat)}
        </button>
      `).join('')}
    </div>

    <!-- Product Grid -->
    <div class="product-grid">
      ${state.products.length === 0 ? `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: white; border-radius: 12px;">
          <h3>No grocery items found</h3>
          <p style="color: var(--muted); margin-top: 8px;">Try modifying your keyword search or selected category filter.</p>
        </div>
      ` : state.products.map(p => `
        <div class="product-card">
          <div class="product-img-wrap">
            <img class="product-img" src="${escape(p.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400')}" alt="${escape(p.name)}" />
          </div>
          <div class="product-body">
            <div class="product-cat">${escape(p.category)}</div>
            <div class="product-name">${escape(p.name)}</div>
            <div class="product-desc">${escape(p.description || '')}</div>
            <div class="product-pricing">
              <span class="current-price">₹${Number(p.discount_price || p.price).toFixed(2)}</span>
              ${p.discount_price && p.discount_price < p.price ? `<span class="original-price">₹${Number(p.price).toFixed(2)}</span>` : ''}
              <span class="unit-tag">/ ${escape(p.unit)}</span>
            </div>
            <button class="add-cart-btn" onclick="addToCart('${p.id}')">+ Add to Cart</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Cart & Checkout Tab
function renderCartTab() {
  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = subtotal > 199 ? 0 : 25;
  const grandTotal = subtotal + deliveryFee;

  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 24px;">
      <!-- Items List -->
      <div class="card">
        <h2 class="card-title">🛍️ Your Grocery Cart (${state.cart.length} items)</h2>
        ${state.cart.length === 0 ? `
          <div style="text-align: center; padding: 40px 0; color: var(--muted);">
            <p style="font-size: 32px; margin-bottom: 8px;">🛒</p>
            <p>Your shopping cart is empty.</p>
            <button class="btn-primary" style="margin-top: 14px;" onclick="state.activeTab = 'store'; render();">Explore Groceries</button>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">
            ${state.cart.map(item => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border);">
                <div>
                  <div style="font-weight: 600; font-size: 14px;">${escape(item.name)}</div>
                  <div style="font-size: 12px; color: var(--muted);">₹${item.price.toFixed(2)} / ${escape(item.unit)}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <button class="btn-outline" style="padding: 2px 8px;" onclick="updateCartQty('${item.productId}', -1)">-</button>
                  <span style="font-weight: 700; font-size: 14px;">${item.quantity}</span>
                  <button class="btn-outline" style="padding: 2px 8px;" onclick="updateCartQty('${item.productId}', 1)">+</button>
                  <span style="font-weight: 700; width: 70px; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Checkout Details -->
      <div class="card">
        <h2 class="card-title">⚡ Checkout & Delivery (10 Mins)</h2>
        <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 16px;">
          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--slate);">Delivery Address</label>
            <textarea id="delivery-address-input" class="search-input" style="border-radius: 8px; height: 70px; padding: 10px; margin-top: 4px;" placeholder="House/Flat number, Street, Landmark, Pin Code">Flat 402, Green Glen Layout, Bellandur, Bengaluru</textarea>
          </div>

          <div>
            <label style="font-size: 12px; font-weight: 700; color: var(--slate);">Apply Promotional Coupon (Try: FRESH10, KIRANA50)</label>
            <div style="display: flex; gap: 8px; margin-top: 4px;">
              <input type="text" id="coupon-code-input" class="search-input" style="border-radius: 8px; text-transform: uppercase;" placeholder="FRESH10" />
            </div>
          </div>

          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid var(--border); font-size: 14px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>Cart Subtotal:</span>
              <span>₹${subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span>Delivery Partner Fee:</span>
              <span>${deliveryFee === 0 ? '<strong style="color: var(--primary);">FREE</strong>' : `₹${deliveryFee.toFixed(2)}`}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 16px; border-top: 1px solid var(--border); padding-top: 8px; margin-top: 4px;">
              <span>Total Payable:</span>
              <span style="color: var(--primary);">₹${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <button class="btn-primary" style="width: 100%; padding: 14px; font-size: 15px;" onclick="checkoutOrder()" ${state.cart.length === 0 ? 'disabled' : ''}>
            Place Order via Mock UPI (₹${grandTotal.toFixed(2)})
          </button>
        </div>
      </div>
    </div>
  `;
}

// My Orders Tab
function renderOrdersTab() {
  return `
    <div class="card">
      <h2 class="card-title">📦 Order History & Invoices</h2>
      ${state.userOrders.length === 0 ? `
        <div style="text-align: center; padding: 40px; color: var(--muted);">
          <p>No previous orders found for your profile.</p>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 16px; margin-top: 16px;">
          ${state.userOrders.map(order => `
            <div style="border: 1px solid var(--border); border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div>
                <div style="font-weight: 700; font-size: 15px;">Order #${escape(order.order_number)}</div>
                <div style="font-size: 12px; color: var(--muted);">Placed on: ${new Date(order.created_at).toLocaleString()}</div>
                <div style="font-size: 13px; margin-top: 4px;">Destination: ${escape(order.delivery_address)}</div>
                <div style="font-size: 12px; color: var(--muted);">Payment Ref: <code>${escape(order.payment_ref_masked || 'UPI-XXXX')}</code></div>
              </div>
              <div style="text-align: right;">
                <span class="status-pill status-clean" style="margin-bottom: 6px;">${order.status.toUpperCase()}</span>
                <div style="font-size: 18px; font-weight: 800; color: var(--dark);">₹${Number(order.final_amount).toFixed(2)}</div>
                <div style="margin-top: 8px;">
                  <a href="/api/orders/${order.id}/invoice" target="_blank" class="btn-outline" style="text-decoration: none; font-size: 12px; padding: 4px 10px;">📄 View Tax Invoice</a>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

// DPDP Privacy Center Tab
function renderPrivacyTab() {
  const notice = state.noticeData?.notice;

  return `
    <!-- Granular Consent Management Banner (DC-02, DC-03) -->
    <div class="consent-banner">
      <div class="consent-header">
        <div class="consent-title">
          <span>🛡️ DPDP Act, 2023: Granular Consent Center (Section 6)</span>
        </div>
        <div>
          <span class="status-pill status-clean">Audited Ledger Active</span>
        </div>
      </div>
      <p style="font-size: 13px; color: var(--slate);">
        In compliance with India's DPDP Act, consent choices are itemized, separate, unticked by default, and never conditioned for grocery delivery access.
      </p>

      <div class="consent-grid">
        <div class="consent-item">
          <input type="checkbox" checked disabled />
          <div>
            <div class="consent-label">Essential Order Fulfillment <span class="badge-required">REQUIRED</span></div>
            <div class="consent-desc">Processing shopping cart, address routing, and payment confirmation.</div>
          </div>
        </div>

        <div class="consent-item">
          <input 
            type="checkbox" 
            id="cns-order-updates" 
            ${state.activeConsents.order_updates ? 'checked' : ''}
            onchange="toggleConsent('order_updates', this.checked)"
          />
          <div>
            <div class="consent-label">SMS & WhatsApp ETA Updates</div>
            <div class="consent-desc">Delivery rider dispatch alerts and delivery pin confirmation.</div>
          </div>
        </div>

        <div class="consent-item">
          <input 
            type="checkbox" 
            id="cns-marketing" 
            ${state.activeConsents.marketing ? 'checked' : ''}
            onchange="toggleConsent('marketing', this.checked)"
            ${state.currentUser?.is_minor ? 'disabled' : ''}
          />
          <div>
            <div class="consent-label">Promotional Offers & Coupons</div>
            <div class="consent-desc">${state.currentUser?.is_minor ? '⛔ Disabled for Minors under Section 9(3)' : 'Curated grocery discounts and festival coupons.'}</div>
          </div>
        </div>

        <div class="consent-item">
          <input 
            type="checkbox" 
            id="cns-analytics" 
            ${state.activeConsents.analytics ? 'checked' : ''}
            onchange="toggleConsent('analytics', this.checked)"
            ${state.currentUser?.is_minor ? 'disabled' : ''}
          />
          <div>
            <div class="consent-label">Application Performance Diagnostics</div>
            <div class="consent-desc">${state.currentUser?.is_minor ? '⛔ Disabled for Minors under Section 9(3)' : 'Anonymous performance telemetry and crash logs.'}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Children's Data Protection Banner if Minor (DC-19, DC-20) -->
    ${state.currentUser?.is_minor ? `
      <div class="card" style="border: 2px solid #f59e0b; background: #fffbeb; margin-bottom: 24px;">
        <h3 style="color: #b45309; display: flex; align-items: center; gap: 8px;">
          <span>👶 Children's Personal Data Safeguards (DPDP Section 9)</span>
        </h3>
        <p style="font-size: 13px; color: #78350f; margin-top: 6px;">
          This account is registered to a minor under 18 years of age. Behavioural tracking, profiling, and targeted advertising are permanently locked out at both client and server layers under Section 9(3).
        </p>
        <div style="margin-top: 12px; display: flex; align-items: center; gap: 12px;">
          <span>Parental Consent Status: <strong>${state.currentUser.parental_consent_verified ? 'VERIFIED ✅' : 'PENDING ⚠️'}</strong></span>
          ${!state.currentUser.parental_consent_verified ? `
            <button class="btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick="verifyParentConsent()">Verify Parental Consent (Demo OTP)</button>
          ` : ''}
        </div>
      </div>
    ` : ''}

    <!-- Principal Rights Grid (Section 11, 12, 14) -->
    <div class="privacy-section-grid">
      <!-- Right to Access (Section 11) -->
      <div class="card">
        <h3 class="card-title">📥 Right to Access (Section 11)</h3>
        <p style="font-size: 13px; color: var(--muted); margin-bottom: 14px;">
          Obtain a complete machine-readable export of all personal data, order histories, consent audit trails, and third-party processors shared with.
        </p>
        <button class="btn-primary" onclick="triggerDataDownload()">Download My Data (JSON)</button>
      </div>

      <!-- Right to Erasure (Section 12) -->
      <div class="card">
        <h3 class="card-title">🗑️ Right to Erasure (Section 12)</h3>
        <p style="font-size: 13px; color: var(--muted); margin-bottom: 14px;">
          Irreversibly delete and anonymize your personal account data across our databases and caches.
        </p>
        <button class="btn-danger" onclick="handleRightToErasure()">Request Account Erasure</button>
      </div>

      <!-- Right to Nominate (Section 14) -->
      <div class="card">
        <h3 class="card-title">🤝 Right of Nomination (Section 14)</h3>
        <p style="font-size: 13px; color: var(--muted); margin-bottom: 12px;">
          Designate an individual to exercise your data principal rights in the event of death or incapacity.
        </p>
        <div style="font-size: 13px;">
          ${state.nominee ? `
            <div style="background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid var(--border);">
              <strong>${escape(state.nominee.name)}</strong> (${escape(state.nominee.relationship)})
              <div style="color: var(--muted); font-size: 12px;">${escape(state.nominee.email)} • ${escape(state.nominee.phone)}</div>
            </div>
          ` : `
            <p style="color: var(--muted); font-size: 12px;">No nominee currently designated.</p>
          `}
          <button class="btn-outline" style="margin-top: 10px;" onclick="promptNominee()">Update Nominee Details</button>
        </div>
      </div>

      <!-- Grievance Redressal (Section 8(10) & S13) -->
      <div class="card">
        <h3 class="card-title">⚖️ Grievance Redressal (Section 8(10))</h3>
        <p style="font-size: 13px; color: var(--muted); margin-bottom: 12px;">
          Submit formal grievances directly to our Grievance Officer with guaranteed 72-hour turnaround.
        </p>
        <button class="btn-outline" onclick="promptGrievance()">+ File Formal Grievance</button>
        ${state.grievanceTickets.length > 0 ? `
          <div style="margin-top: 12px;">
            <div style="font-weight: 700; font-size: 12px;">Active Tickets:</div>
            ${state.grievanceTickets.map(t => `
              <div style="font-size: 12px; padding: 6px 0; border-bottom: 1px dashed var(--border);">
                <code>${escape(t.ticket_id)}</code>: ${escape(t.category)} (${escape(t.status)})
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Multilingual Notice Section (DC-01, DC-06) -->
    <div class="card" style="margin-top: 24px;">
      <h3 class="card-title">📜 Layered Privacy Notice (${state.selectedLanguage.toUpperCase()})</h3>
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid var(--border); font-size: 13px;">
        <h4>${escape(notice?.title || 'Privacy Notice')}</h4>
        <p style="margin-top: 8px;">${escape(notice?.summary || '')}</p>
        <p style="margin-top: 8px; color: var(--slate);">${escape(notice?.rights_info || '')}</p>
        <p style="margin-top: 8px; color: var(--slate); font-weight: 600;">${escape(notice?.grievance_info || '')}</p>
      </div>
    </div>
  `;
}

function promptNominee() {
  const name = prompt('Nominee Full Name:');
  if (!name) return;
  const relationship = prompt('Relationship (e.g. Spouse, Parent, Child):');
  const email = prompt('Nominee Email:');
  const phone = prompt('Nominee Phone:');

  api('/api/privacy/nominee', {
    method: 'POST',
    body: JSON.stringify({ name, relationship, email, phone })
  }).then(res => {
    state.nominee = res.nominee;
    showToast('Nominee updated under DPDP Section 14', 'success');
    render();
  }).catch(e => showToast(e.message, 'error'));
}

function promptGrievance() {
  const category = prompt('Grievance Category (Consent, Erasure, Correction, Minor Data, Security):', 'Consent');
  if (!category) return;
  const description = prompt('Detailed description of your complaint (min 10 characters):');
  if (!description) return;

  api('/api/privacy/grievances', {
    method: 'POST',
    body: JSON.stringify({ category, description })
  }).then(res => {
    showToast(`Grievance filed! Ticket ID: ${res.ticketId} (72h SLA)`, 'success');
    loadUserPrivacyState().then(render);
  }).catch(e => showToast(e.message, 'error'));
}

// Store Owner Portal Tab
function renderStorePortalTab() {
  const dash = state.storeDashboard;
  if (!dash) return `<div class="card"><p>Loading store management portal...</p></div>`;

  return `
    <div class="card" style="margin-bottom: 24px;">
      <h2 class="card-title">🏪 Store Management: ${escape(dash.store.name)}</h2>
      <div style="display: flex; gap: 24px; margin-top: 12px; font-size: 14px;">
        <div>City: <strong>${escape(dash.store.city)}</strong></div>
        <div>Total Catalog SKUs: <strong>${dash.stats.totalProducts}</strong></div>
        <div>Orders Received: <strong>${dash.stats.totalOrders}</strong></div>
        <div>Revenue: <strong style="color: var(--primary);">₹${dash.stats.totalRevenue.toFixed(2)}</strong></div>
      </div>
    </div>

    <!-- Inventory Table -->
    <div class="card" style="margin-bottom: 24px;">
      <h3 class="card-title">📦 Store Product Inventory & Pricing</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock Qty</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${(dash.products || []).slice(0, 10).map(p => `
            <tr>
              <td><strong>${escape(p.name)}</strong></td>
              <td>${escape(p.category)}</td>
              <td>₹${p.price.toFixed(2)}</td>
              <td>${p.stock_quantity} ${escape(p.unit)}</td>
              <td>
                <button class="btn-outline" style="padding: 2px 8px; font-size: 11px;" onclick="promptUpdateInventory('${p.id}', ${p.stock_quantity}, ${p.price})">Update Stock</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Bulk Product Importer (C-A05-07 XXE Defused) -->
    <div class="card">
      <h3 class="card-title">📥 Bulk Product Import (CSV or Safe XML)</h3>
      <p style="font-size: 13px; color: var(--muted); margin-bottom: 12px;">
        Fast XML parser configured with external entity expansion disabled (defending against XXE / CWE-611).
      </p>
      <textarea id="bulk-import-data" class="search-input" style="border-radius: 8px; height: 100px; padding: 10px; font-family: monospace; font-size: 12px;" placeholder="name,category,price,stock,unit&#10;Organic Carrots,Fresh Produce,45.0,80,1 kg&#10;Kaju Katli,Snacks & Beverages,350.0,30,250 g"></textarea>
      <div style="margin-top: 10px; display: flex; gap: 10px;">
        <button class="btn-primary" onclick="executeBulkImport('csv')">Import via CSV</button>
      </div>
    </div>
  `;
}

function promptUpdateInventory(productId, currentStock, currentPrice) {
  const stock = prompt('Enter new stock quantity:', currentStock);
  if (stock === null) return;
  const price = prompt('Enter new price (INR):', currentPrice);
  if (price === null) return;

  api(`/api/store/products/${productId}/inventory`, {
    method: 'PUT',
    body: JSON.stringify({ stock: parseInt(stock, 10), price: parseFloat(price) })
  }).then(res => {
    showToast(res.message, 'success');
    loadStoreDashboard().then(render);
  }).catch(e => showToast(e.message, 'error'));
}

function executeBulkImport(format) {
  const data = document.getElementById('bulk-import-data')?.value;
  if (!data) return showToast('Please paste CSV or XML data', 'error');

  api('/api/store/bulk-import', {
    method: 'POST',
    body: JSON.stringify({ format, data })
  }).then(res => {
    showToast(res.message, 'success');
    loadStoreDashboard().then(render);
  }).catch(e => showToast(e.message, 'error'));
}

// Admin Tab
function renderAdminTab() {
  return `
    <div class="card" style="margin-bottom: 24px;">
      <h2 class="card-title">⚙️ Security & Compliance Operations Center</h2>
      <p style="font-size: 13px; color: var(--muted);">
        Authenticated administrative oversight with mandatory RBAC (C-A01-02) and automated DPDP Section 8 workflows.
      </p>
      <div style="display: flex; gap: 12px; margin-top: 14px; flex-wrap: wrap;">
        <button class="btn-outline" onclick="triggerBreachSim()">🚨 Simulate DPBI Breach Intimation (Section 8(6))</button>
        <button class="btn-outline" onclick="triggerRetentionPurge()">🧹 Run Data Retention Purge Job (Section 8(7))</button>
      </div>
    </div>

    <!-- Security Audit Logs (PII Redacted) -->
    <div class="card" style="margin-bottom: 24px;">
      <h3 class="card-title">📋 Security & Compliance Audit Log (C-A09-01 / C-A09-02)</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Correlation ID</th>
            <th>Action</th>
            <th>Resource</th>
            <th>Status</th>
            <th>Sanitized Details</th>
          </tr>
        </thead>
        <tbody>
          ${state.auditLogs.slice(0, 8).map(log => `
            <tr>
              <td>${new Date(log.created_at).toLocaleTimeString()}</td>
              <td><code>${escape(log.correlation_id)}</code></td>
              <td><strong>${escape(log.action)}</strong></td>
              <td>${escape(log.resource)}</td>
              <td><span class="status-pill ${log.status === 'SUCCESS' ? 'status-clean' : (log.status === 'ERROR' ? 'status-danger' : 'status-warning')}">${escape(log.status)}</span></td>
              <td style="font-family: monospace; font-size: 11px;">${escape(log.details_redacted || '{}')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- User Accounts Table -->
    <div class="card">
      <h3 class="card-title">👥 Registered Data Principals (${state.adminUsers.length})</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Contact</th>
            <th>Role</th>
            <th>Minor Status</th>
            <th>Account State</th>
          </tr>
        </thead>
        <tbody>
          ${state.adminUsers.map(u => `
            <tr>
              <td><strong>${escape(u.name)}</strong></td>
              <td>${escape(u.email)}</td>
              <td><span class="status-pill status-info">${escape(u.role)}</span></td>
              <td>${u.is_minor ? '<span class="status-pill status-warning">Minor (&lt;18)</span>' : '<span class="status-pill status-clean">Adult</span>'}</td>
              <td><span class="status-pill status-clean">${escape(u.status)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function triggerBreachSim() {
  api('/api/admin/simulate-breach-notification', { method: 'POST' })
    .then(res => {
      showToast(res.runbook_summary, 'success');
      loadAdminData().then(render);
    })
    .catch(e => showToast(e.message, 'error'));
}

function triggerRetentionPurge() {
  api('/api/admin/purge-expired-data', { method: 'POST' })
    .then(res => {
      showToast(`Retention purge complete: ${res.purgedRecords} expired tokens/records shredded`, 'success');
      loadAdminData().then(render);
    })
    .catch(e => showToast(e.message, 'error'));
}

// Scanner Benchmark Tab
function renderScannerBenchmarkTab() {
  return `
    <div class="card" style="margin-bottom: 24px;">
      <h2 class="card-title">🔍 SecureScan Negative Control Benchmark</h2>
      <p style="font-size: 14px; color: var(--slate); margin-top: 6px;">
        KiranaKart Secure acts as the <strong>known-good negative control</strong> for repository scanners, with zero flaws above Low severity on OWASP Top 10 and 100% compliance with India's DPDP Act 2023.
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 16px;">
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px;">
          <div style="font-size: 12px; color: #166534; font-weight: 700;">OWASP FINDINGS TARGET</div>
          <div style="font-size: 28px; font-weight: 800; color: #15803d;">0</div>
          <div style="font-size: 11px; color: #166534;">Target: 0 Findings at Low+ Severity</div>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px;">
          <div style="font-size: 12px; color: #166534; font-weight: 700;">DPDP VIOLATIONS TARGET</div>
          <div style="font-size: 28px; font-weight: 800; color: #15803d;">0</div>
          <div style="font-size: 11px; color: #166534;">Target: 0 Non-Compliance Flags</div>
        </div>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px;">
          <div style="font-size: 12px; color: #1e40af; font-weight: 700;">SECURITY CONTROLS</div>
          <div style="font-size: 28px; font-weight: 800; color: #1d4ed8;">50+</div>
          <div style="font-size: 11px; color: #1e40af;">Mapped 1:1 in groundtruth/controls.json</div>
        </div>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px;">
          <div style="font-size: 12px; color: #1e40af; font-weight: 700;">HARD NEGATIVE TRAPS</div>
          <div style="font-size: 28px; font-weight: 800; color: #1d4ed8;">10</div>
          <div style="font-size: 11px; color: #1e40af;">Tricky-but-safe patterns in hard-negatives/</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">🧪 Flaw Injection Harness (tools/inject.js)</h3>
      <p style="font-size: 13px; color: var(--muted); margin-bottom: 12px;">
        To test SecureScan's detection recall, throwaway branches can be created with single injected flaws:
      </p>
      <div style="background: #1e293b; color: #38bdf8; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 13px;">
        <div style="color: #94a3b8;"># List all available injectable flaws:</div>
        <div>node tools/inject.js --list</div>
        <br>
        <div style="color: #94a3b8;"># Inject IDOR flaw (V-A01-01) on throwaway test branch:</div>
        <div>node tools/inject.js --flaw V-A01-01</div>
        <br>
        <div style="color: #94a3b8;"># Reset back to clean baseline:</div>
        <div>node tools/inject.js --revert</div>
      </div>
    </div>
  `;
}

function escape(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Kickoff
window.addEventListener('DOMContentLoaded', init);
