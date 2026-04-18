const Client = require('../model/Client');
const Plan = require('../model/Plan');
const Branch = require('../model/Branch');
const Admin = require('../model/Admin');

// Get Clients Report
exports.getClientsReport = async (req, res) => {
  try {
    const { startDate, endDate, status, planId } = req.query;

    let query = {};

    // Date filter
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Plan filter
    if (planId) {
      query.plan = planId;
    }

    const clients = await Client.find(query)
      .populate('plan', 'planName planType')
      .sort({ createdAt: -1 });

    // Calculate statistics
    const totalClients = clients.length || 0;
    const totalStudents = clients.reduce((sum, client) => sum + (client.students || 0), 0);
    const totalBranches = clients.reduce((sum, client) => sum + (client.currentBranchCount || 0), 0);
    const averageRating = clients.length > 0 
      ? (clients.reduce((sum, client) => sum + (client.rating || 0), 0) / clients.length).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      summary: {
        totalClients,
        totalStudents,
        totalBranches,
        averageRating
      },
      clients: clients || []
    });
  } catch (error) {
    console.error('Clients report error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get Plans Report
exports.getPlansReport = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 });
    const Student = require('../model/Student');

    // Get client count and student count for each plan
    const plansWithStats = await Promise.all(
      plans.map(async (plan) => {
        const clientCount = await Client.countDocuments({ plan: plan._id });
        const activeClientCount = await Client.countDocuments({ 
          plan: plan._id, 
          status: 'active' 
        });
        
        // Get total students for this plan
        const clients = await Client.find({ plan: plan._id }, '_id');
        const clientIds = clients.map(c => c._id);
        const totalStudents = await Student.countDocuments({ client: { $in: clientIds } });
        
        return {
          ...plan.toObject(),
          clientCount: clientCount || 0,
          activeClientCount: activeClientCount || 0,
          totalStudents: totalStudents || 0
        };
      })
    );

    res.status(200).json({
      success: true,
      totalPlans: plans.length || 0,
      activePlans: plans.filter(p => p.status).length || 0,
      plans: plansWithStats || []
    });
  } catch (error) {
    console.error('Plans report error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get Revenue Report
exports.getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const clients = await Client.find(query).populate('plan');

    let totalRevenue = 0;
    const revenueByPlan = {};

    clients.forEach(client => {
      if (client.plan) {
        let revenue = 0;
        
        if (client.plan.planType === 'Per Student Basis') {
          revenue = (client.students || 0) * (client.plan.pricePerStudent || 0);
        } else if (client.plan.planType === 'Monthly Fixed Price') {
          revenue = client.plan.monthlyPrice || 0;
        } else if (client.plan.planType === 'Yearly Fixed Price') {
          revenue = client.plan.yearlyPrice || 0;
        }

        totalRevenue += revenue;

        if (!revenueByPlan[client.plan.planName]) {
          revenueByPlan[client.plan.planName] = {
            planName: client.plan.planName,
            planType: client.plan.planType,
            clientCount: 0,
            revenue: 0
          };
        }

        revenueByPlan[client.plan.planName].clientCount++;
        revenueByPlan[client.plan.planName].revenue += revenue;
      }
    });

    res.status(200).json({
      success: true,
      totalRevenue: totalRevenue || 0,
      totalClients: clients.length || 0,
      revenueByPlan: Object.values(revenueByPlan) || []
    });
  } catch (error) {
    console.error('Revenue report error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get System Overview Report
exports.getSystemOverview = async (req, res) => {
  try {
    const Student = require('../model/Student');
    
    const [
      totalClients,
      activeClients,
      totalPlans,
      totalBranches,
      totalAdmins,
      recentClients
    ] = await Promise.all([
      Client.countDocuments(),
      Client.countDocuments({ status: 'active' }),
      Plan.countDocuments(),
      Branch.countDocuments(),
      Admin.countDocuments(),
      Client.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('plan', 'planName')
        .select('_id name createdAt status plan students')
    ]);

    // Get actual student counts for each recent client
    const recentActivityWithCounts = await Promise.all(
      recentClients.map(async (client) => {
        const studentCount = await Student.countDocuments({ client: client._id });
        const clientStudentCount = client.students || 0;
        const finalCount = studentCount > 0 ? studentCount : clientStudentCount;
        return {
          ...client.toObject(),
          students: finalCount
        };
      })
    );

    // Get total students across all clients
    const allClients = await Client.find({}, '_id');
    const clientIds = allClients.map(c => c._id);
    const totalStudents = await Student.countDocuments({ client: { $in: clientIds } });

    res.status(200).json({
      success: true,
      overview: {
        totalClients: totalClients || 0,
        activeClients: activeClients || 0,
        inactiveClients: (totalClients - activeClients) || 0,
        totalPlans: totalPlans || 0,
        totalBranches: totalBranches || 0,
        totalAdmins: totalAdmins || 0,
        totalStudents: totalStudents || 0
      },
      recentActivity: recentActivityWithCounts || []
    });
  } catch (error) {
    console.error('System overview error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get Growth Analytics
exports.getGrowthAnalytics = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query; // daily, weekly, monthly, yearly

    let groupBy;
    switch (period) {
      case 'daily':
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
      case 'weekly':
        groupBy = { $dateToString: { format: '%Y-W%V', date: '$createdAt' } };
        break;
      case 'yearly':
        groupBy = { $dateToString: { format: '%Y', date: '$createdAt' } };
        break;
      default: // monthly
        groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    }

    const clientGrowth = await Client.aggregate([
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
          totalStudents: { $sum: { $ifNull: ['$students', 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const branchGrowth = await Branch.aggregate([
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      period,
      clientGrowth: clientGrowth || [],
      branchGrowth: branchGrowth || []
    });
  } catch (error) {
    console.error('Growth analytics error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};
