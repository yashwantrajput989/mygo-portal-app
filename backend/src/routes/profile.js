const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcryptjs');
const argon2 = require('argon2');
const prisma = require('../prisma');
const { authenticateToken } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/profile
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;

        const user = await prisma.users.findUnique({
            where: { Id: userId }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Fetch Employee record
        let employee = await prisma.employees.findFirst({
            where: {
                OR: [
                    { Id: userId },
                    { EmployeeId: String(userId) }
                ]
            }
        });

        if (!employee) {
            // Find by name match
            const nameParts = (user.FullName || '').split(' ');
            employee = await prisma.employees.findFirst({
                where: {
                    FirstName: { contains: nameParts[0] || '', mode: 'insensitive' }
                }
            });
        }

        const empId = employee?.Id || userId;

        // Fetch Contact details
        const contact = await prisma.employeeContactDetails.findFirst({
            where: { EmployeeId: empId }
        });

        // Fetch Emergency contact
        const emergency = await prisma.employeeEmergencyContacts.findFirst({
            where: { EmployeeId: empId }
        });

        // Fetch System details
        const system = await prisma.employeeSystemDetails.findFirst({
            where: { EmployeeId: empId }
        });

        return res.json({
            success: true,
            user: {
                id: user.Id,
                fullName: user.FullName,
                email: user.Email,
                isActive: user.IsActive
            },
            employee: employee || {
                FirstName: user.FullName?.split(' ')[0] || '',
                LastName: user.FullName?.split(' ')[1] || '',
                Department: 'SAP Practice',
                Designation: 'Senior Consultant',
                COE: 'Technical & Architecture',
                EmploymentType: 'Full Time',
                Country: 'India',
                City: 'Hyderabad'
            },
            contact: contact || {
                CorporateEmail: user.Email,
                PersonalEmail: '',
                MobileNumber: '',
                AddressLine1: '',
                AddressLine2: ''
            },
            emergency: emergency || {
                ContactName: '',
                Relationship: '',
                PhoneNumber: ''
            },
            system: system || {
                Username: user.Email?.split('@')[0] || '',
                SystemRole: 'Employee',
                WorkLocation: 'Hyderabad, India',
                AssetId: 'MYGO-LT-2026',
                OperatingSystem: 'Windows 11 Enterprise',
                VPNAccess: true
            }
        });
    } catch (err) {
        console.error('Profile fetch error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/profile
router.put('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const { personal, employee, contact, emergency, system } = req.body;

        // 1. Update User FullName
        if (personal?.fullName) {
            await prisma.users.update({
                where: { Id: userId },
                data: { FullName: personal.fullName }
            });
        }

        // 2. Update / Upsert Employee record
        let empRecord = await prisma.employees.findFirst({
            where: {
                OR: [{ Id: userId }, { EmployeeId: String(userId) }]
            }
        });

        const empData = {
            FirstName: personal?.firstName || empRecord?.FirstName,
            MiddleName: personal?.middleName || empRecord?.MiddleName,
            LastName: personal?.lastName || empRecord?.LastName,
            DateOfBirth: personal?.dateOfBirth ? new Date(personal.dateOfBirth) : empRecord?.DateOfBirth,
            Gender: personal?.gender || empRecord?.Gender,
            Country: personal?.country || empRecord?.Country,
            State: personal?.state || empRecord?.State,
            City: personal?.city || empRecord?.City,
            Nationality: personal?.nationality || empRecord?.Nationality,
            PrimarySkillset: employee?.primarySkillset || empRecord?.PrimarySkillset,
            SecondarySkillset: employee?.secondarySkillset || empRecord?.SecondarySkillset,
            EmploymentType: employee?.employmentType || empRecord?.EmploymentType,
            Department: employee?.department || empRecord?.Department,
            Designation: employee?.designation || empRecord?.Designation,
            ReportingManager: employee?.reportingManager || empRecord?.ReportingManager,
            COE: employee?.coe || empRecord?.COE,
            Level: employee?.level || empRecord?.Level,
            MemberBillability: employee?.memberBillability || empRecord?.MemberBillability,
            Mem_Location: employee?.workLocation || empRecord?.Mem_Location,
            RegionalTimeZone: employee?.regionalTimeZone || empRecord?.RegionalTimeZone,
            Visastatus: personal?.visaStatus || empRecord?.Visastatus
        };

        if (empRecord) {
            await prisma.employees.update({
                where: { Id: empRecord.Id },
                data: empData
            });
        } else {
            await prisma.employees.create({
                data: {
                    Id: userId,
                    EmployeeId: `MYG-${userId}`,
                    ...empData
                }
            });
        }

        const empId = empRecord?.Id || userId;

        // 3. Update / Upsert Contact Details
        if (contact) {
            const existingContact = await prisma.employeeContactDetails.findFirst({
                where: { EmployeeId: empId }
            });

            if (existingContact) {
                await prisma.employeeContactDetails.update({
                    where: { Id: existingContact.Id },
                    data: {
                        PersonalEmail: contact.personalEmail,
                        MobileNumber: contact.mobileNumber,
                        AddressLine1: contact.addressLine1,
                        AddressLine2: contact.addressLine2
                    }
                });
            } else {
                const maxC = await prisma.employeeContactDetails.findFirst({ orderBy: { Id: 'desc' } });
                await prisma.employeeContactDetails.create({
                    data: {
                        Id: (maxC?.Id || 0) + 1,
                        EmployeeId: empId,
                        CorporateEmail: req.user.Email,
                        PersonalEmail: contact.personalEmail,
                        MobileNumber: contact.mobileNumber,
                        AddressLine1: contact.addressLine1,
                        AddressLine2: contact.addressLine2
                    }
                });
            }
        }

        // 4. Update / Upsert Emergency Contact
        if (emergency) {
            const existingEmerg = await prisma.employeeEmergencyContacts.findFirst({
                where: { EmployeeId: empId }
            });

            if (existingEmerg) {
                await prisma.employeeEmergencyContacts.update({
                    where: { Id: existingEmerg.Id },
                    data: {
                        ContactName: emergency.contactName,
                        Relationship: emergency.relationship,
                        PhoneNumber: emergency.phoneNumber
                    }
                });
            } else {
                const maxE = await prisma.employeeEmergencyContacts.findFirst({ orderBy: { Id: 'desc' } });
                await prisma.employeeEmergencyContacts.create({
                    data: {
                        Id: (maxE?.Id || 0) + 1,
                        EmployeeId: empId,
                        ContactName: emergency.contactName,
                        Relationship: emergency.relationship,
                        PhoneNumber: emergency.phoneNumber
                    }
                });
            }
        }

        return res.json({ success: true, message: 'Profile updated successfully!' });
    } catch (err) {
        console.error('Profile update error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/profile/password
router.put('/password', authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
        }

        const user = await prisma.users.findUnique({
            where: { Id: userId }
        });

        // Hash new password using Argon2id
        const newSalt = require('crypto').randomBytes(16);
        const rawHash = await argon2.hash(newPassword, {
            type: argon2.argon2id,
            memoryCost: 65536,
            timeCost: 4,
            parallelism: 8,
            salt: newSalt,
            raw: true,
            hashLength: 32
        });

        const formattedHash = `${newSalt.toString('base64')}.${rawHash.toString('base64')}`;

        await prisma.users.update({
            where: { Id: userId },
            data: { PasswordHash: formattedHash }
        });

        return res.json({ success: true, message: 'Password updated successfully!' });
    } catch (err) {
        console.error('Password update error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
