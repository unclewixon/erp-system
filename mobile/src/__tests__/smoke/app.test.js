import React from 'react';
import { render, screen } from '../helpers/testUtils';
import { Text, View } from 'react-native';

// Simple smoke test component
const TestComponent = () => (
  <View testID="test-view">
    <Text testID="test-text">Hello World</Text>
  </View>
);

describe('Mobile App Smoke Tests', () => {
  it('should render a basic component', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('test-view')).toBeTruthy();
    expect(screen.getByTestId('test-text')).toBeTruthy();
    expect(screen.getByText('Hello World')).toBeTruthy();
  });

  it('should have React Native environment set up correctly', () => {
    expect(React).toBeDefined();
    expect(View).toBeDefined();
    expect(Text).toBeDefined();
  });
});

describe('Test Environment', () => {
  it('should have mocked AsyncStorage', () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    expect(AsyncStorage.getItem).toBeDefined();
    expect(AsyncStorage.setItem).toBeDefined();
  });

  it('should have mocked SecureStore', () => {
    const SecureStore = require('expo-secure-store');
    expect(SecureStore.getItemAsync).toBeDefined();
    expect(SecureStore.setItemAsync).toBeDefined();
  });

  it('should have mocked Location', () => {
    const Location = require('expo-location');
    expect(Location.requestForegroundPermissionsAsync).toBeDefined();
    expect(Location.getCurrentPositionAsync).toBeDefined();
  });

  it('should have mocked NetInfo', () => {
    const NetInfo = require('@react-native-community/netinfo');
    expect(NetInfo.fetch).toBeDefined();
    expect(NetInfo.addEventListener).toBeDefined();
  });
});
