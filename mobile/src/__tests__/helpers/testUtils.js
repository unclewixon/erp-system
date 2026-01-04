import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

// Wrapper component with navigation context
const AllTheProviders = ({ children }) => {
  return <NavigationContainer>{children}</NavigationContainer>;
};

// Custom render function
const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react-native';

// Override render method
export { customRender as render };

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: '123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'employee',
  ...overrides,
});

export const createMockAttendance = (overrides = {}) => ({
  _id: '456',
  date: new Date().toISOString(),
  clockIn: new Date().toISOString(),
  clockOut: null,
  status: 'present',
  location: {
    latitude: 40.7128,
    longitude: -74.006,
  },
  ...overrides,
});

// Mock API responses
export const mockApiResponse = (data, success = true) => ({
  data: {
    success,
    data,
    message: success ? 'Success' : 'Error',
  },
});
