import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../context/AuthContext';

// Mock the API module
const mockGetMe = vi.fn();
const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockApiGet = vi.fn();

vi.mock('../../services/api', () => ({
  default: {
    get: (...args) => mockApiGet(...args),
    post: vi.fn(),
    put: vi.fn(),
  },
  authAPI: {
    login: (...args) => mockLogin(...args),
    register: vi.fn(),
    getMe: (...args) => mockGetMe(...args),
    logout: (...args) => mockLogout(...args),
    changePassword: vi.fn(),
  },
}));

// Test component that uses the auth context
const TestConsumer = () => {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{auth.loading.toString()}</span>
      <span data-testid="authenticated">{auth.isAuthenticated.toString()}</span>
      <span data-testid="user">{auth.user ? auth.user.email : 'null'}</span>
      <span data-testid="tenant">{auth.tenant ? auth.tenant.name : 'null'}</span>
      <span data-testid="is-super-admin">{auth.isSuperAdmin.toString()}</span>
      <span data-testid="is-tenant-admin">{auth.isTenantAdmin.toString()}</span>
      <button onClick={() => auth.login('test@example.com', 'password')}>Login</button>
      <button onClick={() => auth.logout()}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  let localStorageMock;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks();
    cleanup();

    // Create fresh localStorage mock
    localStorageMock = {
      store: {},
      getItem: vi.fn((key) => localStorageMock.store[key] || null),
      setItem: vi.fn((key, value) => { localStorageMock.store[key] = value; }),
      removeItem: vi.fn((key) => { delete localStorageMock.store[key]; }),
      clear: vi.fn(() => { localStorageMock.store = {}; }),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Default mock: no token, getMe fails
    mockGetMe.mockRejectedValue(new Error('No token'));
    mockApiGet.mockRejectedValue(new Error('No subscription'));
  });

  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const TestComponent = () => {
        const auth = useAuth();
        return <div>{auth.user}</div>;
      };

      expect(() => render(<TestComponent />)).toThrow(
        'useAuth must be used within an AuthProvider'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Initial State', () => {
    it('should have loading true initially', async () => {
      localStorageMock.store.token = 'test-token';

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Initially loading
      expect(screen.getByTestId('loading').textContent).toBe('true');
    });

    it('should set loading to false after checking auth', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });
    });

    it('should be unauthenticated when no token exists', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('false');
        expect(screen.getByTestId('user').textContent).toBe('null');
      });
    });
  });

  describe('Authentication Check', () => {
    it('should fetch user data when token exists', async () => {
      localStorageMock.store.token = 'valid-token';

      mockGetMe.mockResolvedValue({
        data: {
          data: {
            id: '1',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'employee',
            tenant: {
              id: 't1',
              name: 'Test Organization',
              slug: 'test-org',
            },
          },
        },
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
        expect(screen.getByTestId('user').textContent).toBe('test@example.com');
        expect(screen.getByTestId('tenant').textContent).toBe('Test Organization');
      });
    });

    it('should clear token when getMe fails', async () => {
      localStorageMock.store.token = 'invalid-token';
      mockGetMe.mockRejectedValue(new Error('Unauthorized'));

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('false');
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('Login', () => {
    it('should login successfully', async () => {
      mockLogin.mockResolvedValue({
        data: {
          data: {
            user: {
              id: '1',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              role: 'employee',
            },
            tenant: {
              id: 't1',
              name: 'Test Organization',
              slug: 'test-org',
            },
            token: 'new-token',
          },
        },
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-token');
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });
    });
  });

  describe('Logout', () => {
    it('should logout successfully', async () => {
      localStorageMock.store.token = 'valid-token';

      mockGetMe.mockResolvedValue({
        data: {
          data: {
            id: '1',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'employee',
            tenant: {
              id: 't1',
              name: 'Test Organization',
              slug: 'test-org',
            },
          },
        },
      });
      mockLogout.mockResolvedValue({});

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
        expect(screen.getByTestId('authenticated').textContent).toBe('false');
        expect(screen.getByTestId('user').textContent).toBe('null');
      });
    });

    it('should clear state even if logout API fails', async () => {
      localStorageMock.store.token = 'valid-token';

      mockGetMe.mockResolvedValue({
        data: {
          data: {
            id: '1',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'employee',
            tenant: {
              id: 't1',
              name: 'Test Organization',
              slug: 'test-org',
            },
          },
        },
      });
      mockLogout.mockRejectedValue(new Error('Network error'));

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true');
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('false');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Role Checks', () => {
    it('should correctly identify super admin', async () => {
      localStorageMock.store.token = 'valid-token';

      mockGetMe.mockResolvedValue({
        data: {
          data: {
            id: '123',
            email: 'superadmin@example.com',
            firstName: 'Super',
            lastName: 'Admin',
            role: 'super_admin',
            tenant: null,
          },
        },
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
        expect(screen.getByTestId('is-super-admin').textContent).toBe('true');
        expect(screen.getByTestId('user').textContent).toBe('superadmin@example.com');
      });
    });

    it('should correctly identify tenant admin', async () => {
      localStorageMock.store.token = 'valid-token';

      mockGetMe.mockResolvedValue({
        data: {
          data: {
            id: '456',
            email: 'tenantadmin@example.com',
            firstName: 'Tenant',
            lastName: 'Admin',
            role: 'tenant_admin',
            tenant: {
              id: '789',
              name: 'Test Org',
              slug: 'test-org',
            },
          },
        },
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
        expect(screen.getByTestId('is-tenant-admin').textContent).toBe('true');
        expect(screen.getByTestId('user').textContent).toBe('tenantadmin@example.com');
      });
    });

    it('should correctly identify regular employee', async () => {
      localStorageMock.store.token = 'valid-token';

      mockGetMe.mockResolvedValue({
        data: {
          data: {
            id: '111',
            email: 'employee@example.com',
            firstName: 'Regular',
            lastName: 'Employee',
            role: 'employee',
            tenant: {
              id: '222',
              name: 'Test Org',
              slug: 'test-org',
            },
          },
        },
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
        expect(screen.getByTestId('is-super-admin').textContent).toBe('false');
        expect(screen.getByTestId('is-tenant-admin').textContent).toBe('false');
        expect(screen.getByTestId('user').textContent).toBe('employee@example.com');
      });
    });
  });
});
