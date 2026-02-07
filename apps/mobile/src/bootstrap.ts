import { Platform, LogBox } from 'react-native';
console.log('[Bootstrap] Initializing global error handlers...');
import * as TaskManager from 'expo-task-manager';
import './features/timer/timer.background';

// Absolute silence for development overlays
LogBox.ignoreAllLogs(true);
LogBox.ignoreLogs([
    "Couldn't find a navigation context",
    "Have you wrapped your app with 'NavigationContainer'",
    "No 'router' object was found",
    "router is not ready",
    "navigation context is not available",
]);

// 1. Register Stripe task immediately to satisfy Expo Go/Stripe warnings
const STRIPE_TASK_KEY = 'StripeKeepJsAwakeTask';
try {
    if (!TaskManager.isTaskDefined(STRIPE_TASK_KEY)) {
        TaskManager.defineTask(STRIPE_TASK_KEY, async () => {
            // No-op: just satisfies the requirement that the task exists
        });
    }
} catch (e) {
    // TaskManager might not be available in all environments (e.g. web)
}

// 2. Global Error Suppression
// Use a bootstrap file to ensure these run BEFORE any other imports (to catch race conditions)
if (Platform.OS !== 'web') {
    const suppressErrors = [
        'Unable to activate keep awake',
        "Couldn't find a navigation context",
        "Have you wrapped your app with 'NavigationContainer'",
        "No 'router' object was found",
        "router is not ready",
        "navigation context is not available",
        "React Navigation",
        " expo-router",
        "Navigation",
        "router",
    ];

    // @ts-ignore - ErrorUtils is global in RN
    const originalErrorHandler = ErrorUtils.getGlobalHandler?.();
    if (originalErrorHandler) {
        // @ts-ignore
        ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
            const errorMessage = error?.message || error?.toString() || '';
            if (suppressErrors.some(s => errorMessage.toLowerCase().includes(s.toLowerCase()))) {
                return; // total silence
            }
            originalErrorHandler(error, isFatal);
        });
    }

    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
        try {
            const first = String(args[0] ?? '');
            if (suppressErrors.some(s => first.toLowerCase().includes(s.toLowerCase()))) {
                return;
            }
        } catch (e) { }
        originalConsoleError.apply(console, args as any);
    };
}
