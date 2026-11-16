const AppError = require('../errors/appError');

function createProductClient(baseUrl) {
    return {
        async getProduct(productId, authorization) {
            let response;
            try {
                response = await fetch(`${baseUrl.replace(/\/$/, '')}/products/${productId}`, {
                    headers: { authorization },
                    signal: AbortSignal.timeout(5000)
                });
            } catch {
                throw new AppError(503, 'Product Service is unavailable');
            }

            if (response.status === 404) throw new AppError(404, `Product ${productId} not found`);
            if ([401, 403].includes(response.status)) {
                throw new AppError(response.status, 'Invalid or expired token');
            }
            if (!response.ok) throw new AppError(503, 'Product Service is unavailable');

            let product;
            try {
                product = await response.json();
            } catch {
                throw new AppError(503, 'Invalid Product Service response');
            }

            if (!product || product.id !== productId ||
                typeof product.name !== 'string' || !product.name.trim() ||
                !Number.isSafeInteger(product.quantity) || product.quantity < 0 ||
                typeof product.price !== 'number' || !Number.isFinite(product.price) ||
                product.price < 0 || !Number.isSafeInteger(Math.round(product.price * 100))) {
                throw new AppError(503, 'Invalid Product Service response');
            }
            return product;
        }
    };
}

module.exports = createProductClient;
