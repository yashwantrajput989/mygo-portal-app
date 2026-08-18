const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticateToken } = require('../middleware/auth');

// GET /api/permissions
router.get('/', authenticateToken, async (req, res) => {
    try {
        const roles = await prisma.roles.findMany({ orderBy: { Id: 'asc' } });
        const modules = await prisma.modules.findMany({ orderBy: { Id: 'asc' } });
        const matrix = await prisma.roleModulePermissions.findMany();

        return res.json({
            success: true,
            roles: roles.map(r => ({ id: r.Id, name: r.Name, description: r.Description })),
            modules: modules.map(m => ({ id: m.Id, name: m.Name, description: m.Description })),
            matrix: matrix.map(p => ({
                id: p.Id,
                roleId: p.RoleId,
                moduleId: p.ModuleId,
                canView: p.CanView,
                canAdd: p.CanAdd,
                canEdit: p.CanEdit,
                canDelete: p.CanDelete,
                canApprove: p.CanApprove,
                canExport: p.CanExport
            }))
        });
    } catch (err) {
        console.error('Permissions get error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/permissions/update
router.post('/update', authenticateToken, async (req, res) => {
    try {
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

        return res.json({ success: true, message: 'Permission updated successfully' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
