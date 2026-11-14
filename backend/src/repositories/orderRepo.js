/**
 * Order Repository
 * Security Controls: C-A01-01 (IDOR scoping), C-A02-03 (encrypted payment ref), C-X-05 (atomic coupon transaction)
 */

const db = require('./db');
const cryptoService = require('../services/cryptoService');

/**
 * Find order strictly scoped to user or store owner or admin (C-A01-01 IDOR fix)
 */
function findOrderByIdScoped(orderId, currentUser) {
  let stmt;
  let order;

  if (currentUser.role === 'admin') {
    stmt = db.prepare('SELECT * FROM orders WHERE id = ?');
    order = stmt.get(orderId);
  } else if (currentUser.role === 'store_owner') {
    // Check if order belongs to one of this store owner's stores
    stmt = db.prepare(`
      SELECT o.* FROM orders o
      JOIN stores s ON o.store_id = s.id
      WHERE o.id = ? AND s.owner_id = ?
    `);
    order = stmt.get(orderId, currentUser.id);
  } else {
    // Regular customer: strict ownership verification
    stmt = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?');
    order = stmt.get(orderId, currentUser.id);
  }

  if (!order) return null;

  const itemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  const items = itemsStmt.all(orderId);

  return {
    ...order,
    payment_ref_masked: maskPaymentRef(order.payment_ref_encrypted),
    items
  };
}

function listUserOrders(userId) {
  const stmt = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC');
  const orders = stmt.all(userId);
  return orders.map(o => ({
    ...o,
    payment_ref_masked: maskPaymentRef(o.payment_ref_encrypted)
  }));
}

function listStoreOrders(ownerId) {
  const stmt = db.prepare(`
    SELECT o.* FROM orders o
    JOIN stores s ON o.store_id = s.id
    WHERE s.owner_id = ?
    ORDER BY o.created_at DESC
  `);
  return stmt.all(ownerId);
}

/**
 * Atomic Order Creation with Coupon Validation (C-X-05 & C-A04-03)
 */
function createOrderAtomic({ userId, storeId, items, couponCode, deliveryAddress, rawPaymentRef }) {
  const orderId = `ord_${cryptoService.generateSecureToken(12)}`;
  const orderNumber = `KK-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const now = new Date().toISOString();
  const encryptedPaymentRef = cryptoService.encryptField(rawPaymentRef);

  return db.transaction(() => {
    // 1. Calculate authoritative server-side prices from database
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = db.prepare('SELECT id, name, price, discount_price, stock_quantity FROM products WHERE id = ? AND is_active = 1').get(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found or inactive`);
      }
      if (product.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      const unitPrice = product.discount_price || product.price;
      const subtotal = Math.round(unitPrice * item.quantity * 100) / 100;
      totalAmount += subtotal;

      validatedItems.push({
        id: `oi_${cryptoService.generateSecureToken(10)}`,
        productId: product.id,
        productName: product.name,
        unitPrice,
        quantity: item.quantity,
        subtotal
      });

      // Decrement stock
      db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(item.quantity, product.id);
    }

    // 2. Validate Coupon with Row Lock / Atomic Check (C-X-05)
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      appliedCoupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(couponCode.toUpperCase());
      if (appliedCoupon) {
        // Check expiry
        if (new Date(appliedCoupon.expires_at) < new Date()) {
          throw new Error('Coupon has expired');
        }
        // Check minimum order value
        if (totalAmount < appliedCoupon.min_order_value) {
          throw new Error(`Minimum order value of ₹${appliedCoupon.min_order_value} required for coupon`);
        }
        // Check if user already redeemed this coupon
        const existingRedemption = db.prepare('SELECT id FROM coupon_redemptions WHERE coupon_id = ? AND user_id = ?').get(appliedCoupon.id, userId);
        if (existingRedemption) {
          throw new Error('Coupon already redeemed by your account');
        }
        // Check global usage limit
        if (appliedCoupon.times_used >= appliedCoupon.usage_limit) {
          throw new Error('Coupon usage limit reached');
        }

        // Calculate discount
        if (appliedCoupon.flat_discount) {
          discountAmount = appliedCoupon.flat_discount;
        } else if (appliedCoupon.discount_percent) {
          discountAmount = (totalAmount * appliedCoupon.discount_percent) / 100;
          if (appliedCoupon.max_discount && discountAmount > appliedCoupon.max_discount) {
            discountAmount = appliedCoupon.max_discount;
          }
        }

        discountAmount = Math.round(discountAmount * 100) / 100;
      }
    }

    const finalAmount = Math.max(0, Math.round((totalAmount - discountAmount) * 100) / 100);

    // 3. Insert Order
    db.prepare(`
      INSERT INTO orders (id, order_number, user_id, store_id, total_amount, discount_amount, final_amount, status, payment_status, payment_ref_encrypted, delivery_address, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'placed', 'paid', ?, ?, ?, ?)
    `).run(orderId, orderNumber, userId, storeId, totalAmount, discountAmount, finalAmount, encryptedPaymentRef, deliveryAddress, now, now);

    // 4. Insert Order Items
    const insertItem = db.prepare(`
      INSERT INTO order_items (id, order_id, product_id, product_name, unit_price, quantity, subtotal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const vi of validatedItems) {
      insertItem.run(vi.id, orderId, vi.productId, vi.productName, vi.unitPrice, vi.quantity, vi.subtotal);
    }

    // 5. Record Coupon Redemption
    if (appliedCoupon) {
      db.prepare(`
        INSERT INTO coupon_redemptions (id, coupon_id, user_id, order_id, redeemed_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(`cr_${cryptoService.generateSecureToken(10)}`, appliedCoupon.id, userId, orderId, now);

      db.prepare('UPDATE coupons SET times_used = times_used + 1 WHERE id = ?').run(appliedCoupon.id);
    }

    return {
      orderId,
      orderNumber,
      totalAmount,
      discountAmount,
      finalAmount,
      status: 'placed',
      itemsCount: validatedItems.length
    };
  })();
}

function maskPaymentRef(encryptedRef) {
  try {
    const raw = cryptoService.decryptField(encryptedRef);
    if (!raw) return 'UPI-XXXX';
    return raw.length > 8 ? `${raw.slice(0, 4)}...${raw.slice(-4)}` : 'UPI-XXXX';
  } catch (e) {
    return 'UPI-XXXX';
  }
}

module.exports = {
  findOrderByIdScoped,
  listUserOrders,
  listStoreOrders,
  createOrderAtomic
};
