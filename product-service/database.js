const { DatabaseSync } = require('node:sqlite');
const { mkdirSync } = require('node:fs');
const path = require('node:path');

function openDatabase(filename = process.env.PRODUCT_DB_PATH || path.join(__dirname, 'data', 'products.sqlite')) {
    if (filename !== ':memory:') mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
    const db = new DatabaseSync(filename);
    db.exec(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 255),
            description TEXT NOT NULL DEFAULT '',
            price DECIMAL(10, 2) NOT NULL CHECK(price >= 0 AND price <= 99999999.99),
            quantity INTEGER NOT NULL CHECK(quantity >= 0 AND quantity <= 2147483647),
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);
    return db;
}

module.exports = openDatabase;
