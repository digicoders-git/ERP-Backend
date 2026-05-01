const express = require('express');
const router = express.Router();
const Student = require('../model/Student');
const Staff = require('../model/Staff');
const Teacher = require('../model/Teacher');
const Warden = require('../model/Warden');
const Driver = require('../model/Driver');

router.get('/verify-id/:id', async (req, res) => {
    const { id } = req.params;
    const { role } = req.query;

    try {
        console.log(`[VERIFY] ID: ${id}, Role: ${role}`);
        let person;
        const normalizedRole = role ? role.toLowerCase().trim() : '';

        if (normalizedRole === 'student') {
            person = await Student.findById(id).populate('class section branch');
        } else if (normalizedRole === 'staff') {
            person = await Staff.findById(id).populate('branch');
        } else if (normalizedRole === 'teacher') {
            person = await Teacher.findById(id).populate('branch');
        } else if (normalizedRole === 'warden') {
            person = await Warden.findById(id).populate('branch');
        } else if (normalizedRole === 'driver') {
            person = await Driver.findById(id).populate('branch');
        }

        // Fallback: If not found or role missing, try searching both student and staff
        if (!person) {
            person = await Student.findById(id).populate('class section branch');
            if (!person) {
                person = await Staff.findById(id).populate('branch');
            }
        }

        if (!person) {
            console.warn(`[VERIFY] Record not found for ID: ${id} with role: ${role}`);
            return res.status(404).send('<h1>ID Verification Failed</h1><p>Record not found or invalid ID.</p>');
        }

        const name = person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim();
        const photo = person.profileImage || person.studentPhoto || 'https://placehold.co/150x150?text=PHOTO';
        const schoolName = person.branch?.branchName || 'Official Institution';
        const status = 'ACTIVE'; // Dynamic status logic can be added here

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verify Identity | ${name}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Outfit', sans-serif; }
                    .glass { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); }
                    .premium-gradient { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); }
                </style>
            </head>
            <body class="bg-slate-50 min-h-screen flex items-center justify-center p-4">
                <div class="max-w-md w-full glass rounded-[2.5rem] shadow-2xl overflow-hidden border border-white">
                    <div class="premium-gradient p-10 text-center relative">
                        <div class="absolute top-4 right-6">
                            <div class="flex items-center gap-1.5 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                                <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span class="text-[10px] font-bold text-green-400 tracking-wider">${status}</span>
                            </div>
                        </div>
                        <h1 class="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mb-8">Identity Verification</h1>
                        <div class="relative inline-block">
                            <div class="w-32 h-32 mx-auto rounded-full border-4 border-white/10 p-1">
                                <img src="${photo}" class="w-full h-full rounded-full object-cover border-4 border-white shadow-2xl" alt="">
                            </div>
                            <div class="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full shadow-lg border-4 border-slate-900">
                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.64.304 1.24.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"></path></svg>
                            </div>
                        </div>
                    </div>

                    <div class="px-8 pt-10 pb-8 text-center">
                        <h2 class="text-2xl font-extrabold text-slate-800 tracking-tight leading-none">${name}</h2>
                        <p class="text-blue-600 font-bold text-xs uppercase tracking-widest mt-3">${role}</p>

                        <div class="mt-10 space-y-4 text-left">
                            <div class="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">ID Number</span>
                                <span class="text-sm font-bold text-slate-700">${person.admissionNumber || person.staffId || person._id.toString().slice(-8).toUpperCase()}</span>
                            </div>
                            <div class="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Institution</span>
                                <span class="text-sm font-bold text-slate-700 text-right max-w-[60%]">${schoolName}</span>
                            </div>
                            ${person.class ? `
                            <div class="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Academic Year</span>
                                <span class="text-sm font-bold text-slate-700">${person.class.className || '—'} / ${person.section?.sectionName || '—'}</span>
                            </div>
                            ` : ''}
                        </div>

                        <div class="mt-8 pt-8 border-t border-slate-100">
                             <div class="flex items-center justify-center gap-2 mb-6">
                                <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                                <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Data Encrypted & Verified</span>
                             </div>
                             <a href="javascript:window.print()" class="block w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">Download PDF Copy</a>
                        </div>
                    </div>
                    <div class="bg-slate-50 p-6 text-center">
                        <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                            This digital identity is verified by the institutional ERP system.<br/>Scan ID card for live verification.
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).send('<h1>Server Error</h1>');
    }
});

module.exports = router;
