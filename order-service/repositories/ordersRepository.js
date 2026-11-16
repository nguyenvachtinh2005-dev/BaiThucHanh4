function createOrdersRepository(db) {
    const findStatement = db.prepare('SELECT * FROM orders WHERE id = ?');

    return {
        findAll() {
            return db.prepare('SELECT * FROM orders ORDER BY id').all();
        },
        findById(id) {
            return findStatement.get(id);
        },
        create(customerName, customerEmail) {
            return db.prepare('INSERT INTO orders (customer_name, customer_email) VALUES (?, ?)')
                .run(customerName, customerEmail);
        },
        updateStatus(id, status) {
            return db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(status, id);
        },
        updateTotal(id, total) {
            return db.prepare('UPDATE orders SET total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(total, id);
        },
        remove(id) {
            return db.prepare('DELETE FROM orders WHERE id = ?').run(id);
        }
    };
}

module.exports = createOrdersRepository;
