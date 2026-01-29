import React, { useState, useCallback, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver, SubmitHandler } from "react-hook-form";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    onboardingPlanSchema,
    type OnboardingPlanInput,
} from "@/validation/schema";
import { useThemeStore } from "@/features/theme/theme.store";
import { useAuthStore } from "@/features/auth/auth.store";
import { apiService, API_ENDPOINTS } from "@/services/api";
import { showToast } from "@/utils/toast";
import "../global.css";

// Safe Stripe import - only load native Stripe on native platforms
let useStripe: any;
let isStripeAvailable = false;

// Global flag to prevent repeated warnings (persists across hot reloads)
declare global {
    var __STRIPE_WARNING_LOGGED__: boolean | undefined;
}

if (Platform.OS !== 'web') {
    try {
        // Try to import Stripe - this will fail if native modules aren't available
        const stripeModule = require("@stripe/stripe-react-native");
        if (stripeModule && stripeModule.useStripe) {
            useStripe = stripeModule.useStripe;
            isStripeAvailable = true;
        } else {
            throw new Error("Stripe module not properly loaded");
        }
    } catch (error: any) {
        // Only log warning once to reduce console noise (using global to persist across hot reloads)
        if (!global.__STRIPE_WARNING_LOGGED__) {
            // Suppress the error message - it's expected in Expo Go
            global.__STRIPE_WARNING_LOGGED__ = true;
        }
        // Provide fallback hook that returns error functions
        useStripe = () => ({
            initPaymentSheet: async () => ({
                error: {
                    message: "Stripe is not available. Please build the app with native modules (development build).",
                    code: "STRIPE_NOT_AVAILABLE"
                }
            }),
            presentPaymentSheet: async () => ({
                error: {
                    message: "Stripe is not available. Please build the app with native modules (development build).",
                    code: "STRIPE_NOT_AVAILABLE"
                }
            }),
        });
    }
} else {
    // Web fallback
    useStripe = () => ({
        initPaymentSheet: async () => ({
            error: {
                message: "Stripe is not available on web. Use Stripe.js for web payments.",
                code: "STRIPE_NOT_AVAILABLE"
            }
        }),
        presentPaymentSheet: async () => ({
            error: {
                message: "Stripe is not available on web. Use Stripe.js for web payments.",
                code: "STRIPE_NOT_AVAILABLE"
            }
        }),
    });
}

// Plan selection component
const freeFeatures = [
    "User Authentication & Profile Management",
    "Practice Hours Tracking with Timer",
    "CPD Hours Logging",
    "Reflective Account Forms",
    "Feedback Log Recording",
    "Discussion & Appraisal Records",
    "Document Gallery (6 Categories)",
    "Calendar System",
    "Basic Statistics Dashboard",
    "Account Management",
];

const premiumFeatures = [
    "Everything in Free Tier",
    "Advanced Analytics Dashboard",
    "Portfolio Export (PDF)",
    "Section Reset Capability",
    "Push Notifications",
    "Offline Mode with Auto-Sync",
    "Enhanced Earnings Tracking",
    "Premium Support",
];

