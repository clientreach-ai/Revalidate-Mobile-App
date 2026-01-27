import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import { setSubscriptionInfo } from '@/utils/subscription';
import '../../global.css';

// Safe Stripe import - only load on native platforms
let useStripe: any;
let isStripeAvailable = false;

if (Platform.OS !== 'web') {
  try {
    const stripeModule = require("@stripe/stripe-react-native");
    if (stripeModule && stripeModule.useStripe) {
      useStripe = stripeModule.useStripe;
      isStripeAvailable = true;
    }
  } catch (error: any) {
    useStripe = () => ({
      initPaymentSheet: async () => ({ error: { message: "Stripe not available" } }),
      presentPaymentSheet: async () => ({ error: { message: "Stripe not available" } }),
    });
  }
} else {
  useStripe = () => ({
    initPaymentSheet: async () => ({ error: { message: "Stripe not available" } }),
    presentPaymentSheet: async () => ({ error: { message: "Stripe not available" } }),
  });
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const { isDark } = useThemeStore();
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('free');
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const stripe = useStripe();
  const initPaymentSheet = stripe?.initPaymentSheet || (async () => ({ error: { message: "Stripe not available" } }));
  const presentPaymentSheet = stripe?.presentPaymentSheet || (async () => ({ error: { message: "Stripe not available" } }));

  // Load subscription status
  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  // Initialize payment sheet when client secret is available
  useEffect(() => {
    if (clientSecret) {
      initializePaymentSheet();
    }
  }, [clientSecret]);

  const loadSubscriptionStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      const response = await apiService.get<{
        success: boolean;
        data: {
          subscriptionTier: string | null;
          subscriptionStatus: string | null;
          trialEndsAt: string | null;
        };
      }>(API_ENDPOINTS.USERS.ME, token);

      if (response?.data) {
        const isPremiumUser = response.data.subscriptionTier === 'premium';
        setIsPremium(isPremiumUser);
        setSubscriptionStatus(response.data.subscriptionStatus || 'free');
        setTrialEndsAt(response.data.trialEndsAt || null);
        
        await setSubscriptionInfo({
          subscriptionTier: (response.data.subscriptionTier || 'free') as 'free' | 'premium',
          subscriptionStatus: (response.data.subscriptionStatus || 'active') as 'active' | 'trial' | 'expired' | 'cancelled',
          isPremium: isPremiumUser,
          canUseOffline: isPremiumUser,
        });
      }
    } catch (error) {
      console.error('Error loading subscription status:', error);
      showToast.error('Failed to load subscription status', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const initializePaymentSheet = async () => {
    if (!clientSecret) return;

    try {
      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Revalidation Tracker',
      });

      if (error) {
        showToast.error(error.message || "Failed to initialize payment", "Error");
        setIsProcessingPayment(false);
      }
    } catch (error: any) {
      showToast.error(error.message || "Failed to initialize payment", "Error");
      setIsProcessingPayment(false);
    }
  };

  const handleUpgrade = useCallback(async () => {
    if (!isStripeAvailable) {
      showToast.info(
        "To upgrade to Premium, please build the app with native modules enabled. Run: npx expo prebuild && npx expo run:android (or run:ios)",
        "Development Build Required"
      );
      return;
    }

    try {
      setIsProcessingPayment(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        showToast.error("Please log in again", "Error");
        setIsProcessingPayment(false);
        return;
      }

      const paymentResponse = await apiService.post<{
        success: boolean;
        data: {
          clientSecret: string;
          subscriptionId?: string;
          paymentIntentId?: string;
          type: 'subscription' | 'one-time';
        };
      }>(
        API_ENDPOINTS.PAYMENT.CREATE_INTENT,
        {},
        token
      );

      if (paymentResponse?.data?.clientSecret) {
        setPaymentIntentId(paymentResponse.data.paymentIntentId || paymentResponse.data.subscriptionId || null);
        setClientSecret(paymentResponse.data.clientSecret);
        // Payment sheet will be initialized via useEffect
      } else {
        throw new Error("Failed to create payment intent");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to start payment process. Please try again.";
      showToast.error(errorMessage, "Error");
      setIsProcessingPayment(false);
    }
  }, []);

  const handlePayment = useCallback(async () => {
    if (!clientSecret || !paymentIntentId) {
      showToast.error("Payment information missing", "Error");
      return;
    }

    try {
      setIsProcessingPayment(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        showToast.error("Please log in again", "Error");
        setIsProcessingPayment(false);
        return;
      }

      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code !== 'Canceled') {
          showToast.error(error.message || "Payment failed", "Payment Error");
        }
        setIsProcessingPayment(false);
        return;
      }

      // Payment succeeded - confirm on backend
      const confirmPayload: { paymentIntentId?: string; subscriptionId?: string } = {};
      if (paymentIntentId) {
        if (paymentIntentId.startsWith('sub_')) {
          confirmPayload.subscriptionId = paymentIntentId;
        } else {
          confirmPayload.paymentIntentId = paymentIntentId;
        }
      }
      
      await apiService.post(
        API_ENDPOINTS.PAYMENT.CONFIRM,
        confirmPayload,
        token
      );

      setClientSecret(null);
      setPaymentIntentId(null);
      showToast.success("Payment successful! Premium plan activated.", "Success");
      
      // Reload subscription status
      await loadSubscriptionStatus();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Payment processing failed. Please try again.";
      showToast.error(errorMessage, "Payment Error");
      setIsProcessingPayment(false);
    }
  }, [clientSecret, paymentIntentId, presentPaymentSheet]);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadSubscriptionStatus();
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Text className={`${isDark ? "text-white" : "text-slate-800"}`}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isPremium ? '#D4AF37' : '#2B5F9E'}
            colors={[isPremium ? '#D4AF37' : '#2B5F9E']}
          />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8 px-6 pt-4">
          <Pressable 
            onPress={() => router.back()}
            className={`w-10 h-10 items-center justify-center rounded-full shadow-sm ${
              isDark ? "bg-slate-800" : "bg-white"
            }`}
          >
            <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? "#E5E7EB" : "#1F2937"} />
          </Pressable>
          <Text className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>
            Subscription
          </Text>
          <View className="w-10" />
        </View>

        {/* Current Plan Card */}
        <View className="px-6 mb-6">
          <View 
            className={`rounded-2xl p-6 shadow-lg border-2 ${
              isDark ? "bg-slate-800" : "bg-white"
            } ${isPremium ? 'border-[#D4AF37]' : (isDark ? 'border-slate-700' : 'border-slate-200')}`}
            style={isPremium ? {
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              shadowColor: '#D4AF37',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            } : {}}
          >
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className={`text-sm mb-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                  Current Plan
                </Text>
                <View className="flex-row items-center gap-2">
                  <Text 
                    className={`text-2xl font-bold ${
                      isPremium ? 'text-[#D4AF37]' : (isDark ? 'text-white' : 'text-slate-800')
                    }`}
                    style={isPremium ? {
                      textShadowColor: 'rgba(212, 175, 55, 0.3)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2,
                    } : {}}
                  >
                    {isPremium ? 'Premium' : 'Free'}
                  </Text>
                  {isPremium && (
                    <View 
                      className="px-2 py-0.5 rounded-full bg-[#FFD700]/20 border border-[#D4AF37]/50"
                      style={{
                        shadowColor: '#FFD700',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.3,
                        shadowRadius: 2,
                        elevation: 2,
                      }}
                    >
                      <Text className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-tight">
                        ⭐ Premium
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View 
                className={`w-16 h-16 rounded-xl items-center justify-center ${
                  isPremium ? 'bg-gradient-to-br from-[#FFD700] to-[#D4AF37]' : (isDark ? 'bg-slate-700' : 'bg-slate-100')
                }`}
                style={isPremium ? {
                  backgroundColor: '#D4AF37',
                  shadowColor: '#D4AF37',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.5,
                  shadowRadius: 6,
                  elevation: 6,
                } : {}}
              >
                <MaterialIcons 
                  name="workspace-premium" 
                  size={32} 
                  color={isPremium ? '#1F2937' : (isDark ? '#9CA3AF' : '#64748B')} 
                />
              </View>
            </View>
            {isPremium && trialEndsAt && subscriptionStatus === 'trial' && (
              <View 
                className={`rounded-xl p-3 border ${
                  isDark ? "bg-amber-900/30 border-amber-700/50" : "bg-amber-50 border-amber-200"
                }`}
                style={isPremium ? {
                  shadowColor: '#F59E0B',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                } : {}}
              >
                <Text className={`text-sm font-medium ${
                  isDark ? "text-amber-300" : "text-amber-700"
                }`}>
                  ⏰ Trial ends on: {formatDate(trialEndsAt)}
                </Text>
              </View>
            )}
            {isPremium && subscriptionStatus === 'active' && (
              <View 
                className={`rounded-xl p-3 border ${
                  isDark ? "bg-[#D4AF37]/20 border-[#D4AF37]/50" : "bg-[#FFD700]/10 border-[#D4AF37]/30"
                }`}
                style={{
                  shadowColor: '#D4AF37',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                <Text className={`text-sm font-semibold ${
                  isDark ? "text-[#FFD700]" : "text-[#D4AF37]"
                }`}>
                  ✨ Active Premium Subscription
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Plan Options */}
        <View className="px-6" style={{ gap: 16 }}>
          {/* Free Plan */}
          {!isPremium && (
            <View className={`rounded-2xl p-6 shadow-sm ${
              isDark ? "bg-slate-800" : "bg-white"
            }`}>
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1">
                  <Text className={`text-xl font-bold mb-1 ${isDark ? "text-white" : "text-slate-800"}`}>
                    Free Plan
                  </Text>
                  <Text className={`text-3xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                    £0<Text className={`text-lg font-normal ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                      /month
                    </Text>
                  </Text>
                </View>
                <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                  isDark ? "border-slate-600 bg-slate-700" : "border-slate-300 bg-white"
                }`}>
                  <MaterialIcons name="check" size={16} color="#2563EB" />
                </View>
              </View>
              <View className="gap-2 mb-4">
                {[
                  'Practice Hours Tracking',
                  'CPD Hours Logging',
                  'Basic Statistics',
                  'Document Gallery',
                ].map((feature, index) => (
                  <View key={index} className="flex-row items-center gap-2">
                    <MaterialIcons name="check-circle" size={20} color="#10B981" />
                    <Text className={`text-sm ${isDark ? "text-gray-300" : "text-slate-600"}`}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Premium Plan */}
          <View 
            className={`rounded-2xl p-6 shadow-lg border-2 ${
              isDark ? "bg-slate-800" : "bg-white"
            } ${isPremium ? 'border-[#D4AF37]' : (isDark ? 'border-[#D4AF37]/60' : 'border-[#D4AF37]')}`}
            style={!isPremium ? {
              shadowColor: '#D4AF37',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            } : {}}
          >
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-1">
                  <Text 
                    className={`text-xl font-bold ${
                      isPremium 
                        ? (isDark ? "text-[#FFD700]" : "text-[#D4AF37]")
                        : (isDark ? "text-white" : "text-slate-800")
                    }`}
                    style={!isPremium ? {
                      textShadowColor: 'rgba(212, 175, 55, 0.3)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2,
                    } : {}}
                  >
                    Premium Plan
                  </Text>
                  {!isPremium && (
                    <View 
                      className="bg-[#FFD700]/20 px-2 py-0.5 rounded-full border border-[#D4AF37]/50"
                      style={{
                        shadowColor: '#D4AF37',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.3,
                        shadowRadius: 2,
                        elevation: 2,
                      }}
                    >
                      <Text className="text-xs font-bold text-[#D4AF37]">⭐ POPULAR</Text>
                    </View>
                  )}
                </View>
                <Text 
                  className={`text-3xl font-bold ${
                    isPremium 
                      ? (isDark ? "text-[#FFD700]" : "text-[#D4AF37]")
                      : (isDark ? "text-white" : "text-slate-800")
                  }`}
                  style={!isPremium ? {
                    textShadowColor: 'rgba(212, 175, 55, 0.2)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  } : {}}
                >
                  £9.99<Text className={`text-lg font-normal ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                    /month
                  </Text>
                </Text>
              </View>
              <View 
                className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                  isPremium 
                    ? 'bg-[#D4AF37] border-[#D4AF37]' 
                    : (isDark ? 'border-[#D4AF37]/60 bg-[#D4AF37]/20' : 'border-[#D4AF37] bg-[#FFD700]/20')
                }`}
                style={!isPremium ? {
                  shadowColor: '#D4AF37',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.4,
                  shadowRadius: 3,
                  elevation: 3,
                } : {}}
              >
                {isPremium && (
                  <MaterialIcons name="check" size={16} color="#1F2937" />
                )}
              </View>
            </View>
            <View className="gap-2 mb-4">
              {[
                'Everything in Free',
                'Advanced Analytics',
                'PDF Export',
                'Push Notifications',
                'Offline Mode',
                'Premium Support',
              ].map((feature, index) => (
                <View key={index} className="flex-row items-center gap-2">
                  <MaterialIcons 
                    name="check-circle" 
                    size={20} 
                    color={isPremium ? "#D4AF37" : "#D4AF37"} 
                  />
                  <Text className={`text-sm ${isDark ? "text-gray-300" : "text-slate-600"}`}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
            {!isPremium && (
              <>
                <Pressable 
                  onPress={clientSecret ? handlePayment : handleUpgrade}
                  disabled={isProcessingPayment || !isStripeAvailable}
                  className={`rounded-xl p-4 items-center mt-2 flex-row justify-center ${
                    isProcessingPayment || !isStripeAvailable ? "bg-[#D4AF37]/50" : "bg-[#D4AF37]"
                  }`}
                  style={!isProcessingPayment && isStripeAvailable ? {
                    shadowColor: '#D4AF37',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.5,
                    shadowRadius: 6,
                    elevation: 6,
                  } : {}}
                >
                  {isProcessingPayment ? (
                    <Text className="text-white font-semibold text-base">Processing...</Text>
                  ) : clientSecret ? (
                    <>
                      <MaterialIcons name="lock" size={20} color="white" />
                      <Text className="text-white font-semibold text-base ml-2">Pay & Upgrade</Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons name="workspace-premium" size={20} color="white" />
                      <Text className="text-white font-semibold text-base ml-2">Upgrade to Premium</Text>
                    </>
                  )}
                </Pressable>
                {!isStripeAvailable && (
                  <View className={`mt-3 rounded-xl p-3 ${
                    isDark ? "bg-amber-900/20 border border-amber-800" : "bg-amber-50 border border-amber-200"
                  }`}>
                    <View className="flex-row items-start gap-2">
                      <MaterialIcons name="info" size={20} color="#F59E0B" />
                      <View className="flex-1">
                        <Text className={`text-sm font-medium mb-1 ${
                          isDark ? "text-amber-300" : "text-amber-800"
                        }`}>
                          Development Build Required
                        </Text>
                        <Text className={`text-xs ${
                          isDark ? "text-amber-400" : "text-amber-700"
                        }`}>
                          Stripe payments require a development build. Free plan works in Expo Go.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Manage Subscription */}
          {isPremium && (
            <View className={`rounded-2xl p-6 shadow-sm ${
              isDark ? "bg-slate-800" : "bg-white"
            }`}>
              <Text className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-800"}`}>
                Manage Subscription
              </Text>
              <View className="gap-3">
                <Pressable className={`flex-row items-center justify-between p-4 rounded-xl ${
                  isDark ? "bg-slate-700" : "bg-slate-50"
                }`}>
                  <View className="flex-row items-center gap-3">
                    <MaterialIcons name="credit-card" size={24} color={isDark ? "#9CA3AF" : "#64748B"} />
                    <Text className={`font-medium ${isDark ? "text-white" : "text-slate-800"}`}>
                      Payment Method
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={isDark ? "#64748B" : "#94A3B8"} />
                </Pressable>
                <Pressable className={`flex-row items-center justify-between p-4 rounded-xl ${
                  isDark ? "bg-slate-700" : "bg-slate-50"
                }`}>
                  <View className="flex-row items-center gap-3">
                    <MaterialIcons name="receipt" size={24} color={isDark ? "#9CA3AF" : "#64748B"} />
                    <Text className={`font-medium ${isDark ? "text-white" : "text-slate-800"}`}>
                      Billing History
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={isDark ? "#64748B" : "#94A3B8"} />
                </Pressable>
                <Pressable 
                  onPress={async () => {
                    // TODO: Implement cancel subscription API call
                    showToast.info("Cancel subscription feature coming soon", "Info");
                  }}
                  className="flex-row items-center justify-between p-4 bg-red-50 rounded-xl"
                >
                  <View className="flex-row items-center gap-3">
                    <MaterialIcons name="cancel" size={24} color="#DC2626" />
                    <Text className="text-red-600 font-medium">Cancel Subscription</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#DC2626" />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
