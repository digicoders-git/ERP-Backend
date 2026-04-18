const HostelService = require('../../model/HostelService');
const { successResponse,  errorResponse } = require('../../responseFormatter');

exports.getAll = async (req, res) => {
  try {
    const { status, serviceCategory, studentId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (serviceCategory) filter.serviceCategory = serviceCategory;
    if (studentId) filter.studentId = studentId;

    const HostelStudent = require('../../model/HostelStudent');
    const Student = require('../../model/Student');
    const BedAllocation = require('../../model/BedAllocation');

    const services = await HostelService.find(filter).sort({ createdAt: -1 }).lean();

    // Self-healing: Populate latest student info for each record
    const enrichedServices = await Promise.all(services.map(async (item) => {
      // 1. Try Hostel Database
      let student = await HostelStudent.findById(item.studentId).lean();
      
      // 2. Try Main School Database (Legacy)
      if (!student) {
        student = await Student.findById(item.studentId).lean();
      }

      // 3. Fetch current room
      const allotment = await BedAllocation.findOne({ studentId: item.studentId }).lean();

      return {
        ...item,
        studentName: student ? (student.name || `${student.firstName} ${student.lastName}`) : (item.studentName || 'N/A'),
        rollNumber: student ? (student.rollNumber || student.rollNo || 'N/A') : (item.rollNumber || 'N/A'),
        roomNumber: allotment ? allotment.roomNumber : (item.roomNumber || 'N/A')
      };
    }));

    return successResponse(res, enrichedServices, 'Services fetched with fresh data');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.create = async (req, res) => {
  try {
    const now = new Date();
    const service = new HostelService({
      ...req.body,
      date: req.body.date || now.toISOString().split('T')[0],
      time: req.body.time || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    await service.save();
    return successResponse(res, service, 'Service recorded', 201);
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.update = async (req, res) => {
  try {
    const service = await HostelService.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true }
    );
    if (!service) return errorResponse(res, 'Not found', 404);
    return successResponse(res, service, 'Service record updated');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const service = await HostelService.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!service) return errorResponse(res, 'Not found', 404);
    return successResponse(res, service, 'Status updated');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.remove = async (req, res) => {
  try {
    const service = await HostelService.findByIdAndDelete(req.params.id);
    if (!service) return errorResponse(res, 'Not found', 404);
    return successResponse(res, null, 'Deleted');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};

exports.getStats = async (req, res) => {
  try {
    const [total, pending, completed, laundry, hairCut, shoePolish] = await Promise.all([
      HostelService.countDocuments(),
      HostelService.countDocuments({ status: 'Pending' }),
      HostelService.countDocuments({ status: 'Completed' }),
      HostelService.countDocuments({ serviceCategory: 'Laundry' }),
      HostelService.countDocuments({ serviceCategory: 'Hair Cutting' }),
      HostelService.countDocuments({ serviceCategory: 'Shoe Polish' })
    ]);
    return successResponse(res, { total, pending, completed, laundry, hairCut, shoePolish }, 'Stats fetched');
  } catch (error) {
    return errorResponse(res, 'Server error', 500, error);
  }
};
