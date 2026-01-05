import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ROLES } from '../config/constants.js';

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id)
      .populate('tenant', 'name slug subscription isActive')
      .populate('employee', 'employeeId firstName lastName department branch designation');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated',
      });
    }

    // Check if tenant is active (for non-super admins)
    if (user.role !== ROLES.SUPER_ADMIN && user.tenant && !user.tenant.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Organization subscription is inactive',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }
};

// Role-based access control
export const authorize = (...roles) => {
  return (req, res, next) => {
    // Super Admin has access to all routes
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

// Check if user has access to a specific module
export const requireModule = (module) => {
  return (req, res, next) => {
    // Super admin has access to everything
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    // Check if tenant has the module in their subscription
    if (!req.user.tenant?.subscription?.modules?.includes(module)) {
      return res.status(403).json({
        success: false,
        message: `Your subscription does not include the ${module} module`,
      });
    }
    next();
  };
};

// Ensure user belongs to the tenant they're trying to access
export const tenantGuard = async (req, res, next) => {
  try {
    // Super admin can access any tenant
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    // Get tenant ID from request (params, body, or query)
    const requestedTenantId = req.params.tenantId || req.body.tenant || req.query.tenant;

    // If no tenant specified, use user's tenant
    if (!requestedTenantId) {
      req.tenantId = req.user.tenant?._id;
      return next();
    }

    // Check if user belongs to the requested tenant
    if (req.user.tenant?._id?.toString() !== requestedTenantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this organization',
      });
    }

    req.tenantId = req.user.tenant._id;
    next();
  } catch (error) {
    console.error('Tenant guard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};
