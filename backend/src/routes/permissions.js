const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticateToken } = require('../middleware/auth');

// Helper to check admin
async function checkAdmin(userId) {
    const userRoles = await prisma.userRoles.findMany({
        where: { UserId: userId }
    });
    return userRoles.some(r => r.RoleId === 5);
}

// GET /api/permissions
router.get('/', authenticateToken, async (req, res) => {
    try {
        const roles = await prisma.roles.findMany({ orderBy: { Id: 'asc' } });
        const modules = await prisma.modules.findMany({ orderBy: { Id: 'asc' } });
        const matrix = await prisma.roleModulePermissions.findMany();
        const isAdmin = await checkAdmin(req.userId);

        return res.json({
            success: true,
            isAdmin,
            roles: roles.map(r => ({ id: r.Id, name: r.Name, description: r.Description })),
            modules: modules.map(m => ({ id: m.Id, name: m.Name, description: m.Description })),
            matrix: matrix.map(p => ({
                id: p.Id,
                roleId: p.RoleId,
                moduleId: p.ModuleId,
                canView: Boolean(p.CanView),
                canAdd: Boolean(p.CanAdd),
                canEdit: Boolean(p.CanEdit),
                canDelete: Boolean(p.CanDelete),
                canApprove: Boolean(p.CanApprove),
                canExport: Boolean(p.CanExport)
            }))
        });
    } catch (err) {
        console.error('Permissions get error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/permissions/save-all (Admin only bulk save)
router.post('/save-all', authenticateToken, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.userId);
        if (!isAdmin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access Denied: Only Workspace Admins have authority to update security permissions.' 
            });
        }

        const { matrix } = req.body;
        if (!matrix || !Array.isArray(matrix)) {
            return res.status(400).json({ success: false, message: 'Invalid matrix data provided.' });
        }

        for (const item of matrix) {
            const roleId = parseInt(item.roleId);
            const moduleId = parseInt(item.moduleId);

            const existing = await prisma.roleModulePermissions.findFirst({
                where: { RoleId: roleId, ModuleId: moduleId }
            });

            const data = {
                CanView: Boolean(item.canView),
                CanAdd: Boolean(item.canAdd),
                CanEdit: Boolean(item.canEdit),
                CanDelete: Boolean(item.canDelete),
                CanApprove: Boolean(item.canApprove),
                CanExport: Boolean(item.canExport)
            };

            if (existing) {
                await prisma.roleModulePermissions.update({
                    where: { Id: existing.Id },
                    data
                });
            } else {
                const lastPerm = await prisma.roleModulePermissions.findFirst({ orderBy: { Id: 'desc' } });
                const nextId = (lastPerm?.Id || 0) + 1;

                await prisma.roleModulePermissions.create({
                    data: {
                        Id: nextId,
                        RoleId: roleId,
                        ModuleId: moduleId,
                        ...data
                    }
                });
            }
        }

        return res.json({
            success: true,
            message: 'All permissions saved and applied immediately across all active user sessions!'
        });
    } catch (err) {
        console.error('Bulk save error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/permissions/update (Single flag toggle)
router.post('/update', authenticateToken, async (req, res) => {
    try {
        const isAdmin = await checkAdmin(req.userId);
        if (!isAdmin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access Denied: Only Workspace Admins have authority to update security permissions.' 
            });
        }

        const { roleId, moduleId, field, value } = req.body;

        const existing = await prisma.roleModulePermissions.findFirst({
            where: {
                RoleId: parseInt(roleId),
                ModuleId: parseInt(moduleId)
            }
        });

        if (existing) {
            const updateData = {};
            updateData[field] = Boolean(value);
            await prisma.roleModulePermissions.update({
                where: { Id: existing.Id },
                data: updateData
            });
        } else {
            const lastPerm = await prisma.roleModulePermissions.findFirst({ orderBy: { Id: 'desc' } });
            const nextId = (lastPerm?.Id || 0) + 1;

            const createData = {
                Id: nextId,
                RoleId: parseInt(roleId),
                ModuleId: parseInt(moduleId),
                CanView: field === 'CanView' ? Boolean(value) : false,
                CanAdd: field === 'CanAdd' ? Boolean(value) : false,
                CanEdit: field === 'CanEdit' ? Boolean(value) : false,
                CanDelete: field === 'CanDelete' ? Boolean(value) : false,
                CanApprove: field === 'CanApprove' ? Boolean(value) : false,
                CanExport: field === 'CanExport' ? Boolean(value) : false
            };

            await prisma.roleModulePermissions.create({ data: createData });
        }

        return res.json({ success: true, message: 'Permission updated immediately.' });
    } catch (err) {
        console.error('Single update error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
