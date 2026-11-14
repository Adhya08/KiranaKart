/**
 * Invoice Generation Service
 * Security Control: C-A03-03 (Zero shell invocation; pure in-memory structured formatting)
 */

const orderRepo = require('../repositories/orderRepo');

/**
 * Generate safe structured HTML/text invoice without spawning shell subprocesses
 */
function generateInvoiceData(orderId, currentUser) {
  const order = orderRepo.findOrderByIdScoped(orderId, currentUser);
  if (!order) {
    throw new Error('Order not found or unauthorized');
  }

  const invoiceHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Tax Invoice - ${escapeHtml(order.order_number)}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
        .invoice-box { max-width: 800px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #059669; font-size: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
        th { background: #f8fafc; font-size: 13px; text-transform: uppercase; }
        .total-row { font-weight: bold; font-size: 16px; }
        .badge { background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <div class="header">
          <div>
            <h1>KiranaKart</h1>
            <p>Hyperlocal Grocery Invoicing (India)</p>
            <p>GSTIN: 29AABCK1234F1Z8</p>
          </div>
          <div style="text-align: right;">
            <h3>TAX INVOICE</h3>
            <p><strong>Invoice #:</strong> ${escapeHtml(order.order_number)}</p>
            <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
            <span class="badge">PAID</span>
          </div>
        </div>

        <div>
          <h4>Delivery Address:</h4>
          <p>${escapeHtml(order.delivery_address)}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit Price (INR)</th>
              <th>Subtotal (INR)</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>${escapeHtml(item.product_name)}</td>
                <td>${Number(item.quantity)}</td>
                <td>₹${Number(item.unit_price).toFixed(2)}</td>
                <td>₹${Number(item.subtotal).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align: right;">Items Total:</td>
              <td>₹${Number(order.total_amount).toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align: right; color: #059669;">Discount / Coupon:</td>
              <td style="color: #059669;">- ₹${Number(order.discount_amount).toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="3" style="text-align: right;">Grand Total:</td>
              <td>₹${Number(order.final_amount).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px dashed #cbd5e1; font-size: 12px; color: #64748b;">
          <p>Payment Reference: ${escapeHtml(order.payment_ref_masked)}</p>
          <p>This is a computer-generated tax invoice compliant with Indian GST Rules.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return {
    orderNumber: order.order_number,
    html: invoiceHtml.trim()
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { generateInvoiceData };

