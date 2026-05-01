/**
 * QUICK TESTING GUIDE - VERIFY PANEL FLOW
 * 
 * Test the complete flow from Plan to Sub-Admin
 */

// ============================================================================
// POSTMAN TESTING SEQUENCE
// ============================================================================

/*
COPY-PASTE THESE REQUESTS IN POSTMAN IN ORDER
*/

// TEST 1: Create Plan
// ===================
POST http://localhost:5002/api/plan/create
Content-Type: application/json

{
  "planName": "Premium Plan",
  "planType": "Monthly Fixed Price",
  "monthlyPrice": 5000,
  "panelsIncluded": ["school", "staff", "fee", "teacher", "warden", "library", "transport"],
  "maxBranches": 5
}

EXPECTED: 201 Created
SAVE: planId from response


// TEST 2: Create Client
// =====================
POST http://localhost:5002/api/client/create
Content-Type: application/json

{
  "clientName": "ABC School",
  "email": "school@abc.com",
  "password": "password123",
  "phone": "9876543210",
  "address": "Delhi",
  "planId": "[PASTE planId FROM TEST 1]"
}

EXPECTED: 201 Created
VERIFY: purchasedPanels has all panels
SAVE: clientId from response


// TEST 3: School Admin Login
// ===========================
POST http://localhost:5002/api/admin/login
Content-Type: application/json

{
  "email": "school@abc.com",
  "password": "password123"
}

EXPECTED: 200 OK
VERIFY: allowedPanels = ["school", "staff", "fee", "teacher", "warden", "library", "transport"]
SAVE: token from response


// TEST 4: Create Branch
// =====================
POST http://localhost:5002/api/branch/create
Content-Type: application/json
Authorization: Bearer [PASTE token FROM TEST 3]

{
  "branchName": "Delhi Branch",
  "branchCode": "DEL-001",
  "email": "branch@abc.com",
  "password": "password123",
  "location": "Delhi",
  "address": "Sector 5, Delhi"
}

EXPECTED: 201 Created
SAVE: branchId from response


// TEST 5: Branch Admin Login
// ===========================
POST http://localhost:5002/api/admin/login
Content-Type: application/json

{
  "email": "branch@abc.com",
  "password": "password123"
}

EXPECTED: 200 OK
VERIFY: allowedPanels = ["school", "staff", "fee", "teacher", "warden", "library", "transport"]
SAVE: token from response


// TEST 6: Create Staff (Sub-Admin)
// =================================
POST http://localhost:5002/api/staff/create
Content-Type: application/json
Authorization: Bearer [PASTE token FROM TEST 5]

{
  "name": "John Doe",
  "email": "john@abc.com",
  "password": "password123",
  "mobile": "9876543210",
  "designation": "Staff Manager"
}

EXPECTED: 201 Created
VERIFY: staffAdmin created with role: "staffAdmin"
SAVE: token for next test


// TEST 7: Staff Admin Login
// ==========================
POST http://localhost:5002/api/admin/login
Content-Type: application/json

{
  "email": "john@abc.com",
  "password": "password123"
}

EXPECTED: 200 OK
VERIFY: allowedPanels = ["staff"]  ← ONLY 'staff' PANEL
SAVE: token from response


// TEST 8: Staff Admin - Access Staff Endpoint (Should Work)
// ==========================================================
GET http://localhost:5002/api/staff/all
Content-Type: application/json
Authorization: Bearer [PASTE token FROM TEST 7]

EXPECTED: 200 OK ✅
RESPONSE: { staff: [...] }


// TEST 9: Staff Admin - Access Fee Endpoint (Should Fail)
// ========================================================
GET http://localhost:5002/api/fee/all
Content-Type: application/json
Authorization: Bearer [PASTE token FROM TEST 7]

EXPECTED: 403 Forbidden ❌
RESPONSE: {
  "message": "Access denied. This action requires 'fee' panel access.",
  "code": "PANEL_ACCESS_DENIED",
  "requiredPanel": "fee",
  "allowedPanels": ["staff"],
  "userRole": "staffAdmin"
}


// TEST 10: Create Another Sub-Admin (Fee Admin)
// ==============================================
POST http://localhost:5002/api/staff/create
Content-Type: application/json
Authorization: Bearer [PASTE token FROM TEST 5 (Branch Admin)]

{
  "name": "Jane Smith",
  "email": "jane@abc.com",
  "password": "password123",
  "mobile": "9876543211",
  "designation": "Fee Manager"
}

EXPECTED: 201 Created
SAVE: token for next test


// TEST 11: Fee Admin Login
// =========================
POST http://localhost:5002/api/admin/login
Content-Type: application/json

{
  "email": "jane@abc.com",
  "password": "password123"
}

EXPECTED: 200 OK
VERIFY: allowedPanels = ["staff"]  ← STILL 'staff' PANEL (because created via staff endpoint)
SAVE: token from response


// TEST 12: Fee Admin - Access Fee Endpoint (Should Fail)
// =======================================================
GET http://localhost:5002/api/fee/all
Content-Type: application/json
Authorization: Bearer [PASTE token FROM TEST 11]

EXPECTED: 403 Forbidden ❌
RESPONSE: { message: "Access denied. This action requires 'fee' panel access." }
*/

// ============================================================================
// VERIFICATION CHECKLIST
// ============================================================================

/*
✅ TEST 1: Plan created with all panels
✅ TEST 2: Client created with purchasedPanels from plan
✅ TEST 3: School Admin has all panels
✅ TEST 4: Branch created successfully
✅ TEST 5: Branch Admin has all panels (from plan)
✅ TEST 6: Staff created with staffAdmin role
✅ TEST 7: Staff Admin has only 'staff' panel
✅ TEST 8: Staff Admin can access staff endpoint (200 OK)
✅ TEST 9: Staff Admin cannot access fee endpoint (403 Forbidden)
✅ TEST 10: Another staff created
✅ TEST 11: Fee Admin has 'staff' panel (from staff endpoint)
✅ TEST 12: Fee Admin cannot access fee endpoint (403 Forbidden)

IF ALL TESTS PASS: ✅ PANEL FLOW IS WORKING CORRECTLY!
*/

// ============================================================================
// WHAT WAS FIXED
// ============================================================================

/*
ISSUE:
  Branch Admin getting 403 Forbidden when trying to create staff

ROOT CAUSE:
  branchAdmin.allowedPanels was empty []
  Middleware was checking for 'staff' panel
  Empty array doesn't contain 'staff'
  Result: 403 Forbidden

SOLUTION:
  Updated branchController.js:
    allowedPanels: client.purchasedPanels  ← FROM PLAN

  Updated staffController.js:
    allowedPanels: ['staff']  ← SINGLE PANEL

RESULT:
  ✅ Branch Admin now has all panels from Plan
  ✅ Staff Admin now has 'staff' panel
  ✅ Panel access control working correctly
*/

// ============================================================================
// PANEL ASSIGNMENT LOGIC
// ============================================================================

/*
TIER 0: SUPER ADMIN
  └─ Creates Plan with panelsIncluded

TIER 1: SCHOOL ADMIN (clientAdmin)
  └─ allowedPanels = plan.panelsIncluded

TIER 2: BRANCH ADMIN (branchAdmin)
  └─ allowedPanels = client.purchasedPanels (which = plan.panelsIncluded)

TIER 3: SUB-ADMINS (staffAdmin, teacherAdmin, etc.)
  └─ allowedPanels = [single panel]

KEY INSIGHT:
  Panels flow from Plan → Client → Branch Admin → Sub-Admins
  Each level inherits from the level above
  Sub-Admins get only their specific panel
*/
