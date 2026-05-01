/**
 * Panel Access Control Middleware
 * 
 * This middleware checks if the authenticated user has access to a specific panel.
 * It should be used after authMiddleware to ensure req.user is populated.
 * 
 * Usage:
 * router.post('/create', authMiddleware, checkPanelAccess('staff'), controller.create);
 * 
 * Panels available:
 * - 'school': School/Branch management
 * - 'staff': Staff management
 * - 'fee': Fee management
 * - 'warden': Hostel/Warden management
 * - 'library': Library management
 * - 'transport': Transport/Vehicle management
 * - 'teacher': Teacher management
 * - 'parent': Parent portal
 * - 'student': Student portal
 */

const checkPanelAccess = (requiredPanel) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ 
          message: 'User not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
      }

      // Check if allowedPanels exists and is an array
      if (!req.user.allowedPanels || !Array.isArray(req.user.allowedPanels)) {
        console.log('DEBUG: allowedPanels issue', {
          hasAllowedPanels: !!req.user.allowedPanels,
          isArray: Array.isArray(req.user.allowedPanels),
          allowedPanels: req.user.allowedPanels,
          userRole: req.user.role
        });
        return res.status(403).json({ 
          message: 'No panels assigned to this user',
          code: 'NO_PANELS_ASSIGNED',
          userRole: req.user.role,
          allowedPanels: req.user.allowedPanels
        });
      }

      // Check if required panel is in allowedPanels
      if (!req.user.allowedPanels.includes(requiredPanel)) {
        console.log('DEBUG: panel not in allowedPanels', {
          requiredPanel,
          allowedPanels: req.user.allowedPanels,
          userRole: req.user.role
        });
        return res.status(403).json({ 
          message: `Access denied. This action requires '${requiredPanel}' panel access.`,
          code: 'PANEL_ACCESS_DENIED',
          requiredPanel: requiredPanel,
          allowedPanels: req.user.allowedPanels,
          userRole: req.user.role
        });
      }

      // Panel access granted, continue to next middleware/controller
      next();
    } catch (error) {
      return res.status(500).json({ 
        message: 'Server error in panel access check',
        error: error.message,
        code: 'PANEL_CHECK_ERROR'
      });
    }
  };
};

module.exports = checkPanelAccess;
