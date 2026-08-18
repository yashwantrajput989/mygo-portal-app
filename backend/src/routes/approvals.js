const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticateToken } = require('../middleware/auth');

// GET /api/approvals/timesheets
router.get('/timesheets', authenticateToken, async (req, res) => {
    try {
        const pendingTimesheets = await prisma.timesheets.findMany({
            where: { Status: { in: ['Submitted', 'Pending'] } },
            orderBy: { PeriodStart: 'desc' },
            take: 50
        });

        if (pendingTimesheets.length === 0) {
            return res.json({ success: true, timesheets: [] });
        }

        const userIds = [...new Set(pendingTimesheets.map(t => t.UserId).filter(Boolean))];
        const timesheetIds = pendingTimesheets.map(t => t.Id);

        // Fetch Users
        const users = await prisma.users.findMany({
            where: { Id: { in: userIds } },
            select: { Id: true, FullName: true, Email: true }
        });
        const userMap = {};
        users.forEach(u => { userMap[u.Id] = u; });

        // Fetch Rows
        const rows = await prisma.timeEntryRows.findMany({
            where: { TimesheetId: { in: timesheetIds } }
        });
        const projectIds = [...new Set(rows.map(r => r.ProjectId))];

        // Fetch Projects
        const projects = await prisma.projects.findMany({
            where: { Id: { in: projectIds } },
            select: { Id: true, Name: true, Code: true }
        });
        const projectMap = {};
        projects.forEach(p => { projectMap[p.Id] = p; });

        // Group rows by timesheet
        const rowsByTs = {};
        rows.forEach(r => {
            if (!rowsByTs[r.TimesheetId]) rowsByTs[r.TimesheetId] = [];
            rowsByTs[r.TimesheetId].push({
                id: r.Id,
                projectId: r.ProjectId,
                projectName: projectMap[r.ProjectId]?.Name || `Project #${r.ProjectId}`,
                projectCode: projectMap[r.ProjectId]?.Code || '',
                activityType: r.ActivityType,
                totalHours: Number(r.TotalWorkingHours || 0)
            });
        });

        const formatted = pendingTimesheets.map(ts => {
            const u = userMap[ts.UserId];
            const tsRows = rowsByTs[ts.Id] || [];
            return {
                id: ts.Id,
                userId: ts.UserId,
                employeeName: u?.FullName || u?.Email || 'Employee',
                employeeEmail: u?.Email || '',
                periodStart: ts.PeriodStart,
                periodEnd: ts.PeriodEnd,
                actualHoursTotal: Number(ts.ActualHoursTotal || 0),
                status: ts.Status,
                submittedAt: ts.SubmittedAt || ts.CreatedAt,
                rows: tsRows,
                projectNames: [...new Set(tsRows.map(r => r.projectName))]
            };
        });

        return res.json({ success: true, timesheets: formatted });
    } catch (err) {
        console.error('Approvals timesheets error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/approvals/timesheets/:id/action
router.post('/timesheets/:id/action', authenticateToken, async (req, res) => {
    try {
        const timesheetId = parseInt(req.params.id);
        const { action, remarks } = req.body; // 'Approve' or 'Reject'
        const approverName = req.user?.fullName || req.user?.email || 'Approver';
        const approverId = req.userId;

        const newStatus = action === 'Approve' ? 'Approved' : 'Rejected';

        // Update Timesheets Header
        await prisma.timesheets.update({
            where: { Id: timesheetId },
            data: { Status: newStatus }
        });

        // Update rows status
        await prisma.timeEntryRows.updateMany({
            where: { TimesheetId: timesheetId },
            data: { Status: newStatus }
        });

        // Log to TimesheetHistoryLogs
        try {
            const lastLog = await prisma.timesheetHistoryLogs.findFirst({ orderBy: { Id: 'desc' } });
            const nextLogId = (lastLog?.Id || 0) + 1;
            await prisma.timesheetHistoryLogs.create({
                data: {
                    Id: nextLogId,
                    TimesheetId: timesheetId,
                    UserId: approverId,
                    UserName: approverName,
                    ActionType: newStatus,
                    Status: newStatus,
                    ApproverId: approverId,
                    ApproverName: approverName,
                    ActionDate: new Date(),
                    Remarks: remarks || `Timesheet ${newStatus} by ${approverName}`
                }
            });
        } catch (logErr) {
            console.error('Approval log warning:', logErr.message);
        }

        return res.json({ success: true, message: `Timesheet successfully ${newStatus.toLowerCase()}!` });
    } catch (err) {
        console.error('Process approval error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/approvals/expenses
router.get('/expenses', authenticateToken, async (req, res) => {
    try {
        const pendingExpenses = await prisma.expenses.findMany({
            where: { Status: { in: ['Submitted', 'Pending'] } },
            orderBy: { ExpenseDate: 'desc' },
            take: 50
        });

        if (pendingExpenses.length === 0) {
            return res.json({ success: true, expenses: [] });
        }

        const userIds = [...new Set(pendingExpenses.map(e => e.UserId).filter(Boolean))];
        const projectIds = [...new Set(pendingExpenses.map(e => e.ProjectId).filter(Boolean))];
        const expenseIds = pendingExpenses.map(e => e.ExpenseId);

        const users = await prisma.users.findMany({
            where: { Id: { in: userIds } },
            select: { Id: true, FullName: true, Email: true }
        });
        const userMap = {};
        users.forEach(u => { userMap[u.Id] = u; });

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

        const formatted = pendingExpenses.map(exp => {
            const u = userMap[exp.UserId];
            const p = projectMap[exp.ProjectId];
            const atts = attachmentMap[exp.ExpenseId] || [];

            return {
                id: exp.ExpenseId,
                expenseNo: exp.ExpenseNo,
                title: exp.ExpTitle || exp.ExpDescription || 'Expense Claim',
                employeeName: u?.FullName || u?.Email || 'Employee',
                employeeEmail: u?.Email || '',
                projectName: p?.Name || 'General Project',
                amount: Number(exp.Amount || 0),
                currency: exp.Currency || 'USD',
                currencySymbol: exp.CurrencySymbol || '$',
                expenseDate: exp.ExpenseDate,
                vendor: exp.Vendor || 'N/A',
                status: exp.Status,
                hasReceipt: atts.length > 0,
                attachments: atts
            };
        });

        return res.json({ success: true, expenses: formatted });
    } catch (err) {
        console.error('Approvals expenses error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/approvals/expenses/:id/action
router.post('/expenses/:id/action', authenticateToken, async (req, res) => {
    try {
        const expenseId = parseInt(req.params.id);
        const { action, remarks } = req.body;
        const approverName = req.user?.fullName || req.user?.email || 'Approver';
        const approverId = req.userId;

        const newStatus = action === 'Approve' ? 'Approved' : 'Rejected';

        await prisma.expenses.update({
            where: { ExpenseId: expenseId },
            data: { Status: newStatus }
        });

        try {
            const lastLog = await prisma.expenseHistoryLogs.findFirst({ orderBy: { Id: 'desc' } });
            const nextLogId = (lastLog?.Id || 0) + 1;
            await prisma.expenseHistoryLogs.create({
                data: {
                    Id: nextLogId,
                    ExpenseId: expenseId,
                    Action: newStatus,
                    Remarks: remarks || `Expense ${newStatus} by ${approverName}`,
                    ActionBy: approverId,
                    ActionByName: approverName,
                    ActionDate: new Date(),
                    OldStatus: 'Pending',
                    NewStatus: newStatus
                }
            });
        } catch (logErr) {
            console.error('Expense log warning:', logErr.message);
        }

        return res.json({ success: true, message: `Expense successfully ${newStatus.toLowerCase()}!` });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
