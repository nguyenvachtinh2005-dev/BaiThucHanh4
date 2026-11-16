const AppError = require('../errors/appError');
const { requireObject, requirePositiveInteger, validateOrderItem } = require('./common');

function validateOrderItemInput(body, previous = {}) {
    requireObject(body, 'Item body is required');
    const item = { ...previous, ...body };
    validateOrderItem(item);
    requirePositiveInteger(item.order_id, 'order_id');
    return item;
}

module.exports = { validateOrderItemInput };
