const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticateToken } = require('../middleware/auth');

// Helper to determine user's approval authority (Manager vs Admin)
async function getUserRoles(userId) {
    const userRoles = await prisma.userRoles.findMany({
        where: { UserId: userId }
    });
    const roleIds = userRoles.map(r => r.RoleId);
    const isAdmin = roleIds.includes(1) || roleIds.includes(5);
    const isManager = roleIds.includes(2) || isAdmin;

    return { isAdmin, isManager, roleIds };
}

// GET /api/approvals/timesheets
router.get('/timesheets', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const { isAdmin, isManager } = await getUserRoles(userId);

        // Fetch timesheets awaiting approval (Step 1: Submitted/Pending, Step 2: Manager Approved)
        const pendingTimesheets = await prisma.timesheets.findMany({
            where: { 
                Status: { in: ['Submitted', 'Pending', 'Manager Approved'] } 
            },
            orderBy: { PeriodStart: 'desc' },
            take: 100
        });

        if (pendingTimesheets.length === 0) {
            return res.json({ success: true, timesheets: [], userAuthority: { isAdmin, isManager } });
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
                totalHours: Number(r.TotalWorkingHours || 0),
                status: r.Status,
                currentStep: r.CurrentStep || 1
            });
        });

        const formatted = pendingTimesheets.map(ts => {
            const u = userMap[ts.UserId];
            const tsRows = rowsByTs[ts.Id] || [];
            const isManagerApproved = ts.Status === 'Manager Approved';

            return {
                id: ts.Id,
                userId: ts.UserId,
                employeeName: u?.FullName || u?.Email || 'Employee',
                employeeEmail: u?.Email || '',
                periodStart: ts.PeriodStart,
                periodEnd: ts.PeriodEnd,
                actualHoursTotal: Number(ts.ActualHoursTotal || 0),
                status: ts.Status,
                stepNumber: isManagerApproved ? 2 : 1,
                stepLabel: isManagerApproved ? 'Step 2: Admin Sign-Off' : 'Step 1: Manager Review',
                submittedAt: ts.SubmittedAt || ts.CreatedAt,
                rows: tsRows,
                projectNames: [...new Set(tsRows.map(r => r.projectName))]
            };
        });

        return res.json({ 
            success: true, 
            timesheets: formatted,
            userAuthority: { isAdmin, isManager }
        });
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
        const approverName = req.user?.FullName || req.user?.Email || 'Approver';
        const approverId = req.userId;
        const { isAdmin, isManager } = await getUserRoles(approverId);

        const timesheet = await prisma.timesheets.findUnique({
            where: { Id: timesheetId }
        });

        if (!timesheet) {
            return res.status(404).json({ success: false, message: 'Timesheet not found' });
        }

        let newStatus = 'Approved';
        let actionType = 'Approved';
        let stepNumber = 1;

        if (action === 'Reject') {
            newStatus = 'Rejected';
            actionType = 'Rejected by ' + (isAdmin ? 'Admin' : 'Manager');
            stepNumber = timesheet.Status === 'Manager Approved' ? 2 : 1;
        } else {
            // Approval Flow:
            // If currently Submitted and approver is Manager (not Admin) -> moves to 'Manager Approved' (Step 1 passed)
            // If currently 'Manager Approved' or approver is Admin -> moves to 'Approved' (Final step passed)
            if (timesheet.Status === 'Submitted' || timesheet.Status === 'Pending') {
                if (isAdmin) {
                    newStatus = 'Approved';
                    actionType = 'Direct Admin Approval';
                    stepNumber = 2;
                } else {
                    newStatus = 'Manager Approved';
                    actionType = 'Manager Approved';
                    stepNumber = 1;
                }
            } else if (timesheet.Status === 'Manager Approved') {
                newStatus = 'Approved';
                actionType = 'Admin Final Approval';
                stepNumber = 2;
            }
        }

        // Update Timesheets Header
        await prisma.timesheets.update({
            where: { Id: timesheetId },
            data: { Status: newStatus }
        });

        // Update rows status & step
        await prisma.timeEntryRows.updateMany({
            where: { TimesheetId: timesheetId },
            data: { 
                Status: newStatus,
                CurrentStep: newStatus === 'Manager Approved' ? 2 : (newStatus === 'Approved' ? 3 : 1)
            }
        });

        // Create TimesheetHistoryLog
        try {
            const maxLog = await prisma.timesheetHistoryLogs.findFirst({ orderBy: { Id: 'desc' } });
            const nextLogId = (maxLog?.Id || 0) + 1;

            await prisma.timesheetHistoryLogs.create({
                data: {
                    Id: nextLogId,
                    TimesheetId: timesheetId,
                    UserId: timesheet.UserId || approverId,
                    UserName: req.user?.FullName || 'User',
                    ActionType: actionType,
                    Status: newStatus,
                    StepNumber: stepNumber,
                    ApproverId: approverId,
                    ApproverName: approverName,
                    ActionDate: new Date(),
                    WorkflowStatus: newStatus,
                    Remarks: remarks || ''
                }
            });
        } catch (logErr) {
            console.error('History log error:', logErr);
        }

        const message = newStatus === 'Manager Approved'
            ? 'Timesheet approved by Manager. Forwarded to Admin for final sign-off.'
            : (newStatus === 'Approved' ? 'Timesheet fully approved and posted to analytics.' : 'Timesheet rejected.');

        return res.json({
            success: true,
            message,
            status: newStatus
        });
    } catch (err) {
        console.error('Timesheet action error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/approvals/expenses
router.get('/expenses', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const { isAdmin, isManager } = await getUserRoles(userId);

        const pendingExpenses = await prisma.expenses.findMany({
            where: { 
                Status: { in: ['Submitted', 'Pending', 'Manager Approved'] } 
            },
            orderBy: { ExpenseDate: 'desc' },
            take: 100
        });

        if (pendingExpenses.length === 0) {
            return res.json({ success: true, expenses: [], userAuthority: { isAdmin, isManager } });
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

        const formatted = pendingExpenses.map(e => {
            const isManagerApproved = e.Status === 'Manager Approved';

            return {
                id: e.ExpenseId,
                expenseNo: e.ExpenseNo,
                title: e.ExpTitle || e.ExpDescription || 'Expense Claim',
                employeeName: userMap[e.UserId]?.FullName || 'Employee',
                employeeEmail: userMap[e.UserId]?.Email || '',
                projectId: e.ProjectId,
                projectName: projectMap[e.ProjectId]?.Name || 'General Project',
                amount: Number(e.Amount || 0),
                currency: e.Currency || 'USD',
                currencySymbol: e.CurrencySymbol || '$',
                expenseDate: e.ExpenseDate,
                vendor: e.Vendor || 'Merchant',
                status: e.Status,
                stepNumber: isManagerApproved ? 2 : 1,
                stepLabel: isManagerApproved ? 'Step 2: Finance & Admin Payout' : 'Step 1: Project Manager Audit',
                attachments: attachmentMap[e.ExpenseId] || []
            };
        });

        return res.json({ 
            success: true, 
            expenses: formatted,
            userAuthority: { isAdmin, isManager }
        });
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
        const approverName = req.user?.FullName || req.user?.Email || 'Approver';
        const approverId = req.userId;
        const { isAdmin, isManager } = await getUserRoles(approverId);

        const expense = await prisma.expenses.findUnique({
            where: { ExpenseId: expenseId }
        });

        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        let newStatus = 'Approved';
        let actionType = 'Approved';

        if (action === 'Reject') {
            newStatus = 'Rejected';
            actionType = 'Rejected by ' + (isAdmin ? 'Admin' : 'Manager');
        } else {
            if (expense.Status === 'Submitted' || expense.Status === 'Pending') {
                if (isAdmin) {
                    newStatus = 'Approved';
                    actionType = 'Direct Admin Approval';
                } else {
                    newStatus = 'Manager Approved';
                    actionType = 'Manager Approved';
                }
            } else if (expense.Status === 'Manager Approved') {
                newStatus = 'Approved';
                actionType = 'Admin Final Approval';
            }
        }

        await prisma.expenses.update({
            where: { ExpenseId: expenseId },
            data: { Status: newStatus }
        });

        // Audit Log in ExpenseHistoryLogs
        try {
            const maxLog = await prisma.expenseHistoryLogs.findFirst({ orderBy: { Id: 'desc' } });
            const nextLogId = (maxLog?.Id || 0) + 1;

            await prisma.expenseHistoryLogs.create({
                data: {
                    Id: nextLogId,
                    ExpenseId: expenseId,
                    Action: actionType,
                    Remarks: remarks || '',
                    ActionBy: approverId,
                    ActionByName: approverName,
                    ActionDate: new Date(),
                    OldStatus: expense.Status,
                    NewStatus: newStatus
                }
            });
        } catch (logErr) {}

        const message = newStatus === 'Manager Approved'
            ? 'Expense claim approved by Manager. Forwarded to Admin for final payout.'
            : (newStatus === 'Approved' ? 'Expense claim fully approved.' : 'Expense claim rejected.');

        return res.json({
            success: true,
            message,
            status: newStatus
        });
    } catch (err) {
        console.error('Expense action error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
