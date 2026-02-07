import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform, Alert, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { TIMER_BACKGROUND_TASK, TimerUtils } from './timer.utils';

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

  // Proxies to TimerUtils for backward compatibility within the service structure if needed
  parseSafeDate: TimerUtils.parseSafeDate,
  calculateElapsedBetween: TimerUtils.calculateElapsedBetween,
  calculateElapsed: TimerUtils.calculateElapsed,

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