export default function PlanChoose() {
    const router = useRouter();
    const { isDark } = useThemeStore();
    const [isNavigating, setIsNavigating] = useState(false);
    const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    const stripe = useStripe();
    const initPaymentSheet = stripe?.initPaymentSheet || (async () => ({ error: { message: "Stripe not available" } }));
    const presentPaymentSheet = stripe?.presentPaymentSheet || (async () => ({ error: { message: "Stripe not available" } }));

    // Initialize payment sheet when client secret is available
    useEffect(() => {
        if (clientSecret) {
            initializePaymentSheet();
        }
    }, [clientSecret]);

    const initializePaymentSheet = async () => {
        if (!clientSecret) return;

        try {
            const { error } = await initPaymentSheet({
                paymentIntentClientSecret: clientSecret,
                merchantDisplayName: 'Revalidation Tracker',
            });

            if (error) {
                showToast.error(error.message || "Failed to initialize payment", "Error");
                setIsNavigating(false);
            }
        } catch (error: any) {
            showToast.error(error.message || "Failed to initialize payment", "Error");
            setIsNavigating(false);
        }
    };

    const {
        handleSubmit,
        setValue,
        watch,
        reset,
    } = useForm<OnboardingPlanInput>({
        resolver: zodResolver(onboardingPlanSchema) as Resolver<OnboardingPlanInput>,
        defaultValues: {
            selectedPlan: "free",
            trialSelected: false,
        },
    });

    const watchedPlan = watch("selectedPlan");
    const watchedTrial = watch("trialSelected");

    // Load saved data on mount
    useEffect(() => {
        const loadSavedData = async () => {
            try {
                const token = await AsyncStorage.getItem('authToken');
                if (!token) {
                    return;
                }

                const response = await apiService.get<{
                    success: boolean;
                    data: {
                        step4: { subscriptionTier: string | null };
                    };
                }>(API_ENDPOINTS.USERS.ONBOARDING.DATA, token);

                if (response?.data?.step4?.subscriptionTier) {
                    reset({
                        selectedPlan: response.data.step4.subscriptionTier as "free" | "premium" | "premium_yearly",
                        trialSelected: false,
                    });
                }
            } catch (error) {
                // Silently fail - user might not have saved data yet
                console.log('No saved plan data found');
            }
        };

        loadSavedData();
    }, [reset]);

    const onSubmit: SubmitHandler<OnboardingPlanInput> = useCallback(
        async (data) => {
            if (isNavigating) return;

            try {
                setIsNavigating(true);

                // Get auth token
                const token = await AsyncStorage.getItem('authToken');
                if (!token) {
                    showToast.error("Please log in again", "Error");
                    router.replace("/(auth)/login");
                    return;
                }

                // If free plan, just save and continue
                if (data.selectedPlan === "free") {
                    await apiService.post(
                        API_ENDPOINTS.USERS.ONBOARDING.STEP_4,
                        {
                            subscription_tier: data.selectedPlan,
                        },
                        token
                    );
                    // Mark onboarding as completed
                    useAuthStore.getState().setOnboardingCompleted(true);
                    router.replace("/(tabs)/home");
                    return;
                }

                // If premium plan, create subscription setup and show payment sheet
                if (data.selectedPlan === "premium" || data.selectedPlan === "premium_yearly") {
                    if (!isStripeAvailable) {
                        showToast.error("Stripe payment is not available. Please build the app with native modules enabled.", "Payment Unavailable");
                        setIsNavigating(false);
                        return;
                    }

                    // For yearly plan, we pass 'yearly' interval to the backend
                    const interval = data.selectedPlan === "premium_yearly" ? "year" : "month";

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
                        { interval }, // Pass interval to backend
                        token
                    );

                    if (paymentResponse?.data?.clientSecret) {
                        setPaymentIntentId(paymentResponse.data.paymentIntentId || paymentResponse.data.subscriptionId || null);
                        setClientSecret(paymentResponse.data.clientSecret);
                        // Payment sheet will be initialized via useEffect
                        // Then show payment button or auto-present
                        setIsNavigating(false);
                    } else {
                        throw new Error("Failed to create payment intent");
                    }
                }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error
                    ? error.message
                    : "Failed to process plan selection. Please try again.";

                showToast.error(errorMessage, "Error");
                setIsNavigating(false);
            }
        },
        [router, isNavigating]
    );

    // Handle payment - present payment sheet
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

            // Present payment sheet
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
                // Check if it's a subscription ID (starts with 'sub_') or payment intent ID
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

            // Save subscription plan
            // Note: Backend handles interval in payment intent, frontend just confirms 'premium' status
            // But we can save the specific tier if we want detailed analytics
            const tier = watchedPlan === "premium_yearly" ? "premium_yearly" : "premium";

            await apiService.post(
                API_ENDPOINTS.USERS.ONBOARDING.STEP_4,
                {
                    subscription_tier: tier,
                },
                token
            );

            setClientSecret(null);
            setPaymentIntentId(null);
            showToast.success("Payment successful! Premium plan activated.", "Success");
            // Mark onboarding as completed
            useAuthStore.getState().setOnboardingCompleted(true);
            router.replace("/(tabs)/home");
        } catch (error: unknown) {
            const errorMessage = error instanceof Error
                ? error.message
                : "Payment processing failed. Please try again.";
            showToast.error(errorMessage, "Payment Error");
            setIsProcessingPayment(false);
        }
    }, [clientSecret, paymentIntentId, router]);

    const onFormSubmit = handleSubmit(onSubmit);

    const handleSelectPlan = useCallback((plan: "free" | "premium" | "premium_yearly") => {
        setValue("selectedPlan", plan);
        if (plan === "free") {
            setValue("trialSelected", false);
        }
    }, [setValue]);

    return (
        <SafeAreaView
            className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`}
        >
            {/* Background decorative elements */}
            <View className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <View className="absolute -bottom-32 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
            >
                <View className="h-8" />

                <View className="flex-1 px-5 pb-4 w-full">
                    {/* Header */}
                    <View className="mt-6 mb-8">
                        <View className="mb-3">
                            <Text
                                className={`text-4xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
                            >
                                Choose Your Plan
                            </Text>
                            <View className="w-16 h-1 bg-primary rounded-full" />
                        </View>
                        <Text
                            className={`text-base font-light leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        >
                            Select the plan that best fits your revalidation tracking needs.
                        </Text>
                    </View>

                    {/* Plan Cards */}
                    <View className="gap-4 mb-6">
                        {/* Free Plan */}
                        <TouchableOpacity
                            onPress={(e) => {
                                e?.preventDefault?.();
                                handleSelectPlan("free");
                            }}
                            activeOpacity={0.8}
                            style={{
                                width: '100%',
                                borderRadius: 16,
                                borderWidth: 2,
                                padding: 24,
                                backgroundColor: watchedPlan === "free"
                                    ? "rgba(30, 90, 243, 0.1)"
                                    : isDark
                                        ? "rgba(30, 41, 59, 0.9)"
                                        : "#ffffff",
                                borderColor: watchedPlan === "free"
                                    ? "#1E5AF3"
                                    : isDark
                                        ? "rgba(51, 65, 85, 0.5)"
                                        : "#e5e7eb",
                                shadowColor: isDark ? "#000" : "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: isDark ? 0.1 : 0.05,
                                shadowRadius: 4,
                                elevation: 2,
                            }}
                        >
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-1">
                                    <Text
                                        className={`text-2xl font-bold mb-1 ${watchedPlan === "free"
                                            ? "text-primary"
                                            : isDark
                                                ? "text-white"
                                                : "text-gray-900"
                                            }`}
                                    >
                                        Free Plan
                                    </Text>
                                    <Text
                                        className={`text-3xl font-bold ${watchedPlan === "free"
                                            ? "text-primary"
                                            : isDark
                                                ? "text-white"
                                                : "text-gray-900"
                                            }`}
                                    >
                                        £0
                                        <Text className="text-lg font-normal">/month</Text>
                                    </Text>
                                </View>
                                <View
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${watchedPlan === "free"
                                        ? "bg-primary border-primary"
                                        : isDark
                                            ? "border-slate-600 bg-slate-800"
                                            : "border-gray-300 bg-white"
                                        }`}
                                >
                                    {watchedPlan === "free" && (
                                        <MaterialIcons name="check" size={16} color="white" />
                                    )}
                                </View>
                            </View>
                            <View className="gap-2">
                                {freeFeatures.map((feature, index) => (
                                    <View key={index} className="flex-row items-start gap-2">
                                        <MaterialIcons
                                            name="check-circle"
                                            size={20}
                                            color={watchedPlan === "free" ? "#1E5AF3" : isDark ? "#9CA3AF" : "#6B7280"}
                                        />
                                        <Text
                                            className={`flex-1 text-sm ${isDark ? "text-gray-300" : "text-gray-700"
                                                }`}
                                        >
                                            {feature}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </TouchableOpacity>

                        {/* Premium Plan */}
                        <TouchableOpacity
                            onPress={(e) => {
                                e?.preventDefault?.();
                                handleSelectPlan("premium");
                            }}
                            activeOpacity={0.8}
                            style={{
                                width: '100%',
                                borderRadius: 16,
                                borderWidth: 2,
                                padding: 24,
                                position: 'relative',
                                backgroundColor: watchedPlan === "premium"
                                    ? "rgba(30, 90, 243, 0.1)"
                                    : isDark
                                        ? "rgba(30, 41, 59, 0.9)"
                                        : "#ffffff",
                                borderColor: watchedPlan === "premium"
                                    ? "#1E5AF3"
                                    : isDark
                                        ? "rgba(51, 65, 85, 0.5)"
                                        : "#e5e7eb",
                                shadowColor: isDark ? "#000" : "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: isDark ? 0.1 : 0.05,
                                shadowRadius: 4,
                                elevation: 2,
                            }}
                        >
                            {/* Popular Badge */}
                            <View className="absolute -top-3 right-6 bg-primary px-3 py-1 rounded-full">
                                <Text className="text-white text-xs font-bold">POPULAR</Text>
                            </View>

                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-1">
                                    <Text
                                        className={`text-2xl font-bold mb-1 ${watchedPlan === "premium"
                                            ? "text-primary"
                                            : isDark
                                                ? "text-white"
                                                : "text-gray-900"
                                            }`}
                                    >
                                        Premium Plan
                                    </Text>
                                    <View className="flex-row items-baseline gap-1">
                                        <Text
                                            className={`text-3xl font-bold ${watchedPlan === "premium"
                                                ? "text-primary"
                                                : isDark
                                                    ? "text-white"
                                                    : "text-gray-900"
                                                }`}
                                        >
                                            £9.99
                                        </Text>
                                        <Text
                                            className={`text-lg ${isDark ? "text-gray-400" : "text-gray-500"
                                                }`}
                                        >
                                            /month
                                        </Text>
                                    </View>
                                </View>
                                <View
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${watchedPlan === "premium"
                                        ? "bg-primary border-primary"
                                        : isDark
                                            ? "border-slate-600 bg-slate-800"
                                            : "border-gray-300 bg-white"
                                        }`}
                                >
                                    {watchedPlan === "premium" && (
                                        <MaterialIcons name="check" size={16} color="white" />
                                    )}
                                </View>
                            </View>
                            <View className="gap-2">
                                {premiumFeatures.map((feature, index) => (
                                    <View key={index} className="flex-row items-start gap-2">
                                        <MaterialIcons
                                            name="check-circle"
                                            size={20}
                                            color={watchedPlan === "premium" ? "#1E5AF3" : isDark ? "#9CA3AF" : "#6B7280"}
                                        />
                                        <Text
                                            className={`flex-1 text-sm ${isDark ? "text-gray-300" : "text-gray-700"
                                                }`}
                                        >
                                            {feature}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </TouchableOpacity>

                        {/* Premium Yearly Plan */}
                        <TouchableOpacity
                            onPress={(e) => {
                                e?.preventDefault?.();
                                handleSelectPlan("premium_yearly");
                            }}
                            activeOpacity={0.8}
                            style={{
                                width: '100%',
                                borderRadius: 16,
                                borderWidth: 2,
                                padding: 24,
                                position: 'relative',
                                backgroundColor: watchedPlan === "premium_yearly"
                                    ? "rgba(212, 175, 55, 0.1)"
                                    : isDark
                                        ? "rgba(30, 41, 59, 0.9)"
                                        : "#ffffff",
                                borderColor: watchedPlan === "premium_yearly"
                                    ? "#D4AF37"
                                    : isDark
                                        ? "rgba(51, 65, 85, 0.5)"
                                        : "#e5e7eb",
                                shadowColor: isDark ? "#000" : "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: isDark ? 0.1 : 0.05,
                                shadowRadius: 4,
                                elevation: 2,
                            }}
                        >
                            {/* Best Value Badge */}
                            <View className="absolute -top-3 right-6 bg-[#D4AF37] px-3 py-1 rounded-full">
                                <Text className="text-white text-xs font-bold">BEST VALUE</Text>
                            </View>

                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-1">
                                    <Text
                                        className={`text-2xl font-bold mb-1 ${watchedPlan === "premium_yearly"
                                            ? "text-[#D4AF37]"
                                            : isDark
                                                ? "text-white"
                                                : "text-gray-900"
                                            }`}
                                    >
                                        Yearly Plan
                                    </Text>
                                    <View className="flex-row items-baseline gap-1">
                                        <Text
                                            className={`text-3xl font-bold ${watchedPlan === "premium_yearly"
                                                ? "text-[#D4AF37]"
                                                : isDark
                                                    ? "text-white"
                                                    : "text-gray-900"
                                                }`}
                                        >
                                            £99.99
                                        </Text>
                                        <Text
                                            className={`text-lg ${isDark ? "text-gray-400" : "text-gray-500"
                                                }`}
                                        >
                                            /year
                                        </Text>
                                    </View>
                                    <Text className="text-xs text-green-600 font-medium mt-1">
                                        Save ~17% (2 months free)
                                    </Text>
                                </View>
                                <View
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${watchedPlan === "premium_yearly"
                                        ? "bg-[#D4AF37] border-[#D4AF37]"
                                        : isDark
                                            ? "border-slate-600 bg-slate-800"
                                            : "border-gray-300 bg-white"
                                        }`}
                                >
                                    {watchedPlan === "premium_yearly" && (
                                        <MaterialIcons name="check" size={16} color="white" />
                                    )}
                                </View>
                            </View>
                            <View className="gap-2">
                                {premiumFeatures.map((feature, index) => (
                                    <View key={index} className="flex-row items-start gap-2">
                                        <MaterialIcons
                                            name="check-circle"
                                            size={20}
                                            color={watchedPlan === "premium_yearly" ? "#D4AF37" : isDark ? "#9CA3AF" : "#6B7280"}
                                        />
                                        <Text
                                            className={`flex-1 text-sm ${isDark ? "text-gray-300" : "text-gray-700"
                                                }`}
                                        >
                                            {feature}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </TouchableOpacity>

                        {/* Free Trial Option */}
                        {(watchedPlan === "premium" || watchedPlan === "premium_yearly") && (
                            <View
                                className={`rounded-2xl p-4 border ${watchedTrial
                                    ? "bg-primary/10 border-primary"
                                    : isDark
                                        ? "bg-slate-800/50 border-slate-700/50"
                                        : "bg-gray-50 border-gray-200"
                                    }`}
                            >
                                <TouchableOpacity
                                    onPress={() => setValue("trialSelected", !watchedTrial)}
                                    activeOpacity={0.8}
                                    className="flex-row items-center gap-3"
                                >
                                    <View
                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${watchedTrial
                                            ? "bg-primary border-primary"
                                            : isDark
                                                ? "border-slate-600 bg-slate-800"
                                                : "border-gray-300 bg-white"
                                            }`}
                                    >
                                        {watchedTrial && (
                                            <MaterialIcons name="check" size={14} color="white" />
                                        )}
                                    </View>
                                    <View className="flex-1">
                                        <Text
                                            className={`font-semibold ${isDark ? "text-white" : "text-gray-900"
                                                }`}
                                        >
                                            Start 28-Day Free Trial
                                        </Text>
                                        <Text
                                            className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"
                                                }`}
                                        >
                                            Try all premium features free for 28 days. Cancel anytime.
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Continue/Payment Button */}
            <View className={`px-6 pb-8 pt-4 border-t ${isDark ? "border-slate-700/50" : "border-gray-200"}`}>
                {(watchedPlan === "premium" || watchedPlan === "premium_yearly") && clientSecret ? (
                    <TouchableOpacity
                        onPress={handlePayment}
                        disabled={isProcessingPayment || isNavigating}
                        className={`w-full py-4 rounded-2xl flex-row items-center justify-center ${isProcessingPayment || isNavigating
                            ? "bg-primary/50"
                            : "bg-primary"
                            }`}
                        style={{
                            shadowColor: "#1E5AF3",
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.3,
                            shadowRadius: 12,
                            elevation: 8,
                        }}
                    >
                        {isProcessingPayment ? (
                            <Text className="text-white font-bold text-base">Processing Payment...</Text>
                        ) : (
                            <>
                                <MaterialIcons name="lock" size={20} color="white" style={{ marginRight: 8 }} />
                                <Text className="text-white font-bold text-base">Pay & Continue</Text>
                            </>
                        )}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={onFormSubmit}
                        activeOpacity={0.8}
                        disabled={isNavigating}
                        className={`w-full bg-primary py-4 rounded-2xl flex-row items-center justify-center ${isNavigating ? "opacity-50" : "active:opacity-90"
                            }`}
                        style={{
                            shadowColor: "#1E5AF3",
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.25,
                            shadowRadius: 12,
                            elevation: 8,
                        }}
                    >
                        <Text className="text-white font-semibold text-base">
                            {watchedPlan === "premium" && watchedTrial
                                ? "Start Free Trial"
                                : watchedPlan === "premium"
                                    ? "Subscribe to Premium"
                                    : "Continue with Free Plan"}
                        </Text>
                        <MaterialIcons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                )}
                {watchedPlan === "free" && (
                    <Text
                        className={`text-center text-xs mt-3 ${isDark ? "text-gray-400" : "text-gray-500"
                            }`}
                    >
                        You can upgrade to Premium anytime from settings
                    </Text>
                )}
            </View>

        </SafeAreaView>
    );
}
