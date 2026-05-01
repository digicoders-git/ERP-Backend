const Timetable = require('../../model/Timetable');
const Admin = require('../../model/Admin');
const Staff = require('../../model/Staff');
const Teacher = require('../../model/Teacher');

const getBranchClient = async (userId) => {
  let user = await Admin.findById(userId).select('branch client role').lean();
  if (!user) {
    user = await Staff.findById(userId).select('branch client').lean();
    if (user) user.role = 'staffAdmin';
  }
  if (!user) {
    throw new Error('User not found or unauthorized');
  }
  return user;
};

// Create a new timetable entry
exports.addTimetable = async (req, res) => {
  try {
    const { day, periodNumber, startTime, endTime, subject, room, classId, sectionId, teacherId, teacherName, className } = req.body;
    const adminId = req.userId;

    const admin = await getBranchClient(adminId);
    
    if (!admin || !['staffAdmin', 'branchAdmin', 'schoolAdmin', 'superAdmin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Access denied: Institutional authority required for timetable operations' });
    }

    // Validate classId
    if (classId) {
      const Class = require('../../model/Class');
      const classExists = await Class.findById(classId);
      if (!classExists) return res.status(400).json({ message: 'Class not found' });
    }

    // Validate sectionId
    if (sectionId) {
      const Section = require('../../model/Section');
      const sectionExists = await Section.findById(sectionId);
      if (!sectionExists) return res.status(400).json({ message: 'Section not found' });
    }

    // Validate teacherId
    if (teacherId) {
      const TeacherModel = require('../../model/Teacher');
      const teacherExists = await TeacherModel.findById(teacherId);
      if (!teacherExists) return res.status(400).json({ message: 'Teacher not found' });
    }

    // Check for conflict: Same teacher, same day, same period
    if (teacherId && day && periodNumber) {
      const conflict = await Timetable.findOne({ day, periodNumber, teacherId, branch: admin.branch })
        .populate('classId', 'className')
        .populate('sectionId', 'sectionName');
        
      if (conflict) {
        const classStr = conflict.classId ? `${conflict.classId.className}${conflict.className?.includes('(') ? ' (' + conflict.className.split('(')[1] : ''}` : conflict.className || 'Another Class';
        const sectionStr = conflict.sectionId ? conflict.sectionId.sectionName : 'N/A';
        
        return res.status(400).json({ 
          message: `Teacher Busy: ${teacherName || 'Teacher'} is in ${classStr}-${sectionStr} (P${periodNumber})` 
        });
      }
    }

    const timetable = new Timetable({
      day, 
      periodNumber,
      startTime,
      endTime,
      subject, 
      room,
      classId: classId || null,
      className: className || null,
      sectionId: sectionId || null,
      teacherId: teacherId || null,
      teacherName: teacherName || null,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await timetable.save();
    res.status(201).json({ success: true, message: 'Scholastic unit registered successfully', timetable });
  } catch (error) {
    res.status(500).json({ message: 'Registry anomaly detected', error: error.message });
  }
};

// Create bulk timetable entries for multiple days/periods
exports.createBulkTimetable = async (req, res) => {
  try {
    const { classId, sectionId, schedule } = req.body; // schedule is an array of entries
    const adminId = req.userId;
    const admin = await getBranchClient(adminId);

    if (!schedule || !Array.isArray(schedule)) {
      return res.status(400).json({ message: 'Invalid schedule data provided' });
    }

    const entries = schedule.map(entry => ({
      day: entry.day,
      periodNumber: entry.periodNumber,
      classId,
      sectionId,
      subject: entry.subject,
      teacherId: entry.teacherId || null,
      teacherName: entry.teacherName,
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room || '',
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    }));

    const result = await Timetable.insertMany(entries);
    res.status(201).json({ 
      success: true, 
      message: `${result.length} academic periods synchronized successfully`,
      count: result.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Bulk synchronization failure', error: error.message });
  }
};

// Get all timetable entries for the branch
exports.getAllTimetables = async (req, res) => {
  try {
    const { day, classId, sectionId } = req.query;
    const adminId = req.userId;

    const admin = await getBranchClient(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Authorities not recognized' });
    }

    const query = { branch: admin.branch };
    if (day) query.day = day;
    if (classId) query.classId = classId;
    if (sectionId) query.sectionId = sectionId;

    const timetables = await Timetable.find(query)
      .populate('classId', 'className classCode')
      .populate('sectionId', 'sectionName')
      .populate('teacherId', 'name email role')
      .sort({ day: 1, startTime: 1 })
      .lean();

    res.status(200).json({ timetables });
  } catch (error) {
    res.status(500).json({ message: 'Scholastic grid synchronization failure', error: error.message });
  }
};

// Update a timetable entry
exports.updateTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await getBranchClient(adminId);
    if (!admin || !['staffAdmin', 'branchAdmin', 'schoolAdmin', 'superAdmin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const timetable = await Timetable.findById(id);
    if (!timetable) return res.status(404).json({ message: 'Unit not found' });

    if (timetable.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { day, className, subject, room, startTime, endTime, classTime,
            classId, sectionId, teacherId, teacherName } = req.body;

    // Validate classId if provided - must exist in database
    if (classId && classId !== '') {
      const Class = require('../../model/Class');
      const classExists = await Class.findById(classId);
      if (!classExists) {
        return res.status(400).json({ message: 'Class not found in database' });
      }
    }

    // Validate sectionId if provided - must exist in database
    if (sectionId && sectionId !== '') {
      const Section = require('../../model/Section');
      const sectionExists = await Section.findById(sectionId);
      if (!sectionExists) {
        return res.status(400).json({ message: 'Section not found in database' });
      }
    }

    // Validate teacherId if provided - must exist in database
    if (teacherId && teacherId !== '') {
      const Teacher = require('../../model/Teacher');
      const teacherExists = await Teacher.findById(teacherId);
      if (!teacherExists) {
        return res.status(400).json({ message: 'Teacher not found in database' });
      }
    }

    // Build sanitized update — convert empty strings to null for ObjectId fields
    const updates = {
      ...(day        && { day }),
      ...(className  && { className }),
      ...(subject    && { subject }),
      ...(room       !== undefined && { room }),
      ...(teacherName !== undefined && { teacherName }),
      classId:   classId   && classId   !== '' ? classId   : null,
      sectionId: sectionId && sectionId !== '' ? sectionId : null,
      teacherId: teacherId && teacherId !== '' ? teacherId : null,
    };

    // Check for conflict if teacher, day, or period is changing
    const checkTeacher = updates.teacherId || timetable.teacherId;
    const checkDay = updates.day || timetable.day;
    const checkPeriod = timetable.periodNumber; // periodNumber usually doesn't change in this UI

    if (checkTeacher && checkDay && checkPeriod) {
      const conflict = await Timetable.findOne({ 
        _id: { $ne: id },
        day: checkDay, 
        periodNumber: checkPeriod, 
        teacherId: checkTeacher, 
        branch: admin.branch 
      })
      .populate('classId', 'className')
      .populate('sectionId', 'sectionName');

      if (conflict) {
        const classStr = conflict.classId ? `${conflict.classId.className}${conflict.className?.includes('(') ? ' (' + conflict.className.split('(')[1] : ''}` : conflict.className || 'Another Class';
        const sectionStr = conflict.sectionId ? conflict.sectionId.sectionName : 'N/A';
        
        return res.status(400).json({ 
          message: `Teacher Busy: ${conflict.teacherName || 'Teacher'} is in ${classStr}-${sectionStr} (P${checkPeriod})` 
        });
      }
    }

    // Handle time
    if (startTime) updates.startTime = startTime;
    if (endTime)   updates.endTime   = endTime;
    if (classTime) {
      updates.startTime = classTime.split('-')[0]?.trim();
      updates.endTime   = classTime.split('-')[1]?.trim();
    }

    const updatedTimetable = await Timetable.findByIdAndUpdate(
      id, { $set: updates }, { new: true, runValidators: false }
    );
    res.status(200).json({ message: 'Timetable updated successfully', timetable: updatedTimetable });
  } catch (error) {
    res.status(500).json({ message: 'Update failed', error: error.message });
  }
};

// Delete a timetable entry
exports.deleteTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;

    const admin = await getBranchClient(adminId);
    if (!admin || !['staffAdmin', 'branchAdmin', 'schoolAdmin', 'superAdmin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const timetable = await Timetable.findById(id);
    if (!timetable) return res.status(404).json({ message: 'Unit not found' });

    if (timetable.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Timetable.findByIdAndDelete(id);
    res.status(200).json({ message: 'Scholastic unit purged successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Purge operation failed', error: error.message });
  }
};
