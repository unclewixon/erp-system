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
import Settings from './pages/settings/Settings';
import Communications from './pages/communications/Communications';
import Assets from './pages/assets/Assets';
import Tasks from './pages/tasks/Tasks';
import Finance from './pages/finance/Finance';

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

// Public Route wrapper (redirects to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
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

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
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
        <Route path="tenants" element={<Tenants />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
