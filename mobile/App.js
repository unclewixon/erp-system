import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import notificationService from './src/services/notificationService';
import offlineService from './src/services/offlineService';

export default function App() {
  const navigationRef = useRef();

  useEffect(() => {
    // Initialize services
    initializeServices();
  }, []);

  const initializeServices = async () => {
    // Initialize offline service and start network monitoring
    offlineService.startNetworkMonitoring();

    // Initialize push notifications
    await notificationService.initialize();

    // Set up notification response handler
    notificationService.setNotificationResponseHandler((response) => {
      const data = response.notification.request.content.data;

      // Handle notification tap based on type
      if (data?.type === 'leave_status') {
        navigationRef.current?.navigate('Leave');
      } else if (data?.type === 'attendance_reminder') {
        navigationRef.current?.navigate('Attendance');
      }
    });
  };

  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="auto" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
