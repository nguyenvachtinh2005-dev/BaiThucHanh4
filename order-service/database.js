
const { DatabaseSync } = require('node:sqlite');
const { mkdirSync } = require('node:fs');
const path = require('node:path');

function openDatabase(filename = process.env.ORDER_DB_PATH || path.join(__dirname, 'data', 'orders.sqlite')) {
    if (filename !== ':memory:') mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });

    const db = new DatabaseSync(filename);
    db.exec('PRAGMA foreign_keys = ON;');

    db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name VARCHAR(255) NOT NULL,
            customer_email VARCHAR(255) NOT NULL,
            total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
            status VARCHAR(50) NOT NULL DEFAULT 'pending'
                CHECK(status IN ('pending', 'completed', 'cancelled')),
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            product_name VARCHAR(255) NOT NULL,
            quantity INTEGER NOT NULL CHECK(quantity > 0),
            unit_price DECIMAL(10, 2) NOT NULL CHECK(unit_price >= 0),
            total_price DECIMAL(10, 2) NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        );
    `);

    return db;
}

module.exports = openDatabase;
