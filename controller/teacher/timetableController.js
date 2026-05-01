const Timetable = require('../../model/Timetable');
const Admin = require('../../model/Admin');

// Fetch personal timetable for the teacher
exports.getAllTimetables = async (req, res) => {
  try {
    const { day } = req.query;
    const teacherId = req.user.teacher; // From auth token

    if (!teacherId) {
      return res.status(403).json({ success: false, message: 'Teacher profile not linked to this account' });
    }

    const query = { teacherId };
    if (day) query.day = day;

    const timetables = await Timetable.find(query)
      .populate('classId', 'className classCode stream')
      .populate('sectionId', 'sectionName')
      .sort({ day: 1, periodNumber: 1, startTime: 1 })
      .lean();

    res.status(200).json({ success: true, data: timetables });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Disable editing for teachers (now managed by Branch Admin)
exports.addTimetable = async (req, res) => {
  res.status(403).json({ success: false, message: 'Timetable management is now restricted to Admin only.' });
};

exports.updateTimetable = async (req, res) => {
  res.status(403).json({ success: false, message: 'Timetable management is now restricted to Admin only.' });
};

exports.deleteTimetable = async (req, res) => {
  res.status(403).json({ success: false, message: 'Timetable management is now restricted to Admin only.' });
};

exports.getTimetableByDay = async (req, res) => {
  // Similar to getAllTimetables but for a specific day
  try {
    const { day } = req.params;
    const teacherId = req.user.teacher;

    const timetables = await Timetable.find({ day, teacherId })
      .populate('classId', 'className classCode stream')
      .populate('sectionId', 'sectionName')
      .sort({ periodNumber: 1, startTime: 1 })
      .lean();

    res.status(200).json({ success: true, data: timetables });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};