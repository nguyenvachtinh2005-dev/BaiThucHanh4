function authenticate(authServiceUrl) {
    return async (req, res, next) => {
        const authorization = req.headers.authorization;
        if (!authorization || !/^Bearer \S+$/i.test(authorization)) {
            return res.status(401).json({ message: 'Bearer token is required' });
        }
        try {
            const response = await fetch(`${authServiceUrl.replace(/\/$/, '')}/auth`, {
                method: 'POST',
                headers: { authorization },
                signal: AbortSignal.timeout(5000)
            });
            if (response.status === 401 || response.status === 403) {
                return res.status(response.status).json({ message: 'Invalid or expired token' });
            }
            if (!response.ok) throw new Error('Auth Service failed');
            const result = await response.json();
            if (!result.user) throw new Error('Invalid Auth Service response');
            req.user = result.user;
            next();
        } catch (error) {
            return res.status(503).json({ message: 'Auth Service is unavailable' });
        }
    };
}

module.exports = authenticate;
