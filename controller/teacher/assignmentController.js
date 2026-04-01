const Assignment = require('../../model/Assignment');
const Class = require('../../model/Class');
const Section = require('../../model/Section');
const Admin = require('../../model/Admin');

exports.createAssignment = async (req, res) => {
  try {
    const { classId, sectionId, title, subject, dueDate, totalStudents, description } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can create assignments' });
    }

    const [classData, section] = await Promise.all([
      Class.findById(classId).lean(),
      Section.findById(sectionId).lean()
    ]);
    if (!classData) return res.status(404).json({ message: 'Class not found' });
    if (!section) return res.status(404).json({ message: 'Section not found' });

    const assignment = new Assignment({
      class: classId, section: sectionId,
      title, subject, dueDate, totalStudents, description,
      teacherId: adminId,
      branch: admin.branch, client: admin.client, createdBy: adminId
    });

    await assignment.save();
    res.status(201).json({ message: 'Assignment created successfully', assignment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllAssignments = async (req, res) => {
  try {
    const { page = 1, limit = 10, classId, sectionId } = req.query;
    const skip = (page - 1) * limit;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can view assignments' });
    }

    const query = { branch: admin.branch };
    if (classId) query.class = classId;
    if (sectionId) query.section = sectionId;

    const [assignments, total] = await Promise.all([
      Assignment.find(query)
        .populate('class', 'className classCode')
        .populate('section', 'sectionName')
        .sort({ createdAt: -1 })
        .skip(skip).limit(parseInt(limit))
        .lean(),
      Assignment.countDocuments(query)
    ]);

    res.status(200).json({
      assignments,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can view assignment details' });
    }

    const assignment = await Assignment.findById(id)
      .populate('class', 'className classCode')
      .populate('section', 'sectionName')
      .lean();

    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    if (assignment.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ assignment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, dueDate, totalStudents, description } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can update assignments' });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    if (assignment.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (title) assignment.title = title;
    if (subject) assignment.subject = subject;
    if (dueDate) assignment.dueDate = dueDate;
    if (totalStudents) assignment.totalStudents = totalStudents;
    if (description) assignment.description = description;

    await assignment.save();
    res.status(200).json({ message: 'Assignment updated successfully', assignment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can delete assignments' });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    if (assignment.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Assignment.findByIdAndDelete(id);
    res.status(200).json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
