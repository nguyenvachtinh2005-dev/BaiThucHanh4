const AppError = require('../errors/appError');
const { requireObject, validateOrderItem } = require('./common');

const ORDER_STATUSES = new Set(['pending', 'completed', 'cancelled']);

function validateCreateOrder(body) {
    requireObject(body, 'Order body is required');
    const customerName = typeof body.customer_name === 'string' ? body.customer_name.trim() : '';
    const customerEmail = body.customer_email;
    if (!customerName || customerName.length > 255 ||
        typeof customerEmail !== 'string' || customerEmail.length > 255 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ||
        !Array.isArray(body.items) || body.items.length === 0) {
        throw new AppError(400, 'Valid customer_name, customer_email and non-empty items are required');
    }

    for (const item of body.items) validateOrderItem(item);
    return { customerName, customerEmail, items: body.items };
}

function validateOrderStatus(body) {
    requireObject(body, 'Order body is required');
    if (!ORDER_STATUSES.has(body.status)) throw new AppError(400, 'Invalid order status');
    return body.status;
}

module.exports = { validateCreateOrder, validateOrderStatus };
