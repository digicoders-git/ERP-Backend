const Class = require('../../model/Class');
const Section = require('../../model/Section');
const Student = require('../../model/Student');
const Teacher = require('../../model/Teacher');
const Staff = require('../../model/Staff');
const Admin = require('../../model/Admin');
const mongoose = require('mongoose');

const getBranchClient = async (userId) => {
  let user = await Staff.findById(userId).select('branch client').lean();
  if (!user) {
    user = await Admin.findById(userId).select('branch client').lean();
  }
  if (!user) {
    throw new Error('User not found or unauthorized');
  }
  return user;
};

// Get All Classes with Details
exports.getAllClasses = async (req, res) => {
  try {
    const { branch } = await getBranchClient(req.userId);

    const classes = await Class.find({ branch })
      .sort({ className: 1 })
      .lean();

    const classDetails = await Promise.all(classes.map(async (cls) => {
      const [sections, studentCount, teachers] = await Promise.all([
        Section.find({ assignToClass: cls._id }).select('sectionName').lean(),
        Student.countDocuments({ class: cls._id, status: 'active' }),
        Teacher.find({ assignedClasses: cls._id }).select('name subject').lean()
      ]);

      return {
        ...cls,
        sections,
        studentCount,
        teachers
      };
    }));

    res.status(200).json({ classes: classDetails });
  } catch (error) {
    console.error('getAllClasses error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Class Details by ID
exports.getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const { branch } = await getBranchClient(req.userId);

    const classInfo = await Class.findOne({ _id: id, branch }).lean();
    if (!classInfo) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const [sections, students, teachers] = await Promise.all([
      Section.find({ assignToClass: id }).lean(),
      Student.find({ class: id, status: 'active' })
        .select('firstName lastName admissionNumber rollNumber section profileImage')
        .populate('section', 'sectionName')
        .sort({ rollNumber: 1 })
        .lean(),
      Teacher.find({ assignedClasses: id })
        .select('name email mobile subject profileImage')
        .lean()
    ]);

    res.status(200).json({
      class: classInfo,
      sections,
      students,
      teachers,
      totalStudents: students.length
    });
  } catch (error) {
    console.error('getClassById error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Students by Class and Section
exports.getStudentsByClassSection = async (req, res) => {
  try {
    const { classId, sectionId, page = 1, limit = 50 } = req.query;
    const { branch } = await getBranchClient(req.userId);

    const skip = (page - 1) * limit;

    const query = { branch, status: 'active' };
    if (classId) query.class = classId;
    if (sectionId) query.section = sectionId;

    const [students, total] = await Promise.all([
      Student.find(query)
        .select('firstName lastName admissionNumber rollNumber fatherName mobile profileImage')
        .populate('class', 'className')
        .populate('section', 'sectionName')
        .sort({ rollNumber: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Student.countDocuments(query)
    ]);

    res.status(200).json({
      students,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('getStudentsByClassSection error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Class Statistics
exports.getClassStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    const { branch } = await getBranchClient(req.userId);

    const classInfo = await Class.findById(id).lean();
    
    if (!classInfo) {
      return res.status(404).json({ message: 'Class not found' });
    }

    if (classInfo.branch.toString() !== branch.toString()) {
      return res.status(403).json({ message: 'Class does not belong to your branch' });
    }

    const [
      totalStudents,
      maleStudents,
      femaleStudents,
      sections,
      teachers
    ] = await Promise.all([
      Student.countDocuments({ class: id, status: 'active' }),
      Student.countDocuments({ class: id, status: 'active', gender: 'male' }),
      Student.countDocuments({ class: id, status: 'active', gender: 'female' }),
      Section.countDocuments({ assignToClass: id }),
      Teacher.countDocuments({ assignedClasses: id })
    ]);

    res.status(200).json({
      class: classInfo,
      statistics: {
        totalStudents,
        maleStudents,
        femaleStudents,
        totalSections: sections,
        totalTeachers: teachers
      }
    });
  } catch (error) {
    console.error('getClassStatistics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
