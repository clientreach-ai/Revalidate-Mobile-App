import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import "../global.css";

const onboardingSteps = [
    {
        title: "Track Your Practice Hours",
        description: "Start timers, log work sessions, and never lose track of your professional hours for revalidation.",
        icon: "access-time",
        illustration: "clock",
    },
    {
        title: "Log CPD Activities",
        description: "Record training activities, conferences, and continuing professional development with evidence uploads.",
        icon: "school",
        illustration: "cpd",
    },
    {
        title: "Organize Your Evidence",
        description: "Store all your documents, feedback, reflective accounts, and appraisal records in one secure place.",
        icon: "folder",
        illustration: "documents",
    },
    {
        title: "Monitor Your Progress",
        description: "Track your completion status against revalidation requirements with real-time statistics and insights.",
        icon: "bar-chart",
        illustration: "stats",
    },
];

export default function OnboardingIndex() {
    const router = useRouter();
    const [isDark] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const bounceAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(bounceAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(bounceAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [bounceAnim]);

    useEffect(() => {
        // Animate slide position when step changes
        Animated.spring(slideAnim, {
            toValue: currentStep,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
        }).start();
    }, [currentStep, slideAnim]);

    const translateY = bounceAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -10],
    });

    const handleNext = () => {
        if (currentStep < onboardingSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            // Last step - navigate to role selection
            router.push("/(onboarding)/role-selection");
        }
    };

    const handleSkip = () => {
        router.push("/(onboarding)/role-selection");
    };

    const isLastStep = currentStep === onboardingSteps.length - 1;

    return (
        <SafeAreaView
            className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`}
        >
            {/* Skip Button */}
            <View className="flex-row justify-end px-6 py-2">
                <Pressable onPress={handleSkip}>
                    <Text className={`font-medium py-2 px-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        Skip
                    </Text>
                </Pressable>
            </View>

            {/* Main Content */}
            <View className="flex-1 overflow-hidden">
                {onboardingSteps.map((step, index) => {
                    const inputRange = onboardingSteps.map((_, i) => i);
                    const translateX = slideAnim.interpolate({
                        inputRange,
                        outputRange: inputRange.map(i => (i - index) * 100),
                    });
                    const opacity = slideAnim.interpolate({
                        inputRange: [index - 1, index, index + 1],
                        outputRange: [0, 1, 0],
                        extrapolate: 'clamp',
                    });
                    const scale = slideAnim.interpolate({
                        inputRange: [index - 1, index, index + 1],
                        outputRange: [0.9, 1, 0.9],
                        extrapolate: 'clamp',
                    });

                    return (
                        <Animated.View
                            key={index}
                            className="absolute flex-1 flex-col items-center justify-center px-8 w-full"
                            style={{
                                transform: [{ translateX }, { scale }],
                                opacity,
                            }}
                        >
                            {/* Illustration Container */}
                            <View className="relative w-full max-w-[320px] flex items-center justify-center mb-12" style={{ height: 320 }}>
                                {/* Background Blobs */}
                                <View className="absolute w-48 h-48 bg-primary/20 rounded-full -top-4 -left-4 opacity-50" style={{ transform: [{ scale: 1.5 }] }} />
                                <View className="absolute w-32 h-32 bg-blue-400/10 rounded-full bottom-0 right-0 opacity-50" style={{ transform: [{ scale: 1.5 }] }} />

                                {/* Dynamic Illustration */}
                                {step.illustration === "clock" && (
                                    <View className={`relative p-8 rounded-[40px] border shadow-2xl ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
                                        <View className="w-32 h-32 rounded-full border-8 border-primary flex items-center justify-center relative">
                                            <View className="absolute w-1 h-12 bg-primary rounded-full origin-bottom top-4" />
                                            <View className={`absolute w-1 h-8 rounded-full origin-bottom rotate-90 ${isDark ? "bg-slate-600" : "bg-slate-300"}`} />
                                            <View className={`w-3 h-3 bg-primary rounded-full z-10 border-2 ${isDark ? "border-slate-800" : "border-white"}`} />
                                            <Animated.View
                                                className={`absolute -top-4 -right-8 ${isDark ? "bg-slate-700" : "bg-white"} shadow-lg rounded-2xl p-3 border ${isDark ? "border-slate-600" : "border-slate-50"}`}
                                                style={{ transform: [{ translateY }] }}
                                            >
                                                <MaterialIcons name="check-circle" size={20} color="#10B981" />
                                            </Animated.View>
                                            <View className={`absolute top-1/2 -left-12 ${isDark ? "bg-slate-700" : "bg-white"} shadow-lg rounded-2xl p-3 border ${isDark ? "border-slate-600" : "border-slate-50"}`}>
                                                <Text className="text-xs font-bold text-primary">+8.5h</Text>
                                            </View>
                                        </View>
                                        <View className="mt-6 flex-row gap-2">
                                            <View className={`h-2 w-16 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-100"}`} />
                                            <View className="h-2 w-8 bg-primary/30 rounded-full" />
                                        </View>
                                    </View>
                                )}
                                {step.illustration === "cpd" && (
                                    <View className={`relative p-8 rounded-[40px] border shadow-2xl ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
                                        <View className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
                                            <MaterialIcons name="school" size={64} color="#1E5AF3" />
                                        </View>
                                        <View className="mt-6 flex-row gap-2 justify-center">
                                            <View className={`p-3 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"}`}>
                                                <MaterialIcons name="description" size={24} color={isDark ? "#9CA3AF" : "#6B7280"} />
                                            </View>
                                            <View className={`p-3 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"}`}>
                                                <MaterialIcons name="verified" size={24} color={isDark ? "#9CA3AF" : "#6B7280"} />
                                            </View>
                                            <View className={`p-3 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"}`}>
                                                <MaterialIcons name="video-library" size={24} color={isDark ? "#9CA3AF" : "#6B7280"} />
                                            </View>
                                        </View>
                                    </View>
                                )}
                                {step.illustration === "documents" && (
                                    <View className={`relative p-8 rounded-[40px] border shadow-2xl ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
                                        <View className="flex-row flex-wrap gap-3 justify-center">
                                            {[1, 2, 3, 4].map((i) => (
                                                <View
                                                    key={i}
                                                    className={`w-20 h-24 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"} flex items-center justify-center`}
                                                >
                                                    <MaterialIcons name="description" size={32} color={isDark ? "#9CA3AF" : "#6B7280"} />
                                                </View>
                                            ))}
                                        </View>
                                        <View className="mt-4 flex-row gap-2 justify-center">
                                            <View className="h-2 w-8 bg-primary rounded-full" />
                                            <View className={`h-2 w-2 rounded-full ${isDark ? "bg-slate-600" : "bg-slate-300"}`} />
                                            <View className={`h-2 w-2 rounded-full ${isDark ? "bg-slate-600" : "bg-slate-300"}`} />
                                        </View>
                                    </View>
                                )}
                                {step.illustration === "stats" && (
                                    <View className={`relative p-8 rounded-[40px] border shadow-2xl ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
                                        <View className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                            <MaterialIcons name="bar-chart" size={64} color="#1E5AF3" />
                                        </View>
                                        <View className="flex-row gap-3 justify-center">
                                            <View className="items-center">
                                                <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>450</Text>
                                                <Text className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Hours</Text>
                                            </View>
                                            <View className={`w-px ${isDark ? "bg-slate-600" : "bg-slate-300"}`} />
                                            <View className="items-center">
                                                <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>85%</Text>
                                                <Text className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Complete</Text>
                                            </View>
                                        </View>
                                        <View className={`mt-4 h-2 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
                                            <View className="h-full bg-primary rounded-full" style={{ width: "85%" }} />
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Text Content */}
                            <View className="items-center max-w-sm">
                                <Text
                                    className={`text-3xl font-bold leading-tight text-center mb-4 ${
                                        isDark ? "text-blue-400" : "text-primary"
                                    }`}
                                >
                                    {step.title}
                                </Text>
                                <Text
                                    className={`text-base leading-relaxed text-center ${
                                        isDark ? "text-gray-400" : "text-gray-500"
                                    }`}
                                >
                                    {step.description}
                                </Text>
                            </View>
                        </Animated.View>
                    );
                })}
            </View>

            {/* Bottom Section */}
            <View className={`px-6 pb-12 pt-6 gap-8 ${isDark ? "bg-background-dark" : "bg-background-light"}`}>
                {/* Progress Dots */}
                <View className="flex-row justify-center items-center gap-2">
                    {onboardingSteps.map((_, index) => (
                        <View
                            key={index}
                            className={`h-2 rounded-full ${
                                index === currentStep
                                    ? "w-6 bg-primary"
                                    : `w-2 ${isDark ? "bg-slate-700" : "bg-slate-300"}`
                            }`}
                        />
                    ))}
                </View>

                {/* Next Button */}
                <Pressable
                    onPress={handleNext}
                    className="w-full bg-primary py-4 rounded-2xl active:opacity-90 flex-row items-center justify-center"
                    style={{
                        shadowColor: "#1E5AF3",
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.25,
                        shadowRadius: 12,
                        elevation: 8,
                    }}
                >
                    <Text className="text-white font-semibold text-base">
                        {isLastStep ? "Get Started" : "Next"}
                    </Text>
                    <MaterialIcons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
