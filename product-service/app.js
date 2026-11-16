const express = require('express');
const openDatabase = require('./database');
const authenticate = require('./middleware/auth');
const productsRouter = require('./routes/products');

function createApp({ db = openDatabase(), authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3000' } = {}) {
    const app = express();
    app.use(express.json());
    app.use('/products', authenticate(authServiceUrl), productsRouter(db));
    app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
    app.use((error, req, res, next) => {
        if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
        if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Request body too large' });
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    });
    return app;
}

if (require.main === module) {
    const port = Number(process.env.PRODUCT_PORT || 3001);
    createApp().listen(port, () => console.log(`Product Service is running on port ${port}`));
}

module.exports = createApp;
