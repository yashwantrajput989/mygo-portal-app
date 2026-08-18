const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticateToken } = require('../middleware/auth');

// Helper to normalize week dates (Monday to Sunday)
function getWeekDates(inputDate) {
    const d = inputDate ? new Date(inputDate) : new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(d);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const days = [];
    for (let i = 0; i < 7; i++) {
        const current = new Date(monday);
        current.setDate(monday.getDate() + i);
        days.push(current.toISOString().slice(0, 10));
    }

    return {
        monday,
        sunday,
        startStr: monday.toISOString().slice(0, 10),
        endStr: sunday.toISOString().slice(0, 10),
        days
    };
}

// GET /api/timesheets/weekly?startDate=YYYY-MM-DD
router.get('/weekly', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const weekInfo = getWeekDates(req.query.startDate);

        // 1. Fetch timesheet header
        const timesheet = await prisma.timesheets.findFirst({
            where: {
                UserId: userId,
                PeriodStart: {
                    gte: new Date(weekInfo.startStr + 'T00:00:00.000Z'),
                    lte: new Date(weekInfo.startStr + 'T23:59:59.999Z')
                }
            }
        });

        let formattedRows = [];
        let timesheetStatus = 'Draft';
        let timesheetId = null;

        if (timesheet) {
            timesheetId = timesheet.Id;
            timesheetStatus = timesheet.Status || 'Draft';

            // Fetch TimeEntryRows
            const rows = await prisma.timeEntryRows.findMany({
                where: { TimesheetId: timesheet.Id },
                orderBy: { RowOrder: 'asc' }
            });

            if (rows.length > 0) {
                const rowIds = rows.map(r => r.Id);
                const projectIds = rows.map(r => r.ProjectId);

                // Fetch Project details
                const projects = await prisma.projects.findMany({
                    where: { Id: { in: projectIds } }
                });
                const projectMap = {};
                projects.forEach(p => { projectMap[p.Id] = p; });

                // Fetch TimeEntryCells
                const cells = await prisma.timeEntryCells.findMany({
                    where: { TimeEntryRowId: { in: rowIds } }
                });

                const cellIds = cells.map(c => c.Id);
                // Fetch Notes
                const notes = await prisma.timeEntryNotes.findMany({
                    where: { TimeEntryCellId: { in: cellIds } }
                });
                const noteMap = {};
                notes.forEach(n => { noteMap[n.TimeEntryCellId] = n.NoteText; });

                formattedRows = rows.map(row => {
                    const rowCells = weekInfo.days.map(dStr => {
                        const matchedCell = cells.find(c => 
                            c.TimeEntryRowId === row.Id && 
                            new Date(c.EntryDate).toISOString().slice(0, 10) === dStr
                        );
                        return {
                            id: matchedCell?.Id || null,
                            entryDate: dStr,
                            hours: matchedCell ? Number(matchedCell.Hours || 0) : 0,
                            noteText: matchedCell ? (noteMap[matchedCell.Id] || '') : ''
                        };
                    });

                    return {
                        id: row.Id,
                        projectId: row.ProjectId,
                        projectName: projectMap[row.ProjectId]?.Name || `Project #${row.ProjectId}`,
                        projectCode: projectMap[row.ProjectId]?.Code || '',
                        activityType: row.ActivityType || 'Development / Consulting',
                        status: row.Status || 'Draft',
                        cells: rowCells
                    };
                });
            }
        }

        // 2. Fetch assigned projects for user (Strict RBAC: Only assigned projects to employee)
        const assignments = await prisma.assignments.findMany({
            where: { AssigneeId: userId }
        });
        const assignedProjIds = [...new Set(assignments.map(a => a.ProjectId))];

        let availableProjects = [];
        if (assignedProjIds.length > 0) {
            availableProjects = await prisma.projects.findMany({
                where: { Id: { in: assignedProjIds } },
                orderBy: { Name: 'asc' }
            });
        }

        // Fallback for Workspace Admin or Bench allocation if user has no assigned project
        if (availableProjects.length === 0) {
            const userRoles = await prisma.userRoles.findMany({
                where: { UserId: userId }
            });
            const roleIds = userRoles.map(ur => ur.RoleId);
            const isAdmin = roleIds.includes(1) || roleIds.includes(5);

            if (isAdmin) {
                availableProjects = await prisma.projects.findMany({
                    where: { IsActive: true },
                    take: 30,
                    orderBy: { Name: 'asc' }
                });
            } else {
                // If standard employee has no project assigned yet, fallback to default Bench project
                const benchProject = await prisma.projects.findFirst({
                    where: {
                        OR: [
                            { Name: { contains: 'Bench', mode: 'insensitive' } },
                            { Code: { contains: 'BENCH', mode: 'insensitive' } },
                            { Id: 1 }
                        ]
                    }
                });
                if (benchProject) {
                    availableProjects = [benchProject];
                } else {
                    availableProjects = await prisma.projects.findMany({ take: 1 });
                }
            }
        }

        return res.json({
            success: true,
            timesheetId,
            status: timesheetStatus,
            startOfWeek: weekInfo.startStr,
            endOfWeek: weekInfo.endStr,
            days: weekInfo.days,
            rows: formattedRows,
            availableProjects: availableProjects.map(p => ({
                id: p.Id,
                name: p.Name,
                code: p.Code,
                status: p.status
            }))
        });
    } catch (err) {
        console.error('Weekly timesheet error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/timesheets/save (Save draft or Submit)
router.post('/save', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const userEmail = req.user?.email || '';
        const { startDate, endDate, rows, status } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'Start and End dates are required' });
        }

        const weekInfo = getWeekDates(startDate);
        const submissionStatus = status === 'Submitted' ? 'Submitted' : 'Draft';

        // Calculate total hours
        let totalHours = 0;
        if (rows && Array.isArray(rows)) {
            rows.forEach(r => {
                if (r.cells && Array.isArray(r.cells)) {
                    r.cells.forEach(c => {
                        totalHours += Number(c.hours || 0);
                    });
                }
            });
        }

        // 1. Find or create Timesheet header
        let timesheet = await prisma.timesheets.findFirst({
            where: {
                UserId: userId,
                PeriodStart: {
                    gte: new Date(weekInfo.startStr + 'T00:00:00.000Z'),
                    lte: new Date(weekInfo.startStr + 'T23:59:59.999Z')
                }
            }
        });

        if (timesheet) {
            timesheet = await prisma.timesheets.update({
                where: { Id: timesheet.Id },
                data: {
                    Status: submissionStatus,
                    ActualHoursTotal: totalHours,
                    SubmittedAt: submissionStatus === 'Submitted' ? new Date() : timesheet.SubmittedAt
                }
            });
        } else {
            // Get next Id
            const maxTs = await prisma.timesheets.findFirst({ orderBy: { Id: 'desc' } });
            const nextTsId = (maxTs?.Id || 0) + 1;

            timesheet = await prisma.timesheets.create({
                data: {
                    Id: nextTsId,
                    UserId: userId,
                    PeriodStart: new Date(weekInfo.startStr + 'T00:00:00.000Z'),
                    PeriodEnd: new Date(weekInfo.endStr + 'T23:59:59.999Z'),
                    PeriodType: 'Weekly',
                    Status: submissionStatus,
                    PlannedHoursTotal: 40.0,
                    ActualHoursTotal: totalHours,
                    OverUnder: totalHours - 40.0,
                    SubmittedAt: submissionStatus === 'Submitted' ? new Date() : null
                }
            });
        }

        // 2. Process rows and cells
        if (rows && Array.isArray(rows)) {
            for (let rIdx = 0; rIdx < rows.length; rIdx++) {
                const rowData = rows[rIdx];
                let rowId = rowData.id;

                let rowTotalHours = 0;
                if (rowData.cells) {
                    rowTotalHours = rowData.cells.reduce((s, c) => s + Number(c.hours || 0), 0);
                }

                if (rowId) {
                    await prisma.timeEntryRows.update({
                        where: { Id: rowId },
                        data: {
                            ProjectId: parseInt(rowData.projectId),
                            ActivityType: rowData.activityType || 'Consulting',
                            TotalWorkingHours: rowTotalHours,
                            RowOrder: rIdx + 1,
                            Status: submissionStatus
                        }
                    });
                } else {
                    const maxRow = await prisma.timeEntryRows.findFirst({ orderBy: { Id: 'desc' } });
                    rowId = (maxRow?.Id || 0) + 1;

                    await prisma.timeEntryRows.create({
                        data: {
                            Id: rowId,
                            TimesheetId: timesheet.Id,
                            ProjectId: parseInt(rowData.projectId),
                            TotalWorkingHours: rowTotalHours,
                            RowOrder: rIdx + 1,
                            Status: submissionStatus,
                            ActivityType: rowData.activityType || 'Consulting'
                        }
                    });
                }

                // Process daily cells for this row
                if (rowData.cells && Array.isArray(rowData.cells)) {
                    for (let cIdx = 0; cIdx < rowData.cells.length; cIdx++) {
                        const cellData = rowData.cells[cIdx];
                        const cellHours = Number(cellData.hours || 0);
                        let cellId = cellData.id;

                        const entryDate = new Date(cellData.entryDate + 'T00:00:00.000Z');

                        if (cellId) {
                            await prisma.timeEntryCells.update({
                                where: { Id: cellId },
                                data: {
                                    Hours: cellHours,
                                    IsSubmitted: submissionStatus === 'Submitted',
                                    ActivityType: rowData.activityType || 'Consulting'
                                }
                            });
                        } else {
                            const maxCell = await prisma.timeEntryCells.findFirst({ orderBy: { Id: 'desc' } });
                            cellId = (maxCell?.Id || 0) + 1;

                            await prisma.timeEntryCells.create({
                                data: {
                                    Id: cellId,
                                    TimeEntryRowId: rowId,
                                    UserId: userId,
                                    EntryDate: entryDate,
                                    Hours: cellHours,
                                    IsSubmitted: submissionStatus === 'Submitted',
                                    ActivityType: rowData.activityType || 'Consulting'
                                }
                            });
                        }

                        // Save Note if provided
                        if (cellData.noteText && cellData.noteText.trim().length > 0) {
                            const existingNote = await prisma.timeEntryNotes.findFirst({
                                where: { TimeEntryCellId: cellId }
                            });

                            if (existingNote) {
                                await prisma.timeEntryNotes.update({
                                    where: { Id: existingNote.Id },
                                    data: { NoteText: cellData.noteText.trim() }
                                });
                            } else {
                                const maxNote = await prisma.timeEntryNotes.findFirst({ orderBy: { Id: 'desc' } });
                                const nextNoteId = (maxNote?.Id || 0) + 1;

                                await prisma.timeEntryNotes.create({
                                    data: {
                                        Id: nextNoteId,
                                        TimeEntryCellId: cellId,
                                        TimeEntryRowId: rowId,
                                        UserId: userId,
                                        NoteText: cellData.noteText.trim()
                                    }
                                });
                            }
                        }
                    }
                }
            }
        }

        // Audit Log
        try {
            const maxLog = await prisma.timesheetHistoryLogs.findFirst({ orderBy: { Id: 'desc' } });
            const nextLogId = (maxLog?.Id || 0) + 1;
            await prisma.timesheetHistoryLogs.create({
                data: {
                    Id: nextLogId,
                    TimesheetId: timesheet.Id,
                    Action: submissionStatus === 'Submitted' ? 'Submitted Timesheet' : 'Saved Draft Timesheet',
                    ActionBy: userEmail || `User #${userId}`,
                    ActionDate: new Date(),
                    Remarks: `Total hours: ${totalHours}`
                }
            });
        } catch (logErr) {}

        return res.json({
            success: true,
            message: submissionStatus === 'Submitted' ? 'Timesheet submitted for approval' : 'Draft saved successfully',
            status: submissionStatus,
            timesheetId: timesheet.Id
        });
    } catch (err) {
        console.error('Save timesheet error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
