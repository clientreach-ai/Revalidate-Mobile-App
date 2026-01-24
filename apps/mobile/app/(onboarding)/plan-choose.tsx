import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
    // Get router - this should work fine with Expo Router
    const router = useRouter();
    const [isDark] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<"free" | "premium">("free");
    const [trialSelected, setTrialSelected] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    const handleContinue = useCallback(() => {
        if (isNavigating) return;
        
        try {
            setIsNavigating(true);
            // Use setTimeout to ensure state updates complete before navigation
            setTimeout(() => {
                try {
                    // Navigate to dashboard - using replace to prevent going back to onboarding
                    router.replace("/(tabs)/dashboard");
                } catch (error) {
                    console.error("Navigation error:", error);
                    setIsNavigating(false);
                }
            }, 0);
        } catch (error) {
            console.error("Error in handleContinue:", error);
            setIsNavigating(false);
        }
    }, [router, isNavigating]);

    const handleSelectPlan = useCallback((plan: "free" | "premium") => {
        // Wrap in try-catch to prevent any errors from propagating
        try {
            // Direct state update - no navigation context needed
            setSelectedPlan(plan);
            if (plan === "free") {
                setTrialSelected(false);
            }
        } catch (error) {
            // Silently handle any errors - this shouldn't happen but just in case
            console.warn("Error in handleSelectPlan:", error);
        }
    }, []);

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
                                // Prevent any default behavior and handle the press
                                e?.preventDefault?.();
                                handleSelectPlan("free");
                            }}
                            activeOpacity={0.8}
                            style={{
                                width: '100%',
                                borderRadius: 16,
                                borderWidth: 2,
                                padding: 24,
                                backgroundColor: selectedPlan === "free" 
                                    ? "rgba(30, 90, 243, 0.1)" 
                                    : isDark 
                                    ? "rgba(30, 41, 59, 0.9)" 
                                    : "#ffffff",
                                borderColor: selectedPlan === "free" 
                                    ? "#1E5AF3" 
                                    : isDark 
                                    ? "rgba(51, 65, 85, 0.5)" 
                                    : "#e5e7eb",
                                shadowColor: selectedPlan === "free" ? "#1E5AF3" : isDark ? "#000" : "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: selectedPlan === "free" ? 0.15 : isDark ? 0.1 : 0.05,
                                shadowRadius: 4,
                                elevation: selectedPlan === "free" ? 4 : 2,
                            }}
                        >
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-1">
                                    <Text
                                        className={`text-2xl font-bold mb-1 ${
                                            selectedPlan === "free"
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
                                            selectedPlan === "free"
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
                                        selectedPlan === "free"
                                            ? "bg-primary border-primary"
                                            : isDark
                                            ? "border-slate-600 bg-slate-800"
                                            : "border-gray-300 bg-white"
                                    }`}
                                >
                                    {selectedPlan === "free" && (
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
                                            color={selectedPlan === "free" ? "#1E5AF3" : isDark ? "#9CA3AF" : "#6B7280"}
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
                                // Prevent any default behavior and handle the press
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
                                backgroundColor: selectedPlan === "premium" 
                                    ? "rgba(30, 90, 243, 0.1)" 
                                    : isDark 
                                    ? "rgba(30, 41, 59, 0.9)" 
                                    : "#ffffff",
                                borderColor: selectedPlan === "premium" 
                                    ? "#1E5AF3" 
                                    : isDark 
                                    ? "rgba(51, 65, 85, 0.5)" 
                                    : "#e5e7eb",
                                shadowColor: selectedPlan === "premium" ? "#1E5AF3" : isDark ? "#000" : "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: selectedPlan === "premium" ? 0.15 : isDark ? 0.1 : 0.05,
                                shadowRadius: 4,
                                elevation: selectedPlan === "premium" ? 4 : 2,
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
                                            selectedPlan === "premium"
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
                                                selectedPlan === "premium"
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
                                        selectedPlan === "premium"
                                            ? "bg-primary border-primary"
                                            : isDark
                                            ? "border-slate-600 bg-slate-800"
                                            : "border-gray-300 bg-white"
                                    }`}
                                >
                                    {selectedPlan === "premium" && (
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
                                            color={selectedPlan === "premium" ? "#1E5AF3" : isDark ? "#9CA3AF" : "#6B7280"}
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
                        {selectedPlan === "premium" && (
                            <View
                                className={`rounded-2xl p-4 border ${
                                    trialSelected
                                        ? "bg-primary/10 border-primary"
                                        : isDark
                                        ? "bg-slate-800/50 border-slate-700/50"
                                        : "bg-gray-50 border-gray-200"
                                }`}
                            >
                                <TouchableOpacity
                                    onPress={() => setTrialSelected(!trialSelected)}
                                    activeOpacity={0.8}
                                    className="flex-row items-center gap-3"
                                >
                                    <View
                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                            trialSelected
                                                ? "bg-primary border-primary"
                                                : isDark
                                                ? "border-slate-600 bg-slate-800"
                                                : "border-gray-300 bg-white"
                                        }`}
                                    >
                                        {trialSelected && (
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
                    onPress={handleContinue}
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
                        {selectedPlan === "premium" && trialSelected
                            ? "Start Free Trial"
                            : selectedPlan === "premium"
                            ? "Subscribe to Premium"
                            : "Continue with Free Plan"}
                    </Text>
                    <MaterialIcons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
                {selectedPlan === "free" && (
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
