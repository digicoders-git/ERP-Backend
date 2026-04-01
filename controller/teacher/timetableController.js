const Timetable = require('../../model/Timetable');
const Admin = require('../../model/Admin');

exports.addTimetable = async (req, res) => {
  try {
    const { day, className, classTime, startTime, endTime, subject, room, classId, sectionId } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can add timetable' });
    }

    const timetable = new Timetable({
      day, className, classTime,
      startTime: startTime || (classTime ? classTime.split('-')[0]?.trim() : ''),
      endTime: endTime || (classTime ? classTime.split('-')[1]?.trim() : ''),
      subject, room,
      classId: classId || null,
      sectionId: sectionId || null,
      teacherId: adminId,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await timetable.save();
    res.status(201).json({ message: 'Timetable added successfully', timetable });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllTimetables = async (req, res) => {
  try {
    const { day, className } = req.query;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can view timetables' });
    }

    const query = { branch: admin.branch };
    if (day) query.day = day;
    if (className) query.className = { $regex: className, $options: 'i' };

    const timetables = await Timetable.find(query)
      .populate('classId', 'className classCode')
      .populate('sectionId', 'sectionName')
      .sort({ day: 1, startTime: 1, classTime: 1 })
      .lean();

    res.status(200).json({ timetables });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getTimetableByDay = async (req, res) => {
  try {
    const { day } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can view timetable' });
    }

    const timetables = await Timetable.find({ day, branch: admin.branch })
      .populate('classId', 'className classCode')
      .populate('sectionId', 'sectionName')
      .sort({ startTime: 1, classTime: 1 })
      .lean();

    res.status(200).json({ timetables });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const { day, className, classTime, startTime, endTime, subject, room, classId, sectionId } = req.body;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can update timetable' });
    }

    const timetable = await Timetable.findById(id);
    if (!timetable) return res.status(404).json({ message: 'Timetable not found' });
    if (timetable.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (day) timetable.day = day;
    if (className) timetable.className = className;
    if (classTime) {
      timetable.classTime = classTime;
      timetable.startTime = classTime.split('-')[0]?.trim();
      timetable.endTime = classTime.split('-')[1]?.trim();
    }
    if (startTime) timetable.startTime = startTime;
    if (endTime) timetable.endTime = endTime;
    if (subject) timetable.subject = subject;
    if (room) timetable.room = room;
    if (classId) timetable.classId = classId;
    if (sectionId) timetable.sectionId = sectionId;

    await timetable.save();
    res.status(200).json({ message: 'Timetable updated successfully', timetable });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await Admin.findById(adminId).lean();
    if (!admin || admin.role !== 'teacherAdmin') {
      return res.status(403).json({ message: 'Only teacher admin can delete timetable' });
    }

    const timetable = await Timetable.findById(id);
    if (!timetable) return res.status(404).json({ message: 'Timetable not found' });
    if (timetable.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Timetable.findByIdAndDelete(id);
    res.status(200).json({ message: 'Timetable deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
