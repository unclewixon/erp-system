import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/common/LoadingSpinner';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';
import Employees from './pages/employees/Employees';
import Branches from './pages/organization/Branches';
import Departments from './pages/organization/Departments';
import Designations from './pages/organization/Designations';
import Attendance from './pages/attendance/Attendance';
import Leaves from './pages/leaves/Leaves';
import Payroll from './pages/payroll/Payroll';
import Accounting from './pages/accounting/Accounting';
import Inventory from './pages/inventory/Inventory';
import Procurement from './pages/procurement/Procurement';
import Recruitment from './pages/recruitment/Recruitment';
import Performance from './pages/performance/Performance';
import Training from './pages/training/Training';
import Tenants from './pages/admin/Tenants';
import Analytics from './pages/admin/Analytics';
import Plans from './pages/admin/Plans';
import LiveChats from './pages/admin/LiveChats';
import WebsiteContent from './pages/admin/WebsiteContent';
import PaymentSettings from './pages/admin/PaymentSettings';
import EmailSettings from './pages/admin/EmailSettings';
import GlobalSettings from './pages/admin/GlobalSettings';
import Settings from './pages/settings/Settings';
import Communications from './pages/communications/Communications';
import Assets from './pages/assets/Assets';
import Tasks from './pages/tasks/Tasks';
import Finance from './pages/finance/Finance';
import Shifts from './pages/hr/Shifts';
import MySchedule from './pages/hr/MySchedule';
import SwapRequests from './pages/hr/SwapRequests';

// Website Pages
import Home from './pages/website/Home';
import Contact from './pages/website/Contact';

// Payment Pages
import Subscription from './pages/payment/Subscription';
import PaymentCallback from './pages/payment/PaymentCallback';

// Public Pages
import RosterPlanning from './pages/public/RosterPlanning';

import './styles/global.scss';

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Subscription Guard - requires active subscription to access app
const SubscriptionGuard = ({ children }) => {
  const { isAuthenticated, loading, hasActiveSubscription, isSuperAdmin } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Super admins bypass subscription check
  if (isSuperAdmin) {
    return children;
  }

  // Redirect to subscription page if no active subscription
  if (!hasActiveSubscription()) {
    return <Navigate to="/app/subscription" replace />;
  }

  return children;
};

// Public Route wrapper (redirects to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, hasActiveSubscription, isSuperAdmin } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (isAuthenticated) {
    // If super admin or has subscription, go to dashboard
    if (isSuperAdmin || hasActiveSubscription()) {
      return <Navigate to="/app/dashboard" replace />;
    }
    // Otherwise, go to subscription page
    return <Navigate to="/app/subscription" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Landing Page - Single Page Website */}
      <Route path="/" element={<Home />} />

      {/* Redirect old About/Pricing/Contact routes to home page sections */}
      <Route path="/about" element={<Navigate to="/#about" replace />} />
      <Route path="/pricing" element={<Navigate to="/#features" replace />} />
      <Route path="/contact" element={<Contact />} />

      {/* Public Roster Planning Page */}
      <Route path="/roster/:token" element={<RosterPlanning />} />

      {/* Auth Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Subscription Page - accessible without active subscription */}
      <Route
        path="/app/subscription"
        element={
          <ProtectedRoute>
            <Subscription />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes - require subscription */}
      <Route
        path="/app"
        element={
          <SubscriptionGuard>
            <Layout />
          </SubscriptionGuard>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="employees" element={<Employees />} />
        <Route path="branches" element={<Branches />} />
        <Route path="departments" element={<Departments />} />
        <Route path="designations" element={<Designations />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="leaves" element={<Leaves />} />
        <Route path="payroll" element={<Payroll />} />
        <Route path="accounting" element={<Accounting />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="procurement" element={<Procurement />} />
        <Route path="recruitment" element={<Recruitment />} />
        <Route path="performance" element={<Performance />} />
        <Route path="training" element={<Training />} />
        <Route path="communications" element={<Communications />} />
        <Route path="assets" element={<Assets />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="finance" element={<Finance />} />
        <Route path="shifts" element={<Shifts />} />
        <Route path="my-schedule" element={<MySchedule />} />
        <Route path="swap-requests" element={<SwapRequests />} />
        <Route path="tenants" element={<Tenants />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="plans" element={<Plans />} />
        <Route path="live-chats" element={<LiveChats />} />
        <Route path="website-content" element={<WebsiteContent />} />
        <Route path="payment-settings" element={<PaymentSettings />} />
        <Route path="email-settings" element={<EmailSettings />} />
        <Route path="global-settings" element={<GlobalSettings />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Payment Callback Route (Protected but outside layout) */}
      <Route
        path="/payment/callback"
        element={
          <ProtectedRoute>
            <PaymentCallback />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#333',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#10b981',
                },
              },
              error: {
                style: {
                  background: '#ef4444',
                },
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
