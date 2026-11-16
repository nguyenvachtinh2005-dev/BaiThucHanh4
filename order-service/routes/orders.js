const { Router } = require('express');

function ordersRouter(controller) {
    const router = Router();
    router.get('/', controller.list);
    router.post('/', controller.create);
    router.get('/:id', controller.get);
    router.put('/:id', controller.update);
    router.delete('/:id', controller.remove);
    return router;
}

module.exports = ordersRouter;
