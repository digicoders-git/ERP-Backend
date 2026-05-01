const Student = require('../../model/Student');
const Staff = require('../../model/Staff');
const Teacher = require('../../model/Teacher');
const Driver = require('../../model/Driver');
const Warden = require('../../model/Warden');
const Librarian = require('../../model/Librarian');
const Class = require('../../model/Class');
const Section = require('../../model/Section');
const Hostel = require('../../model/Hostel');
const ClientSettings = require('../../model/ClientSettings');
const mongoose = require('mongoose');

exports.generateIdCards = async (req, res) => {
    try {
        const { studentIds, staffIds, role = 'student' } = req.body;
        const targetIds = role === 'student' ? studentIds : staffIds;

        if (!targetIds || targetIds.length === 0) {
            return res.status(400).json({ success: false, message: "No IDs provided" });
        }

        const branch = req.user.branch;
        const settings = await ClientSettings.findOne({ branchId: branch }).lean();
        const roleConfig = settings?.idCard?.[role] || {};

        if (!roleConfig.template) {
            console.log(`[IDCard] Layout not found for role: ${role} in branch: ${branch}`);
            return res.status(404).json({ success: false, message: "ID Card layout not configured for this role" });
        }

        const baseUrl = process.env.VITE_API_BASE_URL || `${req.protocol}://${req.get('host')}`;
        let people = [];

        if (role === 'student') {
            people = await Student.find({ _id: { $in: targetIds } }).populate('class section branch').lean();
        } else {
            let TargetModel = Staff;
            let population = 'branch';
            
            if (role === 'teacher') {
                TargetModel = Teacher;
                population = [
                    { path: 'branch' },
                    { path: 'assignedClass', select: 'className' },
                    { path: 'assignedSection', select: 'sectionName' }
                ];
            }
            else if (role === 'driver') TargetModel = Driver;
            else if (role === 'warden') {
                TargetModel = Warden;
                population = [
                    { path: 'branch' },
                    { path: 'assignedHostel', select: 'hostelName' }
                ];
            }
            else if (role === 'librarian') TargetModel = Librarian;

            people = await TargetModel.find({ _id: { $in: targetIds } }).populate(population).lean();

            // Special handling for drivers to get vehicle/route from TransportAssignment
            if (role === 'driver') {
                const TransportAssignment = require('../../model/TransportAssignment');
                for (let i = 0; i < people.length; i++) {
                    const assignment = await TransportAssignment.findOne({ driver: people[i]._id, status: true }).populate('vehicle route').lean();
                    if (assignment) {
                        people[i].vehicle = assignment.vehicle;
                        people[i].route = assignment.route;
                    }
                }
            }
        }

        let allCardsHtml = "";
        const schoolName = settings?.branding?.schoolName || "School Name";
        const schoolLogo = settings?.branding?.logo 
            ? (settings.branding.logo.startsWith('http') ? settings.branding.logo : `${baseUrl}/${settings.branding.logo.replace(/\\/g, '/').startsWith('/') ? settings.branding.logo.replace(/\\/g, '/').slice(1) : settings.branding.logo.replace(/\\/g, '/')}`)
            : (settings?.logo ? (settings.logo.startsWith('http') ? settings.logo : `${baseUrl}/${settings.logo.replace(/\\/g, '/').startsWith('/') ? settings.logo.replace(/\\/g, '/').slice(1) : settings.logo.replace(/\\/g, '/')}`) : 'https://placehold.co/50?text=LOGO');

        const os = require('os');
        const networkInterfaces = os.networkInterfaces();
        let localIp = 'localhost';
        for (const interfaceName in networkInterfaces) {
            for (const iface of networkInterfaces[interfaceName]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    localIp = iface.address;
                    break;
                }
            }
            if (localIp !== 'localhost') break;
        }

        for (const person of people) {
            // Unified Mapping Registry
            const currentHost = req.get('host').includes('localhost') || req.get('host').includes('127.0.0.1') 
                ? `${localIp}:${req.get('host').split(':')[1] || '5002'}`
                : req.get('host');
            
            const verificationUrl = `${req.protocol}://${currentHost}/api/public/verify-id/${person._id}?role=${role}`;
            const idCardNumber = person.admissionNumber || person.staffId || person._id.toString().slice(-8).toUpperCase();

            const mappings = {
                '{{issue_date}}': new Date().toLocaleDateString('en-GB'),
                '{{id_card_number}}': idCardNumber,
                '{{qr_code}}': `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationUrl)}`,
                '{{name}}': person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim() || '—',
                '{{photo}}': person.profileImage || person.studentPhoto || 'https://placehold.co/150x150?text=PHOTO',
                '{{email}}': person.email || '—',
                '{{address}}': person.address || person.permanentAddress?.address || person.currentAddress?.address || person.profile?.address || '—',
                '{{school_name}}': schoolName,
                '{{school_logo}}': schoolLogo,

                // Role Specific
                '{{admission_no}}': person.admissionNumber || '—',
                '{{roll_no}}': person.rollNumber || '—',
                '{{class_section}}': person.class ? `${person.class.className || '—'} / ${person.section?.sectionName || '—'}` : '—',
                '{{id_no}}': person.admissionNumber || person.staffId || person.customId || '—',
                '{{employee_id}}': person.staffId || person.customId || '—',
                '{{designation}}': person.designation || (role === 'teacher' ? 'Teacher' : role.charAt(0).toUpperCase() + role.slice(1)),
                '{{department}}': person.department || '—',
                '{{phone}}': person.mobile || person.phone || '—',
                '{{blood_group}}': person.bloodGroup || '—',
                '{{joining_date}}': person.createdAt ? new Date(person.createdAt).toLocaleDateString('en-GB') : '—',
                '{{father_name}}': person.guardianInfo?.fatherName || person.fatherName || '—',
                '{{mother_name}}': person.guardianInfo?.motherName || person.motherName || '—',
                '{{student_name}}': person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim() || '—',
                '{{student_phone}}': person.mobile || person.phone || '—',
                '{{guardian_contact}}': person.guardianInfo?.guardianPhone || person.guardianInfo?.fatherPhone || person.mobile || '—',
                '{{emergency_contact}}': person.guardianInfo?.emergencyPhone || '—',
                '{{dob}}': person.dob ? new Date(person.dob).toLocaleDateString('en-GB') : '—',

                // Teacher specific
                '{{subject}}': Array.isArray(person.subjects) ? person.subjects.join(', ') : (person.subject || '—'),
                '{{qualification}}': person.qualification || '—',
                '{{experience}}': person.experience ? (typeof person.experience === 'number' ? `${person.experience} Yrs` : person.experience) : '—',
                '{{is_class_teacher}}': person.isClassTeacher ? 'YES' : 'NO',
                '{{assigned_class}}': person.assignedClass?.className || '—',

                // Driver specific
                '{{vehicle_no}}': person.vehicle?.vehicleNumber || '—',
                '{{route_name}}': person.route?.routeName || '—',
                '{{license_no}}': person.licenseNo || '—',

                // Warden specific
                '{{hostel_name}}': person.assignedHostel?.hostelName || '—',
            };

            // Handle role-specific alias mappings
            mappings['{{signature}}'] = 'https://placehold.co/100x40?text=SIGNATURE';
            // mappings['{{qr_code}}'] = idCardNumber; // REMOVED: This was overwriting the QR URL

            if (role === 'student') {
                mappings['{{student_photo}}'] = mappings['{{photo}}'];
            } else {
                mappings['{{staff_name}}'] = mappings['{{name}}'];
                mappings['{{staff_photo}}'] = mappings['{{photo}}'];
                mappings['{{staff_phone}}'] = mappings['{{phone}}'];
                mappings['{{staff_email}}'] = person.email || '—';
                mappings['{{staff_address}}'] = person.address || '—';
            }

            const design = roleConfig.design || { cardWidth: 350, cardHeight: 550 };
            const configuredFields = roleConfig.fields || [];
            
            let cardHtml = `
                <div class="id-card-wrapper" style="
                    width: ${design.cardWidth}px; 
                    height: ${design.cardHeight}px; 
                    position: relative; 
                    background-image: url('${roleConfig.template?.startsWith('http') ? roleConfig.template : (roleConfig.template ? baseUrl + '/' + (roleConfig.template.replace(/\\/g, '/').startsWith('/') ? roleConfig.template.replace(/\\/g, '/').slice(1) : roleConfig.template.replace(/\\/g, '/')) : '')}');
                    background-size: 100% 100%;
                    background-repeat: no-repeat;
                    background-color: ${design.backgroundColor || '#ffffff'};
                    overflow: hidden;
                    box-sizing: border-box;
                    margin: 10px;
                    display: inline-block;
                    vertical-align: top;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    border-radius: 4px;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                ">
            `;

            for (const field of configuredFields) {
                if (field.visible) {
                    const tag = `{{${field.id}}}`;
                    let value = mappings[tag] || '—';
                    
                    const isImage = field.type === 'image' || field.id.includes('photo') || field.id.includes('logo') || field.id.includes('signature') || field.id.includes('qr_code');

                    const commonStyle = `
                        position: absolute !important; 
                        top: ${field.y}px !important; 
                        left: ${field.x}px !important; 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        box-sizing: border-box !important;
                    `;

                    if (isImage) {
                        let imgSrc = value;
                        if (field.id === 'qr_code') {
                            imgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(value)}`;
                        } else if (imgSrc && !imgSrc.startsWith('http')) {
                            const cleanPath = imgSrc.replace(/\\/g, '/').startsWith('/') ? imgSrc.replace(/\\/g, '/').slice(1) : imgSrc.replace(/\\/g, '/');
                            imgSrc = `${baseUrl}/${cleanPath}`;
                        }

                        cardHtml += `
                            <div style="${commonStyle} width: ${field.width}px !important; height: ${field.height}px !important; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                                <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: ${field.id === 'qr_code' ? 'contain' : 'cover'}; pointer-events: none;" />
                            </div>
                        `;
                    } else {
                        cardHtml += `
                            <div style="${commonStyle} 
                                color: ${field.color || '#000000'} !important; 
                                font-size: ${field.fontSize || 14}px !important; 
                                font-weight: ${field.bold ? 'bold' : 'normal'} !important;
                                width: ${field.width || 200}px !important;
                                white-space: normal !important;
                                word-wrap: break-word !important;
                                line-height: 1 !important;
                                font-family: 'Inter', sans-serif !important;
                                display: -webkit-box !important;
                                -webkit-line-clamp: 2 !important;
                                -webkit-box-orient: vertical !important;
                                overflow: hidden !important;
                                text-align: left !important;
                            ">
                                ${value}
                            </div>
                        `;
                    }
                }
            }
            cardHtml += `</div>`;
            allCardsHtml += cardHtml;
        }

        res.status(200).json({ success: true, html: allCardsHtml });
    } catch (err) {
        console.error("ID Card Generation Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
