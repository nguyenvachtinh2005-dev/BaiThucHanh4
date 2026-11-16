function createOrderItemsRepository(db) {
    const findStatement = db.prepare('SELECT * FROM order_items WHERE id = ?');

    return {
        findAll() {
            return db.prepare('SELECT * FROM order_items ORDER BY id').all();
        },
        findById(id) {
            return findStatement.get(id);
        },
        findByOrderId(orderId) {
            return db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(orderId);
        },
        findOrderId(orderId) {
            return db.prepare('SELECT id FROM orders WHERE id = ?').get(orderId);
        },
        quantityForProduct(orderId, productId, exceptItemId = 0) {
            return db.prepare(`SELECT COALESCE(SUM(quantity), 0) AS quantity
                FROM order_items WHERE order_id = ? AND product_id = ? AND id != ?`)
                .get(orderId, productId, exceptItemId).quantity;
        },
        insert(orderId, productId, productName, quantity, unitPrice, totalPrice) {
            return db.prepare(`INSERT INTO order_items
                (order_id, product_id, product_name, quantity, unit_price, total_price)
                VALUES (?, ?, ?, ?, ?, ?)`)
                .run(orderId, productId, productName, quantity, unitPrice, totalPrice);
        },
        update(id, orderId, productId, productName, quantity, unitPrice, totalPrice) {
            return db.prepare(`UPDATE order_items SET order_id = ?, product_id = ?, product_name = ?,
                quantity = ?, unit_price = ?, total_price = ? WHERE id = ?`)
                .run(orderId, productId, productName, quantity, unitPrice, totalPrice, id);
        },
        remove(id) {
            return db.prepare('DELETE FROM order_items WHERE id = ?').run(id);
        },
        totalCents(orderId) {
            const rows = db.prepare('SELECT total_price FROM order_items WHERE order_id = ?').all(orderId);
            return rows.reduce((sum, row) => sum + Math.round(row.total_price * 100), 0);
        }
    };
}

module.exports = createOrderItemsRepository;
