const AppError = require('../errors/appError');
const { validateCreateOrder, validateOrderStatus } = require('../validation/orders');
const { calculateItemCents } = require('../validation/common');
const withTransaction = require('./transaction');

function createOrderService(db, orders, items, productClient) {
    function findOrder(id) {
        const order = orders.findById(id);
        if (!order) throw new AppError(404, 'Order not found');
        return order;
    }

    function syncTotal(orderId) {
        const cents = items.totalCents(orderId);
        if (!Number.isSafeInteger(cents)) throw new AppError(400, 'Order total is too large');
        orders.updateTotal(orderId, cents / 100);
    }

    function getDetails(orderId) {
        return { ...findOrder(orderId), items: items.findByOrderId(orderId) };
    }

    return {
        list() {
            return orders.findAll();
        },
        get(id) {
            return getDetails(id);
        },
        async create(body, authorization) {
            const input = validateCreateOrder(body);
            const quantities = new Map();
            for (const item of input.items) {
                const total = (quantities.get(item.product_id) || 0) + item.quantity;
                if (!Number.isSafeInteger(total)) throw new AppError(400, 'Quantity is too large');
                quantities.set(item.product_id, total);
            }

            const products = new Map();
            for (const [productId, quantity] of quantities) {
                const product = await productClient.getProduct(productId, authorization);
                if (quantity > product.quantity) {
                    throw new AppError(400, `Insufficient stock for product ${productId}`);
                }
                products.set(productId, product);
            }

            const id = withTransaction(db, () => {
                const result = orders.create(input.customerName, input.customerEmail);
                const orderId = Number(result.lastInsertRowid);
                for (const item of input.items) {
                    const product = products.get(item.product_id);
                    const amount = calculateItemCents(product, item.quantity);
                    items.insert(orderId, product.id, product.name, item.quantity, amount.unitPrice, amount.totalPrice);
                }
                syncTotal(orderId);
                return orderId;
            });
            return getDetails(id);
        },
        updateStatus(id, body) {
            const status = validateOrderStatus(body);
            findOrder(id);
            orders.updateStatus(id, status);
            return findOrder(id);
        },
        remove(id) {
            findOrder(id);
            withTransaction(db, () => orders.remove(id));
        }
    };
}

module.exports = createOrderService;
