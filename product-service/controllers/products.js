function validateProduct(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Product body is required';
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 255) {
        return 'name must contain 1 to 255 characters';
    }
    if (body.description !== undefined && typeof body.description !== 'string') return 'description must be a string';
    if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0 || body.price > 99999999.99 ||
        Math.abs(body.price * 100 - Math.round(body.price * 100)) > 0.000001) {
        return 'price must be between 0 and 99999999.99 with at most 2 decimal places';
    }
    if (!Number.isInteger(body.quantity) || body.quantity < 0 || body.quantity > 2147483647) {
        return 'quantity must be an integer between 0 and 2147483647';
    }
    return null;
}

function productsController(db) {
    const find = db.prepare('SELECT * FROM products WHERE id = ?');
    return {
        list(req, res) {
            res.json(db.prepare('SELECT * FROM products ORDER BY id').all());
        },
        checkId(req, res, next) {
            const id = Number(req.params.id);
            if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(id)) {
                return res.status(400).json({ message: 'Invalid product id' });
            }
            req.productId = id;
            if (!find.get(id)) return res.status(404).json({ message: 'Product not found' });
            next();
        },
        get(req, res) {
            res.json(find.get(req.productId));
        },
        create(req, res) {
            const error = validateProduct(req.body);
            if (error) return res.status(400).json({ message: error });
            const { name, description = '', price, quantity } = req.body;
            const result = db.prepare('INSERT INTO products (name, description, price, quantity) VALUES (?, ?, ?, ?)')
                .run(name.trim(), description, Math.round(price * 100) / 100, quantity);
            res.location(`/products/${result.lastInsertRowid}`).status(201).json(find.get(result.lastInsertRowid));
        },
        update(req, res) {
            const error = validateProduct(req.body);
            if (error) return res.status(400).json({ message: error });
            const { name, description = '', price, quantity } = req.body;
            db.prepare(`UPDATE products SET name = ?, description = ?, price = ?, quantity = ?,
                updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
                .run(name.trim(), description, Math.round(price * 100) / 100, quantity, req.productId);
            res.json(find.get(req.productId));
        },
        remove(req, res) {
            db.prepare('DELETE FROM products WHERE id = ?').run(req.productId);
            res.status(204).end();
        }
    };
}

module.exports = productsController;
