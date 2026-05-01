const mongoose = require('mongoose');
const Attendance = require('../../model/Attendance');
const Teacher = require('../../model/Teacher');
const Warden = require('../../model/Warden');
const Librarian = require('../../model/Librarian');
const Driver = require('../../model/Driver');
const Staff = require('../../model/Staff'); // For general staff like Fee Admin

const getModelByRole = (role) => {
    switch (role.toLowerCase()) {
        case 'teacher': return Teacher;
        case 'warden': return Warden;
        case 'librarian': return Librarian;
        case 'driver': return Driver;
        default: return Staff;
    }
};

const Admin = require('../../model/Admin');

// Get all staff by role for marking attendance (including current status)
exports.getStaffList = async (req, res) => {
    try {
        const { role, date } = req.query;
        const branchId = req.user.branch?._id || req.user.branch;

        if (!role) return res.status(400).json({ success: false, message: 'Role is required' });

        const normalizedBranchId = new mongoose.Types.ObjectId(branchId);
        const queryDate = date ? new Date(date) : new Date();
        queryDate.setHours(0, 0, 0, 0);

        let staffList = [];
        
        if (role.toLowerCase() === 'feeadmin') {
            const admins = await Admin.find({ 
                branch: normalizedBranchId, 
                role: { $in: ['feeAdmin', 'feeManager'] } 
            }).lean();
            
            staffList = admins.map(a => ({
                _id: a._id,
                name: a.name || 'Fee Admin',
                email: a.email,
                role: a.role === 'feeAdmin' ? 'Fee Admin' : 'Fee Manager',
                profileImage: a.profileImage,
                employeeId: a._id.toString().slice(-6).toUpperCase()
            }));
        } else {
            const Model = getModelByRole(role);
            const rawList = await Model.find({ branch: normalizedBranchId }).lean();
            
            staffList = rawList.map(s => ({
                _id: s._id,
                name: s.name || s.wardenName || 'Unknown',
                email: s.email,
                role: s.role || s.designation || role,
                profileImage: s.profileImage || s.profilePic || null,
                employeeId: s.staffId || s.customId || s.licenseNo || s._id.toString().slice(-6).toUpperCase()
            }));
        }

        // Fetch existing attendance for these staff on this date
        const staffIds = staffList.map(s => s._id);
        const existingAttendance = await Attendance.find({
            branch: normalizedBranchId,
            date: queryDate,
            staffId: { $in: staffIds },
            type: 'staff'
        }).lean();

        // Map status back to staff list
        const finalData = staffList.map(s => {
            const att = existingAttendance.find(a => a.staffId.toString() === s._id.toString());
            return {
                ...s,
                status: att ? att.status : 'Present' // Default to Present if not marked
            };
        });

        res.status(200).json({ success: true, data: finalData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Mark staff attendance (Single or Bulk)
exports.markStaffAttendance = async (req, res) => {
    try {
        const branchId = req.user.branch?._id || req.user.branch;
        const { attendanceData, date } = req.body; // Array of { staffId, role, status }

        if (!attendanceData || !date) return res.status(400).json({ success: false, message: 'Data and date required' });

        const normalizedBranchId = new mongoose.Types.ObjectId(branchId);
        const queryDate = new Date(date);
        queryDate.setHours(0, 0, 0, 0);

        const operations = attendanceData.map(item => ({
            updateOne: {
                filter: { 
                    branch: normalizedBranchId, 
                    date: queryDate, 
                    staffId: new mongoose.Types.ObjectId(item.staffId),
                    type: 'staff' 
                },
                update: {
                    $set: {
                        status: item.status.toLowerCase(),
                        source: 'manual',
                        markedBy: new mongoose.Types.ObjectId(req.userId),
                        markedByType: 'Admin',
                        staffRole: item.role
                    }
                },
                upsert: true
            }
        }));

        const result = await Attendance.bulkWrite(operations);
        console.log('BulkWrite result:', result);

        res.status(200).json({ success: true, message: 'Attendance marked successfully' });
    } catch (error) {
        console.error('Attendance Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get own attendance history (For any logged in staff member)
exports.getOwnAttendanceHistory = async (req, res) => {
    try {
        // Support both direct staff login (_id) and teacher panel login (req.user.teacher)
        let rawStaffId = req.user?.teacher || req.user?._id;
        const userRole = req.user?.role;
        const branchId = req.user?.branch?._id || req.user?.branch;
        const userEmail = req.user?.email;

        if (!rawStaffId || !branchId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        // ── KEY FIX: Admin-model users (libraryAdmin, wardenAdmin etc.) have a different
        // _id from the role-specific model. We look up the correct ID by email.
        if (userRole === 'libraryAdmin' || userRole === 'librarian') {
            const libRecord = await Librarian.findOne({ email: req.user?.email }).select('_id').lean();
            if (libRecord) {
                rawStaffId = libRecord._id;
            }
        } else if (userRole === 'warden') {
            const Warden = require('../../model/Warden');
            const wardenRecord = await Warden.findById(rawStaffId).select('_id').lean();
            if (!wardenRecord) {
                // try email lookup
                const byEmail = await Warden.findOne({ email: req.user?.email }).select('_id').lean();
                if (byEmail) rawStaffId = byEmail._id;
            }
        }

        const staffId = new mongoose.Types.ObjectId(rawStaffId);
        const normalizedBranchId = new mongoose.Types.ObjectId(branchId);

        const history = await Attendance.find({
            branch: normalizedBranchId,
            staffId: staffId,
            type: 'staff'
        }).sort({ date: -1 }).limit(60); // Last 60 records

        res.status(200).json({ success: true, data: history });
    } catch (error) {
        console.error('getOwnAttendanceHistory error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
