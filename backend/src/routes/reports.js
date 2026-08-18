const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticateToken } = require('../middleware/auth');

// GET /api/reports/timesheet
router.get('/timesheet', authenticateToken, async (req, res) => {
    try {
        const timesheets = await prisma.timesheets.findMany({
            orderBy: { PeriodStart: 'desc' },
            take: 100
        });

        const userIds = [...new Set(timesheets.map(t => t.UserId).filter(Boolean))];
        const users = await prisma.users.findMany({
            where: { Id: { in: userIds } },
            select: { Id: true, FullName: true, Email: true }
        });
        const userMap = {};
        users.forEach(u => { userMap[u.Id] = u; });

        const employees = await prisma.employees.findMany({
            where: { Id: { in: userIds } },
            select: { Id: true, Department: true, Designation: true, MemberBillability: true }
        });
        const empMap = {};
        employees.forEach(e => { empMap[e.Id] = e; });

        const rows = await prisma.timeEntryRows.findMany({
            where: { TimesheetId: { in: timesheets.map(t => t.Id) } }
        });
        const projectIds = [...new Set(rows.map(r => r.ProjectId))];
        const projects = await prisma.projects.findMany({
            where: { Id: { in: projectIds } },
            select: { Id: true, Name: true, Code: true }
        });
        const projectMap = {};
        projects.forEach(p => { projectMap[p.Id] = p; });

        const formatted = timesheets.map(t => {
            const u = userMap[t.UserId];
            const emp = empMap[t.UserId];
            return {
                id: t.Id,
                userId: t.UserId,
                employeeName: u?.FullName || u?.Email || 'Employee',
                employeeEmail: u?.Email || '',
                department: emp?.Department || 'Consulting',
                designation: emp?.Designation || 'Consultant',
                billability: emp?.MemberBillability || 'Billable',
                periodStart: t.PeriodStart,
                periodEnd: t.PeriodEnd,
                plannedHours: Number(t.PlannedHoursTotal || 40),
                actualHours: Number(t.ActualHoursTotal || 0),
                status: t.Status,
                submittedAt: t.SubmittedAt
            };
        });

        // Summary metrics
        const totalActualHours = formatted.reduce((sum, r) => sum + r.actualHours, 0);
        const totalPlannedHours = formatted.reduce((sum, r) => sum + r.plannedHours, 0);
        const approvedCount = formatted.filter(r => r.status === 'Approved').length;
        const submittedCount = formatted.filter(r => r.status === 'Submitted').length;

        return res.json({
            success: true,
            records: formatted,
            summary: {
                totalActualHours,
                totalPlannedHours,
                approvedCount,
                submittedCount,
                utilizationRate: totalPlannedHours > 0 ? Math.round((totalActualHours / totalPlannedHours) * 100) : 100
            }
        });
    } catch (err) {
        console.error('Timesheet report error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/reports/expenses
router.get('/expenses', authenticateToken, async (req, res) => {
    try {
        const expenses = await prisma.expenses.findMany({
            orderBy: { ExpenseDate: 'desc' },
            take: 100
        });

        const userIds = [...new Set(expenses.map(e => e.UserId).filter(Boolean))];
        const projectIds = [...new Set(expenses.map(e => e.ProjectId).filter(Boolean))];

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

        const formatted = expenses.map(e => ({
            id: e.ExpenseId,
            expenseNo: e.ExpenseNo,
            title: e.ExpTitle || e.ExpDescription,
            employeeName: userMap[e.UserId]?.FullName || 'Employee',
            projectName: projectMap[e.ProjectId]?.Name || 'Project',
            amount: Number(e.Amount || 0),
            currency: e.Currency,
            currencySymbol: e.CurrencySymbol,
            expenseDate: e.ExpenseDate,
            vendor: e.Vendor,
            status: e.Status,
            reimburseToMe: e.ReimburseToMe,
            billToClient: e.BillToClient
        }));

        const totalAmount = formatted.reduce((sum, e) => sum + e.amount, 0);

        return res.json({
            success: true,
            records: formatted,
            summary: {
                totalAmount: totalAmount.toFixed(2),
                count: formatted.length,
                pendingCount: formatted.filter(e => e.status === 'Pending' || e.status === 'Submitted').length,
                approvedCount: formatted.filter(e => e.status === 'Approved').length
            }
        });
    } catch (err) {
        console.error('Expense report error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/reports/unsubmit-days
router.post('/unsubmit-days', authenticateToken, async (req, res) => {
    try {
        const { cellIds } = req.body;
        if (!cellIds || !Array.isArray(cellIds) || cellIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Valid cellIds array is required' });
        }

        await prisma.timeEntryCells.updateMany({
            where: { Id: { in: cellIds.map(Number) } },
            data: { IsSubmitted: false }
        });

        return res.json({ success: true, message: `Successfully unsubmitted ${cellIds.length} days for edit.` });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
