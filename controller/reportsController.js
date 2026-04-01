const Admin = require('../model/Admin');
const Student = require('../model/Student');
const Staff = require('../model/Staff');
const Teacher = require('../model/Teacher');
const Fee = require('../model/Fee');
const FeeMapping = require('../model/FeeMapping');
const Hostel = require('../model/Hostel');
const Room = require('../model/Room');
const HostelAllocation = require('../model/HostelAllocation');
const Vehicle = require('../model/Vehicle');
const Driver = require('../model/Driver');
const Route = require('../model/Route');
const TransportAllocation = require('../model/TransportAllocation');
const Class = require('../model/Class');
const Section = require('../model/Section');

// Get Full Branch Report
exports.getBranchReport = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can access reports' });
    }

    const branchId = admin.branch;

    const [
      totalStudents, pendingAdmissions, confirmedAdmissions, rejectedAdmissions,
      totalStaff, activeStaff,
      totalTeachers, activeTeachers,
      totalClasses, totalSections,
      totalFees, activeFees,
      totalHostels, totalRooms, availableRooms, occupiedRooms, totalAllocations,
      totalVehicles, totalDrivers, totalRoutes, totalTransportAllocations
    ] = await Promise.all([
      Student.countDocuments({ branch: branchId }),
      Student.countDocuments({ branch: branchId, admissionStatus: 'pending' }),
      Student.countDocuments({ branch: branchId, admissionStatus: 'confirmed' }),
      Student.countDocuments({ branch: branchId, admissionStatus: 'rejected' }),
      Staff.countDocuments({ branch: branchId }),
      Staff.countDocuments({ branch: branchId, status: true }),
      Teacher.countDocuments({ branch: branchId }),
      Teacher.countDocuments({ branch: branchId, status: true }),
      Class.countDocuments({ branch: branchId }),
      Section.countDocuments({ branch: branchId }),
      Fee.countDocuments({ branch: branchId }),
      Fee.countDocuments({ branch: branchId, status: true }),
      Hostel.countDocuments({ branch: branchId }),
      Room.countDocuments({ branch: branchId }),
      Room.countDocuments({ branch: branchId, status: 'available' }),
      Room.countDocuments({ branch: branchId, status: 'occupied' }),
      HostelAllocation.countDocuments({ branch: branchId }),
      Vehicle.countDocuments({ branch: branchId }),
      Driver.countDocuments({ branch: branchId }),
      Route.countDocuments({ branch: branchId }),
      TransportAllocation.countDocuments({ branch: branchId, status: true })
    ]);

    res.status(200).json({
      admissions: {
        totalStudents,
        pendingAdmissions,
        confirmedAdmissions,
        rejectedAdmissions
      },
      staff: { totalStaff, activeStaff, inactiveStaff: totalStaff - activeStaff },
      teachers: { totalTeachers, activeTeachers, inactiveTeachers: totalTeachers - activeTeachers },
      academic: { totalClasses, totalSections },
      fees: { totalFees, activeFees, inactiveFees: totalFees - activeFees },
      hostel: { totalHostels, totalRooms, availableRooms, occupiedRooms, totalAllocations },
      transport: { totalVehicles, totalDrivers, totalRoutes, totalTransportAllocations }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Hostel Report
exports.getHostelReport = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin || (admin.role !== 'branchAdmin' && admin.role !== 'staffAdmin')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const branchId = admin.branch;

    const hostels = await Hostel.find({ branch: branchId }).select('hostelName hostelCode type totalFloor status');

    const hostelReports = await Promise.all(hostels.map(async (hostel) => {
      const totalRooms = await Room.countDocuments({ hostel: hostel._id });
      const availableRooms = await Room.countDocuments({ hostel: hostel._id, status: 'available' });
      const occupiedRooms = await Room.countDocuments({ hostel: hostel._id, status: 'occupied' });
      const totalAllocations = await HostelAllocation.countDocuments({ hostel: hostel._id });
      const activeAllocations = await HostelAllocation.countDocuments({ hostel: hostel._id, allocationStatus: 'active' });

      return {
        hostel: { id: hostel._id, name: hostel.hostelName, code: hostel.hostelCode, type: hostel.type, status: hostel.status },
        totalRooms, availableRooms, occupiedRooms,
        totalAllocations, activeAllocations
      };
    }));

    res.status(200).json({ hostelReports });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
