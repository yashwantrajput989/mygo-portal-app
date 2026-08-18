const express = require('express');
const router = express.Router();
const multer = require('multer');
const prisma = require('../prisma');
const { authenticateToken } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

// GET /api/expenses
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;

        const expenses = await prisma.expenses.findMany({
            where: { UserId: userId },
            orderBy: { ExpenseDate: 'desc' }
        });

        const projectIds = [...new Set(expenses.map(e => e.ProjectId).filter(Boolean))];
        const expenseIds = expenses.map(e => e.ExpenseId);

        const projects = await prisma.projects.findMany({
            where: { Id: { in: projectIds } },
            select: { Id: true, Name: true, Code: true }
        });
        const projectMap = {};
        projects.forEach(p => { projectMap[p.Id] = p; });

        const attachments = await prisma.expenseAttachments.findMany({
            where: { ExpenseId: { in: expenseIds } },
            select: { AttachmentId: true, ExpenseId: true, OriginalFileName: true, ContentType: true }
        });
        const attachmentMap = {};
        attachments.forEach(a => {
            if (!attachmentMap[a.ExpenseId]) attachmentMap[a.ExpenseId] = [];
            attachmentMap[a.ExpenseId].push(a);
        });

        const types = await prisma.expenseTypes.findMany({
            where: { IsActive: true },
            orderBy: { ExpenseName: 'asc' }
        });

        const currencies = await prisma.currencyMaster.findMany({
            where: { IsActive: true },
            orderBy: { CurrencyCode: 'asc' }
        });

        const allActiveProjects = await prisma.projects.findMany({
            where: { IsActive: true },
            select: { Id: true, Name: true, Code: true },
            orderBy: { Name: 'asc' }
        });

        const formatted = expenses.map(e => ({
            id: e.ExpenseId,
            expenseNo: e.ExpenseNo,
            title: e.ExpTitle || e.ExpDescription || 'Expense Claim',
            projectId: e.ProjectId,
            projectName: projectMap[e.ProjectId]?.Name || 'General Project',
            projectCode: projectMap[e.ProjectId]?.Code || '',
            amount: Number(e.Amount || 0),
            currency: e.Currency || 'USD',
            currencySymbol: e.CurrencySymbol || '$',
            expenseDate: e.ExpenseDate,
            vendor: e.Vendor || 'N/A',
            description: e.ExpDescription || '',
            status: e.Status || 'Pending',
            reimburseToMe: e.ReimburseToMe,
            billToClient: e.BillToClient,
            attachments: attachmentMap[e.ExpenseId] || []
        }));

        return res.json({
            success: true,
            expenses: formatted,
            types: types.map(t => ({ id: t.ExpenseTypeId, name: t.ExpenseName, category: t.Category })),
            currencies: currencies.map(c => ({ id: c.CurrencyId, code: c.CurrencyCode, symbol: c.CurrencySymbol })),
            projects: allActiveProjects.map(p => ({ id: p.Id, name: p.Name, code: p.Code }))
        });
    } catch (err) {
        console.error('Expenses get error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/expenses/create
router.post('/create', authenticateToken, upload.single('receipt'), async (req, res) => {
    try {
        const userId = req.userId;
        const { projectId, title, amount, currency, expenseDate, expenseTypeId, vendor, description, reimburseToMe, billToClient } = req.body;

        if (!amount || isNaN(parseFloat(amount))) {
            return res.status(400).json({ success: false, message: 'Valid amount is required' });
        }

        // Generate ExpenseNo
        const now = new Date();
        const datePart = `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
        const lastExp = await prisma.expenses.findFirst({ orderBy: { ExpenseId: 'desc' } });
        const nextId = (lastExp?.ExpenseId || 0) + 1;
        const expenseNo = `EXP_${datePart}_${String(nextId).padStart(5, '0')}`;

        const parsedProjectId = parseInt(projectId) || 1;
        const parsedTypeId = parseInt(expenseTypeId) || 1;
        const curr = currency || 'INR';
        const currSymbol = curr === 'USD' ? '$' : (curr === 'EUR' ? '€' : (curr === 'GBP' ? '£' : '₹'));

        const expense = await prisma.expenses.create({
            data: {
                ExpenseId: nextId,
                ExpenseNo: expenseNo,
                ExpenseDate: expenseDate ? new Date(expenseDate) : new Date(),
                ExpenseTypeId: parsedTypeId,
                Vendor: vendor || '',
                Currency: curr,
                CurrencySymbol: currSymbol,
                Amount: parseFloat(amount),
                ReimburseToMe: reimburseToMe === 'true' || reimburseToMe === true,
                BillToClient: billToClient === 'true' || billToClient === true,
                ExpDescription: description || title || '',
                ExpTitle: title || description || 'Expense Claim',
                ProjectId: parsedProjectId,
                CurrentStep: 1,
                Status: 'Submitted',
                UserId: userId,
                CreatedAt: new Date(),
                CreatedOn: new Date()
            }
        });

        // Save receipt attachment if uploaded
        if (req.file) {
            const lastAtt = await prisma.expenseAttachments.findFirst({ orderBy: { AttachmentId: 'desc' } });
            const nextAttId = (lastAtt?.AttachmentId || 0) + 1;

            await prisma.expenseAttachments.create({
                data: {
                    AttachmentId: nextAttId,
                    ExpenseNo: expenseNo,
                    ExpenseId: expense.ExpenseId,
                    OriginalFileName: req.file.originalname,
                    ContentType: req.file.mimetype || 'application/octet-stream',
                    FileSize: BigInt(req.file.size),
                    FileData: req.file.buffer,
                    UploadedBy: String(userId),
                    UploadedOn: new Date()
                }
            });
        }

        // Initialize ExpenseEntryRowApprovals
        try {
            const lastAppr = await prisma.expenseEntryRowApprovals.findFirst({ orderBy: { Id: 'desc' } });
            const nextApprId = (lastAppr?.Id || 0) + 1;
            await prisma.expenseEntryRowApprovals.create({
                data: {
                    Id: nextApprId,
                    ExpenseId: expense.ExpenseId,
                    StepNumber: 1,
                    ApproverId: 29, // Default to admin or PM
                    Status: 'Pending',
                    CreatedAt: new Date()
                }
            });
        } catch (apprErr) {
            console.error('Approval init notice:', apprErr.message);
        }

        return res.json({
            success: true,
            message: 'Expense claim submitted successfully!',
            expense: {
                id: expense.ExpenseId,
                expenseNo: expense.ExpenseNo
            }
        });
    } catch (err) {
        console.error('Create expense error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/expenses/attachments/:id
router.get('/attachments/:id', authenticateToken, async (req, res) => {
    try {
        const attachmentId = parseInt(req.params.id);
        const attachment = await prisma.expenseAttachments.findUnique({
            where: { AttachmentId: attachmentId }
        });

        if (!attachment || !attachment.FileData) {
            return res.status(404).json({ success: false, message: 'Receipt attachment not found' });
        }

        res.setHeader('Content-Type', attachment.ContentType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${attachment.OriginalFileName}"`);
        return res.send(attachment.FileData);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
