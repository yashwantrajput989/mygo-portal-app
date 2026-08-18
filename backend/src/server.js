const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const timesheetRoutes = require('./routes/timesheets');
const approvalRoutes = require('./routes/approvals');
const expenseRoutes = require('./routes/expenses');
const projectRoutes = require('./routes/projects');
const clientRoutes = require('./routes/clients');
const employeeRoutes = require('./routes/employees');
const ticketRoutes = require('./routes/tickets');
const permissionRoutes = require('./routes/permissions');
const reportRoutes = require('./routes/reports');
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/profile', profileRoutes);

app.listen(PORT, () => {
    console.log('MYGO Enterprise Portal API Server running on port ' + PORT);
});
