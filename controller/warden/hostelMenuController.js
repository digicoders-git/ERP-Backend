const HostelMenu = require('../../model/HostelMenu');
const Warden = require('../../model/Warden');

// Add Menu
exports.addMenu = async (req, res) => {
  try {
    const { day, breakfast, lunch, dinner } = req.body;
    const wardenId = req.userId;

    const warden = await Warden.findById(wardenId);
    if (!warden) {
      return res.status(403).json({ message: 'Warden not found' });
    }

    const existingMenu = await HostelMenu.findOne({ day, branch: warden.branch });
    if (existingMenu) {
      return res.status(400).json({ message: 'Menu already exists for this day' });
    }

    const menu = new HostelMenu({
      day,
      breakfast,
      lunch,
      dinner,
      branch: warden.branch,
      client: warden.client,
      createdBy: wardenId
    });

    await menu.save();
    res.status(201).json({ message: 'Menu added successfully', menu });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Menus
exports.getAllMenus = async (req, res) => {
  try {
    const wardenId = req.userId;

    const warden = await Warden.findById(wardenId);
    if (!warden) {
      return res.status(403).json({ message: 'Warden not found' });
    }

    const menus = await HostelMenu.find({ branch: warden.branch })
      .sort({ day: 1 });

    res.status(200).json({ menus });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Menu By Day
exports.getMenuByDay = async (req, res) => {
  try {
    const { day } = req.params;
    const wardenId = req.userId;

    const warden = await Warden.findById(wardenId);
    if (!warden) {
      return res.status(403).json({ message: 'Warden not found' });
    }

    const menu = await HostelMenu.findOne({ day, branch: warden.branch });
    if (!menu) {
      return res.status(404).json({ message: 'Menu not found for this day' });
    }

    res.status(200).json({ menu });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Menu
exports.updateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const { breakfast, lunch, dinner } = req.body;
    const wardenId = req.userId;

    const warden = await Warden.findById(wardenId);
    if (!warden) {
      return res.status(403).json({ message: 'Warden not found' });
    }

    const menu = await HostelMenu.findById(id);
    if (!menu) {
      return res.status(404).json({ message: 'Menu not found' });
    }

    if (menu.branch.toString() !== warden.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (breakfast) menu.breakfast = breakfast;
    if (lunch) menu.lunch = lunch;
    if (dinner) menu.dinner = dinner;

    await menu.save();
    res.status(200).json({ message: 'Menu updated successfully', menu });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Menu
exports.deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const wardenId = req.userId;

    const warden = await Warden.findById(wardenId);
    if (!warden) {
      return res.status(403).json({ message: 'Warden not found' });
    }

    const menu = await HostelMenu.findById(id);
    if (!menu) {
      return res.status(404).json({ message: 'Menu not found' });
    }

    if (menu.branch.toString() !== warden.branch.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await HostelMenu.findByIdAndDelete(id);
    res.status(200).json({ message: 'Menu deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
