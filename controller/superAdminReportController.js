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
    const totalClients = clients.length;
    const totalStudents = clients.reduce((sum, client) => sum + (client.students || 0), 0);
    const totalBranches = clients.reduce((sum, client) => sum + (client.currentBranchCount || 0), 0);
    const averageRating = clients.length > 0 
      ? (clients.reduce((sum, client) => sum + (client.rating || 0), 0) / clients.length).toFixed(2)
      : 0;

    res.status(200).json({
      summary: {
        totalClients,
        totalStudents,
        totalBranches,
        averageRating
      },
      clients
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Plans Report
exports.getPlansReport = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 });

    // Get client count for each plan
    const plansWithStats = await Promise.all(
      plans.map(async (plan) => {
        const clientCount = await Client.countDocuments({ plan: plan._id });
        const activeClientCount = await Client.countDocuments({ 
          plan: plan._id, 
          status: 'active' 
        });
        
        return {
          ...plan.toObject(),
          clientCount,
          activeClientCount
        };
      })
    );

    res.status(200).json({
      totalPlans: plans.length,
      activePlans: plans.filter(p => p.status).length,
      plans: plansWithStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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
          revenue = client.students * client.plan.pricePerStudent;
        } else if (client.plan.planType === 'Monthly Fixed Price') {
          revenue = client.plan.monthlyPrice;
        } else if (client.plan.planType === 'Yearly Fixed Price') {
          revenue = client.plan.yearlyPrice;
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
      totalRevenue,
      totalClients: clients.length,
      revenueByPlan: Object.values(revenueByPlan)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get System Overview Report
exports.getSystemOverview = async (req, res) => {
  try {
    const [
      totalClients,
      activeClients,
      totalPlans,
      totalBranches,
      totalAdmins,
      clientsByPlan,
      recentActivity
    ] = await Promise.all([
      Client.countDocuments(),
      Client.countDocuments({ status: 'active' }),
      Plan.countDocuments(),
      Branch.countDocuments(),
      Admin.countDocuments(),
      Client.aggregate([
        {
          $lookup: {
            from: 'plans',
            localField: 'plan',
            foreignField: '_id',
            as: 'planDetails'
          }
        },
        {
          $unwind: '$planDetails'
        },
        {
          $group: {
            _id: '$planDetails.planName',
            count: { $sum: 1 },
            totalStudents: { $sum: '$students' }
          }
        }
      ]),
      Client.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('plan', 'planName')
        .select('name createdAt status students')
    ]);

    // Get total students
    const clientsWithStudents = await Client.find({}, 'students');
    const totalStudents = clientsWithStudents.reduce((sum, client) => sum + (client.students || 0), 0);

    res.status(200).json({
      overview: {
        totalClients,
        activeClients,
        inactiveClients: totalClients - activeClients,
        totalPlans,
        totalBranches,
        totalAdmins,
        totalStudents
      },
      clientsByPlan,
      recentActivity
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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
          totalStudents: { $sum: '$students' }
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
      period,
      clientGrowth,
      branchGrowth
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
