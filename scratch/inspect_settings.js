const mongoose = require('mongoose');
const ClientSettings = require('../model/ClientSettings');
require('dotenv').config();

const inspectSettings = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ERP');
        const settings = await ClientSettings.findOne({});
        console.log(JSON.stringify(settings, null, 2));
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
};
inspectSettings();
