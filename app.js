const express = require('express');
const authRouter = require('./routes/auth');
const authMiddleware = require('./middleware/authMiddleware.js');

const app = express();
const port = Number(process.env.AUTH_PORT || 3000);

app.use(express.json());

app.use('/', authRouter);

app.get('/hello', authMiddleware, (req, res) => {
    res.send('Hello World');
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Auth Service is running on port ${port}`);
    });
}

module.exports = app;
