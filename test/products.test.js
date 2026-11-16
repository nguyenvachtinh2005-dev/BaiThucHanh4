const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const authApp = require('../app');
const createApp = require('../product-service/app');
const openDatabase = require('../product-service/database');

test('Product Service CRUD, persistence and authentication through Auth Service', async (t) => {
    const directory = mkdtempSync(path.join(tmpdir(), 'products-test-'));
    const filename = path.join(directory, 'products.sqlite');
    let db = openDatabase(filename);
    const authServer = authApp.listen(0, '127.0.0.1');
    await once(authServer, 'listening');
    const authUrl = `http://127.0.0.1:${authServer.address().port}`;
    const productServer = createApp({ db, authServiceUrl: authUrl }).listen(0, '127.0.0.1');
    await once(productServer, 'listening');
    const baseUrl = `http://127.0.0.1:${productServer.address().port}/products`;
    t.after(async () => {
        await Promise.all([new Promise(resolve => productServer.close(resolve)), new Promise(resolve => authServer.close(resolve))]);
        db.close();
        rmSync(directory, { recursive: true, force: true });
    });
    const login = await fetch(`${authUrl}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: 'admin', password: 'MTIzNDU2' })
    });
    assert.equal(login.status, 200);
    const { token } = await login.json();
    const headers = { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    for (const [method, suffix] of [['GET', ''], ['GET', '/1'], ['POST', ''], ['PUT', '/1'], ['DELETE', '/1']]) {
        assert.equal((await fetch(baseUrl + suffix, { method })).status, 401);
    }
    assert.equal((await fetch(baseUrl, { headers: { authorization: 'Bearer invalid' } })).status, 403);
    const product = { name: 'Laptop', description: 'Test product', price: 123.45, quantity: 5 };
    let response = await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(product) });
    assert.equal(response.status, 201);
    const created = await response.json();
    assert.equal(response.headers.get('location'), `/products/${created.id}`);
    assert.equal(created.price, 123.45);
    assert.ok(created.created_at && created.updated_at);
    assert.equal((await (await fetch(baseUrl, { headers })).json()).length, 1);
    assert.equal((await (await fetch(`${baseUrl}/${created.id}`, { headers })).json()).name, 'Laptop');
    for (const invalid of [{ name: '' }, { price: -1 }, { price: 1.001 }, { price: '12' }, { quantity: 1.5 }, { quantity: -1 }, { description: null }]) {
        assert.equal((await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify({ ...product, ...invalid }) })).status, 400);
    }
    assert.equal((await fetch(baseUrl, { method: 'POST', headers, body: '{' })).status, 400);
    response = await fetch(`${baseUrl}/${created.id}`, {
        method: 'PUT', headers, body: JSON.stringify({ ...product, name: 'Updated laptop', quantity: 2 })
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).quantity, 2);
    // A separate connection verifies data is persisted in the service's own database.
    const reopened = openDatabase(filename);
    assert.equal(reopened.prepare('SELECT name FROM products WHERE id = ?').get(created.id).name, 'Updated laptop');
    reopened.close();
    assert.equal((await fetch(`${baseUrl}/abc`, { headers })).status, 400);
    assert.equal((await fetch(`${baseUrl}/99999`, { headers })).status, 404);
    assert.equal((await fetch(`${baseUrl}/${created.id}`, { method: 'DELETE', headers })).status, 204);
    assert.equal((await fetch(`${baseUrl}/${created.id}`, { headers })).status, 404);
    assert.equal((await (await fetch(baseUrl, { headers })).json()).length, 0);
    await new Promise(resolve => authServer.close(resolve));
    assert.equal((await fetch(baseUrl, { headers })).status, 503);
});
