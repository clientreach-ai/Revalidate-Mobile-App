import '../src/bootstrap';
import React, { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { safeNavigate } from '@/utils/navigation';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { ThemeProvider } from '@/features/theme/ThemeProvider';
import { useThemeStore } from '@/features/theme/theme.store';
import Toast from 'react-native-toast-message';
import { initializeSyncService, cleanupSyncService } from '@/services/sync-service';
import { addNotificationResponseReceivedListener } from '@/features/notifications/notifications.service';
import { NavigationErrorBoundary } from '@/components/common/NavigationErrorBoundary';
import "./global.css";

import { StripeProvider } from '@/services/stripe';

// Safe Stripe import handled by platform-specific files in @/services/stripe
const isStripeAvailable = Platform.OS !== 'web';

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
  const pendingNavigationRef = useRef<null | { pathname: string; params?: Record<string, string> }>(null);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleFlush = (attempt: number) => {
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }

    flushTimeoutRef.current = setTimeout(() => {
      const pending = pendingNavigationRef.current;
      if (!pending) return;

      try {
        pendingNavigationRef.current = null;
        safeNavigate.push({ pathname: pending.pathname, params: pending.params } as any);
      } catch (e: any) {
        // Most common case: navigation tree not ready yet.
        const message = e?.message || String(e);
        const shouldRetry = message.includes('navigation context') ||
          message.includes('NavigationContainer') ||
          message.includes('router is not ready');

        if (shouldRetry && attempt < 15) { // Increased retries
          pendingNavigationRef.current = pending;
          scheduleFlush(attempt + 1);
          return;
        }

        console.error('Failed to navigate from notification:', e);
      }
    }, attempt === 0 ? 0 : 250);
  };

  useEffect(() => {
    // Initialize sync service
    initializeSyncService();

    return () => {
      cleanupSyncService();
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Listen for notification interactions (taps)
    // This handles navigation when user taps a notification while app is foreground/background
    const subscription = addNotificationResponseReceivedListener(response => {
      try {
        const data = response.notification.request.content.data;
        // Check if this is a calendar invitation
        if (data?.type === 'calendar_invite' && data?.eventId) {
          console.log('Received calendar invite notification, navigating to event:', data.eventId);
          // Navigate to event details and trigger accept/decline modal.
          // Navigation may not be ready yet (cold start / deep link return), so queue if needed.
          const destination = {
            pathname: '/calendar/[id]',
            params: { id: String(data.eventId), showAcceptModal: 'true' },
          };

          pendingNavigationRef.current = destination;
          scheduleFlush(0);
        }
      } catch (err) {
        console.error('Error handling notification response:', err);
      }
    });

    // Deep-link handler: queue incoming URLs and replay navigation when router is ready
    const handleUrl = (event: { url: string }) => {
      try {
        let path = event.url;

        // If this is an app-generated URL using Linking.createURL('/'), strip the prefix
        const prefix = Linking.createURL('/');
        if (path.startsWith(prefix)) {
          path = path.slice(prefix.length - 1); // keep leading '/'
        } else {
          // Fallback: strip scheme and host (e.g. myapp://host/path)
          const schemeIndex = path.indexOf('://');
          if (schemeIndex !== -1) {
            const firstSlash = path.indexOf('/', schemeIndex + 3);
            path = firstSlash !== -1 ? path.slice(firstSlash) : '/';
          }
        }

        // Normalize to tabs route when appropriate (most profile routes live under /(tabs))
        if (path.startsWith('/profile')) {
          path = '/(tabs)' + path;
        }

        pendingNavigationRef.current = { pathname: path };
        scheduleFlush(0);
      } catch (e) {
        console.error('Failed to handle deep link:', e);
      }
    };

    const linkingSubscription = Linking.addEventListener('url', handleUrl);

    // Handle initial URL on cold start
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) handleUrl({ url: initialUrl });
    }).catch(() => { /* ignore */ });

    return () => {
      subscription.remove();
      try {
        linkingSubscription.remove();
      } catch (e) {
        // ignore if remove is not available
      }
    };
  }, []);

  return (
    <StripeProvider
      publishableKey={isStripeAvailable ? STRIPE_PUBLISHABLE_KEY : ''}
      merchantIdentifier="merchant.com.revalidationtracker.app"
      urlScheme="revalidation-tracker"
    >
      <ThemeProvider>
        <StatusBarWrapper />
        <NavigationErrorBoundary>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
        </NavigationErrorBoundary>
        <Toast config={toastConfig} />
      </ThemeProvider>
    </StripeProvider>
  );
}
