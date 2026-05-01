const ExcelJS = require('exceljs');
const mongoose = require('mongoose');

// Helper to get Models safely
const getMarksModel = () => mongoose.models.Marks || require('../model/Marks');
const getStudentModel = () => mongoose.models.Student || require('../model/Student');
const getExamScheduleModel = () => mongoose.models.ExamSchedule || require('../model/ExamSchedule');
const getExamTypeModel = () => mongoose.models.ExamType || require('../model/ExamType');
const getClassModel = () => mongoose.models.Class || require('../model/Class');

// Generate Excel Template for Bulk Marks Entry
exports.generateExcelTemplate = async (req, res) => {
    try {
        const Student = getStudentModel();
        const ExamSchedule = getExamScheduleModel();
        const ExamType = getExamTypeModel();
        const Class = getClassModel();

        const { branchId, classId, examTypeId } = req.query;

        if (!branchId || !classId || !examTypeId) {
            return res.status(400).json({ message: 'branchId, classId, and examTypeId are required' });
        }

        const [classData, examType, students, schedules] = await Promise.all([
            Class.findById(classId),
            ExamType.findById(examTypeId),
            Student.find({ branch: branchId, class: classId, status: 'active' }).sort({ admissionNumber: 1 }),
            ExamSchedule.find({ branch: branchId, class: classId, examTypeId: examTypeId })
        ]);

        if (!classData || !examType) {
            return res.status(404).json({ message: 'Class or Exam Type not found' });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Marks Entry');

        const columns = [
            { header: 'Student ID', key: 'studentId', width: 20 }, // This will be hidden
            { header: 'Admission No', key: 'admissionNo', width: 15 },
            { header: 'Student Name', key: 'studentName', width: 25 },
        ];

        schedules.forEach(schedule => {
            columns.push({ 
                header: `${schedule.subject} (Max: ${schedule.totalMarks})`, 
                key: `subject_${schedule._id}`, 
                width: 20 
            });
        });

        worksheet.columns = columns;
        worksheet.getColumn(1).hidden = true;

        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

        students.forEach(stu => {
            const rowData = {
                studentId: stu._id.toString(),
                admissionNo: stu.admissionNumber || stu.admissionNo || 'N/A',
                studentName: `${stu.firstName} ${stu.lastName}`
            };
            schedules.forEach(s => { rowData[`subject_${s._id}`] = ''; });
            worksheet.addRow(rowData);
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Marks_Entry_${classData.className}_${examType.examTypeName}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Template Gen Error:', error);
        res.status(500).json({ message: 'Failed to generate template', error: error.message });
    }
};

// Preview Uploaded Excel
exports.importExcelPreview = async (req, res) => {
    try {
        const ExamSchedule = getExamScheduleModel();
        if (!req.file) {
            return res.status(400).json({ message: 'Excel file is required' });
        }

        const { branchId, classId, examTypeId } = req.body;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.getWorksheet(1);

        const schedules = await ExamSchedule.find({ branch: branchId, class: classId, examTypeId: examTypeId });
        const previewData = [];

        const headerRow = worksheet.getRow(1);
        const subjectColMap = {}; 

        headerRow.eachCell((cell, colNumber) => {
            const header = cell.value?.toString() || '';
            const matchingSched = schedules.find(s => header.startsWith(s.subject));
            if (matchingSched) {
                subjectColMap[colNumber] = matchingSched;
            }
        });

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; 

            const studentId = row.getCell(1).value?.toString();
            const studentName = row.getCell(3).value?.toString();
            
            if (!studentId) return;

            const studentResult = {
                studentId,
                studentName,
                marks: [],
                totalMarks: 0,
                obtainedMarks: 0,
                hasError: false,
                errorMessage: ''
            };

            Object.entries(subjectColMap).forEach(([colIndex, schedule]) => {
                const markValue = row.getCell(parseInt(colIndex)).value;
                const mark = Number(markValue);

                if (isNaN(mark) && markValue !== null && markValue !== '') {
                    studentResult.hasError = true;
                    studentResult.errorMessage = `Invalid marks for ${schedule.subject}`;
                } else if (mark > schedule.totalMarks) {
                    studentResult.hasError = true;
                    studentResult.errorMessage = `${schedule.subject} marks exceed maximum (${schedule.totalMarks})`;
                }

                studentResult.marks.push({
                    scheduleId: schedule._id,
                    subject: schedule.subject,
                    obtained: mark || 0,
                    max: schedule.totalMarks
                });

                studentResult.obtainedMarks += (mark || 0);
                studentResult.totalMarks += schedule.totalMarks;
            });

            studentResult.percentage = ((studentResult.obtainedMarks / studentResult.totalMarks) * 100).toFixed(2);
            previewData.push(studentResult);
        });

        res.status(200).json({
            success: true,
            data: previewData,
            summary: {
                totalStudents: previewData.length,
                errorCount: previewData.filter(d => d.hasError).length
            }
        });

    } catch (error) {
        console.error('Preview Error:', error);
        res.status(500).json({ message: 'Failed to parse Excel', error: error.message });
    }
};

// Finalize and Save Bulk Results
exports.finalizeBulkResult = async (req, res) => {
    try {
        const Marks = getMarksModel();
        const { results, branchId, classId, examTypeId } = req.body;
        const userId = req.userId;

        if (!results || !Array.isArray(results)) {
            return res.status(400).json({ message: 'Invalid results data' });
        }

        const admin = await mongoose.model('Admin').findById(userId);
        const staff = !admin ? await mongoose.model('Staff').findById(userId) : null;
        const client = admin ? admin.client : (staff ? staff.client : null);

        if (!client) {
            return res.status(403).json({ message: 'Client information not found' });
        }

        // Loop and save marks
        for (const studentData of results) {
            for (const m of studentData.marks) {
                await Marks.findOneAndUpdate(
                    { examSchedule: m.scheduleId, student: studentData.studentId },
                    {
                        examSchedule: m.scheduleId,
                        student: studentData.studentId,
                        subject: m.subject,
                        marksObtained: m.obtained,
                        theoryMarksObtained: m.obtained,
                        totalMarks: m.max,
                        branch: branchId,
                        client: client,
                        enteredBy: userId,
                        status: 'draft',
                        isLocked: true
                    },
                    { upsert: true, new: true }
                );
            }
        }

        res.status(200).json({
            success: true,
            message: `Results finalized for ${results.length} students`
        });

    } catch (error) {
        console.error('Finalize Error:', error);
        res.status(500).json({ message: 'Failed to finalize results', error: error.message });
    }
};

// Publish Results
exports.publishResults = async (req, res) => {
    try {
        const Marks = getMarksModel();
        const ExamSchedule = getExamScheduleModel();
        const { classId, examTypeId, branchId } = req.body;

        const schedules = await ExamSchedule.find({ branch: branchId, class: classId, examTypeId: examTypeId });
        const scheduleIds = schedules.map(s => s._id);

        await Marks.updateMany(
            { examSchedule: { $in: scheduleIds } },
            { status: 'published' }
        );

        res.status(200).json({
            success: true,
            message: 'Results published successfully'
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to publish', error: error.message });
    }
};

// Export Consolidated Class Results to Excel
exports.exportClassResults = async (req, res) => {
    try {
        const Student = getStudentModel();
        const ExamSchedule = getExamScheduleModel();
        const ExamType = getExamTypeModel();
        const Class = getClassModel();
        const Marks = getMarksModel();

        const { branchId, classId, examTypeId } = req.query;

        const [classData, examType, students, schedules, marks] = await Promise.all([
            Class.findById(classId),
            ExamType.findById(examTypeId),
            Student.find({ branch: branchId, class: classId, status: 'active' }).sort({ admissionNumber: 1 }),
            ExamSchedule.find({ branch: branchId, class: classId, examTypeId: examTypeId }),
            Marks.find({ branch: branchId, examSchedule: { $in: (await ExamSchedule.find({ examTypeId, class: classId })).map(s => s._id) } }).lean()
        ]);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Class Results');

        // Define Columns
        const columns = [
            { header: 'Admission No', key: 'admissionNo', width: 15 },
            { header: 'Student Name', key: 'studentName', width: 25 },
        ];

        schedules.forEach(s => {
            columns.push({ header: `${s.subject}`, key: `sub_${s._id}`, width: 15 });
        });

        columns.push({ header: 'Total Obtained', key: 'totalObtained', width: 15 });
        columns.push({ header: 'Grand Total', key: 'totalMax', width: 15 });
        columns.push({ header: 'Percentage (%)', key: 'percentage', width: 15 });

        worksheet.columns = columns;

        // Styling
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        worksheet.getRow(1).alignment = { horizontal: 'center' };

        // Add Rows
        students.forEach(stu => {
            const studentMarks = marks.filter(m => m.student.toString() === stu._id.toString());
            const rowData = {
                admissionNo: stu.admissionNumber || 'N/A',
                studentName: `${stu.firstName} ${stu.lastName}`,
            };

            let totalObtained = 0;
            let totalMax = 0;

            schedules.forEach(s => {
                const markRecord = studentMarks.find(m => m.examSchedule.toString() === s._id.toString());
                const mObt = markRecord ? markRecord.marksObtained : 0;
                rowData[`sub_${s._id}`] = mObt;
                totalObtained += mObt;
                totalMax += s.totalMarks;
            });

            rowData.totalObtained = totalObtained;
            rowData.totalMax = totalMax;
            rowData.percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0;

            worksheet.addRow(rowData);
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Results_${classData.className}_${examType.examTypeName}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Error:', error);
        res.status(500).json({ message: 'Failed to export results', error: error.message });
    }
};
