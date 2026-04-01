const Approval = require('../model/Approval');
const Admin = require('../model/Admin');

const getBranchId = async (userId) => {
  const admin = await Admin.findById(userId);
  if (!admin || admin.role !== 'branchAdmin') return null;
  return admin.branch;
};

// Create Approval
exports.createApproval = async (req, res) => {
  try {
    const branchId = await getBranchId(req.userId);
    if (!branchId) return res.status(403).json({ message: 'Only branch admin can create approvals' });

    const { type, name, department, class: cls, priority, description } = req.body;
    if (!type || !name) return res.status(400).json({ message: 'Type and name are required' });

    const approval = await Approval.create({
      branch: branchId,
      type, name, department, class: cls, priority, description,
      createdBy: req.userId
    });

    res.status(201).json({ message: 'Approval created successfully', approval });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Approvals
exports.getAllApprovals = async (req, res) => {
  try {
    const branchId = await getBranchId(req.userId);
    if (!branchId) return res.status(403).json({ message: 'Access denied' });

    const { status, type, priority } = req.query;
    const query = { branch: branchId };
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    const approvals = await Approval.find(query).sort({ createdAt: -1 });
    res.status(200).json({ approvals });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Single Approval
exports.getApprovalById = async (req, res) => {
  try {
    const branchId = await getBranchId(req.userId);
    if (!branchId) return res.status(403).json({ message: 'Access denied' });

    const approval = await Approval.findOne({ _id: req.params.id, branch: branchId });
    if (!approval) return res.status(404).json({ message: 'Approval not found' });

    res.status(200).json({ approval });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Approval Status (Approve / Reject)
exports.updateApprovalStatus = async (req, res) => {
  try {
    const branchId = await getBranchId(req.userId);
    if (!branchId) return res.status(403).json({ message: 'Access denied' });

    const { status } = req.body;
    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be Approved, Rejected, or Pending' });
    }

    const approval = await Approval.findOneAndUpdate(
      { _id: req.params.id, branch: branchId },
      { status },
      { new: true }
    );
    if (!approval) return res.status(404).json({ message: 'Approval not found' });

    res.status(200).json({ message: `Approval ${status.toLowerCase()} successfully`, approval });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Approval
exports.deleteApproval = async (req, res) => {
  try {
    const branchId = await getBranchId(req.userId);
    if (!branchId) return res.status(403).json({ message: 'Access denied' });

    const approval = await Approval.findOneAndDelete({ _id: req.params.id, branch: branchId });
    if (!approval) return res.status(404).json({ message: 'Approval not found' });

    res.status(200).json({ message: 'Approval deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Approval Stats
exports.getApprovalStats = async (req, res) => {
  try {
    const branchId = await getBranchId(req.userId);
    if (!branchId) return res.status(403).json({ message: 'Access denied' });

    const [total, pending, approved, rejected] = await Promise.all([
      Approval.countDocuments({ branch: branchId }),
      Approval.countDocuments({ branch: branchId, status: 'Pending' }),
      Approval.countDocuments({ branch: branchId, status: 'Approved' }),
      Approval.countDocuments({ branch: branchId, status: 'Rejected' })
    ]);

    // Type-wise pending count
    const types = ['Student Admission', 'Leave Request', 'Fee Waiver', 'Transfer Certificate', 'Event Approval', 'Budget Request'];
    const typeStats = {};
    for (const type of types) {
      typeStats[type] = await Approval.countDocuments({ branch: branchId, type, status: 'Pending' });
    }

    res.status(200).json({ stats: { total, pending, approved, rejected }, typeStats });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
