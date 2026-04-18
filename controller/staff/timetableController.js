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
    const { day, className, classTime, startTime, endTime, subject, room, classId, sectionId, teacherId, teacherName } = req.body;
    const adminId = req.userId;

    const admin = await getBranchClient(adminId);
    
    // Check if user is teacherAdmin - restrict to their assigned class only
    if (admin.role === 'teacherAdmin') {
      const teacher = await Teacher.findOne({ createdBy: adminId }).populate('assignedClass');
      if (!teacher) {
        return res.status(403).json({ message: 'Teacher profile not found. Please contact admin to create your teacher profile.' });
      }
      
      if (!teacher.assignedClass) {
        return res.status(403).json({ message: 'No class assigned to this teacher. Please contact admin to assign a class.' });
      }

      // Teacher can only create timetable for their assigned class
      const assignedClassId = teacher.assignedClass._id.toString();
      
      // If classId provided, check if it matches assigned class
      if (classId && classId !== assignedClassId) {
        return res.status(403).json({ message: `You can only create timetable for your assigned class: ${teacher.assignedClass.className}` });
      }

      // If no classId provided, use assigned class
      const finalClassId = classId || assignedClassId;
      
      // Validate the assigned class exists
      const Class = require('../../model/Class');
      const classExists = await Class.findById(finalClassId);
      if (!classExists) {
        return res.status(400).json({ message: 'Assigned class not found in database' });
      }

      // Validate sectionId if provided - must exist in database
      if (sectionId) {
        const Section = require('../../model/Section');
        const sectionExists = await Section.findById(sectionId);
        if (!sectionExists) {
          return res.status(400).json({ message: 'Section not found in database' });
        }
      }

      // Teacher's own ID should be used
      const teacherIdToUse = teacherId || teacher._id.toString();
      const teacherNameToUse = teacherName || teacher.name;

      const timetable = new Timetable({
        day, 
        className: className || classExists.className, 
        classTime,
        startTime: startTime || (classTime ? classTime.split('-')[0]?.trim() : ''),
        endTime: endTime || (classTime ? classTime.split('-')[1]?.trim() : ''),
        subject, 
        room,
        classId: finalClassId,
        sectionId: sectionId || null,
        teacherId: teacherIdToUse,
        teacherName: teacherNameToUse,
        branch: teacher.branch,
        client: teacher.client,
        createdBy: adminId
      });

      await timetable.save();
      return res.status(201).json({ message: 'Timetable created successfully for your assigned class', timetable });
    }

    // For admin roles - existing validation
    if (!admin || !['staffAdmin', 'branchAdmin', 'schoolAdmin', 'superAdmin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Access denied: Institutional authority required for timetable operations' });
    }

    // Validate classId if provided - must exist in database
    if (classId) {
      const Class = require('../../model/Class');
      const classExists = await Class.findById(classId);
      if (!classExists) {
        return res.status(400).json({ message: 'Class not found in database' });
      }
    }

    // Validate sectionId if provided - must exist in database
    if (sectionId) {
      const Section = require('../../model/Section');
      const sectionExists = await Section.findById(sectionId);
      if (!sectionExists) {
        return res.status(400).json({ message: 'Section not found in database' });
      }
    }

    // Validate teacherId if provided - must exist in database
    if (teacherId) {
      const TeacherModel = require('../../model/Teacher');
      const teacherExists = await TeacherModel.findById(teacherId);
      if (!teacherExists) {
        return res.status(400).json({ message: 'Teacher not found in database' });
      }
    }

    const timetable = new Timetable({
      day, 
      className, 
      classTime,
      startTime: startTime || (classTime ? classTime.split('-')[0]?.trim() : ''),
      endTime: endTime || (classTime ? classTime.split('-')[1]?.trim() : ''),
      subject, 
      room,
      classId: classId || null,
      sectionId: sectionId || null,
      teacherId: teacherId || null,
      teacherName: teacherName || null,
      branch: admin.branch,
      client: admin.client,
      createdBy: adminId
    });

    await timetable.save();
    res.status(201).json({ message: 'Scholastic unit registered successfully', timetable });
  } catch (error) {
    res.status(500).json({ message: 'Registry anomaly detected', error: error.message });
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
