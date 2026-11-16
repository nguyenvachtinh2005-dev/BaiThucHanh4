const { parseId } = require('../validation/common');

function createOrdersController(service) {
    return {
        async list(req, res) {
            return res.json(service.list());
        },
        async get(req, res) {
            const order = service.get(parseId(req.params.id, 'order'));
            return res.json(order);
        },
        async create(req, res) {
            const order = await service.create(req.body, req.headers.authorization);
            return res.location(`/orders/${order.id}`).status(201).json(order);
        },
        async update(req, res) {
            const order = service.updateStatus(parseId(req.params.id, 'order'), req.body);
            return res.json(order);
        },
        async remove(req, res) {
            service.remove(parseId(req.params.id, 'order'));
            return res.status(204).end();
        }
    };
}

module.exports = createOrdersController;
