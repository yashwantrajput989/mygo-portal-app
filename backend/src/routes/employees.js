const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { authenticateToken } = require('../middleware/auth');

// GET /api/employees
router.get('/', authenticateToken, async (req, res) => {
    try {
        const employees = await prisma.employees.findMany({
            orderBy: { Id: 'asc' },
            take: 200
        });

        const empIds = employees.map(e => e.Id);

        // Fetch matching Users
        const users = await prisma.users.findMany({
            where: { Id: { in: empIds } },
            select: { Id: true, FullName: true, Email: true, ProfileImage: true, IsActive: true }
        });
        const userMap = {};
        users.forEach(u => { userMap[u.Id] = u; });

        // Fetch Contact details
        const contacts = await prisma.employeeContactDetails.findMany({
            where: { EmployeeId: { in: empIds } }
        });
        const contactMap = {};
        contacts.forEach(c => { if (c.EmployeeId) contactMap[c.EmployeeId] = c; });

        // Fetch System details
        const systemDetails = await prisma.employeeSystemDetails.findMany({
            where: { EmployeeId: { in: empIds } }
        });
        const systemMap = {};
        systemDetails.forEach(s => { if (s.EmployeeId) systemMap[s.EmployeeId] = s; });

        const formatted = employees.map(emp => {
            const u = userMap[emp.Id];
            const c = contactMap[emp.Id];
            const s = systemMap[emp.Id];

            const fullName = u?.FullName || `${emp.FirstName || ''} ${emp.LastName || ''}`.trim() || u?.Email || 'Team Member';
            const email = u?.Email || c?.CorporateEmail || c?.PersonalEmail || 'N/A';

            return {
                id: emp.Id,
                employeeCode: emp.EmployeeId || emp.mygoempid || `EMP-${emp.Id}`,
                name: fullName,
                email: email,
                department: emp.Department || 'Consulting',
                designation: emp.Designation || 'Consultant',
                reportingManager: emp.ReportingManager || 'Leadership',
                coe: emp.COE || 'SAP Solutions',
                level: emp.Level || 'L1',
                joiningDate: emp.DateOfJoining,
                location: emp.Mem_Location || emp.City || emp.Country || s?.WorkLocation || 'India',
                phone: c?.MobileNumber || 'N/A',
                workLocation: s?.WorkLocation || emp.Mem_Location || 'Hyderabad',
                billability: emp.MemberBillability || 'Billable',
                isActive: u?.IsActive !== false
            };
        });

        // Unique departments for filtering
        const departments = [...new Set(employees.map(e => e.Department).filter(Boolean))];

        return res.json({ success: true, employees: formatted, departments });
    } catch (err) {
        console.error('Employees get error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
