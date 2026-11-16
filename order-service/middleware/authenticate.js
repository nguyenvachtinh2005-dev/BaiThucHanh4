const AppError = require('../errors/appError');

function authenticate(authClient) {
    return async (req, res, next) => {
        const authorization = req.headers.authorization;
        if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) {
            return res.status(401).json({ message: 'Bearer token is required' });
        }

        try {
            req.user = await authClient.authenticate(authorization);
            return next();
        } catch (error) {
            if (error instanceof AppError) {
                return res.status(error.status).json({ message: error.message });
            }
            return next(error);
        }
    };
}

module.exports = authenticate;
