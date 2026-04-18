const ExamSchedule = require('../../model/ExamSchedule');
const Class = require('../../model/Class');
const Section = require('../../model/Section');
const Staff = require('../../model/Staff');

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
    const staffId = req.userId;

    if (!classId || !sectionId) {
      return res.status(400).json({ message: 'Class and Section are required' });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(403).json({ message: 'Staff not found' });
    }

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found. Please select a valid class.' });
    }

    if (classData.branch.toString() !== staff.branch.toString()) {
      return res.status(403).json({ message: 'Class does not belong to your branch' });
    }

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

    if (section.branch.toString() !== staff.branch.toString()) {
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
      branch: staff.branch,
      client: staff.client,
      createdBy: staffId
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
    const staffId = req.userId;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(403).json({ message: 'Staff not found' });
    }

    const searchQuery = { branch: staff.branch };

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
      .populate('createdBy', 'email')
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
    const staffId = req.userId;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(403).json({ message: 'Staff not found' });
    }

    const examSchedule = await ExamSchedule.findById(id)
      .populate('class', 'className classCode')
      .populate('section', 'sectionName')
      .populate('branch', 'branchName branchCode')
      .populate('createdBy', 'email');

    if (!examSchedule) {
      return res.status(404).json({ message: 'Exam schedule not found' });
    }

    if (examSchedule.branch._id.toString() !== staff.branch.toString()) {
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
    const staffId = req.userId;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(403).json({ message: 'Staff not found' });
    }

    const examSchedule = await ExamSchedule.findById(id);
    if (!examSchedule) {
      return res.status(404).json({ message: 'Exam schedule not found' });
    }

    if (examSchedule.branch.toString() !== staff.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (examSchedule.createdBy.toString() !== staffId) {
      return res.status(403).json({ message: 'You can only update your own exam schedules' });
    }

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
    const staffId = req.userId;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(403).json({ message: 'Staff not found' });
    }

    const examSchedule = await ExamSchedule.findById(id);
    if (!examSchedule) {
      return res.status(404).json({ message: 'Exam schedule not found' });
    }

    if (examSchedule.branch.toString() !== staff.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (examSchedule.createdBy.toString() !== staffId) {
      return res.status(403).json({ message: 'You can only delete your own exam schedules' });
    }

    await ExamSchedule.findByIdAndDelete(id);
    res.status(200).json({ message: 'Exam schedule deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
