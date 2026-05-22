require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Staff = require('./model/Staff');
const Admin = require('./model/Admin');
const IDCard = require('./model/IDCard');

async function cleanup() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ERP');
  
  const admins = await Admin.find({ role: 'staffAdmin' });
  for (let admin of admins) {
    const staff = await Staff.findById(admin.staff);
    if (!staff) {
      console.log(`Deleting orphaned Admin for staffId: ${admin.staff}`);
      await Admin.findByIdAndDelete(admin._id);
    }
  }

  const idCards = await IDCard.find({ roleType: 'staff' });
  for (let idCard of idCards) {
    const staff = await Staff.findById(idCard.staffId);
    if (!staff) {
      console.log(`Deleting orphaned IDCard for staffId: ${idCard.staffId}`);
      await IDCard.findByIdAndDelete(idCard._id);
    }
  }

  console.log('Cleanup complete.');
  process.exit();
}

cleanup().catch(console.error);
