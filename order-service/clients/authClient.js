const AppError = require('../errors/appError');

function createAuthClient(baseUrl) {
    return {
        async authenticate(authorization) {
            let response;
            try {
                response = await fetch(`${baseUrl.replace(/\/$/, '')}/auth`, {
                    method: 'POST',
                    headers: { authorization },
                    signal: AbortSignal.timeout(5000)
                });
            } catch {
                throw new AppError(503, 'Auth Service is unavailable');
            }

            if ([401, 403].includes(response.status)) {
                throw new AppError(response.status, 'Invalid or expired token');
            }
            if (!response.ok) throw new AppError(503, 'Auth Service is unavailable');

            let result;
            try {
                result = await response.json();
            } catch {
                throw new AppError(503, 'Invalid Auth Service response');
            }
            if (!result || !result.user) {
                throw new AppError(503, 'Invalid Auth Service response');
            }
            return result.user;
        }
    };
}

module.exports = createAuthClient;
