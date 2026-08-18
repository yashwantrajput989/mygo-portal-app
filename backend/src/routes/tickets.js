const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticateToken } = require('../middleware/auth');

// GET /api/tickets
router.get('/', authenticateToken, async (req, res) => {
    try {
        const tickets = await prisma.tickets.findMany({
            orderBy: { CreatedDate: 'desc' },
            take: 100
        });

        const createdUserIds = [...new Set(tickets.map(t => t.CreatedUserId).filter(Boolean))];
        const assignedUserIds = [...new Set(tickets.map(t => t.AssignedUserId).filter(Boolean))];
        const allUserIds = [...new Set([...createdUserIds, ...assignedUserIds])];

        const users = await prisma.users.findMany({
            where: { Id: { in: allUserIds } },
            select: { Id: true, FullName: true, Email: true }
        });
        const userMap = {};
        users.forEach(u => { userMap[u.Id] = u; });

        const categories = await prisma.categoryMaster.findMany();
        const categoryMap = {};
        categories.forEach(c => { categoryMap[c.Id] = c.CategoryName; });

        const formatted = tickets.map(t => ({
            id: t.Id,
            ticketCode: t.TicketCode || `TCK-${t.Id}`,
            title: t.Title,
            description: t.Description || '',
            priority: t.Priority || 'Medium',
            status: t.Status || 'Open',
            createdByName: userMap[t.CreatedUserId]?.FullName || t.CreatedBy || 'Team Member',
            createdByEmail: userMap[t.CreatedUserId]?.Email || '',
            assignedToName: userMap[t.AssignedUserId]?.FullName || 'Helpdesk Queue',
            category: categoryMap[t.CategoryMasterId] || 'IT & General Support',
            createdDate: t.CreatedDate
        }));

        const stats = {
            open: tickets.filter(t => t.Status === 'Open' || !t.Status).length,
            inProgress: tickets.filter(t => t.Status === 'In Progress').length,
            resolved: tickets.filter(t => t.Status === 'Resolved' || t.Status === 'Closed').length,
            total: tickets.length
        };

        return res.json({
            success: true,
            tickets: formatted,
            categories: categories.map(c => ({ id: c.Id, name: c.CategoryName })),
            stats
        });
    } catch (err) {
        console.error('Tickets get error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/tickets/create
router.post('/create', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const userName = req.user?.fullName || req.user?.email || 'User';
        const { title, description, priority, categoryId } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Ticket title is required' });
        }

        const lastTicket = await prisma.tickets.findFirst({ orderBy: { Id: 'desc' } });
        const nextId = (lastTicket?.Id || 0) + 1;
        const ticketCode = `TCK-${String(nextId).padStart(4, '0')}`;

        const newTicket = await prisma.tickets.create({
            data: {
                Id: nextId,
                TicketCode: ticketCode,
                Title: title,
                Description: description || '',
                Priority: priority || 'Medium',
                Status: 'Open',
                CreatedBy: userName,
                CreatedUserId: userId,
                CategoryMasterId: parseInt(categoryId) || 1,
                CreatedDate: new Date()
            }
        });

        // Add activity
        try {
            const lastAct = await prisma.ticketActivities.findFirst({ orderBy: { Id: 'desc' } });
            const nextActId = (lastAct?.Id || 0) + 1;
            await prisma.ticketActivities.create({
                data: {
                    Id: nextActId,
                    TicketId: newTicket.Id,
                    Action: 'Ticket Created',
                    PerformedBy: userName,
                    CreatedDate: new Date()
                }
            });
        } catch (actErr) {
            console.error('Ticket activity notice:', actErr.message);
        }

        return res.json({ success: true, message: 'Support ticket submitted successfully!', ticket: newTicket });
    } catch (err) {
        console.error('Create ticket error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/tickets/:id/comments
router.get('/:id/comments', authenticateToken, async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        const comments = await prisma.ticketComments.findMany({
            where: { TicketId: ticketId },
            orderBy: { CreatedDate: 'asc' }
        });

        return res.json({ success: true, comments });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/tickets/:id/comments
router.post('/:id/comments', authenticateToken, async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        const { comment } = req.body;
        const userName = req.user?.fullName || req.user?.email || 'User';

        if (!comment || !comment.trim()) {
            return res.status(400).json({ success: false, message: 'Comment content is required' });
        }

        const lastC = await prisma.ticketComments.findFirst({ orderBy: { Id: 'desc' } });
        const nextId = (lastC?.Id || 0) + 1;

        const newComment = await prisma.ticketComments.create({
            data: {
                Id: nextId,
                TicketId: ticketId,
                Comment: comment,
                CommentedBy: userName,
                CreatedDate: new Date()
            }
        });

        return res.json({ success: true, comment: newComment });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
