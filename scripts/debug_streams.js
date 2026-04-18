const mongoose = require('mongoose');
require('dotenv').config();

async function checkStudents() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const students = await mongoose.connection.db.collection('students').find({
            admissionNumber: { $in: ['STU-2115', 'STU-2420'] }
        }).toArray();
        
        console.log('--- STUDENT STREAM REPORT ---');
        students.forEach(s => {
            console.log(`ID: ${s.admissionNumber} | Name: ${s.firstName} ${s.lastName} | Stream: ${s.stream || 'UNDEFINED'}`);
        });
        
        // Also check some Classes to see if they have streams defined
        const all_classes = await mongoose.connection.db.collection('classes').find({}).toArray();
        console.log('\n--- CLASSES STREAM CONFIG ---');
        all_classes.forEach(c => {
            console.log(`Class: ${c.className} | Streams: ${JSON.stringify(c.stream)}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkStudents();
