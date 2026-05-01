const mongoose = require('mongoose');
const Student = require('../model/Student');
require('dotenv').config();

const updateStudentPlaceholders = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ERP');
        console.log('Connected to MongoDB');

        const students = await Student.find({ profileImage: /via\.placeholder\.com/ });
        console.log(`Found ${students.length} students with broken placeholders`);

        let updatedCount = 0;
        for (let student of students) {
            student.profileImage = student.profileImage.replace('via.placeholder.com', 'placehold.co');
            await student.save();
            updatedCount++;
        }

        console.log(`Successfully updated ${updatedCount} students`);
        process.exit(0);
    } catch (err) {
        console.error('Update failed:', err);
        process.exit(1);
    }
};

updateStudentPlaceholders();
