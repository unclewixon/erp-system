import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, branchAPI } from '../services/api';

const AttendanceScreen = () => {
  const { user } = useAuth();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [withinGeofence, setWithinGeofence] = useState(null);
  const [branch, setBranch] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    await requestLocationPermission();
    await fetchData();
  };

  const fetchData = async () => {
    try {
      const [todayRes, historyRes] = await Promise.all([
        attendanceAPI.getToday(),
        attendanceAPI.getMy({ limit: 7 }),
      ]);

      setTodayAttendance(todayRes.data.data);
      setRecentHistory(historyRes.data.data || []);

      // Fetch monthly summary
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const summaryRes = await attendanceAPI.getSummary({
        startDate: startOfMonth.toISOString(),
        endDate: now.toISOString(),
      });
      setSummary(summaryRes.data.data);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await requestLocationPermission();
    await fetchData();
    setRefreshing(false);
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required for geofenced attendance.'
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);
      await checkGeofence(currentLocation);
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const checkGeofence = async (currentLocation) => {
    try {
      if (user?.employee?.branch) {
        const response = await branchAPI.getById(user.employee.branch);
        const branchData = response.data.data;
        setBranch(branchData);

        if (branchData.geofence?.enabled && branchData.location?.coordinates) {
          const [branchLng, branchLat] = branchData.location.coordinates;
          const distance = calculateDistance(
            currentLocation.coords.latitude,
            currentLocation.coords.longitude,
            branchLat,
            branchLng
          );

          setWithinGeofence(distance <= branchData.geofence.radius);
        } else {
          setWithinGeofence(true);
        }
      } else {
        setWithinGeofence(true);
      }
    } catch (error) {
      console.error('Error checking geofence:', error);
      setWithinGeofence(true);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handleClockIn = async () => {
    if (!location) {
      Alert.alert('Error', 'Location not available. Please enable GPS.');
      return;
    }

    if (withinGeofence === false) {
      Alert.alert(
        'Outside Geofence',
        'You are not within the allowed area for attendance check-in.'
      );
      return;
    }

    setActionLoading(true);
    try {
      const response = await attendanceAPI.clockIn({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      setTodayAttendance(response.data.data);
      Alert.alert('Success', response.data.message || 'Clocked in successfully!');
      fetchData();
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to clock in. Please try again.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      let locationData = {};
      if (location) {
        locationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      }

      const response = await attendanceAPI.clockOut(locationData);
      setTodayAttendance(response.data.data);
      Alert.alert('Success', response.data.message || 'Clocked out successfully!');
      fetchData();
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to clock out. Please try again.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const isCheckedIn = todayAttendance?.clockIn?.time && !todayAttendance?.clockOut?.time;
  const isCheckedOut = todayAttendance?.clockOut?.time;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          <Text style={styles.title}>Attendance</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>

          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isCheckedIn
                      ? '#10b981'
                      : isCheckedOut
                      ? '#3b82f6'
                      : '#6b7280',
                  },
                ]}
              />
              <Text style={styles.statusText}>
                {isCheckedIn
                  ? 'Clocked In'
                  : isCheckedOut
                  ? 'Day Complete'
                  : 'Not Clocked In'}
              </Text>
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Clock In</Text>
                <Text style={styles.timeValue}>
                  {formatTime(todayAttendance?.clockIn?.time)}
                </Text>
                {todayAttendance?.isLate && (
                  <Text style={styles.lateTag}>
                    +{todayAttendance.lateMinutes}m late
                  </Text>
                )}
              </View>
              <View style={styles.timeDivider} />
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Clock Out</Text>
                <Text style={styles.timeValue}>
                  {formatTime(todayAttendance?.clockOut?.time)}
                </Text>
              </View>
              <View style={styles.timeDivider} />
              <View style={styles.timeItem}>
                <Text style={styles.timeLabel}>Work Hours</Text>
                <Text style={styles.timeValue}>
                  {todayAttendance?.workHours?.actual?.toFixed(1) || '0.0'}h
                </Text>
              </View>
            </View>
          </View>

          {/* Geofence Status */}
          <View style={styles.geofenceCard}>
            <Text style={styles.geofenceTitle}>Location Status</Text>
            {withinGeofence === null ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <View style={styles.geofenceStatus}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: withinGeofence ? '#10b981' : '#ef4444' },
                  ]}
                />
                <Text style={styles.geofenceText}>
                  {withinGeofence
                    ? `Within ${branch?.name || 'office'} area`
                    : 'Outside allowed area'}
                </Text>
              </View>
            )}
          </View>

          {/* Clock In/Out Button */}
          {!isCheckedOut && (
            <TouchableOpacity
              style={[
                styles.clockButton,
                isCheckedIn ? styles.clockOutButton : styles.clockInButton,
                (actionLoading || withinGeofence === false) && styles.buttonDisabled,
              ]}
              onPress={isCheckedIn ? handleClockOut : handleClockIn}
              disabled={actionLoading || withinGeofence === false}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.clockButtonText}>
                  {isCheckedIn ? 'Clock Out' : 'Clock In'}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* Monthly Summary */}
          {summary && (
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>This Month</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {summary.byStatus?.find((s) => s._id === 'present')?.count || 0}
                  </Text>
                  <Text style={styles.summaryLabel}>Present</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>
                    {summary.byStatus?.find((s) => s._id === 'late')?.count || 0}
                  </Text>
                  <Text style={styles.summaryLabel}>Late</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                    {summary.byStatus?.find((s) => s._id === 'absent')?.count || 0}
                  </Text>
                  <Text style={styles.summaryLabel}>Absent</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                    {(
                      summary.byStatus?.reduce(
                        (acc, s) => acc + (s.totalOvertime || 0),
                        0
                      ) || 0
                    ).toFixed(1)}h
                  </Text>
                  <Text style={styles.summaryLabel}>Overtime</Text>
                </View>
              </View>
            </View>
          )}

          {/* Recent History */}
          {recentHistory.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Recent History</Text>
              {recentHistory.slice(0, 5).map((record) => (
                <View key={record._id} style={styles.historyItem}>
                  <View style={styles.historyDate}>
                    <Text style={styles.historyDateText}>
                      {formatDate(record.date)}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            record.status === 'present'
                              ? '#dcfce7'
                              : record.status === 'late'
                              ? '#fef3c7'
                              : '#fee2e2',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color:
                              record.status === 'present'
                                ? '#16a34a'
                                : record.status === 'late'
                                ? '#d97706'
                                : '#dc2626',
                          },
                        ]}
                      >
                        {record.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.historyTimes}>
                    <Text style={styles.historyTimeText}>
                      {formatTime(record.clockIn?.time)} -{' '}
                      {formatTime(record.clockOut?.time)}
                    </Text>
                    <Text style={styles.historyHours}>
                      {record.workHours?.actual?.toFixed(1) || '0.0'}h
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {location && (
            <Text style={styles.coordinates}>
              GPS: {location.coords.latitude.toFixed(6)},{' '}
              {location.coords.longitude.toFixed(6)}
            </Text>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  timeLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  lateTag: {
    fontSize: 10,
    color: '#f59e0b',
    marginTop: 2,
  },
  geofenceCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  geofenceTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  geofenceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  geofenceText: {
    fontSize: 16,
    color: '#111827',
  },
  clockButton: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  clockInButton: {
    backgroundColor: '#3b82f6',
  },
  clockOutButton: {
    backgroundColor: '#ef4444',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  clockButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  summarySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  historySection: {
    marginBottom: 24,
  },
  historyItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyDate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyDateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  historyTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyTimeText: {
    fontSize: 13,
    color: '#6b7280',
  },
  historyHours: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  coordinates: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
});

export default AttendanceScreen;
