import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';

// Mock API module
export const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

export const mockAuthAPI = {
  login: vi.fn(),
  register: vi.fn(),
  getMe: vi.fn(),
  logout: vi.fn(),
  changePassword: vi.fn(),
};

// Custom render function with all providers
export const renderWithProviders = (ui, options = {}) => {
  const Wrapper = ({ children }) => (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

// Custom render without auth provider (for testing auth context itself)
export const renderWithRouter = (ui, options = {}) => {
  const Wrapper = ({ children }) => (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: '123',
  _id: '123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'employee',
  isActive: true,
  isEmailVerified: true,
  ...overrides,
});

export const createMockTenant = (overrides = {}) => ({
  id: '456',
  _id: '456',
  name: 'Test Organization',
  slug: 'test-org',
  email: 'org@example.com',
  isActive: true,
  subscription: {
    plan: 'starter',
    modules: ['hr_management', 'attendance'],
    isActive: true,
  },
  trial: {
    isOnTrial: false,
    trialDays: 14,
    hasExpired: false,
    convertedToPaid: true,
  },
  ...overrides,
});

export const createMockEmployee = (overrides = {}) => ({
  _id: '789',
  employeeId: 'EMP001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  status: 'active',
  employmentType: 'full_time',
  dateOfJoining: new Date().toISOString(),
  department: {
    _id: 'dept1',
    name: 'Engineering',
    code: 'ENG',
  },
  designation: {
    _id: 'des1',
    name: 'Software Engineer',
    code: 'SE',
  },
  branch: {
    _id: 'branch1',
    name: 'Head Office',
    code: 'HO',
  },
  ...overrides,
});

// Wait utilities
export const waitForLoadingToFinish = () => new Promise(resolve => setTimeout(resolve, 0));

// Mock local storage
export const mockLocalStorage = () => {
  const store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: vi.fn(key => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(key => delete store[key]); }),
    store,
  };
};
