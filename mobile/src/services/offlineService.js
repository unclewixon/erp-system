import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const CACHE_KEYS = {
  USER_PROFILE: 'cache_user_profile',
  ATTENDANCE_HISTORY: 'cache_attendance_history',
  LEAVE_BALANCES: 'cache_leave_balances',
  LEAVE_REQUESTS: 'cache_leave_requests',
  EMPLOYEE_DIRECTORY: 'cache_employee_directory',
  PENDING_ACTIONS: 'pending_offline_actions',
};

const CACHE_EXPIRY = {
  USER_PROFILE: 24 * 60 * 60 * 1000, // 24 hours
  ATTENDANCE_HISTORY: 1 * 60 * 60 * 1000, // 1 hour
  LEAVE_BALANCES: 6 * 60 * 60 * 1000, // 6 hours
  LEAVE_REQUESTS: 1 * 60 * 60 * 1000, // 1 hour
  EMPLOYEE_DIRECTORY: 24 * 60 * 60 * 1000, // 24 hours
};

class OfflineService {
  constructor() {
    this.isOnline = true;
    this.unsubscribe = null;
  }

  // Initialize network listener
  initialize() {
    this.unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;

      // Sync pending actions when coming back online
      if (wasOffline && this.isOnline) {
        this.syncPendingActions();
      }
    });
  }

  // Cleanup listener
  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  // Check if online
  async checkConnection() {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected && state.isInternetReachable;
    return this.isOnline;
  }

  // Cache data with expiry
  async cacheData(key, data) {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheEntry));
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  // Get cached data
  async getCachedData(key, expiryTime = null) {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);

      // Check if cache is expired
      if (expiryTime && Date.now() - timestamp > expiryTime) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  // Cache user profile
  async cacheUserProfile(profile) {
    await this.cacheData(CACHE_KEYS.USER_PROFILE, profile);
  }

  async getCachedUserProfile() {
    return await this.getCachedData(CACHE_KEYS.USER_PROFILE, CACHE_EXPIRY.USER_PROFILE);
  }

  // Cache attendance history
  async cacheAttendanceHistory(history) {
    await this.cacheData(CACHE_KEYS.ATTENDANCE_HISTORY, history);
  }

  async getCachedAttendanceHistory() {
    return await this.getCachedData(CACHE_KEYS.ATTENDANCE_HISTORY, CACHE_EXPIRY.ATTENDANCE_HISTORY);
  }

  // Cache leave balances
  async cacheLeaveBalances(balances) {
    await this.cacheData(CACHE_KEYS.LEAVE_BALANCES, balances);
  }

  async getCachedLeaveBalances() {
    return await this.getCachedData(CACHE_KEYS.LEAVE_BALANCES, CACHE_EXPIRY.LEAVE_BALANCES);
  }

  // Cache leave requests
  async cacheLeaveRequests(requests) {
    await this.cacheData(CACHE_KEYS.LEAVE_REQUESTS, requests);
  }

  async getCachedLeaveRequests() {
    return await this.getCachedData(CACHE_KEYS.LEAVE_REQUESTS, CACHE_EXPIRY.LEAVE_REQUESTS);
  }

  // Cache employee directory
  async cacheEmployeeDirectory(employees) {
    await this.cacheData(CACHE_KEYS.EMPLOYEE_DIRECTORY, employees);
  }

  async getCachedEmployeeDirectory() {
    return await this.getCachedData(CACHE_KEYS.EMPLOYEE_DIRECTORY, CACHE_EXPIRY.EMPLOYEE_DIRECTORY);
  }

  // Queue offline actions for sync
  async queueOfflineAction(action) {
    try {
      const pending = await this.getPendingActions();
      pending.push({
        ...action,
        id: Date.now().toString(),
        timestamp: Date.now(),
      });
      await AsyncStorage.setItem(CACHE_KEYS.PENDING_ACTIONS, JSON.stringify(pending));
    } catch (error) {
      console.error('Error queuing offline action:', error);
    }
  }

  // Get pending offline actions
  async getPendingActions() {
    try {
      const pending = await AsyncStorage.getItem(CACHE_KEYS.PENDING_ACTIONS);
      return pending ? JSON.parse(pending) : [];
    } catch (error) {
      console.error('Error getting pending actions:', error);
      return [];
    }
  }

  // Sync pending actions
  async syncPendingActions() {
    const pending = await this.getPendingActions();
    if (pending.length === 0) return;

    const failed = [];

    for (const action of pending) {
      try {
        await this.executeAction(action);
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        failed.push(action);
      }
    }

    // Keep only failed actions
    await AsyncStorage.setItem(CACHE_KEYS.PENDING_ACTIONS, JSON.stringify(failed));

    return {
      synced: pending.length - failed.length,
      failed: failed.length,
    };
  }

  // Execute a queued action
  async executeAction(action) {
    const api = require('./api').default;

    switch (action.type) {
      case 'CLOCK_IN':
        await api.post('/attendance/clock-in', action.data);
        break;
      case 'CLOCK_OUT':
        await api.post('/attendance/clock-out', action.data);
        break;
      case 'LEAVE_REQUEST':
        await api.post('/leaves/requests', action.data);
        break;
      case 'UPDATE_PROFILE':
        await api.put('/employees/profile', action.data);
        break;
      default:
        console.warn('Unknown action type:', action.type);
    }
  }

  // Clear all cached data
  async clearAllCache() {
    try {
      const keys = Object.values(CACHE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Get cache statistics
  async getCacheStats() {
    const stats = {};

    for (const [name, key] of Object.entries(CACHE_KEYS)) {
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const { timestamp } = JSON.parse(cached);
          stats[name] = {
            exists: true,
            age: Date.now() - timestamp,
            ageFormatted: this.formatAge(Date.now() - timestamp),
          };
        } else {
          stats[name] = { exists: false };
        }
      } catch (error) {
        stats[name] = { exists: false, error: true };
      }
    }

    return stats;
  }

  formatAge(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  }
}

export default new OfflineService();
export { CACHE_KEYS };
