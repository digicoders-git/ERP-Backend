const Plan = require('../model/Plan');

// Create Plan
exports.createPlan = async (req, res) => {
  try {
    const { planName, planType, pricePerStudent, monthlyPrice, yearlyPrice, panelsIncluded, maxBranches } = req.body;

    if (!planName || !planType || !panelsIncluded || panelsIncluded.length === 0) {
      return res.status(400).json({ message: 'Plan name, plan type, and at least one panel are required' });
    }

    // Validate price based on plan type
    if (planType === 'Per Student Basis' && (!pricePerStudent || pricePerStudent <= 0)) {
      return res.status(400).json({ message: 'Price per student is required for Per Student Basis plan' });
    }
    if (planType === 'Monthly Fixed Price' && (!monthlyPrice || monthlyPrice <= 0)) {
      return res.status(400).json({ message: 'Monthly price is required for Monthly Fixed Price plan' });
    }
    if (planType === 'Yearly Fixed Price' && (!yearlyPrice || yearlyPrice <= 0)) {
      return res.status(400).json({ message: 'Yearly price is required for Yearly Fixed Price plan' });
    }

    // Validate maxBranches if school panel is included
    if (panelsIncluded.includes('school')) {
      if (!maxBranches || maxBranches <= 0) {
        return res.status(400).json({ message: 'maxBranches is required and must be greater than 0 when school panel is included' });
      }
    }
    
    const finalMaxBranches = panelsIncluded.includes('school') ? maxBranches : 0;

    const plan = new Plan({
      planName,
      planType,
      pricePerStudent: planType === 'Per Student Basis' ? pricePerStudent : 0,
      monthlyPrice: planType === 'Monthly Fixed Price' ? monthlyPrice : 0,
      yearlyPrice: planType === 'Yearly Fixed Price' ? yearlyPrice : 0,
      panelsIncluded,
      maxBranches: finalMaxBranches
    });

    await plan.save();
    res.status(201).json({ message: 'Plan created successfully', plan });
  } catch (error) {
    console.error('Plan create error:', error.message, error.errors);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: 'Validation failed', errors: messages });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Plans
exports.getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 });
    res.status(200).json({ plans });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Single Plan
exports.getPlanById = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await Plan.findById(planId);

    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    res.status(200).json({ plan });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Plan
exports.updatePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const { planName, planType, pricePerStudent, monthlyPrice, yearlyPrice, panelsIncluded, maxBranches, status } = req.body;

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Update plan name
    if (planName) plan.planName = planName;

    // Update plan type and validate/set prices
    if (planType) {
      // Validate that required price is provided for new plan type
      if (planType === 'Per Student Basis') {
        if (!pricePerStudent || pricePerStudent <= 0) {
          return res.status(400).json({ message: 'Price per student is required and must be greater than 0' });
        }
        plan.planType = planType;
        plan.pricePerStudent = pricePerStudent;
        plan.monthlyPrice = 0;
        plan.yearlyPrice = 0;
      } else if (planType === 'Monthly Fixed Price') {
        if (!monthlyPrice || monthlyPrice <= 0) {
          return res.status(400).json({ message: 'Monthly price is required and must be greater than 0' });
        }
        plan.planType = planType;
        plan.pricePerStudent = 0;
        plan.monthlyPrice = monthlyPrice;
        plan.yearlyPrice = 0;
      } else if (planType === 'Yearly Fixed Price') {
        if (!yearlyPrice || yearlyPrice <= 0) {
          return res.status(400).json({ message: 'Yearly price is required and must be greater than 0' });
        }
        plan.planType = planType;
        plan.pricePerStudent = 0;
        plan.monthlyPrice = 0;
        plan.yearlyPrice = yearlyPrice;
      }
    } else {
      // If plan type is not changing, update only the relevant price
      if (plan.planType === 'Per Student Basis' && pricePerStudent !== undefined) {
        if (pricePerStudent <= 0) {
          return res.status(400).json({ message: 'Price per student must be greater than 0' });
        }
        plan.pricePerStudent = pricePerStudent;
      }
      if (plan.planType === 'Monthly Fixed Price' && monthlyPrice !== undefined) {
        if (monthlyPrice <= 0) {
          return res.status(400).json({ message: 'Monthly price must be greater than 0' });
        }
        plan.monthlyPrice = monthlyPrice;
      }
      if (plan.planType === 'Yearly Fixed Price' && yearlyPrice !== undefined) {
        if (yearlyPrice <= 0) {
          return res.status(400).json({ message: 'Yearly price must be greater than 0' });
        }
        plan.yearlyPrice = yearlyPrice;
      }
    }

    // Update panels and maxBranches
    if (panelsIncluded) {
      // Validate: If school panel is included, maxBranches must be > 0
      if (panelsIncluded.includes('school')) {
        const newMaxBranches = maxBranches !== undefined ? maxBranches : plan.maxBranches;
        if (!newMaxBranches || newMaxBranches <= 0) {
          return res.status(400).json({ message: 'maxBranches is required and must be greater than 0 when school panel is included' });
        }
        plan.maxBranches = newMaxBranches;
      } else {
        plan.maxBranches = 0;
      }
      plan.panelsIncluded = panelsIncluded;
      
      // Update all clients using this plan
      const Client = require('../model/Client');
      const Admin = require('../model/Admin');
      
      await Client.updateMany(
        { plan: planId },
        { 
          purchasedPanels: panelsIncluded,
          maxBranches: plan.maxBranches
        }
      );
      
      // Update all client admins' allowed panels
      const clients = await Client.find({ plan: planId });
      const clientIds = clients.map(c => c._id);
      
      await Admin.updateMany(
        { client: { $in: clientIds }, role: 'clientAdmin' },
        { allowedPanels: panelsIncluded }
      );
    } else if (maxBranches !== undefined && plan.panelsIncluded.includes('school')) {
      if (maxBranches <= 0) {
        return res.status(400).json({ message: 'maxBranches must be greater than 0 when school panel is included' });
      }
      plan.maxBranches = maxBranches;
      
      // Update maxBranches for all clients using this plan
      const Client = require('../model/Client');
      await Client.updateMany(
        { plan: planId },
        { maxBranches: maxBranches }
      );
    }

    // Update status
    if (status !== undefined) plan.status = status;

    await plan.save();
    res.status(200).json({ message: 'Plan updated successfully', plan });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Plan
exports.deletePlan = async (req, res) => {
  try {
    const { planId } = req.params;

    const plan = await Plan.findByIdAndDelete(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    res.status(200).json({ message: 'Plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
