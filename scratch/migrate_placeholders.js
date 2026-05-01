const mongoose = require('mongoose');
const ClientSettings = require('../model/ClientSettings');
require('dotenv').config();

const updatePlaceholders = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ERP');
        console.log('Connected to MongoDB');

        const settings = await ClientSettings.find({});
        console.log(`Found ${settings.length} settings documents`);

        let updatedCount = 0;
        for (let setting of settings) {
            let modified = false;
            if (setting.idCard) {
                for (let role of ['student', 'staff', 'teacher', 'driver', 'warden']) {
                    if (setting.idCard[role] && setting.idCard[role].fields) {
                        setting.idCard[role].fields = setting.idCard[role].fields.map(f => {
                            if (f.placeholder && f.placeholder.includes('via.placeholder.com')) {
                                f.placeholder = f.placeholder.replace('via.placeholder.com', 'placehold.co');
                                modified = true;
                            }
                            return f;
                        });
                    }
                }
            }

            if (modified) {
                setting.markModified('idCard');
                await setting.save();
                updatedCount++;
            }
        }

        console.log(`Successfully updated ${updatedCount} settings documents`);
        process.exit(0);
    } catch (err) {
        console.error('Update failed:', err);
        process.exit(1);
    }
};

updatePlaceholders();
