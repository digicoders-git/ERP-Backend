require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./model/Admin');
const Client = require('./model/Client');

const debugLogin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const email = process.argv[2] || 'admin@school.com';
    console.log(`🔍 Debugging admin: ${email}\n`);

    // Step 1: Find admin
    const admin = await Admin.findOne({ email })
      .populate('client')
      .populate('branch');
    
    if (!admin) {
      console.log('❌ Admin not found in database');
      console.log('\nTIP: Create admin with: POST /api/admin/create');
      await mongoose.connection.close();
      return;
    }

    console.log('✅ Admin found:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Status: ${admin.status}`);
    console.log(`   Client ID: ${admin.client?._id || 'NOT SET'}`);
    console.log(`   Client Name: ${admin.client?.name || 'N/A'}\n`);

    // Step 2: Check client
    if (!admin.client) {
      console.log('❌ Client not assigned to admin!');
      console.log('   FIX: Update admin with client ID');
      await mongoose.connection.close();
      return;
    }

    console.log('✅ Client found:');
    console.log(`   Name: ${admin.client.name}`);
    console.log(`   Status: ${admin.client.status}`);
    console.log(`   Purchased Panels: ${admin.client.purchasedPanels?.join(', ') || 'NONE SET'}\n`);

    // Step 3: Check panel access
    if (!admin.client.purchasedPanels || admin.client.purchasedPanels.length === 0) {
      console.log('❌ NO PANELS PURCHASED!');
      console.log('   FIX: Update client with purchasedPanels array');
      console.log('   Example: ["school", "staff", "fee", "warden"]\n');
    } else {
      console.log(`✅ Panels available: ${admin.client.purchasedPanels.join(', ')}\n`);
    }

    // Step 4: Test password
    const testPassword = process.argv[3] || 'Test@123';
    const isMatch = await admin.comparePassword(testPassword);
    console.log(`🔐 Password test with "${testPassword}": ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}\n`);

    // Summary
    console.log('═══ LOGIN SUMMARY ═══');
    const canLogin = admin.status && admin.client && admin.client.purchasedPanels?.length > 0;
    if (canLogin) {
      console.log('✅ LOGIN SHOULD WORK!');
    } else {
      console.log('❌ LOGIN WILL FAIL');
      if (!admin.status) console.log('   - Admin status is disabled');
      if (!admin.client) console.log('   - No client assigned');
      if (!admin.client?.purchasedPanels?.length) console.log('   - No panels purchased');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

debugLogin();
