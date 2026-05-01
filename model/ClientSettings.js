const mongoose = require('mongoose');

const clientSettingsSchema = new mongoose.Schema({
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },

  // 1. BRANDING SETTINGS
  branding: {
    logo: String,
    schoolName: String,
    address: String,
    phone: String,
    email: String,
    website: String,
    primaryColor: { type: String, default: '#2563eb' },
    secondaryColor: { type: String, default: '#1e40af' },
    accentColor: { type: String, default: '#3b82f6' },
    fontFamily: { type: String, default: 'Inter' }
  },

  // 2. STAFF CONFIGURATION
  staff: {
    idFormat: { type: String, default: 'ST-YYYY-0001' },
    displayFields: {
      type: [String],
      default: ['name', 'email', 'phone', 'qualification', 'experience', 'salary']
    },
    customFields: [{
      fieldName: String,
      fieldType: { type: String, enum: ['text', 'number', 'date', 'select', 'textarea'] },
      required: { type: Boolean, default: false },
      order: Number
    }],
    idCardFields: {
      type: [String],
      default: ['name', 'id', 'photo', 'designation']
    }
  },

  // 3. TEACHER CONFIGURATION
  teacher: {
    idFormat: { type: String, default: 'TCH-YYYY-0001' },
    displayFields: {
      type: [String],
      default: ['name', 'email', 'phone', 'qualification', 'subject', 'experience']
    },
    customFields: [{
      fieldName: String,
      fieldType: { type: String, enum: ['text', 'number', 'date', 'select', 'textarea'] },
      required: { type: Boolean, default: false },
      order: Number
    }],
    idCardFields: {
      type: [String],
      default: ['name', 'id', 'photo', 'subject']
    }
  },

  // 4. STUDENT CONFIGURATION
  student: {
    idFormat: { type: String, default: 'STU-YYYY-0001' },
    rollNumberFormat: { type: String, default: 'CLASS-SECTION-0001' },
    displayFields: {
      type: [String],
      default: ['name', 'email', 'phone', 'fatherName', 'motherName', 'dob', 'gender', 'address']
    },
    customFields: [{
      fieldName: String,
      fieldType: { type: String, enum: ['text', 'number', 'date', 'select', 'textarea'] },
      required: { type: Boolean, default: false },
      order: Number
    }],
    idCardFields: {
      type: [String],
      default: ['name', 'id', 'photo', 'rollNumber', 'class']
    }
  },

  // 5. ATTENDANCE SETTINGS
  attendance: {
    method: {
      type: String,
      enum: ['manual', 'biometric', 'mobile-app'],
      default: 'manual'
    },
    autoMarkRules: {
      markAbsentAfter: { type: String, default: '09:00' },
      markHalfDayAfter: { type: String, default: '11:00' },
      markAbsentFinalAfter: { type: String, default: '12:00' }
    },
    latePolicy: {
      lateAfter: { type: String, default: '09:15' },
      halfDayAfter: { type: String, default: '11:00' },
      absentAfter: { type: String, default: '12:00' }
    }
  },

  // 6. ADMISSION SETTINGS
  admission: {
    requiredDocuments: [String],
    optionalDocuments: [String],
    customFields: [{
      fieldName: String,
      fieldType: { type: String, enum: ['text', 'number', 'date', 'select', 'textarea'] },
      required: { type: Boolean, default: false },
      order: Number
    }],
    approvalWorkflow: {
      type: String,
      enum: ['auto-approve', 'manual', 'multi-level'],
      default: 'manual'
    }
  },

  // 7. ID CARD DESIGN
  idCard: {
    htmlContent: { type: String, default: '' },
    student: {
      template: { type: String, default: 'student' },
      cardLayout: { type: String, default: 'vertical' },
      fields: [{
        id: { type: String, default: '' },
        label: { type: String, default: '' },
        visible: { type: Boolean, default: true },
        position: { type: Number, default: 0 },
        fontSize: { type: Number, default: 11 },
        bold: { type: Boolean, default: false },
        color: { type: String, default: '#1e3a8a' },
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        width: { type: Number, default: 100 },
        height: { type: Number, default: 20 },
        section: { type: String, default: 'body' },
        format: { type: String, default: '' }
      }],
      design: {
        cardWidth: { type: Number, default: 350 },
        cardHeight: { type: Number, default: 550 },
        backgroundColor: { type: String, default: '#ffffff' },
        headerColor: { type: String, default: '#1e40af' },
        accentColor: { type: String, default: '#2563eb' },
        textColor: { type: String, default: '#1f2937' },
        borderColor: { type: String, default: '#1e40af' },
        borderWidth: { type: Number, default: 3 },
        borderRadius: { type: Number, default: 12 },
        logoSize: { type: Number, default: 50 },
        photoSize: { type: Number, default: 120 },
        headerHeight: { type: Number, default: 80 }
      },
      printSettings: {
        paperSize: { type: String, default: 'A4' },
        orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
        margins: { type: Number, default: 10 },
        cardsPerPage: { type: Number, default: 4 }
      }
    },
    staff: {
      template: { type: String, default: 'staff' },
      cardLayout: { type: String, default: 'vertical' },
      fields: [{
        id: { type: String, default: '' },
        label: { type: String, default: '' },
        visible: { type: Boolean, default: true },
        position: { type: Number, default: 0 },
        fontSize: { type: Number, default: 11 },
        bold: { type: Boolean, default: false },
        color: { type: String, default: '#059669' },
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        width: { type: Number, default: 100 },
        height: { type: Number, default: 20 },
        section: { type: String, default: 'body' },
        format: { type: String, default: '' }
      }],
      design: {
        cardWidth: { type: Number, default: 350 },
        cardHeight: { type: Number, default: 550 },
        backgroundColor: { type: String, default: '#ffffff' },
        headerColor: { type: String, default: '#059669' },
        accentColor: { type: String, default: '#10b981' },
        textColor: { type: String, default: '#1f2937' },
        borderColor: { type: String, default: '#059669' },
        borderWidth: { type: Number, default: 3 },
        borderRadius: { type: Number, default: 12 },
        logoSize: { type: Number, default: 50 },
        photoSize: { type: Number, default: 120 },
        headerHeight: { type: Number, default: 80 }
      },
      printSettings: {
        paperSize: { type: String, default: 'A4' },
        orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
        margins: { type: Number, default: 10 },
        cardsPerPage: { type: Number, default: 4 }
      }
    },
    teacher: {
      template: { type: String, default: 'teacher' },
      cardLayout: { type: String, default: 'vertical' },
      fields: [{
        id: { type: String, default: '' },
        label: { type: String, default: '' },
        visible: { type: Boolean, default: true },
        position: { type: Number, default: 0 },
        fontSize: { type: Number, default: 11 },
        bold: { type: Boolean, default: false },
        color: { type: String, default: '#7c3aed' },
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        width: { type: Number, default: 100 },
        height: { type: Number, default: 20 },
        section: { type: String, default: 'body' },
        format: { type: String, default: '' }
      }],
      design: {
        cardWidth: { type: Number, default: 350 },
        cardHeight: { type: Number, default: 550 },
        backgroundColor: { type: String, default: '#ffffff' },
        headerColor: { type: String, default: '#7c3aed' },
        accentColor: { type: String, default: '#a855f7' },
        textColor: { type: String, default: '#1f2937' },
        borderColor: { type: String, default: '#7c3aed' },
        borderWidth: { type: Number, default: 3 },
        borderRadius: { type: Number, default: 12 },
        logoSize: { type: Number, default: 50 },
        photoSize: { type: Number, default: 120 },
        headerHeight: { type: Number, default: 80 }
      },
      printSettings: {
        paperSize: { type: String, default: 'A4' },
        orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
        margins: { type: Number, default: 10 },
        cardsPerPage: { type: Number, default: 4 }
      }
    },
    driver: {
      template: { type: String, default: 'driver' },
      cardLayout: { type: String, default: 'vertical' },
      fields: [{
        id: { type: String, default: '' },
        label: { type: String, default: '' },
        visible: { type: Boolean, default: true },
        position: { type: Number, default: 0 },
        fontSize: { type: Number, default: 11 },
        bold: { type: Boolean, default: false },
        color: { type: String, default: '#dc2626' },
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        width: { type: Number, default: 100 },
        height: { type: Number, default: 20 },
        section: { type: String, default: 'body' },
        format: { type: String, default: '' }
      }],
      design: {
        cardWidth: { type: Number, default: 350 },
        cardHeight: { type: Number, default: 550 },
        backgroundColor: { type: String, default: '#ffffff' },
        headerColor: { type: String, default: '#dc2626' },
        accentColor: { type: String, default: '#ef4444' },
        textColor: { type: String, default: '#1f2937' },
        borderColor: { type: String, default: '#dc2626' },
        borderWidth: { type: Number, default: 3 },
        borderRadius: { type: Number, default: 12 },
        logoSize: { type: Number, default: 50 },
        photoSize: { type: Number, default: 120 },
        headerHeight: { type: Number, default: 80 }
      },
      printSettings: {
        paperSize: { type: String, default: 'A4' },
        orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
        margins: { type: Number, default: 10 },
        cardsPerPage: { type: Number, default: 4 }
      }
    },
    warden: {
      template: { type: String, default: 'warden' },
      cardLayout: { type: String, default: 'vertical' },
      fields: [{
        id: { type: String, default: '' },
        label: { type: String, default: '' },
        visible: { type: Boolean, default: true },
        position: { type: Number, default: 0 },
        fontSize: { type: Number, default: 11 },
        bold: { type: Boolean, default: false },
        color: { type: String, default: '#0891b2' },
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        width: { type: Number, default: 100 },
        height: { type: Number, default: 20 },
        section: { type: String, default: 'body' },
        format: { type: String, default: '' }
      }],
      design: {
        cardWidth: { type: Number, default: 350 },
        cardHeight: { type: Number, default: 550 },
        backgroundColor: { type: String, default: '#ffffff' },
        headerColor: { type: String, default: '#0891b2' },
        accentColor: { type: String, default: '#06b6d4' },
        textColor: { type: String, default: '#1f2937' },
        borderColor: { type: String, default: '#0891b2' },
        borderWidth: { type: Number, default: 3 },
        borderRadius: { type: Number, default: 12 },
        logoSize: { type: Number, default: 50 },
        photoSize: { type: Number, default: 120 },
        headerHeight: { type: Number, default: 80 }
      },
      printSettings: {
        paperSize: { type: String, default: 'A4' },
        orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
        margins: { type: Number, default: 10 },
        cardsPerPage: { type: Number, default: 4 }
      }
    }
  },

  // 8. FEE SLIP DESIGN
  feeSlip: {
    template: {
      type: String,
      enum: ['standard', 'detailed', 'custom'],
      default: 'standard'
    },
    backgroundImage: { type: String, default: '' },
    cardWidth: { type: Number, default: 800 },
    cardHeight: { type: Number, default: 400 },
    fields: [{
      id: { type: String, default: '' },
      label: { type: String, default: '' },
      visible: { type: Boolean, default: true },
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      fontSize: { type: Number, default: 14 },
      bold: { type: Boolean, default: false },
      color: { type: String, default: '#000000' },
      width: { type: Number, default: 200 },
      height: { type: Number, default: 25 },
      format: { type: String, default: '' }
    }],
    header: {
      showLogo: { type: Boolean, default: true },
      showSchoolName: { type: Boolean, default: true },
      showAddress: { type: Boolean, default: true },
      customText: String
    },
    content: {
      showStudentInfo: { type: Boolean, default: true },
      showFeeHeads: { type: Boolean, default: true },
      showDiscount: { type: Boolean, default: true },
      showPaymentStatus: { type: Boolean, default: true }
    },
    footer: {
      customText: String,
      showSignatureLine: { type: Boolean, default: true },
      showDate: { type: Boolean, default: true }
    }
  },

  // 9. MARKSHEET DESIGN
  marksheet: {
    examTypes: [{
      _id: mongoose.Schema.Types.ObjectId,
      name: { type: String, required: true },
      code: { type: String, required: true },
      description: String,
      template: String,
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now }
    }],
    examType: {
      type: String,
      enum: ['board', 'internal', 'semester'],
      default: 'internal'
    },
    template: {
      type: String,
      enum: ['standard', 'detailed', 'custom'],
      default: 'standard'
    },
    templates: {
      board: String,
      internal: String,
      semester: String
    },
    gradingSystem: {
      type: String,
      enum: ['percentage', 'point', 'custom'],
      default: 'percentage'
    },
    signatureFields: {
      type: [String],
      default: ['teacher', 'principal']
    }
  },

  // 10. TRANSPORT SETTINGS
  transport: {
    trackingMethod: {
      type: String,
      enum: ['gps', 'driver-app', 'manual'],
      default: 'manual'
    },
    alertSettings: {
      delayAlert: { type: Number, default: 15 },
      breakdownAlert: { type: Boolean, default: true },
      customAlerts: [String]
    },
    routeCustomization: {
      allowCustomRoutes: { type: Boolean, default: true },
      allowCustomStops: { type: Boolean, default: true },
      allowCustomTimings: { type: Boolean, default: true }
    }
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Create compound unique index on client + branchId
clientSettingsSchema.index({ client: 1, branchId: 1 }, { unique: true });

module.exports = mongoose.model('ClientSettings', clientSettingsSchema);
