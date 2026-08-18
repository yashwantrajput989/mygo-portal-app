const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticateToken } = require('../middleware/auth');

// GET /api/projects
router.get('/', authenticateToken, async (req, res) => {
    try {
        const projects = await prisma.projects.findMany({
            orderBy: { Name: 'asc' }
        });

        const clientIds = [...new Set(projects.map(p => p.ClientId).filter(Boolean))];
        const clients = await prisma.clients.findMany({
            where: { Id: { in: clientIds } },
            select: { Id: true, ClientName: true, ClientCode: true }
        });
        const clientMap = {};
        clients.forEach(c => { clientMap[c.Id] = c; });

        // Fetch assignments for all projects
        const projectIds = projects.map(p => p.Id);
        const assignments = await prisma.assignments.findMany({
            where: { ProjectId: { in: projectIds } }
        });

        const assigneeIds = [...new Set(assignments.map(a => a.AssigneeId).filter(Boolean))];
        const users = await prisma.users.findMany({
            where: { Id: { in: assigneeIds } },
            select: { Id: true, FullName: true, Email: true }
        });
        const userMap = {};
        users.forEach(u => { userMap[u.Id] = u; });

        const assignmentsByProj = {};
        assignments.forEach(a => {
            if (!assignmentsByProj[a.ProjectId]) assignmentsByProj[a.ProjectId] = [];
            const u = userMap[a.AssigneeId];
            assignmentsByProj[a.ProjectId].push({
                id: a.Id,
                userId: a.AssigneeId,
                name: u?.FullName || u?.Email || 'Team Member',
                title: a.Title || 'Resource',
                isBillable: a.IsBillable,
                hours: Number(a.PlannedHours || 0)
            });
        });

        const formatted = projects.map(p => ({
            id: p.Id,
            name: p.Name,
            code: p.Code || '',
            description: p.description || '',
            clientId: p.ClientId,
            clientName: clientMap[p.ClientId]?.ClientName || 'Internal Client',
            clientCode: clientMap[p.ClientId]?.ClientCode || '',
            startDate: p.startDate,
            endDate: p.endDate,
            status: p.status || 'Active',
            isActive: p.IsActive,
            plannedHours: Number(p.totalPlannedHours || 0),
            actualHours: Number(p.totalActHours || 0),
            team: assignmentsByProj[p.Id] || []
        }));

        const allClients = await prisma.clients.findMany({
            select: { Id: true, ClientName: true, ClientCode: true },
            orderBy: { ClientName: 'asc' }
        });

        return res.json({ success: true, projects: formatted, clients: allClients });
    } catch (err) {
        console.error('Projects get error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/projects/create
router.post('/create', authenticateToken, async (req, res) => {
    try {
        const { name, code, clientId, description, startDate, endDate, plannedHours, status } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Project name is required' });
        }

        const lastProj = await prisma.projects.findFirst({ orderBy: { Id: 'desc' } });
        const nextId = (lastProj?.Id || 0) + 1;

        const newProject = await prisma.projects.create({
            data: {
                Id: nextId,
                Name: name,
                Code: code || `PRJ-${nextId}`,
                ClientId: parseInt(clientId) || 1,
                description: description || name,
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : null,
                totalPlannedHours: parseFloat(plannedHours) || 0,
                totalActHours: 0,
                status: status || 'In Progress',
                IsActive: true,
                CreatedAt: new Date()
            }
        });

        return res.json({ success: true, message: 'Project created successfully!', project: newProject });
    } catch (err) {
        console.error('Project create error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
