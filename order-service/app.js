const express = require('express');
const openDatabase = require('./database');
const createAuthClient = require('./clients/authClient');
const createProductClient = require('./clients/productClient');
const authenticate = require('./middleware/authenticate');
const createOrdersRepository = require('./repositories/ordersRepository');
const createOrderItemsRepository = require('./repositories/orderItemsRepository');
const createOrderService = require('./services/orderService');
const createOrderItemService = require('./services/orderItemService');
const createOrdersController = require('./controllers/ordersController');
const createOrderItemsController = require('./controllers/orderItemsController');
const ordersRouter = require('./routes/orders');
const orderItemsRouter = require('./routes/order_items');

function createApp({
    db = openDatabase(),
    authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3000',
    productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001',
    authClient = createAuthClient(authServiceUrl),
    productClient = createProductClient(productServiceUrl)
} = {}) {
    const app = express();
    const ordersRepository = createOrdersRepository(db);
    const orderItemsRepository = createOrderItemsRepository(db);
    const orderService = createOrderService(db, ordersRepository, orderItemsRepository, productClient);
    const orderItemService = createOrderItemService(db, ordersRepository, orderItemsRepository, productClient);
    const ordersController = createOrdersController(orderService);
    const orderItemsController = createOrderItemsController(orderItemService);

    app.use(express.json());
    app.get('/', (req, res) => res.json({ message: 'Order Service is running' }));

    const requireToken = authenticate(authClient);
    app.use('/orders', requireToken, ordersRouter(ordersController));
    app.use('/order_items', requireToken, orderItemsRouter(orderItemsController));

    app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
    app.use((error, req, res, next) => {
        if (error.type === 'entity.parse.failed') {
            return res.status(400).json({ message: 'Invalid JSON body' });
        }
        if (error.type === 'entity.too.large') {
            return res.status(413).json({ message: 'Request body too large' });
        }
        if (error.status === 503) {
            return res.status(503).json({ message: error.message });
        }
        if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
            return res.status(error.status).json({ message: error.message });
        }
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    });

    return app;
}

if (require.main === module) {
    const port = Number(process.env.ORDER_PORT || 3002);
    createApp().listen(port, () => {
        console.log(`Order Service is running on port ${port}`);
    });
}

module.exports = createApp;
