const Task = require('../model/Task');
const Admin = require('../model/Admin');
const Staff = require('../model/Staff');

// Assign Task to Staff (Only by Branch Admin)
exports.assignTask = async (req, res) => {
  try {
    const { title, description, category, priority, deadline, assignedTo, assignedToModel } = req.body;

    if (!title || !description || !priority || !deadline || !assignedTo || !assignedToModel) {
      return res.status(400).json({ message: 'Title, description, priority, deadline, assignedTo, and assignedToModel are required' });
    }

    // Get branch admin details
    const branchAdmin = await Admin.findById(req.userId).populate('branch');
    if (!branchAdmin || branchAdmin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can assign tasks' });
    }

    // Check if assignedTo exists and belongs to same branch
    let assignedPerson;
    if (assignedToModel === 'Staff') {
      assignedPerson = await Staff.findById(assignedTo);
    } else if (assignedToModel === 'Teacher') {
      const Teacher = require('../model/Teacher');
      assignedPerson = await Teacher.findById(assignedTo);
    }

    if (!assignedPerson) {
      return res.status(404).json({ message: `${assignedToModel} not found` });
    }

    if (assignedPerson.branch.toString() !== branchAdmin.branch._id.toString()) {
      return res.status(403).json({ message: `${assignedToModel} does not belong to your branch` });
    }

    // Create Task
    const task = new Task({
      title,
      description,
      category,
      priority,
      deadline,
      assignedTo,
      assignedToModel,
      assignedBy: req.userId,
      branch: branchAdmin.branch._id,
      client: branchAdmin.client,
      status: 'pending'
    });
    await task.save();

    res.status(201).json({
      message: 'Task assigned successfully',
      task: {
        id: task._id,
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        deadline: task.deadline,
        status: task.status,
        assignedTo: task.assignedTo,
        assignedToModel: task.assignedToModel
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Tasks (By Branch Admin)
exports.getAllTasks = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;
    const admin = await Admin.findById(req.userId);

    const searchQuery = search ? {
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ]
    } : {};

    if (admin.role === 'branchAdmin') {
      searchQuery.branch = admin.branch;
      const tasks = await Task.find(searchQuery)
        .populate('assignedTo', 'name email mobile')
        .populate('assignedBy', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Task.countDocuments(searchQuery);
      return res.status(200).json({ 
        tasks, 
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    if (admin.role === 'clientAdmin') {
      searchQuery.client = admin.client;
      const tasks = await Task.find(searchQuery)
        .populate('assignedTo', 'name email mobile')
        .populate('assignedBy', 'email')
        .populate('branch', 'branchName branchCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Task.countDocuments(searchQuery);
      return res.status(200).json({ 
        tasks, 
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    if (admin.role === 'superAdmin') {
      const tasks = await Task.find(searchQuery)
        .populate('assignedTo', 'name email mobile')
        .populate('assignedBy', 'email')
        .populate('branch', 'branchName branchCode')
        .populate('client', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Task.countDocuments(searchQuery);
      return res.status(200).json({ 
        tasks, 
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    return res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Tasks by Staff (For specific staff member)
exports.getTasksByStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const admin = await Admin.findById(req.userId);

    // Check if branch admin owns this staff
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    if (admin.role === 'branchAdmin' && staff.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const tasks = await Task.find({ assignedTo: staffId })
      .populate('assignedBy', 'email')
      .sort({ createdAt: -1 });

    res.status(200).json({ tasks });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Tasks by Status
exports.getTasksByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const admin = await Admin.findById(req.userId);

    if (admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can view tasks by status' });
    }

    const tasks = await Task.find({ 
      branch: admin.branch,
      status: status 
    })
      .populate('assignedTo', 'name email mobile')
      .populate('assignedBy', 'email')
      .sort({ createdAt: -1 });

    res.status(200).json({ tasks });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Single Task
exports.getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;
    const admin = await Admin.findById(req.userId);

    const task = await Task.findById(taskId)
      .populate('assignedTo', 'name email mobile profileImage')
      .populate('assignedBy', 'email')
      .populate('branch', 'branchName branchCode')
      .populate('client', 'name');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check access rights
    if (admin.role === 'branchAdmin' && task.branch._id.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role === 'clientAdmin' && task.client._id.toString() !== admin.client.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ task });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Task
exports.updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, category, priority, deadline, assignedTo } = req.body;

    const admin = await Admin.findById(req.userId);
    if (admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can update tasks' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if branch admin owns this task
    if (task.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (title) task.title = title;
    if (description) task.description = description;
    if (category !== undefined) task.category = category;
    if (priority) task.priority = priority;
    if (deadline) task.deadline = deadline;
    
    if (assignedTo) {
      // Check if new staff belongs to same branch
      const staff = await Staff.findById(assignedTo);
      if (!staff) {
        return res.status(404).json({ message: 'Staff not found' });
      }
      if (staff.branch.toString() !== admin.branch.toString()) {
        return res.status(403).json({ message: 'Staff does not belong to your branch' });
      }
      task.assignedTo = assignedTo;
    }

    await task.save();

    res.status(200).json({ message: 'Task updated successfully', task });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Task
exports.deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const admin = await Admin.findById(req.userId);
    if (admin.role !== 'branchAdmin') {
      return res.status(403).json({ message: 'Only branch admin can delete tasks' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if branch admin owns this task
    if (task.branch.toString() !== admin.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Task.findByIdAndDelete(taskId);

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
