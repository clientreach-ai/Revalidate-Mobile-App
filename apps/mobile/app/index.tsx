import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemeStore } from "@/features/theme/theme.store";
import { useAuthStore, useAuthHydrated } from "@/features/auth/auth.store";
import { useSubscriptionStore } from "@/features/subscription/subscription.store";
import { apiService, API_ENDPOINTS } from "@/services/api";
import { checkNetworkStatus } from "@/services/network-monitor";
import "./global.css";

export default function SplashScreen() {
    const spinAnim = useRef(new Animated.Value(0)).current;
    const router = useRouter();
    const { isDark, toggleTheme } = useThemeStore();
    const hasHydrated = useAuthHydrated();
    const [hasNavigated, setHasNavigated] = useState(false);

    // Spin animation for loader
    useEffect(() => {
        Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: true,
            })
        ).start();
    }, [spinAnim]);

    // Check auth state and route accordingly
    useEffect(() => {
        // Wait for Zustand store to hydrate from AsyncStorage
        if (!hasHydrated || hasNavigated) return;

        const checkAuthAndRoute = async () => {
            try {
                let { isAuthenticated, onboardingCompleted, token } = useAuthStore.getState();
                const { isPremium, canUseOffline } = useSubscriptionStore.getState();
                const isOnline = await checkNetworkStatus();

                // Fallback: check AsyncStorage for existing users who logged in before auth store was implemented
                if (!token) {
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                    const storedToken = await AsyncStorage.getItem('authToken');
                    if (storedToken) {
                        token = storedToken;
                        isAuthenticated = true;
                        // Migrate to auth store
                        const userData = await AsyncStorage.getItem('userData');
                        if (userData) {
                            const user = JSON.parse(userData);
                            useAuthStore.getState().setAuth(storedToken, {
                                id: user.id,
                                email: user.email,
                                firstName: user.firstName,
                                lastName: user.lastName,
                            });
                        }
                    }
                }

                // Not authenticated - go to login
                if (!isAuthenticated || !token) {
                    navigateWithDelay("/(auth)/login");
                    return;
                }

                // Authenticated + Onboarding completed = go to home
                // For premium users offline, trust local state
                if (onboardingCompleted) {
                    navigateWithDelay("/(tabs)/home");
                    return;
                }

                // If online, check with API for fresh onboarding status
                if (isOnline) {
                    try {
                        const progress = await apiService.get<{
                            success: boolean;
                            data: { completed: boolean; currentStep: number };
                        }>(API_ENDPOINTS.USERS.ONBOARDING.PROGRESS, token);

                        if (progress?.data?.completed) {
                            useAuthStore.getState().setOnboardingCompleted(true);
                            navigateWithDelay("/(tabs)/home");
                        } else {
                            const step = progress?.data?.currentStep || 1;
                            routeToOnboardingStep(step);
                        }
                    } catch (apiError) {
                        // API failed but token exists - check if premium user offline
                        if (isPremium || canUseOffline) {
                            // Trust local state for premium users
                            navigateWithDelay("/(tabs)/home");
                        } else {
                            // Free user without completed onboarding - go to onboarding
                            navigateWithDelay("/(onboarding)/role-selection");
                        }
                    }
                } else {
                    // Offline mode
                    if (isPremium || canUseOffline) {
                        // Premium offline - trust local state
                        navigateWithDelay("/(tabs)/home");
                    } else {
                        // Free user offline without completed onboarding
                        navigateWithDelay("/(onboarding)/role-selection");
                    }
                }
            } catch (error) {
                console.warn("Auth check error:", error);
                navigateWithDelay("/(auth)/login");
            }
        };

        const navigateWithDelay = (route: string) => {
            setHasNavigated(true);
            requestAnimationFrame(() => {
                setTimeout(() => {
                    router.replace(route as any);
                }, 1200);
            });
        };

        const routeToOnboardingStep = (step: number) => {
            if (step === 2) {
                navigateWithDelay("/(onboarding)/personal-details");
            } else if (step === 3) {
                navigateWithDelay("/(onboarding)/professional-details");
            } else if (step === 4) {
                navigateWithDelay("/(onboarding)/plan-choose");
            } else {
                navigateWithDelay("/(onboarding)/role-selection");
            }
        };

        checkAuthAndRoute();
    }, [hasHydrated, hasNavigated, router]);

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    return (
        <SafeAreaView
            className={`flex-1 items-center justify-center ${isDark ? "bg-background-dark" : "bg-background-light"
                }`}
        >
            {/* Background circles */}
            <View className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <View className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Dark mode toggle button */}
            <Pressable
                className={`absolute top-4 right-4 p-2 rounded-full shadow-lg ${isDark ? "bg-slate-800/80" : "bg-white/80"
                    }`}
                onPress={toggleTheme}
            >
                <MaterialIcons
                    name={isDark ? "light-mode" : "dark-mode"}
                    size={20}
                    color={isDark ? "#D1D5DB" : "#4B5563"}
                />
            </Pressable>

            {/* Main content */}
            <View className="items-center px-8">
                <Image
                    source={require("../assets/logo.png")}
                    className="w-[300px] h-[300px] mb-5"
                    resizeMode="contain"
                />
                <Text
                    className={`text-4xl font-bold mb-2 ${isDark ? "text-white" : "text-primary"}`}
                >
                    Revalidate
                </Text>
                <Text
                    className={`text-base font-medium text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                    Your Professional Portfolio, Simplified
                </Text>
            </View>

            {/* Bottom spinning loader */}
            <View className="absolute bottom-12 items-center">
                <Animated.View
                    style={{ transform: [{ rotate: spin }] }}
                    className={`w-8 h-8 border-4 ${isDark ? "border-gray-800" : "border-gray-200"} border-t-primary rounded-full`}
                />
                <View className="flex-col items-center mt-2 space-y-1">
                    <Text
                        className={`text-[10px] uppercase tracking-widest font-semibold ${isDark ? "text-gray-500" : "text-gray-400"}`}
                    >
                        Trustworthy Healthcare Tracking
                    </Text>
                    <View className="flex-row space-x-2 text-gray-700">
                        <View className="w-1.5 h-1.5 rounded-full bg-current" />
                        <View className="w-1.5 h-1.5 rounded-full bg-current" />
                        <View className="w-1.5 h-1.5 rounded-full bg-current" />
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}
