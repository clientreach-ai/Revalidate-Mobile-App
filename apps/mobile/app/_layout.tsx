import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Platform } from 'react-native';
import { ThemeProvider } from '@/features/theme/ThemeProvider';
import { useThemeStore } from '@/features/theme/theme.store';
import Toast from 'react-native-toast-message';
import { initializeSyncService, cleanupSyncService } from '@/services/sync-service';
import { addNotificationResponseReceivedListener } from '@/features/notifications/notifications.service';
import "./global.css";

// ErrorUtils is available globally in React Native
declare const ErrorUtils: {
  getGlobalHandler: () => ((error: Error, isFatal?: boolean) => void) | null;
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

// Safe Stripe import - only load native Stripe on native platforms
let StripeProvider: any;
let isStripeAvailable = false;

// Global flag to prevent repeated warnings
declare global {
  var __STRIPE_LAYOUT_WARNING_LOGGED__: boolean | undefined;
}

if (Platform.OS !== 'web') {
  try {
    const stripeModule = require("@stripe/stripe-react-native");
    if (stripeModule && stripeModule.StripeProvider) {
      StripeProvider = stripeModule.StripeProvider;
      isStripeAvailable = true;
    } else {
      throw new Error("Stripe module not properly loaded");
    }
  } catch (error: any) {
    // Provide a fallback component that just passes children through
    StripeProvider = ({ children }: any) => <>{children}</>;
  }
} else {
  // Web fallback: no native Stripe available
  StripeProvider = ({ children }: any) => <>{children}</>;
}

// Stripe publishable key - must be set via environment variable
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

if (!STRIPE_PUBLISHABLE_KEY && isStripeAvailable) {
  console.warn('⚠️  EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Stripe payments will not work.');
}

// Custom toast configuration
const toastConfig = {
  success: ({ text1, text2 }: any) => (
    <View
      style={{
        height: 60,
        width: '90%',
        backgroundColor: '#10B981',
        borderRadius: 12,
        borderLeftColor: '#059669',
        borderLeftWidth: 4,
        paddingHorizontal: 15,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <View style={{ flex: 1 }}>
        {text1 && (
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '700',
              marginBottom: 2,
            }}
          >
            {text1}
          </Text>
        )}
        {text2 && (
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: '400',
              opacity: 0.95,
            }}
          >
            {text2}
          </Text>
        )}
      </View>
    </View>
  ),
  error: ({ text1, text2 }: any) => (
    <View
      style={{
        height: 60,
        width: '90%',
        backgroundColor: '#EF4444',
        borderRadius: 12,
        borderLeftColor: '#DC2626',
        borderLeftWidth: 4,
        paddingHorizontal: 15,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <View style={{ flex: 1 }}>
        {text1 && (
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '700',
              marginBottom: 2,
            }}
          >
            {text1}
          </Text>
        )}
        {text2 && (
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: '400',
              opacity: 0.95,
            }}
          >
            {text2}
          </Text>
        )}
      </View>
    </View>
  ),
  info: ({ text1, text2 }: any) => (
    <View
      style={{
        height: 60,
        width: '90%',
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        borderLeftColor: '#2563EB',
        borderLeftWidth: 4,
        paddingHorizontal: 15,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <View style={{ flex: 1 }}>
        {text1 && (
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '700',
              marginBottom: 2,
            }}
          >
            {text1}
          </Text>
        )}
        {text2 && (
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: '400',
              opacity: 0.95,
            }}
          >
            {text2}
          </Text>
        )}
      </View>
    </View>
  ),
};

function StatusBarWrapper() {
  const { isDark } = useThemeStore();

  return <StatusBar style={isDark ? "light" : "dark"} />;
}

export default function RootLayout() {
  const router = useRouter();
  useEffect(() => {
    // Handle unhandled promise rejections (suppress non-critical keep-awake errors)
    const originalErrorHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      const errorMessage = error?.message || error?.toString() || '';
      if (errorMessage.includes('Unable to activate keep awake')) {
        // Suppress this non-critical Expo development tool error
        return;
      }
      // Call original error handler for other errors
      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
    });

    // Listen for notification interactions (taps)
    // This handles navigation when user taps a notification while app is foreground/background
    const subscription = addNotificationResponseReceivedListener(response => {
      try {
        const data = response.notification.request.content.data;
        // Check if this is a calendar invitation
        if (data?.type === 'calendar_invite' && data?.eventId) {
          console.log('Received calendar invite notification, navigating to event:', data.eventId);
          // Navigate to event details and trigger accept/decline modal
          router.push({
            pathname: '/calendar/[id]',
            params: { id: String(data.eventId), showAcceptModal: 'true' }
          } as any);
        }
      } catch (err) {
        console.error('Error handling notification response:', err);
      }
    });

    initializeSyncService();

    return () => {
      if (originalErrorHandler) {
        ErrorUtils.setGlobalHandler(originalErrorHandler);
      }
      cleanupSyncService();
      subscription.remove();
    };
  }, []);

  return (
    <StripeProvider
      publishableKey={isStripeAvailable ? STRIPE_PUBLISHABLE_KEY : ''}
    >
      <ThemeProvider>
        <StatusBarWrapper />
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
        <Toast config={toastConfig} />
      </ThemeProvider>
    </StripeProvider>
  );
}
