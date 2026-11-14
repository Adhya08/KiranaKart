/**
 * Orders & Invoicing Controller
 * Security Controls: C-A01-01 (IDOR Scoping), C-A03-03 (Safe invoice), C-A04-03 (Server price verification), C-X-05 (Coupon race condition fix)
 */

const orderRepo = require('../repositories/orderRepo');
const invoiceService = require('../services/invoiceService');
const auditService = require('../services/auditService');

function createOrder(req, res, next) {
  try {
    const { items, storeId = 'str_01', couponCode, deliveryAddress, paymentMethod = 'UPI' } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart must contain at least one valid grocery item' });
    }

    if (!deliveryAddress || typeof deliveryAddress !== 'string' || deliveryAddress.trim().length < 5) {
      return res.status(400).json({ error: 'Valid delivery address is required' });
    }

    // Mock payment tokenization in India
    const mockPaymentRef = `UPI_${paymentMethod}_${Date.now()}_${Math.floor(Math.random() * 89999 + 10000)}`;

    const orderResult = orderRepo.createOrderAtomic({
      userId: req.currentUser.id,
      storeId,
      items,
      couponCode: couponCode ? String(couponCode).trim() : null,
      deliveryAddress: deliveryAddress.trim(),
      rawPaymentRef: mockPaymentRef
    });

    auditService.logSecurityEvent({
      correlationId: req.correlationId,
      userId: req.currentUser.id,
      action: 'ORDER_PLACED_SUCCESS',
      resource: `/api/orders/${orderResult.orderId}`,
      ipAddress: req.ip,
      status: 'SUCCESS',
      details: {
        orderNumber: orderResult.orderNumber,
        finalAmount: orderResult.finalAmount
      }
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! Delivery within 10-15 minutes.',
      order: orderResult
    });
  } catch (err) {
    next(err);
  }
}

function listUserOrders(req, res, next) {
  try {
    const orders = orderRepo.listUserOrders(req.currentUser.id);
    res.status(200).json({ success: true, orders });
  } catch (err) {
    next(err);
  }
}

function getOrderDetails(req, res, next) {
  try {
    const { id } = req.params;
    // Scoped order lookup preventing IDOR (C-A01-01)
    const order = orderRepo.findOrderByIdScoped(id, req.currentUser);

    if (!order) {
      auditService.logSecurityEvent({
        correlationId: req.correlationId,
        userId: req.currentUser.id,
        action: 'IDOR_ACCESS_DENIED_ATTEMPT',
        resource: `/api/orders/${id}`,
        ipAddress: req.ip,
        status: 'FORBIDDEN',
        details: { requestedOrderId: id }
      });

      return res.status(404).json({ error: 'Order not found or access unauthorized' });
    }

    res.status(200).json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

function downloadInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const invoice = invoiceService.generateInvoiceData(id, req.currentUser);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="invoice_${invoice.orderNumber}.html"`);
    res.send(invoice.html);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrder,
  listUserOrders,
  getOrderDetails,
  downloadInvoice
};

