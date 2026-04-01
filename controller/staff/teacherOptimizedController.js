const Teacher = require('../../model/Teacher');
const Assignment = require('../../model/Assignment');
const Attendance = require('../../model/Attendance');
const Timetable = require('../../model/Timetable');

exports.getAllTeachers = async (req, res) => {
  try {
    const { branch, page = 1, limit = 20, search = '', status = 'all' } = req.query;
    const skip = (page - 1) * limit;
    const adminBranch = req.user.branch;

    const query = { branch: adminBranch || branch };
    if (status !== 'all') query.status = status === 'active';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    const [teachers, total] = await Promise.all([
      Teacher.find(query)
        .select('name email mobile subjects qualification experience salary status createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Teacher.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: teachers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTeacherStats = async (req, res) => {
  try {
    const adminBranch = req.user.branch;

    const stats = await Teacher.aggregate([
      { $match: { branch: adminBranch } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          active: [{ $match: { status: true } }, { $count: 'count' }],
          inactive: [{ $match: { status: false } }, { $count: 'count' }],
          avgSalary: [{ $group: { _id: null, avg: { $avg: '$salary' } } }],
          byQualification: [
            { $group: { _id: '$qualification', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]
        }
      }
    ]);

    const result = {
      total: stats[0].total[0]?.count || 0,
      active: stats[0].active[0]?.count || 0,
      inactive: stats[0].inactive[0]?.count || 0,
      avgSalary: Math.round(stats[0].avgSalary[0]?.avg || 0),
      byQualification: stats[0].byQualification
    };

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTeacherWithClasses = async (req, res) => {
  try {
    const { branch, limit = 10 } = req.query;
    const adminBranch = req.user.branch;

    const teachers = await Teacher.find({ branch: adminBranch || branch, status: true })
      .select('_id name email subjects')
      .limit(parseInt(limit))
      .lean();

    const teacherIds = teachers.map(t => t._id);

    const classCount = await Timetable.aggregate([
      { $match: { teacherId: { $in: teacherIds } } },
      {
        $group: {
          _id: '$teacherId',
          classes: { $sum: 1 },
          subjects: { $addToSet: '$subject' }
        }
      }
    ]);

    const classMap = {};
    classCount.forEach(c => {
      classMap[c._id.toString()] = { classes: c.classes, subjects: c.subjects };
    });

    const result = teachers.map(t => ({
      ...t,
      classesCount: classMap[t._id.toString()]?.classes || 0,
      assignedSubjects: classMap[t._id.toString()]?.subjects || []
    }));

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createTeacher = async (req, res) => {
  try {
    const { name, email, mobile, subjects, qualification, experience, salary, address } = req.body;
    const adminBranch = req.user.branch;

    if (!name || !email || !mobile) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const teacher = new Teacher({
      name,
      email,
      mobile,
      subjects: subjects || [],
      qualification,
      experience,
      salary,
      address,
      branch: adminBranch,
      client: req.user.client,
      createdBy: req.userId,
      status: true
    });

    await teacher.save();

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: teacher
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { name, email, mobile, subjects, qualification, experience, salary, address, status } = req.body;

    const teacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { name, email, mobile, subjects, qualification, experience, salary, address, status },
      { new: true, runValidators: true }
    );

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Teacher updated successfully',
      data: teacher
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await Teacher.findByIdAndDelete(teacherId);

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Teacher deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTeacherAssignments = async (req, res) => {
  try {
    const { branch } = req.query;
    const adminBranch = req.user.branch;

    const assignments = await Assignment.aggregate([
      { $match: { branch: adminBranch || branch } },
      {
        $lookup: {
          from: 'teachers',
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacherDetails'
        }
      },
      { $unwind: '$teacherDetails' },
      {
        $project: {
          _id: 1,
          title: 1,
          teacherName: '$teacherDetails.name',
          dueDate: 1,
          status: 1,
          createdAt: 1
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: 50 }
    ]);

    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTeacherDashboard = async (req, res) => {
  try {
    const adminBranch = req.user.branch;

    const [stats, recentTeachers, activeAssignments, todayClasses] = await Promise.all([
      Teacher.aggregate([
        { $match: { branch: adminBranch } },
        {
          $facet: {
            total: [{ $count: 'count' }],
            active: [{ $match: { status: true } }, { $count: 'count' }]
          }
        }
      ]),
      Teacher.find({ branch: adminBranch, status: true })
        .select('name email mobile subjects')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Assignment.find({ branch: adminBranch, status: 'active' })
        .select('title dueDate')
        .limit(5)
        .lean(),
      Timetable.aggregate([
        {
          $match: {
            branch: adminBranch,
            day: new Date().toLocaleDateString('en-US', { weekday: 'long' })
          }
        },
        { $limit: 10 }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          total: stats[0].total[0]?.count || 0,
          active: stats[0].active[0]?.count || 0
        },
        recentTeachers,
        activeAssignments,
        todayClasses: todayClasses.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
