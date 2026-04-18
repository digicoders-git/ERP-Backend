const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Teacher = require('../../model/Teacher');
const Timetable = require('../../model/Timetable');
const Assignment = require('../../model/Assignment');
const Notice = require('../../model/Notice');
const Student = require('../../model/Student');
const Class = require('../../model/Class');
const Section = require('../../model/Section');

// Debug endpoint to check all data
router.get('/debug/check-data', auth, async (req, res) => {
  try {
    const adminId = req.userId;
    const teacherId = req.user?.teacher;
    const branch = req.user?.branch;

    console.log('Debug Check - adminId:', adminId, 'teacherId:', teacherId, 'branch:', branch);

    // Check teacher
    const teacher = await Teacher.findById(teacherId).lean();
    
    // Check timetables
    const timetables = await Timetable.find({ branch, teacherId: adminId }).lean();
    const timetablesAll = await Timetable.find({ teacherId: adminId }).lean();
    
    // Check assignments
    const assignments = await Assignment.find({ branch, teacherId: adminId }).lean();
    const assignmentsAll = await Assignment.find({ teacherId: adminId }).lean();
    
    // Check notices
    const notices = await Notice.find({ branch, isPublished: true }).lean();
    const noticesAll = await Notice.find({ isPublished: true }).lean();
    
    // Check classes and sections
    const classes = await Class.find({ branch }).lean();
    const sections = await Section.find({ branch }).lean();
    
    // Check students
    const students = await Student.find({ branch }).lean();

    res.json({
      success: true,
      debug: {
        teacher: {
          found: !!teacher,
          id: teacher?._id,
          name: teacher?.name,
          branch: teacher?.branch,
          assignedClass: teacher?.assignedClass,
          assignedSection: teacher?.assignedSection
        },
        timetables: {
          withBranchAndTeacher: timetables.length,
          withTeacherOnly: timetablesAll.length,
          sample: timetables.slice(0, 2)
        },
        assignments: {
          withBranchAndTeacher: assignments.length,
          withTeacherOnly: assignmentsAll.length,
          sample: assignments.slice(0, 2)
        },
        notices: {
          withBranch: notices.length,
          total: noticesAll.length,
          sample: notices.slice(0, 2)
        },
        classes: {
          count: classes.length,
          sample: classes.slice(0, 2)
        },
        sections: {
          count: sections.length,
          sample: sections.slice(0, 2)
        },
        students: {
          count: students.length,
          sample: students.slice(0, 2)
        },
        queryParams: {
          adminId,
          teacherId,
          branch
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
