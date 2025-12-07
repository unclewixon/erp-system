import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import api from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  async registerForPushNotifications() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // Replace with actual Expo project ID
      })).data;
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    this.expoPushToken = token;
    return token;
  }

  async savePushToken(userId) {
    if (!this.expoPushToken) return;

    try {
      await api.post('/notifications/register-device', {
        userId,
        pushToken: this.expoPushToken,
        platform: Platform.OS,
      });
      await SecureStore.setItemAsync('pushToken', this.expoPushToken);
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
  }

  setupNotificationListeners(onNotificationReceived, onNotificationResponse) {
    // Listener for received notifications (foreground)
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Listener for notification responses (user tapped)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      if (onNotificationResponse) {
        onNotificationResponse(response);
      }
    });
  }

  removeListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  async scheduleLocalNotification(title, body, data = {}, trigger = null) {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: trigger || { seconds: 1 },
    });

    return notificationId;
  }

  async cancelNotification(notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getBadgeCount() {
    return await Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count) {
    await Notifications.setBadgeCountAsync(count);
  }

  // Schedule attendance reminder
  async scheduleAttendanceReminder(hour = 9, minute = 0) {
    const trigger = {
      hour,
      minute,
      repeats: true,
    };

    return await this.scheduleLocalNotification(
      'Attendance Reminder',
      "Don't forget to clock in today!",
      { type: 'attendance_reminder' },
      trigger
    );
  }

  // Schedule leave approval notification
  async notifyLeaveStatus(status, startDate, endDate) {
    const statusText = status === 'approved' ? 'approved' : 'rejected';
    return await this.scheduleLocalNotification(
      `Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      `Your leave request from ${startDate} to ${endDate} has been ${statusText}.`,
      { type: 'leave_status', status }
    );
  }
}

export default new NotificationService();
