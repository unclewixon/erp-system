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
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { leaveAPI } from '../services/api';

const LeaveScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [activeTab, setActiveTab] = useState('balances');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [applyForm, setApplyForm] = useState({
    leaveType: '',
    startDate: new Date(),
    endDate: new Date(),
    reason: '',
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [balancesRes, requestsRes, typesRes, holidaysRes] = await Promise.all([
        leaveAPI.getMyBalances(),
        leaveAPI.getMyRequests(),
        leaveAPI.getTypes(),
        leaveAPI.getHolidays(),
      ]);

      setBalances(balancesRes.data.data || []);
      setRequests(requestsRes.data.data || []);
      setLeaveTypes(typesRes.data.data || []);
      setHolidays(holidaysRes.data.data || []);
    } catch (error) {
      console.error('Error fetching leave data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const handleApplySubmit = async () => {
    if (!applyForm.leaveType) {
      Alert.alert('Error', 'Please select a leave type');
      return;
    }
    if (!applyForm.reason.trim()) {
      Alert.alert('Error', 'Please provide a reason');
      return;
    }

    setSubmitting(true);
    try {
      await leaveAPI.createRequest({
        leaveType: applyForm.leaveType,
        startDate: applyForm.startDate.toISOString().split('T')[0],
        endDate: applyForm.endDate.toISOString().split('T')[0],
        reason: applyForm.reason,
      });

      Alert.alert('Success', 'Leave request submitted successfully');
      setShowApplyModal(false);
      setApplyForm({
        leaveType: '',
        startDate: new Date(),
        endDate: new Date(),
        reason: '',
      });
      fetchData();
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to submit leave request'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = (requestId) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this leave request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveAPI.cancelRequest(requestId, { reason: 'Cancelled by user' });
              Alert.alert('Success', 'Leave request cancelled');
              fetchData();
            } catch (error) {
              Alert.alert(
                'Error',
                error.response?.data?.message || 'Failed to cancel request'
              );
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: { bg: '#fef3c7', text: '#d97706' },
      approved: { bg: '#dcfce7', text: '#16a34a' },
      rejected: { bg: '#fee2e2', text: '#dc2626' },
      cancelled: { bg: '#f3f4f6', text: '#6b7280' },
    };
    return colors[status] || colors.pending;
  };

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
      <View style={styles.header}>
        <Text style={styles.title}>Leave Management</Text>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => setShowApplyModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['balances', 'requests', 'holidays'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[styles.tabText, activeTab === tab && styles.activeTabText]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Balances Tab */}
        {activeTab === 'balances' && (
          <View style={styles.content}>
            {balances.length === 0 ? (
              <Text style={styles.emptyText}>No leave balances found</Text>
            ) : (
              balances.map((bal) => (
                <View
                  key={bal._id}
                  style={[
                    styles.balanceCard,
                    { borderLeftColor: bal.leaveType?.color || '#3b82f6' },
                  ]}
                >
                  <View style={styles.balanceHeader}>
                    <Text
                      style={[
                        styles.balanceType,
                        { color: bal.leaveType?.color || '#3b82f6' },
                      ]}
                    >
                      {bal.leaveType?.name}
                    </Text>
                    <Text style={styles.balanceCode}>{bal.leaveType?.code}</Text>
                  </View>
                  <View style={styles.balanceNumbers}>
                    <View style={styles.balanceMain}>
                      <Text style={styles.balanceValue}>{bal.available}</Text>
                      <Text style={styles.balanceLabel}>Available</Text>
                    </View>
                    <View style={styles.balanceDetails}>
                      <Text style={styles.balanceDetail}>
                        <Text style={styles.detailValue}>{bal.used}</Text> Used
                      </Text>
                      <Text style={styles.balanceDetail}>
                        <Text style={styles.detailValue}>{bal.pending}</Text>{' '}
                        Pending
                      </Text>
                      <Text style={styles.balanceDetail}>
                        <Text style={styles.detailValue}>{bal.total}</Text> Total
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <View style={styles.content}>
            {requests.length === 0 ? (
              <Text style={styles.emptyText}>No leave requests found</Text>
            ) : (
              requests.map((req) => {
                const statusColors = getStatusColor(req.status);
                return (
                  <View key={req._id} style={styles.requestCard}>
                    <View style={styles.requestHeader}>
                      <View style={styles.requestDates}>
                        <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                        <Text style={styles.requestDateText}>
                          {formatDate(req.startDate)}
                          {req.startDate !== req.endDate &&
                            ` - ${formatDate(req.endDate)}`}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusColors.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: statusColors.text },
                          ]}
                        >
                          {req.status}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.requestInfo}>
                      <View
                        style={[
                          styles.leaveTypeBadge,
                          {
                            backgroundColor: `${req.leaveType?.color}20` || '#3b82f620',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.leaveTypeBadgeText,
                            { color: req.leaveType?.color || '#3b82f6' },
                          ]}
                        >
                          {req.leaveType?.name}
                        </Text>
                      </View>
                      <Text style={styles.requestDays}>
                        {req.workingDays} {req.workingDays === 1 ? 'day' : 'days'}
                      </Text>
                    </View>
                    <Text style={styles.requestReason}>{req.reason}</Text>
                    {req.status === 'pending' && (
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => handleCancelRequest(req._id)}
                      >
                        <Text style={styles.cancelButtonText}>Cancel Request</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Holidays Tab */}
        {activeTab === 'holidays' && (
          <View style={styles.content}>
            {holidays.length === 0 ? (
              <Text style={styles.emptyText}>No holidays found</Text>
            ) : (
              holidays.map((holiday) => (
                <View key={holiday._id} style={styles.holidayItem}>
                  <View style={styles.holidayDate}>
                    <Text style={styles.holidayDay}>
                      {new Date(holiday.date).getDate()}
                    </Text>
                    <Text style={styles.holidayMonth}>
                      {new Date(holiday.date).toLocaleDateString('en-US', {
                        month: 'short',
                      })}
                    </Text>
                  </View>
                  <View style={styles.holidayInfo}>
                    <Text style={styles.holidayName}>{holiday.name}</Text>
                    <Text style={styles.holidayWeekday}>
                      {new Date(holiday.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                      })}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.holidayTypeBadge,
                      {
                        backgroundColor:
                          holiday.type === 'public' ? '#dcfce7' : '#dbeafe',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.holidayTypeText,
                        {
                          color:
                            holiday.type === 'public' ? '#16a34a' : '#2563eb',
                        },
                      ]}
                    >
                      {holiday.type}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Apply Leave Modal */}
      <Modal
        visible={showApplyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowApplyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Leave</Text>
              <TouchableOpacity onPress={() => setShowApplyModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Leave Type *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={applyForm.leaveType}
                  onValueChange={(value) =>
                    setApplyForm({ ...applyForm, leaveType: value })
                  }
                >
                  <Picker.Item label="Select Leave Type" value="" />
                  {leaveTypes.map((type) => (
                    <Picker.Item
                      key={type._id}
                      label={type.name}
                      value={type._id}
                    />
                  ))}
                </Picker>
              </View>

              <Text style={styles.inputLabel}>Start Date *</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.dateInputText}>
                  {applyForm.startDate.toLocaleDateString()}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={applyForm.startDate}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(event, date) => {
                    setShowStartPicker(false);
                    if (date) {
                      setApplyForm({ ...applyForm, startDate: date });
                      if (date > applyForm.endDate) {
                        setApplyForm({ ...applyForm, startDate: date, endDate: date });
                      }
                    }
                  }}
                />
              )}

              <Text style={styles.inputLabel}>End Date *</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.dateInputText}>
                  {applyForm.endDate.toLocaleDateString()}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={applyForm.endDate}
                  mode="date"
                  minimumDate={applyForm.startDate}
                  onChange={(event, date) => {
                    setShowEndPicker(false);
                    if (date) {
                      setApplyForm({ ...applyForm, endDate: date });
                    }
                  }}
                />
              )}

              <Text style={styles.inputLabel}>Reason *</Text>
              <TextInput
                style={styles.textArea}
                value={applyForm.reason}
                onChangeText={(text) =>
                  setApplyForm({ ...applyForm, reason: text })
                }
                placeholder="Please provide a reason for your leave request..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setShowApplyModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submitting && styles.submitButtonDisabled,
                ]}
                onPress={handleApplySubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  applyButton: {
    backgroundColor: '#3b82f6',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    paddingVertical: 40,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceType: {
    fontSize: 16,
    fontWeight: '600',
  },
  balanceCode: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  balanceNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  balanceMain: {},
  balanceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  balanceDetails: {
    alignItems: 'flex-end',
  },
  balanceDetail: {
    fontSize: 12,
    color: '#6b7280',
  },
  detailValue: {
    fontWeight: '600',
    color: '#374151',
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestDates: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestDateText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaveTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  leaveTypeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  requestDays: {
    fontSize: 12,
    color: '#6b7280',
  },
  requestReason: {
    fontSize: 14,
    color: '#6b7280',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  holidayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  holidayDate: {
    width: 50,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  holidayDay: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  holidayMonth: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  holidayInfo: {
    flex: 1,
  },
  holidayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  holidayWeekday: {
    fontSize: 12,
    color: '#6b7280',
  },
  holidayTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  holidayTypeText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
  },
  dateInputText: {
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default LeaveScreen;
