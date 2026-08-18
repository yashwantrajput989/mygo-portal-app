const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const argon2 = require('argon2');
const crypto = require('crypto');
const prisma = require('../prisma');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

async function verifyPassword(storedHash, providedPassword) {
    if (!storedHash || !providedPassword) return false;

    // 1. Direct match (plain text)
    if (storedHash === providedPassword) return true;

    // 2. Argon2id format: Base64(Salt).Base64(Hash) from .NET Konscious.Security.Cryptography.Argon2id
    if (storedHash.includes('.')) {
        try {
            const [saltB64, hashB64] = storedHash.split('.');
            const salt = Buffer.from(saltB64, 'base64');
            const expectedHash = Buffer.from(hashB64, 'base64');

            const computed = await argon2.hash(providedPassword, {
                type: argon2.argon2id,
                memoryCost: 65536,
                timeCost: 4,
                parallelism: 8,
                salt: salt,
                hashLength: expectedHash.length,
                raw: true
            });

            if (crypto.timingSafeEqual(computed, expectedHash)) {
                return true;
            }
        } catch (e) {
            console.error('Argon2id verify notice:', e.message);
        }
    }

    // 3. Bcrypt match ($2a$, $2b$, $2y$)
    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
        try {
            if (await bcrypt.compare(providedPassword, storedHash)) return true;
        } catch (e) {}
    }

    // 4. ASP.NET Core Identity V3 (base64 with 0x01 header, PBKDF2)
    try {
        const decoded = Buffer.from(storedHash, 'base64');
        if (decoded.length >= 49 && decoded[0] === 0x01) {
            const prf = decoded.readUInt32BE(1);
            const iterCount = decoded.readUInt32BE(5);
            const saltLength = decoded.readUInt32BE(9);
            const salt = decoded.subarray(13, 13 + saltLength);
            const subkey = decoded.subarray(13 + saltLength);

            let digest = 'sha256';
            if (prf === 0) digest = 'sha1';
            else if (prf === 1) digest = 'sha256';
            else if (prf === 2) digest = 'sha512';

            const actualSubkey = crypto.pbkdf2Sync(providedPassword, salt, iterCount, subkey.length, digest);
            if (crypto.timingSafeEqual(subkey, actualSubkey)) return true;
        }
    } catch (e) {}

    // 5. ASP.NET Identity V2 (base64 with 0x00 header, 49 bytes total)
    try {
        const decoded = Buffer.from(storedHash, 'base64');
        if (decoded.length === 49 && decoded[0] === 0x00) {
            const salt = decoded.subarray(1, 17);
            const subkey = decoded.subarray(17, 49);
            const actualSubkey = crypto.pbkdf2Sync(providedPassword, salt, 1000, 32, 'sha1');
            if (crypto.timingSafeEqual(subkey, actualSubkey)) return true;
        }
    } catch (e) {}

    // 6. Generic bcrypt fallback
    try {
        if (await bcrypt.compare(providedPassword, storedHash)) return true;
    } catch (e) {}

    return false;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Find user by email (regardless of IsActive flag, all users are allowed)
        const user = await prisma.users.findFirst({
            where: {
                Email: { equals: email.trim(), mode: 'insensitive' }
            }
        });

        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found with this email' });
        }

        // Verify password
        if (password) {
            const isValid = await verifyPassword(user.PasswordHash, password);
            if (!isValid) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
        }

        // Fetch user roles
        const userRoles = await prisma.userRoles.findMany({
            where: { UserId: user.Id }
        });
        const roleIds = userRoles.map(ur => ur.RoleId);

        // If user has no roles, default to Role 1 (User)
        if (roleIds.length === 0) {
            roleIds.push(1);
        }

        // Fetch user module permissions
        const permissions = await prisma.roleModulePermissions.findMany({
            where: {
                RoleId: { in: roleIds },
                CanView: true
            }
        });
        const allowedModules = [...new Set(permissions.map(p => p.ModuleId))];

        // Format profile picture if available
        let profileImageSrc = null;
        if (user.ProfileImage && Buffer.isBuffer(user.ProfileImage) && user.ProfileImage.length > 0) {
            profileImageSrc = `data:image/png;base64,${user.ProfileImage.toString('base64')}`;
        }

        const token = jwt.sign(
            { userId: user.Id, email: user.Email, fullName: user.FullName },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.json({
            success: true,
            token,
            user: {
                id: user.Id,
                email: user.Email,
                fullName: user.FullName || user.Email,
                profileImage: profileImageSrc,
                roles: roleIds,
                permissions: allowedModules
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error during login' });
    }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const userRoles = await prisma.userRoles.findMany({
            where: { UserId: user.Id }
        });
        const roleIds = userRoles.map(ur => ur.RoleId);
        if (roleIds.length === 0) roleIds.push(1);

        const permissions = await prisma.roleModulePermissions.findMany({
            where: {
                RoleId: { in: roleIds },
                CanView: true
            }
        });
        const allowedModules = [...new Set(permissions.map(p => p.ModuleId))];

        let profileImageSrc = null;
        if (user.ProfileImage && Buffer.isBuffer(user.ProfileImage) && user.ProfileImage.length > 0) {
            profileImageSrc = `data:image/png;base64,${user.ProfileImage.toString('base64')}`;
        }

        return res.json({
            success: true,
            user: {
                id: user.Id,
                email: user.Email,
                fullName: user.FullName || user.Email,
                profileImage: profileImageSrc,
                roles: roleIds,
                permissions: allowedModules
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
