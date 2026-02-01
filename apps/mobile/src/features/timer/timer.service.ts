import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform, Alert, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useTimerStore } from './timer.store';

const TIMER_BACKGROUND_TASK = 'TIMER_BACKGROUND_TASK';

// Define the background task
TaskManager.defineTask(TIMER_BACKGROUND_TASK, async () => {
  try {
    const state = useTimerStore.getState();
    if (state.status === 'running' && state.startTime) {
      const start = TimerService.parseSafeDate(state.startTime);
      const now = Date.now();
      // Session Model: Elapsed = Now - T0 - TotalPaused
      // accumulatedMs is now "Total Paused Time"
      const elapsed = Math.max(0, now - start - state.accumulatedMs);

      // Update store UI will reflect this when app foregrounds
      useTimerStore.getState().setElapsedMs(elapsed);
    }
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const TimerService = {
  async registerBackgroundTask() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        TIMER_BACKGROUND_TASK
      );
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(TIMER_BACKGROUND_TASK, {
          minimumInterval: 60, // 1 minute is the minimum for background fetch
          stopOnTerminate: false, // Keep running after app is closed
          startOnBoot: true, // Start on device reboot
        });
      }
    } catch (err) {
      console.error('Failed to register background task', err);
    }
  },

  async unregisterBackgroundTask() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        TIMER_BACKGROUND_TASK
      );
      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(TIMER_BACKGROUND_TASK);
      }
    } catch (err) {
      console.error('Failed to unregister background task', err);
    }
  },

  async requestPermissions() {
    if (Platform.OS === 'web') return false;

    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo) {
      console.warn(
        'Notifications are limited in Expo Go. Use a development build.'
      );
      return false;
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2B5F9E',
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    const requested = status !== 'granted';
    if (requested) {
      const result = await Notifications.requestPermissionsAsync();
      status = result.status;
    }

    if (status === 'granted' && requested) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Notifications enabled',
          body: 'We will send updates and reminders as needed.',
        },
        trigger: null,
      });
    }

    const backgroundFetchStatus = await BackgroundFetch.getStatusAsync();
    if (
      backgroundFetchStatus !== BackgroundFetch.BackgroundFetchStatus.Available
    ) {
      console.warn('Background fetch is not available');
    }

    if (Platform.OS === 'android') {
      // We can't easily check battery optimization status without a native module,
      // but we can prompt the user to check it.
      Alert.alert(
        'Optimization Request',
        'To ensure the timer runs accurately in the background, please disable battery optimization for this app in your system settings.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }

    return true;
  },

  parseSafeDate(dateStr: string | null | undefined): number {
    if (!dateStr) return Date.now();
    // Normalize date string: replace space with T and ensure it ends with Z if no offset is present
    const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    const hasOffset = normalized.includes('Z') || normalized.includes('+') || (normalized.split('-').length > 3);
    const safeStr = hasOffset ? normalized : `${normalized}Z`;
    const timestamp = new Date(safeStr).getTime();
    return isNaN(timestamp) ? Date.now() : timestamp;
  },

  calculateElapsedBetween(startTime: string | null, endTime: string | number | null, accumulatedMs: number): number {
    if (!startTime) return Number.isFinite(accumulatedMs) ? accumulatedMs : 0;
    const start = this.parseSafeDate(startTime);
    const end = typeof endTime === 'number' ? endTime : this.parseSafeDate(endTime);
    const safeAccum = Number.isFinite(accumulatedMs) ? accumulatedMs : 0;
    return Math.max(0, end - start - safeAccum);
  },

  calculateElapsed(startTime: string | null, accumulatedMs: number): number {
    return this.calculateElapsedBetween(startTime, Date.now(), accumulatedMs);
  },

  async pauseTimer() {
    try {
      await this.unregisterBackgroundTask();
    } catch (err) {
      console.error('Failed to pause timer background task', err);
    }
  },

  async resumeTimer() {
    try {
      await this.registerBackgroundTask();
    } catch (err) {
      console.error('Failed to resume timer background task', err);
    }
  },

  async stopTimer() {
    try {
      await this.unregisterBackgroundTask();
    } catch (err) {
      console.error('Failed to stop timer background task', err);
    }
  },
};
