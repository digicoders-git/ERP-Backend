const Assignment = require('../../model/Assignment');
const Class = require('../../model/Class');
const Section = require('../../model/Section');
const Admin = require('../../model/Admin');
const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/assignments');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

exports.createAssignment = async (req, res) => {
  try {
    const { classId, sectionId, title, subject, dueDate, totalStudents, description, marks } = req.body;
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

    const documentPath = req.files?.document?.[0]?.filename || null;
    const imagePath = req.files?.image?.[0]?.filename || null;

    const assignment = new Assignment({
      class: classId, 
      section: sectionId,
      title, 
      subject, 
      dueDate, 
      totalStudents, 
      description,
      marks: marks || 0,
      document: documentPath,
      image: imagePath,
      teacherId: adminId,
      branch: admin.branch, 
      client: admin.client, 
      createdBy: adminId
    });

    await assignment.save();
    res.status(201).json({ message: 'Assignment created successfully', assignment });
  } catch (error) {
    console.error('Create assignment error:', error);
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

    const query = { branch: admin.branch, teacherId: adminId };
    if (classId) query.class = classId;
    if (sectionId) query.section = sectionId;

    const [assignments, total] = await Promise.all([
      Assignment.find(query)
        .populate('class', 'className classCode')
        .populate('section', 'sectionName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Assignment.countDocuments(query)
    ]);

    res.status(200).json({
      assignments,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get all assignments error:', error);
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
    console.error('Get assignment by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, dueDate, totalStudents, description, marks } = req.body;
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
    if (marks !== undefined) assignment.marks = marks;
    
    if (req.files?.document?.[0]) {
      assignment.document = req.files.document[0].filename;
    }
    if (req.files?.image?.[0]) {
      assignment.image = req.files.image[0].filename;
    }

    await assignment.save();
    res.status(200).json({ message: 'Assignment updated successfully', assignment });
  } catch (error) {
    console.error('Update assignment error:', error);
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

    // Delete files if they exist
    if (assignment.document) {
      const docPath = path.join(uploadsDir, assignment.document);
      if (fs.existsSync(docPath)) {
        fs.unlinkSync(docPath);
      }
    }
    if (assignment.image) {
      const imgPath = path.join(uploadsDir, assignment.image);
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }

    await Assignment.findByIdAndDelete(id);
    res.status(200).json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
