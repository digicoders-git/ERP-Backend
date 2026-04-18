const mongoose = require('mongoose');
require('dotenv').config();
const Student = require('../model/Student');
const StudentDocument = require('../model/StudentDocument');

const sync = async () => {
    try {
        console.log('--- INITIATING INSTITUTIONAL DOCUMENT SYNCHRONIZATION ---');
        await mongoose.connect(process.env.MONGO_URI);
        
        const students = await Student.find({}).lean();
        console.log(`Found ${students.length} students to scan.`);
        
        const documentEntries = [];
        
        for (const student of students) {
            const studentName = `${student.firstName} ${student.lastName}`.trim();
            const studentId = student.admissionNumber || student._id.toString();
            
            // 1. Check Top-Level Fields
            const topLevelDocs = [
                { field: 'profileImage', type: 'Photo' },
                { field: 'medicalCertificate', type: 'Birth Certificate' },
                { field: 'casteCertificate', type: 'ID Proof' }
            ];
            
            topLevelDocs.forEach(d => {
                if (student[d.field]) {
                    documentEntries.push({
                        studentName,
                        studentId,
                        type: d.type,
                        fileUrl: student[d.field],
                        fileName: pathbasename(student[d.field]),
                        status: student.verificationStatus || 'pending',
                        branch: student.branch,
                        client: student.client,
                        createdBy: student.createdBy || student.branch // Fallback
                    });
                }
            });
            
            // 2. Check Nested Documents Object
            if (student.documents) {
                Object.entries(student.documents).forEach(([key, url]) => {
                    if (url && typeof url === 'string') {
                        let docType = 'Other';
                        if (key === 'marksheet') docType = 'Marksheet';
                        else if (key === 'characterCertificate') docType = 'Other';
                        else if (key === 'transferCertificate') docType = 'Transfer Certificate';
                        else if (key === 'birthCertificate') docType = 'Birth Certificate';
                        else if (key === 'aadharCard') docType = 'ID Proof';
                        
                        documentEntries.push({
                            studentName,
                            studentId,
                            type: docType,
                            fileUrl: url,
                            fileName: pathbasename(url),
                            status: student.verificationStatus || 'pending',
                            branch: student.branch,
                            client: student.client,
                            createdBy: student.createdBy || student.branch
                        });
                    }
                });
            }
        }
        
        function pathbasename(path) {
            if (!path) return 'document';
            return path.split('/').pop().split('\\').pop();
        }

        console.log(`Prepared ${documentEntries.length} document entries for migration.`);
        
        if (documentEntries.length > 0) {
            // Avoid duplicates - only if the fileUrl doesn't already exist in registry
            for (const entry of documentEntries) {
                const exists = await StudentDocument.findOne({ fileUrl: entry.fileUrl });
                if (!exists) {
                    await StudentDocument.create(entry);
                }
            }
        }
        
        console.log('--- SYNCHRONIZATION COMPLETE 🚀 ---');
        process.exit(0);
    } catch (error) {
        console.error('SYNCHRONIZATION ERROR:', error);
        process.exit(1);
    }
};

sync();
