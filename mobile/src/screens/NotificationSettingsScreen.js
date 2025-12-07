import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { profileAPI } from '../services/api';
import notificationService from '../services/notificationService';

const NotificationSettingsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const [settings, setSettings] = useState({
    pushEnabled: true,
    attendanceReminders: true,
    leaveUpdates: true,
    announcements: true,
    clockInReminder: true,
    clockOutReminder: true,
    leaveApproval: true,
    leaveRejection: true,
  });

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const granted = await notificationService.requestPermissions();
    setPermissionGranted(granted);
    if (!granted) {
      setSettings(prev => ({ ...prev, pushEnabled: false }));
    }
  };

  const handleToggle = async (key) => {
    const newValue = !settings[key];

    if (key === 'pushEnabled' && newValue) {
      const granted = await notificationService.requestPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive push notifications.',
          [{ text: 'OK' }]
        );
        return;
      }
      setPermissionGranted(true);
    }

    setSettings(prev => ({ ...prev, [key]: newValue }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileAPI.updateNotificationSettings(settings);

      // Schedule or cancel reminders based on settings
      if (settings.clockInReminder) {
        await notificationService.scheduleAttendanceReminder('clock-in', 9, 0);
      }
      if (settings.clockOutReminder) {
        await notificationService.scheduleAttendanceReminder('clock-out', 17, 0);
      }

      Alert.alert('Success', 'Notification settings saved successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const SettingItem = ({ label, description, value, onToggle, disabled }) => (
    <View style={[styles.settingItem, disabled && styles.settingItemDisabled]}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, disabled && styles.settingLabelDisabled]}>
          {label}
        </Text>
        {description && (
          <Text style={styles.settingDescription}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
        thumbColor={value ? '#3b82f6' : '#f4f3f4'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
          {saving ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Permission Warning */}
        {!permissionGranted && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={20} color="#f59e0b" />
            <Text style={styles.warningText}>
              Notifications are disabled. Enable them in settings to receive updates.
            </Text>
          </View>
        )}

        {/* Master Toggle */}
        <View style={styles.section}>
          <SettingItem
            label="Push Notifications"
            description="Receive notifications on your device"
            value={settings.pushEnabled}
            onToggle={() => handleToggle('pushEnabled')}
          />
        </View>

        {/* Attendance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance</Text>

          <SettingItem
            label="Attendance Reminders"
            description="Get reminders to clock in and out"
            value={settings.attendanceReminders}
            onToggle={() => handleToggle('attendanceReminders')}
            disabled={!settings.pushEnabled}
          />

          <SettingItem
            label="Clock In Reminder"
            description="Daily reminder at 9:00 AM"
            value={settings.clockInReminder}
            onToggle={() => handleToggle('clockInReminder')}
            disabled={!settings.pushEnabled || !settings.attendanceReminders}
          />

          <SettingItem
            label="Clock Out Reminder"
            description="Daily reminder at 5:00 PM"
            value={settings.clockOutReminder}
            onToggle={() => handleToggle('clockOutReminder')}
            disabled={!settings.pushEnabled || !settings.attendanceReminders}
          />
        </View>

        {/* Leave Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leave</Text>

          <SettingItem
            label="Leave Updates"
            description="Get notified about leave request status"
            value={settings.leaveUpdates}
            onToggle={() => handleToggle('leaveUpdates')}
            disabled={!settings.pushEnabled}
          />

          <SettingItem
            label="Leave Approval"
            description="When your leave is approved"
            value={settings.leaveApproval}
            onToggle={() => handleToggle('leaveApproval')}
            disabled={!settings.pushEnabled || !settings.leaveUpdates}
          />

          <SettingItem
            label="Leave Rejection"
            description="When your leave is rejected"
            value={settings.leaveRejection}
            onToggle={() => handleToggle('leaveRejection')}
            disabled={!settings.pushEnabled || !settings.leaveUpdates}
          />
        </View>

        {/* Other Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other</Text>

          <SettingItem
            label="Announcements"
            description="Company-wide announcements"
            value={settings.announcements}
            onToggle={() => handleToggle('announcements')}
            disabled={!settings.pushEnabled}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  content: {
    padding: 16,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  settingLabelDisabled: {
    color: '#9ca3af',
  },
  settingDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
});

export default NotificationSettingsScreen;
