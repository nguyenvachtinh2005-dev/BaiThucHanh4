const AppError = require('../errors/appError');

function requirePositiveInteger(value, field) {
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new AppError(400, `${field} must be a positive integer`);
    }
}

function parseId(value, resource) {
    if (!/^[1-9]\d*$/.test(value)) {
        throw new AppError(400, `Invalid ${resource} id`);
    }
    const id = Number(value);
    requirePositiveInteger(id, `${resource} id`);
    return id;
}

function requireObject(body, message) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new AppError(400, message);
    }
}

function validateOrderItem(item) {
    requirePositiveInteger(item.product_id, 'product_id');
    requirePositiveInteger(item.quantity, 'quantity');
}

function calculateItemCents(product, quantity) {
    const unitPriceCents = Math.round(product.price * 100);
    const totalCents = unitPriceCents * quantity;
    if (!Number.isSafeInteger(totalCents)) {
        throw new AppError(400, 'Item total is too large');
    }
    return { unitPrice: unitPriceCents / 100, totalPrice: totalCents / 100 };
}

module.exports = {
    AppError,
    requirePositiveInteger,
    parseId,
    requireObject,
    validateOrderItem,
    calculateItemCents
};
