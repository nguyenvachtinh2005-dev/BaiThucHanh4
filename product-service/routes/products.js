const { Router } = require('express');
const productsController = require('../controllers/products');

module.exports = function productsRouter(db) {
    const router = Router();
    const controller = productsController(db);
    router.get('/', controller.list);
    router.post('/', controller.create);
    router.get('/:id', controller.checkId, controller.get);
    router.put('/:id', controller.checkId, controller.update);
    router.delete('/:id', controller.checkId, controller.remove);
    return router;
};
