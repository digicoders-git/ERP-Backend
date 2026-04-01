const Event = require('../model/Event');
const Admin = require('../model/Admin');

const getBranch = async (userId) => {
  const admin = await Admin.findById(userId).select('branch').lean();
  return admin?.branch || null;
};

// Create Event
exports.createEvent = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const { title, type, date, startTime, endTime, venue, description, organizer, attendees } = req.body;
    if (!title || !type || !date) return res.status(400).json({ message: 'title, type, date required' });

    const event = await Event.create({
      branch, title, type, date: new Date(date), startTime, endTime,
      venue, description, organizer, attendees, createdBy: req.userId
    });

    res.status(201).json({ message: 'Event created successfully', event });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Events (fast lean, parallel stats)
exports.getAllEvents = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const { status, type } = req.query;
    const query = { branch };
    if (status) query.status = status;
    if (type) query.type = type;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const next7 = new Date(now); next7.setDate(now.getDate() + 7);

    const [events, stats] = await Promise.all([
      Event.find(query).sort({ date: 1 }).lean(),
      Event.aggregate([
        { $match: { branch } },
        { $facet: {
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          thisMonth: [{ $match: { date: { $gte: monthStart, $lte: monthEnd } } }, { $count: 'count' }],
          next7Days: [{ $match: { date: { $gte: now, $lte: next7 }, status: 'upcoming' } }, { $count: 'count' }]
        }}
      ])
    ]);

    const statusMap = { upcoming: 0, completed: 0, cancelled: 0 };
    stats[0].byStatus.forEach(s => { statusMap[s._id] = s.count; });

    res.status(200).json({
      events,
      stats: {
        ...statusMap,
        total: events.length,
        thisMonth: stats[0].thisMonth[0]?.count || 0,
        next7Days: stats[0].next7Days[0]?.count || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Event
exports.updateEvent = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const updateData = { ...req.body };
    if (updateData.date) updateData.date = new Date(updateData.date);

    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, branch },
      { $set: updateData },
      { new: true }
    ).lean();

    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.status(200).json({ message: 'Event updated successfully', event });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Event Status
exports.updateEventStatus = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const { status } = req.body;
    if (!['upcoming', 'completed', 'cancelled'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, branch },
      { status },
      { new: true }
    ).lean();

    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.status(200).json({ message: 'Event status updated', event });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Event
exports.deleteEvent = async (req, res) => {
  try {
    const branch = await getBranch(req.userId);
    if (!branch) return res.status(403).json({ message: 'Access denied' });

    const event = await Event.findOneAndDelete({ _id: req.params.id, branch });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
