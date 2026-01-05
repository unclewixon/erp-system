import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import {
  authRoutes,
  tenantRoutes,
  branchRoutes,
  departmentRoutes,
  designationRoutes,
  employeeRoutes,
  attendanceRoutes,
  leaveRoutes,
  shiftRoutes,
  payrollRoutes,
  recruitmentRoutes,
  performanceRoutes,
  trainingRoutes,
  onboardingRoutes,
  queryRoutes,
  benefitRoutes,
  loanRoutes,
  workflowRoutes,
  taskRoutes,
  reimbursementRoutes,
  expenseRoutes,
  billRoutes,
  walletRoutes,
  invoiceRoutes,
  bookkeepingRoutes,
  procurementRoutes,
  inventoryRoutes,
  assetRoutes,
  communicationRoutes,
  eventRoutes,
  workflowEngineRoutes,
  approvalRoutes,
  taskManagementRoutes,
  administrationRoutes,
  adminRoutes,
  planRoutes,
  liveChatRoutes,
  websiteContentRoutes,
  paymentRoutes,
  dutyRosterRoutes,
  emailSettingsRoutes,
  globalSettingsRoutes,
} from './routes/index.js';

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Trust proxy for nginx reverse proxy (fixes rate limiter X-Forwarded-For issue)
app.set('trust proxy', 1);

const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible in routes
app.set('io', io);

// Security middleware
app.use(helmet());

// Rate limiting - generous limits for SPA usage
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Allow 1000 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/designations', designationRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/benefits', benefitRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reimbursements', reimbursementRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/bookkeeping', bookkeepingRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/workflow-engine', workflowEngineRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/task-management', taskManagementRoutes);
app.use('/api/administration', administrationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/live-chat', liveChatRoutes);
app.use('/api/website-content', websiteContentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/duty-roster', dutyRosterRoutes);
app.use('/api/email-settings', emailSettingsRoutes);
app.use('/api/global-settings', globalSettingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'ERP API is running',
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

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join tenant room
  socket.on('join-tenant', (tenantId) => {
    socket.join(`tenant-${tenantId}`);
    console.log(`Socket ${socket.id} joined tenant-${tenantId}`);
  });

  // Leave tenant room
  socket.on('leave-tenant', (tenantId) => {
    socket.leave(`tenant-${tenantId}`);
    console.log(`Socket ${socket.id} left tenant-${tenantId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

export default app;
