const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticateToken } = require('../middleware/auth');

// GET /api/clients
router.get('/', authenticateToken, async (req, res) => {
    try {
        const clients = await prisma.clients.findMany({
            orderBy: { ClientName: 'asc' }
        });

        // Count projects per client
        const projects = await prisma.projects.findMany({
            select: { Id: true, ClientId: true, IsActive: true }
        });

        const projectCountMap = {};
        projects.forEach(p => {
            if (p.ClientId) {
                projectCountMap[p.ClientId] = (projectCountMap[p.ClientId] || 0) + 1;
            }
        });

        const formatted = clients.map(c => ({
            id: c.Id,
            clientName: c.ClientName,
            clientCode: c.ClientCode || c.ClientId || `CL-${c.Id}`,
            contactPerson: c.ContactPerson || c.ContactName || 'N/A',
            contactEmail: c.ContactEmail || 'N/A',
            phone: c.Phone || c.AlternateContact || 'N/A',
            country: c.Country || 'Global',
            industry: c.Industry || 'Enterprise IT',
            billingType: c.BillingType || 'Monthly',
            contractValue: Number(c.ContractValue || 0),
            relationshipStatus: c.RelationshipStatus || 'Active Partner',
            satisfaction: c.ClientSatisfaction || 5,
            isActive: c.IsActive,
            activeProjectsCount: projectCountMap[c.Id] || 0
        }));

        return res.json({ success: true, clients: formatted });
    } catch (err) {
        console.error('Clients get error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/clients/create
router.post('/create', authenticateToken, async (req, res) => {
    try {
        const { clientName, clientCode, contactPerson, contactEmail, phone, country, industry, billingType } = req.body;

        if (!clientName) {
            return res.status(400).json({ success: false, message: 'Client name is required' });
        }

        const lastClient = await prisma.clients.findFirst({ orderBy: { Id: 'desc' } });
        const nextId = (lastClient?.Id || 0) + 1;

        const newClient = await prisma.clients.create({
            data: {
                Id: nextId,
                ClientName: clientName,
                ClientCode: clientCode || `CL-${nextId}`,
                ClientId: clientCode || `CL-${nextId}`,
                ContactPerson: contactPerson || '',
                ContactEmail: contactEmail || '',
                Phone: phone || '',
                Country: country || 'India',
                Industry: industry || 'Technology',
                BillingType: billingType || 'Monthly',
                IsActive: true,
                CreatedAt: new Date()
            }
        });

        return res.json({ success: true, message: 'Client registered successfully!', client: newClient });
    } catch (err) {
        console.error('Client create error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
