const ExamSchedule = require('../../model/ExamSchedule');
const Class = require('../../model/Class');
const Section = require('../../model/Section');
const Admin = require('../../model/Admin');

// Create Exam Schedule
exports.createExamSchedule = async (req, res) => {
  try {
    const {
      examTitle, examType, subject,
      examDate, startTime, endTime, roomHall, invigilatorName,
      totalMarks, passingMarks, specialInstructions
    } = req.body;
    
    const classId = req.body.classId || req.body.class;
    const sectionId = req.body.sectionId || req.body.section;
    const adminId = req.userId;

    if (!classId || !sectionId) {
      return res.status(400).json({ message: 'Class and Section are required' });
    }

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'staffAdmin') {
      return res.status(403).json({ message: 'Only staff can create exam schedules' });
    }

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found. Please select a valid class.' });
    }

    if (classData.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Class does not belong to your branch' });
    }

    // Validation for pre-board and board exams - only 10th and 12th
    if (examType === 'pre-board' || examType === 'board') {
      const className = classData.className.toLowerCase();
      if (!className.includes('10') && !className.includes('12') && 
          !className.includes('tenth') && !className.includes('twelfth') &&
          !className.includes('x') && !className.includes('xii')) {
        return res.status(400).json({ 
          message: 'Pre-board and Board exams are only allowed for 10th and 12th classes' 
        });
      }
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    if (section.assignToClass.toString() !== classId) {
      return res.status(400).json({ message: 'Section does not belong to the selected class' });
    }

    if (section.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Section does not belong to your branch' });
    }

    const newExamSchedule = new ExamSchedule({
      examTitle,
      examType,
      class: classId,
      section: sectionId,
      subject,
      examDate,
      startTime,
      endTime,
      roomHall,
      invigilatorName,
      totalMarks,
      passingMarks,
      specialInstructions,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await newExamSchedule.save();
    res.status(201).json({ message: 'Exam schedule created successfully', examSchedule: newExamSchedule });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Exam Schedules
exports.getAllExamSchedules = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', examType = '', classId = '' } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'staffAdmin') {
      return res.status(403).json({ message: 'Only staff can view exam schedules' });
    }

    const searchQuery = { branch: admin.branch };

    if (search) {
      searchQuery.$or = [
        { examTitle: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { invigilatorName: { $regex: search, $options: 'i' } }
      ];
    }

    if (examType && ['unit', 'mid', 'final', 'pre-board', 'board'].includes(examType)) {
      searchQuery.examType = examType;
    }

    if (classId) {
      searchQuery.class = classId;
    }

    const examSchedules = await ExamSchedule.find(searchQuery)
      .populate('class', 'className classCode')
      .populate('section', 'sectionName')
      .populate('createdBy', 'email role')
      .sort({ examDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ExamSchedule.countDocuments(searchQuery);

    res.status(200).json({
      examSchedules,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Exam Schedule By ID
exports.getExamScheduleById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'staffAdmin') {
      return res.status(403).json({ message: 'Only staff can view exam schedule details' });
    }

    const examSchedule = await ExamSchedule.findById(id)
      .populate('class', 'className classCode')
      .populate('section', 'sectionName')
      .populate('branch', 'branchName branchCode')
      .populate('createdBy', 'email role');

    if (!examSchedule) {
      return res.status(404).json({ message: 'Exam schedule not found' });
    }

    if (examSchedule.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ examSchedule });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Exam Schedule
exports.updateExamSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      examTitle, examType, subject,
      examDate, startTime, endTime, roomHall, invigilatorName,
      totalMarks, passingMarks, specialInstructions
    } = req.body;
    
    const classId = req.body.classId || req.body.class;
    const sectionId = req.body.sectionId || req.body.section;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'staffAdmin') {
      return res.status(403).json({ message: 'Only staff can update exam schedules' });
    }

    const examSchedule = await ExamSchedule.findById(id);
    if (!examSchedule) {
      return res.status(404).json({ message: 'Exam schedule not found' });
    }

    if (examSchedule.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (examSchedule.createdBy.toString() !== adminId) {
      return res.status(403).json({ message: 'You can only update your own exam schedules' });
    }

    // Validation for class change with pre-board/board
    if (classId && (examType === 'pre-board' || examType === 'board' || examSchedule.examType === 'pre-board' || examSchedule.examType === 'board')) {
      const classData = await Class.findById(classId);
      if (!classData) {
        return res.status(404).json({ message: 'Class not found' });
      }
      const className = classData.className.toLowerCase();
      if (!className.includes('10') && !className.includes('12') && 
          !className.includes('tenth') && !className.includes('twelfth') &&
          !className.includes('x') && !className.includes('xii')) {
        return res.status(400).json({ 
          message: 'Pre-board and Board exams are only allowed for 10th and 12th classes' 
        });
      }
      examSchedule.class = classId;
    }

    if (sectionId) {
      const section = await Section.findById(sectionId);
      if (!section) {
        return res.status(404).json({ message: 'Section not found' });
      }
      const targetClassId = classId || examSchedule.class;
      if (section.assignToClass.toString() !== targetClassId.toString()) {
        return res.status(400).json({ message: 'Section does not belong to the selected class' });
      }
      examSchedule.section = sectionId;
    }

    if (examTitle) examSchedule.examTitle = examTitle;
    if (examType) examSchedule.examType = examType;
    if (subject) examSchedule.subject = subject;
    if (examDate) examSchedule.examDate = examDate;
    if (startTime) examSchedule.startTime = startTime;
    if (endTime) examSchedule.endTime = endTime;
    if (roomHall) examSchedule.roomHall = roomHall;
    if (invigilatorName) examSchedule.invigilatorName = invigilatorName;
    if (totalMarks !== undefined) examSchedule.totalMarks = totalMarks;
    if (passingMarks !== undefined) examSchedule.passingMarks = passingMarks;
    if (specialInstructions !== undefined) examSchedule.specialInstructions = specialInstructions;

    await examSchedule.save();
    res.status(200).json({ message: 'Exam schedule updated successfully', examSchedule });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Exam Schedule
exports.deleteExamSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== 'staffAdmin') {
      return res.status(403).json({ message: 'Only staff can delete exam schedules' });
    }

    const examSchedule = await ExamSchedule.findById(id);
    if (!examSchedule) {
      return res.status(404).json({ message: 'Exam schedule not found' });
    }

    if (examSchedule.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (examSchedule.createdBy.toString() !== adminId) {
      return res.status(403).json({ message: 'You can only delete your own exam schedules' });
    }

    await ExamSchedule.findByIdAndDelete(id);
    res.status(200).json({ message: 'Exam schedule deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
