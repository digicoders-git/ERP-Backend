// ─── RECORDED CLASSES ─────────────────────────────────────────────────────

exports.getRecordedClasses = async (req, res) => {
  try {
    const user = await getUser(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const studentId = validateStudentAccess(user, req.query.studentId);
    if (!studentId) return res.status(403).json({ message: 'Access denied' });

    const student = await Student.findById(studentId)
      .populate('class', 'className _id')
      .populate('section', 'sectionName _id')
      .lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const classId = student?.class?._id?.toString();
    const sectionId = student?.section?._id?.toString();
    const sBranch = user.branch?.toString();
    const sClient = user.client?.toString();

    // Get student's timetable to find assigned teachers
    const timetables = await Timetable.find({
      branch: sBranch,
      classId: classId,
      ...(sectionId && { sectionId: sectionId })
    })
      .populate('teacherId', '_id name')
      .lean();

    const teacherIds = [...new Set(timetables.map(t => t.teacherId?._id?.toString()).filter(Boolean))];

    // Build query: videos for student's class/section OR created by student's teachers
    const query = {
      branch: sBranch,
      client: sClient,
      $or: [
        { class: classId, section: sectionId },
        { class: classId },
        ...(teacherIds.length > 0 ? [{ createdBy: { $in: teacherIds } }] : [])
      ]
    };

    const videos = await VideoClass.find(query)
      .populate('class', 'className')
      .populate('section', 'sectionName')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const formattedVideos = videos.map(v => {
      const teacherName = v.createdBy?.name || 'Academic Dept';
      
      return {
        id: v._id,
        title: v.title || 'Untitled Video',
        subject: v.subject || 'General',
        duration: v.duration || '0',
        thumbnail: v.thumbnailUrl || '',
        videoUrl: v.videoUrl || '',
        teacher: teacherName,
        uploadedAt: new Date(v.createdAt).toLocaleDateString('en-GB'),
        views: v.views || 0,
        class: v.class?.className || 'All Classes',
        section: v.section?.sectionName || 'All Sections'
      };
    });

    res.status(200).json({ 
      success: true, 
      data: formattedVideos,
      _debug: {
        studentClass: student.class?.className,
        studentSection: student.section?.sectionName,
        assignedTeachers: teacherIds.length,
        totalFound: formattedVideos.length
      }
    });
  } catch (error) {
    console.error('Recorded Classes Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
