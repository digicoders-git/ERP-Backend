const VehicleChecklist = require('../../model/VehicleChecklist');
const Driver = require('../../model/Driver');
const TransportAssignment = require('../../model/TransportAssignment');

const getDriver = async (driverId) => {
  const driver = await Driver.findById(driverId).lean();
  if (!driver) return null;
  return driver;
};

// Submit daily checklist
exports.submitChecklist = async (req,  res) => {
  try {
    const driver = await getDriver(req.driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const { brakes, lights, horn, fuel, tyres, engine, mirrors, seatbelts, firstAid, fireExtinguisher, notes, date } = req.body;

    // Determine status based on checklist
    const hasIssue = [brakes, lights, horn, tyres, engine, mirrors, seatbelts, firstAid, fireExtinguisher].some(v => v === false);
    const status = hasIssue ? 'Minor Issues' : 'All Good';

    // Get vehicle from assignment
    const assignment = await TransportAssignment.findOne({ driver: req.driverId, status: true }).lean();

    const checklist = new VehicleChecklist({
      driver: req.driverId,
      vehicle: assignment?.vehicle || null,
      date: date || new Date().toISOString().split('T')[0],
      brakes, lights, horn, fuel, tyres, engine, mirrors, seatbelts, firstAid, fireExtinguisher,
      notes, status,
      branch: driver.branch,
      client: driver.client
    });

    await checklist.save();
    res.status(201).json({ success: true, message: 'Checklist submitted successfully', data: checklist });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get checklist history for driver
exports.getHistory = async (req, res) => {
  try {
    const driver = await getDriver(req.driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const history = await VehicleChecklist.find({ driver: req.driverId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    res.status(200).json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get today's checklist
exports.getTodayChecklist = async (req, res) => {
  try {
    const driver = await getDriver(req.driverId);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    const today = new Date().toISOString().split('T')[0];
    const checklist = await VehicleChecklist.findOne({ driver: req.driverId, date: today }).lean();

    res.status(200).json({ success: true, data: checklist, submitted: !!checklist });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin — get all checklists for branch
exports.getAllForBranch = async (req, res) => {
  try {
    const { date } = req.query;
    const query = { branch: req.user.branch };
    if (date) query.date = date;

    const [checklists, total] = await Promise.all([
      VehicleChecklist.find(query)
        .populate('driver', 'name mobileNo licenseNo')
        .populate('vehicle', 'vehicleNo vehicleType')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      VehicleChecklist.countDocuments(query)
    ]);

    res.status(200).json({ success: true, data: checklists, total });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
