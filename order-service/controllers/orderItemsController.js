const { parseId } = require('../validation/common');

function createOrderItemsController(service) {
    return {
        async list(req, res) {
            return res.json(service.list());
        },
        async get(req, res) {
            return res.json(service.get(parseId(req.params.id, 'order item')));
        },
        async create(req, res) {
            const item = await service.create(req.body, req.headers.authorization);
            return res.location(`/order_items/${item.id}`).status(201).json(item);
        },
        async update(req, res) {
            const item = await service.update(
                parseId(req.params.id, 'order item'),
                req.body,
                req.headers.authorization
            );
            return res.json(item);
        },
        async remove(req, res) {
            service.remove(parseId(req.params.id, 'order item'));
            return res.status(204).end();
        }
    };
}

module.exports = createOrderItemsController;
