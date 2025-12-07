import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.getMe();
      setUser(response.data.data);
      setTenant(response.data.data.tenant);

      // Fetch subscription status for non-super-admins
      if (response.data.data.role !== 'super_admin' && response.data.data.tenant) {
        try {
          const subRes = await api.get('/payments/subscription');
          setSubscription(subRes.data.data);
        } catch (err) {
          console.log('No subscription found');
          setSubscription(null);
        }
      }
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const refreshSubscription = async () => {
    if (user?.role !== 'super_admin' && tenant) {
      try {
        const subRes = await api.get('/payments/subscription');
        setSubscription(subRes.data.data);
        return subRes.data.data;
      } catch (err) {
        setSubscription(null);
        return null;
      }
    }
    return null;
  };

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { user: userData, tenant: tenantData, token } = response.data.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));

    setUser(userData);
    setTenant(tenantData);

    return response.data;
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    const { user: userData, tenant: tenantData, token } = response.data.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));

    setUser(userData);
    setTenant(tenantData);

    return response.data;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setTenant(null);
    }
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data.data);
      setTenant(response.data.data.tenant);
      return response.data.data;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      return null;
    }
  };

  // Check if user has an active subscription
  const hasActiveSubscription = () => {
    // Super admins don't need subscription
    if (user?.role === 'super_admin') return true;
    // Demo organization has free access
    if (tenant?.email === 'demo@company.com' || user?.email === 'demo@company.com') return true;
    // Check if subscription exists and is active
    if (!subscription) return false;
    return subscription.status === 'active' || subscription.status === 'trial';
  };

  const value = {
    user,
    tenant,
    subscription,
    loading,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
    refreshSubscription,
    hasActiveSubscription,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'super_admin',
    isTenantAdmin: user?.role === 'tenant_admin',
    isHRManager: user?.role === 'hr_manager',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
