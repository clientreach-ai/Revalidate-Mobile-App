import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { ThemeProvider } from '@/features/theme/ThemeProvider';
import { useThemeStore } from '@/features/theme/theme.store';
import Toast from 'react-native-toast-message';
import { initializeSyncService, cleanupSyncService } from '@/services/sync-service';
import "./global.css";

// Safe Stripe import - handles cases where native modules aren't available
let StripeProvider: any;
let isStripeAvailable = false;

// Global flag to prevent repeated warnings
declare global {
    var __STRIPE_LAYOUT_WARNING_LOGGED__: boolean | undefined;
}

// Try to load Stripe - will fail gracefully if native modules aren't available
try {
    const stripeModule = require("@stripe/stripe-react-native");
    if (stripeModule && stripeModule.StripeProvider) {
        StripeProvider = stripeModule.StripeProvider;
        isStripeAvailable = true;
    } else {
        throw new Error("Stripe module not properly loaded");
    }
} catch (error: any) {
    // Suppress the error - it's expected in Expo Go
    // Provide a fallback component that just passes children through
    StripeProvider = ({ children, publishableKey }: any) => <>{children}</>;
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
    useEffect(() => {
        initializeSyncService();
        return () => {
            cleanupSyncService();
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
