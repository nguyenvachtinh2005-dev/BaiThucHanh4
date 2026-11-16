const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const authApp = require('../app');
const createProducts = require('../product-service/app');
const openProducts = require('../product-service/database');
const createOrders = require('../order-service/app');
const openOrders = require('../order-service/database');

test('Order Service: all APIs, validation, transactions and service failures', async (t) => {
    const db = openOrders(':memory:');
    const products = openProducts(':memory:');
    const servers = [];
    async function serve(app) {
        const server = app.listen(0, '127.0.0.1');
        servers.push(server);
        await once(server, 'listening');
        return { server, url: `http://127.0.0.1:${server.address().port}` };
    }
    t.after(async () => {
        await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
        db.close();
        products.close();
    });
    const auth = await serve(authApp);
    const product = await serve(createProducts({ db: products, authServiceUrl: auth.url }));
    const orders = await serve(createOrders({ db, authServiceUrl: auth.url, productServiceUrl: product.url }));
    const login = await fetch(`${auth.url}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: 'admin', password: 'MTIzNDU2' })
    });
    assert.equal(login.status, 200);
    const { token } = await login.json();
    const headers = { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    async function request(path, method = 'GET', body, expected = 200) {
        const response = await fetch(orders.url + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
        assert.equal(response.status, expected, `${method} ${path}`);
        return response.status === 204 ? null : response.json();
    }
    const p = await fetch(product.url + '/products', {
        method: 'POST', headers, body: JSON.stringify({ name: 'Book', price: 12.35, quantity: 10 })
    });
    assert.equal(p.status, 201);
    const { id: productId } = await p.json();
    const body = { customer_name: 'Tam', customer_email: 'tam@example.com', items: [{ product_id: productId, quantity: 2, unit_price: 0.01 }] };

    await t.test('authentication protects all ten endpoints', async () => {
        for (const resource of ['/orders', '/order_items']) {
            for (const [method, suffix] of [['GET', ''], ['POST', ''], ['GET', '/1'], ['PUT', '/1'], ['DELETE', '/1']]) {
                assert.equal((await fetch(orders.url + resource + suffix, { method })).status, 401);
                assert.equal((await fetch(orders.url + resource + suffix, { method, headers: { authorization: 'Bearer invalid' } })).status, 403);
            }
        }
    });

    let created;
    await t.test('create, list, detail and status', async () => {
        assert.deepEqual(await request('/orders'), []);
        created = await request('/orders', 'POST', body, 201);
        assert.equal(created.status, 'pending');
        assert.equal(created.total_amount, 24.7);
        assert.equal(created.items[0].unit_price, 12.35);
        assert.equal((await request('/orders')).length, 1);
        assert.equal((await request(`/orders/${created.id}`)).items.length, 1);
        for (const status of ['completed', 'cancelled', 'pending']) {
            assert.equal((await request(`/orders/${created.id}`, 'PUT', { status })).status, status);
        }
        await request(`/orders/${created.id}`, 'PUT', { status: 'shipped' }, 400);
    });

    await t.test('validation and failed creations leave no partial data', async () => {
        const count = () => db.prepare('SELECT COUNT(*) AS n FROM orders').get().n;
        const before = count();
        for (const invalid of [null, {}, { ...body, customer_name: '' }, { ...body, customer_email: 'bad' }, { ...body, items: [] },
            { ...body, items: [{ product_id: productId, quantity: 1.5 }] },
            { ...body, items: [{ product_id: productId, quantity: 11 }] },
            { ...body, items: [{ product_id: productId, quantity: 6 }, { product_id: productId, quantity: 6 }] }]) {
            await request('/orders', 'POST', invalid, 400);
        }
        await request('/orders', 'POST', { ...body, items: [...body.items, { product_id: 999, quantity: 1 }] }, 404);
        assert.equal(count(), before);
        assert.equal(db.prepare('SELECT COUNT(*) AS n FROM order_items').get().n, 1);
        // Force a failure during the second INSERT to verify actual SQLite rollback.
        db.exec(`CREATE TRIGGER fail_second BEFORE INSERT ON order_items WHEN NEW.quantity = 3
            BEGIN SELECT RAISE(ABORT, 'test insert failure'); END;`);
        await request('/orders', 'POST', { ...body, items: [...body.items, { product_id: productId, quantity: 3 }] }, 500);
        db.exec('DROP TRIGGER fail_second');
        assert.equal(count(), before);
        assert.equal(db.prepare('SELECT COUNT(*) AS n FROM order_items').get().n, 1);
    });

    await t.test('item CRUD synchronizes totals, validates aggregate stock and parent', async () => {
        const item = await request('/order_items', 'POST', { order_id: created.id, product_id: productId, quantity: 3, unit_price: 0 }, 201);
        assert.equal(item.total_price, 37.05);
        assert.equal((await request(`/orders/${created.id}`)).total_amount, 61.75);
        assert.equal((await request('/order_items')).length, 2);
        assert.equal((await request(`/order_items/${item.id}`)).id, item.id);
        const updated = await request(`/order_items/${item.id}`, 'PUT', { quantity: 4 });
        assert.equal(updated.total_price, 49.4);
        assert.equal((await request(`/orders/${created.id}`)).total_amount, 74.1);
        await request(`/order_items/${item.id}`, 'PUT', { quantity: 9 }, 400);
        for (const quantity of [0, -1, 0.5, '2']) await request(`/order_items/${item.id}`, 'PUT', { quantity }, 400);
        await request('/order_items', 'POST', { order_id: 999, product_id: productId, quantity: 1 }, 404);
        await request('/order_items', 'POST', { order_id: created.id, product_id: 999, quantity: 1 }, 404);
        await request('/order_items', 'POST', { order_id: created.id, product_id: productId, quantity: 5 }, 400);
        const other = await request('/orders', 'POST', body, 201);
        await request(`/order_items/${item.id}`, 'PUT', { order_id: other.id });
        assert.equal((await request(`/orders/${created.id}`)).total_amount, 24.7);
        assert.equal((await request(`/orders/${other.id}`)).total_amount, 74.1);
        await request(`/order_items/${item.id}`, 'DELETE', undefined, 204);
        assert.equal((await request(`/orders/${other.id}`)).total_amount, 24.7);
        await request(`/order_items/${item.id}`, 'GET', undefined, 404);
        await request(`/orders/${other.id}`, 'DELETE', undefined, 204);
        assert.equal(db.prepare('SELECT COUNT(*) AS n FROM order_items WHERE order_id = ?').get(other.id).n, 0);
        assert.equal(products.prepare('SELECT quantity FROM products WHERE id = ?').get(productId).quantity, 10);
    });

    await t.test('invalid IDs, malformed JSON and unknown route', async () => {
        for (const resource of ['/orders', '/order_items']) {
            for (const id of ['abc', '0', '-1', '1.5', '9007199254740992']) await request(`${resource}/${id}`, 'GET', undefined, 400);
            await request(`${resource}/99999`, 'GET', undefined, 404);
        }
        assert.equal((await fetch(orders.url + '/orders', { method: 'POST', headers, body: '{' })).status, 400);
        await request('/unknown', 'GET', undefined, 404);
    });

    await t.test('dependency failures return 503 without writes', async () => {
        const malformed = express();
        malformed.get('/products/:id', (req, res) => res.json({ id: 1 }));
        const badProduct = await serve(malformed);
        const badOrders = await serve(createOrders({ db, authServiceUrl: auth.url, productServiceUrl: badProduct.url }));
        assert.equal((await fetch(badOrders.url + '/orders', { method: 'POST', headers, body: JSON.stringify(body) })).status, 503);
        await new Promise(resolve => product.server.close(resolve));
        await request('/orders', 'POST', body, 503);
        await request('/order_items', 'POST', { order_id: created.id, product_id: productId, quantity: 1 }, 503);
        await request(`/order_items/${created.items[0].id}`, 'PUT', { quantity: 1 }, 503);
        assert.equal((await request(`/orders/${created.id}`)).total_amount, 24.7);
        await request(`/orders/${created.id}`, 'DELETE', undefined, 204);
        assert.deepEqual(await request('/order_items'), []);
        await new Promise(resolve => auth.server.close(resolve));
        await request('/orders', 'GET', undefined, 503);
        await request('/order_items', 'GET', undefined, 503);
    });
});
