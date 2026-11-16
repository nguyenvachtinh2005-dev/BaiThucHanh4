const AppError = require('../errors/appError');
const { validateOrderItemInput } = require('../validation/orderItems');
const { calculateItemCents } = require('../validation/common');
const withTransaction = require('./transaction');

function createOrderItemService(db, orders, items, productClient) {
    function findItem(id) {
        const item = items.findById(id);
        if (!item) throw new AppError(404, 'Order item not found');
        return item;
    }

    function requireOrder(id) {
        if (!orders.findById(id)) throw new AppError(404, 'Order not found');
    }

    function syncTotal(orderId) {
        const cents = items.totalCents(orderId);
        if (!Number.isSafeInteger(cents)) throw new AppError(400, 'Order total is too large');
        orders.updateTotal(orderId, cents / 100);
    }

    function verifyStock(orderId, item, product, exceptItemId = 0) {
        const alreadyReserved = items.quantityForProduct(orderId, item.product_id, exceptItemId);
        const requested = alreadyReserved + item.quantity;
        if (!Number.isSafeInteger(requested) || requested > product.quantity) {
            throw new AppError(400, `Insufficient stock for product ${item.product_id}`);
        }
    }

    return {
        list() {
            return items.findAll();
        },
        get(id) {
            return findItem(id);
        },
        async create(body, authorization) {
            const input = validateOrderItemInput(body);
            requireOrder(input.order_id);
            const product = await productClient.getProduct(input.product_id, authorization);

            const id = withTransaction(db, () => {
                requireOrder(input.order_id);
                verifyStock(input.order_id, input, product);
                const amount = calculateItemCents(product, input.quantity);
                const result = items.insert(input.order_id, product.id, product.name,
                    input.quantity, amount.unitPrice, amount.totalPrice);
                syncTotal(input.order_id);
                return Number(result.lastInsertRowid);
            });
            return findItem(id);
        },
        async update(id, body, authorization) {
            const previous = findItem(id);
            const input = validateOrderItemInput(body, previous);
            requireOrder(input.order_id);
            const product = await productClient.getProduct(input.product_id, authorization);

            return withTransaction(db, () => {
                const current = findItem(id);
                requireOrder(input.order_id);
                verifyStock(input.order_id, input, product, id);
                const amount = calculateItemCents(product, input.quantity);
                items.update(id, input.order_id, product.id, product.name,
                    input.quantity, amount.unitPrice, amount.totalPrice);
                syncTotal(input.order_id);
                if (current.order_id !== input.order_id) syncTotal(current.order_id);
                return findItem(id);
            });
        },
        remove(id) {
            withTransaction(db, () => {
                const item = findItem(id);
                items.remove(id);
                syncTotal(item.order_id);
            });
        }
    };
}

module.exports = createOrderItemService;
