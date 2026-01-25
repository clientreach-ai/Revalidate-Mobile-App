import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver, SubmitHandler } from "react-hook-form";
import {
    onboardingPlanSchema,
    type OnboardingPlanInput,
} from "@/validation/schema";
import { useThemeStore } from "@/features/theme/theme.store";
import "../global.css";

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

    const {
        handleSubmit,
        setValue,
        watch,
    } = useForm<OnboardingPlanInput>({
        resolver: zodResolver(onboardingPlanSchema) as Resolver<OnboardingPlanInput>,
        defaultValues: {
            selectedPlan: "free",
            trialSelected: false,
        },
    });

    const watchedPlan = watch("selectedPlan");
    const watchedTrial = watch("trialSelected");

    const onSubmit: SubmitHandler<OnboardingPlanInput> = useCallback(
        (data) => {
            if (isNavigating) return;
            console.log("Onboarding plan submitted:", data);
            setIsNavigating(true);
            setTimeout(() => {
                try {
                    router.replace("/(tabs)/home");
                } catch (error) {
                    console.error("Navigation error:", error);
                    setIsNavigating(false);
                }
            }, 0);
        },
        [router, isNavigating]
    );

    const onFormSubmit = handleSubmit(onSubmit);

    const handleSelectPlan = useCallback((plan: "free" | "premium") => {
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
                                        className={`text-2xl font-bold mb-1 ${
                                            watchedPlan === "free"
                                                ? "text-primary"
                                                : isDark
                                                ? "text-white"
                                                : "text-gray-900"
                                        }`}
                                    >
                                        Free Plan
                                    </Text>
                                    <Text
                                        className={`text-3xl font-bold ${
                                            watchedPlan === "free"
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
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                        watchedPlan === "free"
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
                                            className={`flex-1 text-sm ${
                                                isDark ? "text-gray-300" : "text-gray-700"
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
                                        className={`text-2xl font-bold mb-1 ${
                                            watchedPlan === "premium"
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
                                            className={`text-3xl font-bold ${
                                                watchedPlan === "premium"
                                                    ? "text-primary"
                                                    : isDark
                                                    ? "text-white"
                                                    : "text-gray-900"
                                            }`}
                                        >
                                            £9.99
                                        </Text>
                                        <Text
                                            className={`text-lg ${
                                                isDark ? "text-gray-400" : "text-gray-500"
                                            }`}
                                        >
                                            /month
                                        </Text>
                                    </View>
                                </View>
                                <View
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                        watchedPlan === "premium"
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
                                            className={`flex-1 text-sm ${
                                                isDark ? "text-gray-300" : "text-gray-700"
                                            }`}
                                        >
                                            {feature}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </TouchableOpacity>

                        {/* Free Trial Option */}
                        {watchedPlan === "premium" && (
                            <View
                                className={`rounded-2xl p-4 border ${
                                    watchedTrial
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
                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                            watchedTrial
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
                                            className={`font-semibold ${
                                                isDark ? "text-white" : "text-gray-900"
                                            }`}
                                        >
                                            Start 28-Day Free Trial
                                        </Text>
                                        <Text
                                            className={`text-sm mt-1 ${
                                                isDark ? "text-gray-400" : "text-gray-500"
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

            {/* Continue Button */}
            <View className={`px-6 pb-8 pt-4 border-t ${isDark ? "border-slate-700/50" : "border-gray-200"}`}>
                <TouchableOpacity
                    onPress={onFormSubmit}
                    activeOpacity={0.8}
                    disabled={isNavigating}
                    className={`w-full bg-primary py-4 rounded-2xl flex-row items-center justify-center ${
                        isNavigating ? "opacity-50" : "active:opacity-90"
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
                {watchedPlan === "free" && (
                    <Text
                        className={`text-center text-xs mt-3 ${
                            isDark ? "text-gray-400" : "text-gray-500"
                        }`}
                    >
                        You can upgrade to Premium anytime from settings
                    </Text>
                )}
            </View>
        </SafeAreaView>
    );
}
