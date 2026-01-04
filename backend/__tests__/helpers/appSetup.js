import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import errorHandler from '../../src/middleware/errorHandler.js';

/**
 * Creates a test Express app with routes for testing
 * This avoids starting the full server with database connection
 */
export const createTestApp = (routes = {}) => {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Mock socket.io
  app.set('io', {
    to: () => ({ emit: () => {} }),
    emit: () => {},
  });

  // Mount routes
  Object.entries(routes).forEach(([path, router]) => {
    app.use(path, router);
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'Test API is running',
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
    });
  });

  // Error handler
  app.use(errorHandler);

  return app;
};

/**
 * Creates a fully configured test app with all routes
 */
export const createFullTestApp = async () => {
  const { default: authRoutes } = await import('../../src/routes/auth.js');
  const { default: employeeRoutes } = await import('../../src/routes/employees.js');
  const { default: branchRoutes } = await import('../../src/routes/branches.js');
  const { default: departmentRoutes } = await import('../../src/routes/departments.js');
  const { default: attendanceRoutes } = await import('../../src/routes/attendance.js');

  return createTestApp({
    '/api/auth': authRoutes,
    '/api/employees': employeeRoutes,
    '/api/branches': branchRoutes,
    '/api/departments': departmentRoutes,
    '/api/attendance': attendanceRoutes,
  });
};
