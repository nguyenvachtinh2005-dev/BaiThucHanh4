const express = require('express');
const jwt = require('jsonwebtoken');
const users = require('../data/users');

const router = express.Router();

const SECRET_KEY = 'my_secret_key';

router.post('/login', (req, res) => {

    const { userName, password } = req.body || {};

    const user = users.find(
        u => u.UserName === userName && u.Password === password
    );

    if (user) {

        const token = jwt.sign(
            {
                IdUser: user.IdUser,
                UserName: user.UserName
            },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        user.Token = token;

        return res.json({
            message: 'Login successful',
            token: token
        });
    }

    return res.status(401).json({
        message: 'Invalid username or password'
    });
});

router.post('/auth', (req, res) => {

    const authHeader = req.headers.authorization;

    if (!authHeader || !/^Bearer \S+$/i.test(authHeader)) {
        return res.status(401).json({
            message: 'Token is required'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, SECRET_KEY);

        return res.json({
            message: 'Token is valid',
            user: decoded
        });

    } catch (error) {
        return res.status(403).json({
            message: 'Invalid or expired token'
        });
    }
});

module.exports = router;
