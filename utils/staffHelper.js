const Staff = require('../model/Staff');

// Helper function to get branch from staff user
const getBranchFromStaff = async (userId) => {
  try {
    const staff = await Staff.findById(userId).select('branch client').lean();
    if (!staff) {
      throw new Error('Staff not found');
    }
    return {
      branch: staff.branch,
      client: staff.client,
      staff
    };
  } catch (error) {
    throw error;
  }
};

module.exports = { getBranchFromStaff };
