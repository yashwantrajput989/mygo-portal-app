const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'mygo-portal-secret-key-2026-secure';

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prisma.users.findUnique({
            where: { Id: decoded.userId }
        });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid user session' });
        }

        req.user = user;
        req.userId = user.Id;
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Token invalid or expired' });
    }
}

module.exports = { authenticateToken, JWT_SECRET };
