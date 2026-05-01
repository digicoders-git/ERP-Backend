/**
 * Multiple Panel Access Control Middleware
 * 
 * This middleware checks if the authenticated user has access to ANY of the specified panels.
 * Useful when an endpoint can be accessed by multiple panel types.
 * 
 * Usage:
 * router.get('/reports', authMiddleware, checkMultiplePanelAccess(['staff', 'teacher']), controller.getReports);
 * 
 * This allows both staff and teacher admins to access the reports endpoint.
 */

const checkMultiplePanelAccess = (requiredPanels) => {
  return (req, res, next) => {
    try {
      // Validate input
      if (!Array.isArray(requiredPanels) || requiredPanels.length === 0) {
        return res.status(500).json({ 
          message: 'Invalid panel configuration',
          code: 'INVALID_PANEL_CONFIG'
        });
      }

      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ 
          message: 'User not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
      }

      // Check if allowedPanels exists and is an array
      if (!req.user.allowedPanels || !Array.isArray(req.user.allowedPanels)) {
        return res.status(403).json({ 
          message: 'No panels assigned to this user',
          code: 'NO_PANELS_ASSIGNED',
          userRole: req.user.role
        });
      }

      // Check if user has at least one of the required panels
      const hasAccess = requiredPanels.some(panel => 
        req.user.allowedPanels.includes(panel)
      );

      if (!hasAccess) {
        return res.status(403).json({ 
          message: `Access denied. This action requires one of the following panels: ${requiredPanels.join(', ')}`,
          code: 'MULTIPLE_PANEL_ACCESS_DENIED',
          requiredPanels: requiredPanels,
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

module.exports = checkMultiplePanelAccess;
