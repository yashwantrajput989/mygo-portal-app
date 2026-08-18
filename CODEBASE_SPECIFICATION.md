# MyGo Portals (`mygoportals`) - Full Architecture, Feature, Role & Database Specification

This document provides a comprehensive, granular analysis of the entire **MyGo Portals** ASP.NET Core MVC application. It details every page, controller action, feature workflow, role and ID filtering mechanism, data submission lifecycle, and Entity Framework database schema interactions.

---

## Table of Contents
1. [Architecture & Security Overview](#1-architecture--security-overview)
2. [Role-Based Access Control (RBAC) & Identity Resolution](#2-role-based-access-control-rbac--identity-resolution)
3. [Database Schema & Entity Relationship Mapping](#3-database-schema--entity-relationship-mapping)
4. [Complete Page-by-Page & Feature-by-Feature Breakdown](#4-complete-page-by-page--feature-by-feature-breakdown)
   - [4.1 Authentication & Profile (`HomeController`)](#41-authentication--profile-homecontroller)
   - [4.2 Executive Dashboard (`DashboardController`)](#42-executive-dashboard-dashboardcontroller)
   - [4.3 Timesheet Engine & Row Submissions (`TimeSheetController` & `NewTimeSheetController`)](#43-timesheet-engine--row-submissions-timesheetcontroller--newtimesheetcontroller)
   - [4.4 Multi-Level Approvals Workflow (`ApprovalsController`)](#44-multi-level-approvals-workflow-approvalscontroller)
   - [4.5 Expense Management & Reimbursements (`ExpensesController`)](#45-expense-management--reimbursements-expensescontroller)
   - [4.6 Projects & Resource Allocation (`ProjectsController` & `A ssignmentsController`)](#46-projects--resource-allocation-projectscontroller--a-ssignmentscontroller)
   - [4.7 HR Management & Employee Lifecycle (`HR.cs` & `EmployeeController`)](#47-hr-management--employee-lifecycle-hrcs--employeecontroller)
   - [4.8 Operational Reports & Analytics (`Reports.cs`)](#48-operational-reports--analytics-reportscs)
   - [4.9 Helpdesk Ticketing System (`TicketsController`)](#49-helpdesk-ticketing-system-ticketscontroller)
   - [4.10 Permission Matrix & Role Assignment (`PermissionController` & `AssignRoleController`)](#410-permission-matrix--role-assignment-permissioncontroller--assignrolecontroller)
   - [4.11 Dynamic Email Templates & Notifications (`EmailTemplate.cs`)](#411-dynamic-email-templates--notifications-emailtemplatecs)
   - [4.12 Clients Management (`Clients.cs`)](#412-clients-management-clientscs)
   - [4.13 Utilization & Resource Forecasting (`UtilizationPlan.cs` & `ForecastingController`)](#413-utilization--resource-forecasting-utilizationplancs--forecastingcontroller)
5. [Data Flow Diagrams](#5-data-flow-diagrams)

---

## 1. Architecture & Security Overview

### 1.1 Technology Stack
* **Framework:** ASP.NET Core MVC (.NET 8)
* **Database & ORM:** Microsoft SQL Server with Entity Framework Core (`ApplicationDbContext`)
* **Authentication Scheme:** Cookie Authentication (`CookieAuthenticationDefaults.AuthenticationScheme`) with sliding expiration (8 hours) and anti-forgery token validation.
* **Session Management:** In-memory distributed session (`HttpContext.Session`) with 20-minute idle timeout.
* **Password Encryption:**
  * **Argon2id** algorithm (`Konscious.Security.Cryptography.Argon2id`): Memory size 64MB, 4 iterations, 8 parallel threads, 16-byte random salt. Format: `Base64(Salt).Base64(Hash)`.
  * **ASP.NET Identity PasswordHasher**: Dual verification fallback for legacy password hashes.
* **Document Engines:**
  * **QuestPDF** (`QuestPDF.Fluent`): Generates dynamic PDF timesheet summaries, attendance reports, and certificates.
  * **DocumentFormat.OpenXml**: Handles native `.xlsx` Excel spreadsheets generation and bulk imports.
* **Mailing Subsystem:** `MailKit` / `MimeKit` / `System.Net.Mail` via `EmailService`, supporting templated event notifications and OTP dispatch.

---

## 2. Role-Based Access Control (RBAC) & Identity Resolution

### 2.1 Identity Resolution Workflow
Whenever a request reaches an authorized controller:
1. **User Authentication:** ASP.NET Core Cookie Middleware extracts the authentication cookie and populates `HttpContext.User` (`ClaimsPrincipal`).
2. **User ID Resolution:**
   ```csharp
   var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
   int.TryParse(userIdString, out int userId);
   ```
3. **Role Determination:**
   ```csharp
   var userRole = await _db.UserRoles.AsNoTracking().FirstOrDefaultAsync(ur => ur.UserId == userId);
   int roleId = userRole?.RoleId ?? 0;
   ```
4. **Module Permission Check (`IPermissionService`):**
   ```csharp
   bool canPerform = await _permissionService.HasPermission(userIdString, moduleName, "View"|"Add"|"Edit"|"Delete"|"Approve"|"Export");
   ```
   * Queries `Modules` table where `Name == moduleName`.
   * Queries `RoleModulePermissions` where `RoleId == roleId && ModuleId == module.Id`.
   * Evaluates specific boolean flags: `CanView`, `CanAdd`, `CanEdit`, `CanDelete`, `CanApprove`, `CanExport`.

### 2.2 Standard User Roles & Responsibilities
* **Employee / Consultant:** Enters daily hours, attaches work evidence, submits timesheets/expenses, raises helpdesk tickets, views own profile and history.
* **Project Manager (PM):** Creates and maintains assigned projects, allocates resources, defines multi-tier approval steps, reviews and approves/rejects team timesheet rows and project expenses.
* **HR Manager / Administrator:** Manages employee master directory, bulk uploads employee records via Excel, configures designations, departments, client masters, and company holiday calendars.
* **Finance / Accounts:** Performs final billing reviews, audits timesheet actual vs. billable hours, processes approved expense claims and reimbursements.
* **System Administrator:** Has full super-user rights across all modules, configures the Role-Module Permission Matrix, manages user role assignments, unlocks locked timesheet cells.

---

## 3. Database Schema & Entity Relationship Mapping

### 3.1 Entity Model Table Dictionary

| Table Name | Primary Key | Foreign Keys / Key Columns | Data Content & Purpose |
| :--- | :--- | :--- | :--- |
| `Users` | `Id` (int) | `Email`, `PasswordHash`, `FullName`, `ProfileImage` | Core login credentials, lockout tracking (`AccessFailedCount`, `LockoutEnd`), profile photo. |
| `Roles` | `Id` (int) | `Name`, `Description` | Master role registry. |
| `Modules` | `Id` (int) | `Name`, `Description` | System modules (Timesheet, Projects, Approvals, HR, Expenses, Reports, Tickets, etc.). |
| `RoleModulePermissions` | `Id` (int) | `RoleId` (FK), `ModuleId` (FK) | Granular permissions (`CanView`, `CanAdd`, `CanEdit`, `CanDelete`, `CanApprove`, `CanExport`). |
| `UserRoles` | `UserId`, `RoleId` | Composite PK | Associates each user with their system role. |
| `Employees` | `Id` (int) | `EmployeeId` (string), `DepartmentId`, `Designation` | Employee profile: Birth Date, Joining Date, Timezone (`RegionalTimeZone`), Date Format (`formattype`), Reporting Manager, COE. |
| `EmployeeContactDetails`| `Id` (int) | `EmployeeId` (FK) | Personal phone, corporate email, current & permanent address. |
| `EmployeeSystemDetails` | `Id` (int) | `EmployeeId` (FK) | Workstation asset tag, laptop serial, official IP, domain username. |
| `EmployeeEmergencyContacts`| `Id` (int) | `EmployeeId` (FK) | Primary & secondary emergency contact names, relationships, phone numbers. |
| `EmployeeDocuments` | `Id` (int) | `EmployeeId` (FK) | File paths/blobs for resume, contracts, government IDs. |
| `Clients` | `Id` (int) | `ClientName`, `ClientCode`, `CurrencyId`, `BillingAddress` | Client company profiles, billing address, active status. |
| `Projects` | `Id` (int) | `ClientId` (FK), `ProjectManagerId` (FK) | Project metadata: Project Code, Start/End dates, Billing Type (T&M, Fixed, Non-Billable), Status. |
| `Assignments` | `Id` (int) | `ProjectId` (FK), `AssigneeId` (FK, User Id) | Team member allocation: Role, Billable flag (`IsBillable`), Hourly Rate, Allocation %, Start/End date. |
| `ApprovalWorkflowSteps` | `Id` (int) | `ProjectId` (FK), `SpecificUserId` (FK) | Multi-tier approval rules: `StepOrder` (1, 2, 3...), `ApproverType` (PM, ReportingManager, Client, SpecificUser). |
| `Timesheets` | `TimesheetId` (int) | `UserId` (FK) | Weekly timesheet header: `PeriodStart`, `PeriodEnd`, `Status` (Draft, Submitted, Approved, Rejected, Recalled), `ActualHoursTotal`. |
| `TimeEntryRows` | `TimeEntryRowId` (int)| `TimesheetId` (FK), `ProjectId` (FK), `AssignmentId` (FK) | Project/Task row item within a weekly timesheet. |
| `TimeEntryCells` | `TimeEntryCellId` (int)| `TimeEntryRowId` (FK), `UserId` (FK) | Daily entry: `EntryDate`, `Hours` (decimal), `IsLocked` (bool), `Status`, `IsApproved`. |
| `TimeEntryNotes` | `TimeEntryNoteId` (int)| `TimeEntryCellId` (FK) | Daily task description / task commentary for each cell. |
| `TimeEntryRowAttachments`| `Id` (int) | `TimeEntryRowId` (FK) | File attachments uploaded as work proof for a timesheet row. |
| `TimeEntryRowApprovals` | `Id` (int) | `TimeEntryRowId` (FK), `ApproverUserId` (FK) | Approval audit step tracking: `StepOrder`, `Status`, `ApproverComment`, `ActionDate`. |
| `Expenses` | `ExpenseId` (int) | `UserId` (FK), `ProjectId` (FK) | Expense claim header: `ExpenseNo`, `ExpTitle`, `Amount`, `Currency`, `ExpenseDate`, `Status`, `Category`. |
| `ExpenseAttachments` | `Id` (int) | `ExpenseId` (FK) | Expense receipts: `FileName`, `ContentType`, `FileData` (byte[]). |
| `ExpenseEntryRowApprovals`| `Id` (int) | `ExpenseId` (FK), `ApproverUserId` (FK) | Multi-level approval steps for expense claims. |
| `Tickets` | `TicketId` (int) | `CreatedUserId` (FK), `AssignedUserId` (FK) | Helpdesk tickets: `TicketCode`, `Title`, `Description`, `Priority`, `Status`, `CategoryMasterId`, `SubCategoryMasterId`. |
| `TicketComments` | `Id` (int) | `TicketId` (FK), `UserId` (FK) | Public and internal thread comments. |
| `TicketAttachments` | `Id` (int) | `TicketId` (FK) | Supporting screenshots and documents for tickets. |
| `TicketActivities` | `Id` (int) | `TicketId` (FK), `UserId` (FK) | Complete audit log of status changes and assignments. |
| `Holidays` | `HolidayId` (int) | `HolidayName`, `HolidayDate`, `Country`, `HolidayType` | Company holiday schedule for attendance calculation. |
| `EmailTemplates` | `Id` (int) | `Module`, `Event`, `Subject`, `Body` | Configurable email templates with dynamic placeholders. |
| `LoginLogs` | `Id` (int) | `UserId` (FK), `LoginTime`, `IpAddress`, `UserAgent` | Security login audit trail. |

---

## 4. Complete Page-by-Page & Feature-by-Feature Breakdown

```
Page Structure:
├── 1. Authentication & Security (Login, Register, OTP, Forgot Password)
├── 2. Executive Dashboard (Metrics, Attendance Grid, Team Directory, Recent Items)
├── 3. Timesheet Portal (Weekly Grid, Row Management, Cell Notes, Uploads, PDF/Excel)
├── 4. Approvals Hub (Timesheet Row Approvals, Week Approvals, Expense Approvals)
├── 5. Expense Reimbursements (Claims, Drawer, Receipts, Multi-currency)
├── 6. Projects & Allocations (Project Setup, Assignments, Approval Workflow Builder)
├── 7. HR Portal (Employee Directory, Bulk Excel Upload, Master Data Setup)
├── 8. Reports & Analytics (Utilization Matrix, Member Timesheets, Unlock Cells)
├── 9. Helpdesk Support (Ticket Board, Categorization, Comments & Activities)
├── 10. System Administration (Roles, Module Permissions Matrix, Email Templates)
```

---

### 4.1 Authentication & Profile (`HomeController`)
* **Primary Views:** `Views/Home/Index.cshtml`, `Views/Home/Login.cshtml`, `Views/Home/Register.cshtml`, `Views/Home/Privacy.cshtml`
* **Controller Actions:**
  * `GET /Home/Index` & `GET /Home/Login`: Renders login portal.
  * `POST /Home/Login`:
    * Validates user credentials against `Users` table.
    * Checks lockout flags (`LockoutEnd > DateTime.UtcNow`); locks account for 15 minutes after 5 failed attempts.
    * Verifies password using Argon2id or ASP.NET Identity PasswordHasher.
    * Fetches `Employees.formattype` (e.g. `MM/dd/yyyy`) for date rendering and stores in session & claims.
    * Logs IP address (`X-Forwarded-For` / `RemoteIpAddress`) and User Agent to `LoginLogs`.
    * Creates authentication cookie (`ClaimsPrincipal`) with claims: `NameIdentifier`, `Name`, `Email`, `DateFormat`.
    * Redirects to `/Dashboard/Dashboard` if user has a role in `UserRoles`, or `/Employee/Index` if incomplete.
  * `POST /Home/Register`: Restricts registration to `@mygoconsulting.com` emails. Generates 6-digit numeric OTP and stores in `EmailOtps` with 10-minute expiry; dispatches email via `EmailService`.
  * `POST /Home/VerifyOtp`: Validates OTP; inserts record into `Users` with Argon2id password hash and triggers welcome email.
  * `POST /Home/ForgotPwd`, `POST /Home/VerifyOtpforForgot`, `POST /Home/ResetPassword`: Handles OTP-based self-service password reset.
  * `POST /Home/Logout`: Signs out authentication cookie, clears session, and deletes client cookies.

---

### 4.2 Executive Dashboard (`DashboardController`)
* **Primary View:** `Views/Dashboard/Dashboard.cshtml`
* **Controller Actions:**
  * `GET /Dashboard/Dashboard` (`[Authorize]`):
    * **Timezone & Greeting:** Computes contextual greeting ("Good Morning/Afternoon/Evening") based on local time.
    * **Weekly Hours Metric:** Sums hours from `Timesheets` where `today >= PeriodStart && today <= PeriodEnd` for the logged-in `userId`.
    * **Monthly Attendance Calendar:**
      * Queries `TimeEntryCells` between first day and last day of the current month.
      * Classifies each day: Weekend = Yellow (`newdashboard-holiday`), $\ge 8$ hours = Green/Full Day (`newdashboard-ontime`), $> 0$ hours = Pink/Partial (`newdashboard-late`), 0 hours = White (`newdashboard-day-empty`).
      * Calculates attendance rate: $\text{Attendance \%} = (\text{Full Days} / \text{Working Days}) \times 100$.
    * **Recent Feeds:** Loads top 3 timesheets, top 5 expenses, and pending approval badge counts.
    * **Active Projects:** Counts active `Assignments` for `userId` where `EndDate >= today`.
    * **Team Directory Widget:** Queries projects assigned to the current user, then queries all colleagues assigned to those same projects with client names and avatars.
    * **Upcoming Holidays & Birthdays:** Top 5 upcoming active Indian holidays from `Holidays` table; checks `Employees.DateOfBirth` for today's celebrations.
  * `GET /Dashboard/GetMonthlyAttendance?year=YYYY&month=MM`: AJAX endpoint for interactive calendar navigation.

---

### 4.3 Timesheet Engine & Row Submissions (`TimeSheetController` & `NewTimeSheetController`)
* **Primary View:** `Views/TimeSheet/Index.cshtml`, `Views/NewTimeSheet/NewTimeSheet.cshtml`
* **Controller Actions:**
  * `GET /TimeSheet/Index?weekStart=YYYY-MM-DD&view=week`:
    * Normalizes week date range (Monday to Sunday) using `Employee.RegionalTimeZone` via `TimeZoneMap`.
    * Fetches `Assignments` active for the user to populate the project/role dropdown.
    * Fetches existing `Timesheets` header for the week along with child `TimeEntryRows`, `TimeEntryCells`, `TimeEntryNotes`, and `TimeEntryRowAttachments`.
    * Checks cell lock states: locked cells cannot be modified if `Timesheet.Status == "Submitted"` or `"Approved"`.
  * `POST /TimeSheet/SubmitWeek` (or route `submit-week`):
    * **Payload (`TimesheetSubmissionModel`):**
      * Contains `TimesheetId`, `WeekStartDate`, `WeekEndDate`, `SubmitType` ("FullWeek" or "TillDate"), and a list of `TimesheetSubmissionRowModel` rows.
      * Each row contains `ProjectId`, `AssignmentId`, `Task/Category`, 7 daily cell hours, 7 daily cell notes, and uploaded files.
    * **Database Execution:**
      1. Upserts `Timesheets` header with `Status = "Submitted"` and recalculated `ActualHoursTotal`.
      2. Upserts `TimeEntryRows` for each project line item.
      3. Upserts `TimeEntryCells` for Monday through Sunday with `IsLocked = true`.
      4. Upserts `TimeEntryNotes` containing task descriptions for each cell.
      5. Saves uploaded proof files to `TimeEntryRowAttachments`.
      6. Inspects project's `ApprovalWorkflowSteps` (Step 1) and creates pending approval rows in `TimeEntryRowApprovals`.
      7. Dispatches email notification to designated approver.
      8. Writes event log to `TimesheetHistoryLogs`.
  * `POST /TimeSheet/DraftWeek`: Same as submit, but sets `Status = "Draft"` and leaves `IsLocked = false`.
  * `GET /TimeSheet/GetAttachments?rowId=X`: Retrieves file attachments for a row.
  * `GET /TimeSheet/DownloadFile?id=X`: Streams attachment binary.
  * `POST /TimeSheet/ApplyLeave`: Inserts into `LeaveApplications` and marks relevant timesheet day cells as Leave.
  * `GET /TimeSheet/ExportExcel`: Generates weekly OpenXML `.xlsx` spreadsheet.
  * `GET /TimeSheet/DownloadMonthlyPdf` & `DownloadCustomPdf`: Uses QuestPDF to render formatted timesheet certificates.

---

### 4.4 Multi-Level Approvals Workflow (`ApprovalsController`)
* **Primary View:** `Views/Approvals/Index.cshtml`
* **Controller Actions:**
  * `GET /Approvals/Index`:
    * Identifies pending approvals where `ApproverUserId == currentUserId`.
    * Fetches pending timesheet rows joining `TimeEntryRows` $\to$ `Timesheets` $\to$ `Users` $\to$ `Projects`.
    * Fetches pending expense claims joining `Expenses` $\to$ `Users` $\to$ `Projects`.
  * `POST /Approvals/ApproveRow` / `POST /Approvals/RejectRow`:
    * Targets a specific `TimeEntryRowId`.
    * Updates `TimeEntryRowApprovals` status to `"Approved"` or `"Rejected"`.
    * If approved, checks if a subsequent step exists in `ApprovalWorkflowSteps` for the project. If yes, advances to Step $N+1$; if final step, marks row and timesheet as `"Approved"`.
    * If rejected, captures `ApproverComment`, sets status to `"Rejected"`, and emails employee with reason.
  * `POST /Approvals/ApproveWeek` / `POST /Approvals/RejectWeek`: Batch operation on all rows of a timesheet.
  * `POST /Approvals/ApproveExpense` / `POST /Approvals/RejectExpense`: Approves/rejects expense claims and logs to `ExpenseHistoryLogs`.

---

### 4.5 Expense Management & Reimbursements (`ExpensesController`)
* **Primary View:** `Views/Expenses/Index.cshtml`, `Views/Expenses/NewExpenses.cshtml`
* **Controller Actions:**
  * `GET /Expenses/Index`: Loads employee's submitted, approved, and draft expense claims.
  * `GET /Expenses/NewExpenses?category=All`: Renders new claim form with currency list from `Currencies` and active projects.
  * `POST /Expenses/SaveExpense` (`ExpensePageVM`):
    * Generates unique code `ExpenseNo` (e.g. `EXP-2026-0042`).
    * Captures `ExpTitle`, `Amount`, `Currency`, `ExpenseDate`, `ExpenseType` (Travel, Meals, Lodging, Mileage, Software), `BillableToClient`.
    * Saves uploaded receipt files as binary blobs in `ExpenseAttachments`.
    * Initializes `ExpenseEntryRowApprovals` and logs audit entry in `ExpenseHistoryLogs`.
  * `GET /Expenses/ExpenseDrawer?expenseNo=EXP-XXX`: Returns JSON/partial HTML for slide-out detail drawer.
  * `GET /Expenses/DownloadAttachment?id=X`: Streams receipt image/PDF.

---

### 4.6 Projects & Resource Allocation (`ProjectsController` & `A ssignmentsController`)
* **Primary Views:** `Views/Projects/Index.cshtml`, `Views/Projects/Details.cshtml`, `Views/Projects/Create.cshtml`
* **Controller Actions:**
  * `GET /Projects/Index`: Lists all projects with pagination, search, client filtering, and status badges.
  * `POST /Projects/Create` & `POST /Projects/Save` (`ProjectEditViewModel`): Creates or updates project records (`ProjectCode`, `Name`, `ClientId`, `ProjectManagerId`, `StartDate`, `EndDate`, `BillingType`, `Currency`, `Status`).
  * `GET /Projects/Resources?projectId=X`: Fetches assigned team members from `Assignments` table.
  * `POST /Projects/SaveResources`: Allocates a user (`AssigneeId`) to project with `ProjectRoleId`, `HourlyRate`, `BillingRate`, `StartDate`, `EndDate`, `AllocationPercentage`, and `IsBillable`.
  * `POST /Projects/SaveWorkflowOnly` (`WorkflowSaveDto`): Configures multi-tier approval steps in `ApprovalWorkflowSteps` (e.g., Step 1 = PM, Step 2 = Specific User).

---

### 4.7 HR Management & Employee Lifecycle (`HR.cs` & `EmployeeController`)
* **Primary Views:** `Views/HR/Index.cshtml`, `Views/Employee/Index.cshtml`
* **Controller Actions:**
  * `GET /HR/Index?viewType=Employees|Clients|Designations|Holidays`: Central administrative dashboard for HR operations.
  * `POST /HR/SaveUser` & `POST /HR/MultipleUser`: Creates new employee records in `Employees` and user accounts in `Users`.
  * `POST /HR/UploadUsers` & `POST /HR/UploadAndPreview`:
    * Parses uploaded `.xlsx` Excel spreadsheets using OpenXML.
    * Validates required columns (Employee ID, Name, Email, Department, Designation, Joining Date).
    * Previews parsed data before committing batch insert into `Employees` and `Users`.
  * `POST /HR/SaveHolidayCalendar`: Configures regional/national holidays in `Holidays` table.
  * `GET /HR/ExportUsers?format=excel|csv`: Exports complete employee database to Excel/CSV.
  * `GET /Employee/Index` & `POST /Employee/SaveEmployee`: Allows viewing and editing personal profile details (`EmployeeContactDetails`, `EmployeeEmergencyContacts`, `EmployeeDocuments`).

---

### 4.8 Operational Reports & Analytics (`Reports.cs`)
* **Primary Views:** `Views/Reports/Index.cshtml`, `Views/Reports/Expenses.cshtml`
* **Controller Actions:**
  * `GET /Reports/Index`:
    * Filters by date range, resource type, location, level, billable type, project, and skills.
    * Computes member billable hours vs non-billable hours vs total capacity.
    * Calculates utilization metrics:
      $$\text{Utilization \%} = \frac{\text{Billable Hours}}{\text{Working Days} \times 8} \times 100$$
  * `GET /Reports/Expenses`: Expense breakdown by project, employee, date range, and status.
  * `GET /Reports/GetUserTimesheets?userId=X`: Full historical drill-down into an employee's timesheets.
  * `POST /Reports/UnsubmitSelectedDays` (`[FromBody] List<int> cellIds`):
    * Administrative unlock feature that resets submitted/locked `TimeEntryCells` back to `IsLocked = false` and `Status = "Draft"`, allowing employees to correct errors.
  * `POST /Reports/DownloadMemberReport`: Generates consolidated management reports in Excel or PDF.

---

### 4.9 Helpdesk Ticketing System (`TicketsController`)
* **Primary View:** `Views/Tickets/Index.cshtml`
* **Controller Actions:**
  * `GET /Tickets/Index`: Renders Kanban/List view of support tickets.
  * `GET /Tickets/GetDashboardStats`: Computes counts of Open, In Progress, Resolved, and Closed tickets.
  * `POST /Tickets/CreateTicket` (`CreateTicketRequest`):
    * Auto-generates sequential ticket code (e.g. `TICK-1045`).
    * Captures `Title`, `Description`, `Priority` (Low, Medium, High, Urgent), `CategoryMasterId`, `SubCategoryMasterId`, `AssignedUserId`.
    * Stores file attachments in `TicketAttachments`.
  * `POST /Tickets/AddComment`: Appends comment to `TicketComments`; updates status or reassigns ticket if specified; creates audit log in `TicketActivities`.
  * `GET /Tickets/GetTicketActivities?ticketId=X`: Retrieves full chronological audit trail of ticket events.

---

### 4.10 Permission Matrix & Role Assignment (`PermissionController` & `AssignRoleController`)
* **Primary Views:** `Views/Permission/Index.cshtml`, `Views/AssignRole/Index.cshtml`
* **Controller Actions:**
  * `GET /Permission/Index`: Renders interactive 2D matrix of all `Roles` $\times$ `Modules`.
  * `POST /Permission/Save` (`PermissionMatrixViewModel`): Updates boolean permission flags (`CanView`, `CanAdd`, `CanEdit`, `CanDelete`, `CanApprove`, `CanExport`) in `RoleModulePermissions`.
  * `GET /AssignRole/Index` & `POST /AssignRole/Save`: Maps users to roles in `UserRoles`.

---

### 4.11 Dynamic Email Templates & Notifications (`EmailTemplate.cs`)
* **Primary View:** `Views/EmailTemplate/Index.cshtml`
* **Controller Actions:**
  * `GET /EmailTemplate/Index`: Lists all registered templates.
  * `POST /EmailTemplate/SaveTemplate` (`EmailTemplateCreateVm`): Creates/updates templates for system events (`UserRegistered`, `TimesheetSubmitted`, `TimesheetApproved`, `TimesheetRejected`, `ExpenseSubmitted`).
  * `GET /EmailTemplate/GetPlaceholders?module=X&eventName=Y`: Returns available placeholder tokens (e.g. `{user_name}`, `{user_email}`, `{period_start}`, `{period_end}`, `{approver_name}`).

---

### 4.12 Clients Management (`Clients.cs`)
* **Primary View:** `Views/Clients/Index.cshtml`
* **Controller Actions:**
  * `GET /Clients/Index`: Lists client companies with active projects count.
  * `POST /Clients/AddClient`: Inserts new client profile (`ClientName`, `ClientCode`, `BillingAddress`, `Country`, `CurrencyId`).

---

### 4.13 Utilization & Resource Forecasting (`UtilizationPlan.cs` & `ForecastingController`)
* **Primary View:** `Views/UtilizationPlan/Index.cshtml`, `Views/Forecasting/Index.cshtml`
* **Controller Actions:**
  * `GET /UtilizationPlan/Index`: Renders resource allocation vs availability forecasts.
  * `GET /UtilizationPlan/ExportExcel`: Exports team utilization projections to `.xlsx`.

---

## 5. Data Flow Diagrams

### 5.1 Weekly Timesheet Lifecycle

```
[Employee UI]
      │
      │ 1. Fill Hours & Notes per Project Row
      ▼
[POST /TimeSheet/SubmitWeek]
      │
      ├─► Upsert Timesheets (Status = "Submitted", ActualHoursTotal)
      ├─► Upsert TimeEntryRows (ProjectId, AssignmentId)
      ├─► Upsert TimeEntryCells (Hours, IsLocked = true)
      ├─► Upsert TimeEntryNotes (Daily Task Description)
      ├─► Save TimeEntryRowAttachments (Proof Files)
      ├─► Insert TimeEntryRowApprovals (Step 1 Approver)
      ├─► Log TimesheetHistoryLogs
      └─► Dispatch Email via EmailService
            │
            ▼
   [Project Manager / Approver]
            │
            ├─► POST /Approvals/ApproveRow
            │         │
            │         ├─► If Last Step: Mark Row & Timesheet "Approved"
            │         └─► If More Steps: Activate Step N+1 Approver
            │
            └─► POST /Approvals/RejectRow
                      │
                      ├─► Mark Row "Rejected" & Save ApproverComment
                      └─► Send Notification Email to Employee
```

### 5.2 Expense Claim Lifecycle

```
[Employee UI]
      │
      │ 1. Enter Expense Lines, Currency, Amounts, Upload Receipts
      ▼
[POST /Expenses/SaveExpense]
      │
      ├─► Insert Expenses (ExpenseNo, Amount, Status = "Pending")
      ├─► Insert ExpenseAttachments (Binary Receipt Files)
      ├─► Insert ExpenseEntryRowApprovals (Step 1 Approver)
      └─► Log ExpenseHistoryLogs
            │
            ▼
   [Approver / Finance]
            │
            ├─► POST /Approvals/ApproveExpense ──► Status = "Approved" ──► Finance Reimbursement
            └─► POST /Approvals/RejectExpense  ──► Status = "Rejected" ──► Notification to Employee
```

---
*Document generated for MyGo Portals codebase reference.*
