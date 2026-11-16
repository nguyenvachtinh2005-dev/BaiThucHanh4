const jwt = require('jsonwebtoken');

const SECRET_KEY = 'my_secret_key';

function authMiddleware(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader || !/^Bearer \S+$/i.test(authHeader)) {
        return res.status(401).json({
            message: 'Token is required'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, SECRET_KEY);

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(403).json({
            message: 'Invalid or expired token'
        });
    }
}

module.exports = authMiddleware;
