import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemeStore } from "@/features/theme/theme.store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiService, API_ENDPOINTS } from "@/services/api";
import "./global.css";

export default function SplashScreen() {
    const spinAnim = useRef(new Animated.Value(0)).current;
    const router = useRouter();
    const { isDark, toggleTheme } = useThemeStore();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // Spin animation for loader
    useEffect(() => {
        Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    // Check if user is already logged in
    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Check for stored auth token
                const token = await AsyncStorage.getItem('authToken');
                
                if (!token) {
                    // No token, redirect to login
                    setIsCheckingAuth(false);
                    setTimeout(() => {
                        router.replace("/(auth)/login");
                    }, 1500);
                    return;
                }

                // Check onboarding progress to determine where to redirect
                try {
                    const progress = await apiService.get<{
                        success: boolean;
                        data: {
                            step1_role: boolean;
                            step2_personal: boolean;
                            step3_professional: boolean;
                            step4_plan: boolean;
                            completed: boolean;
                            currentStep: number; // 0 = all done, 1-4 = step to complete
                        };
                    }>(API_ENDPOINTS.USERS.ONBOARDING.PROGRESS, token);

                    setIsCheckingAuth(false);
                    
                    if (progress?.data?.completed) {
                        // User has completed all onboarding steps - navigate to dashboard
                        setTimeout(() => {
                            router.replace("/(tabs)/home");
                        }, 1500);
                    } else {
                        // User hasn't completed onboarding - redirect to the appropriate step
                        const step = progress?.data?.currentStep || 1;
                        setTimeout(() => {
                            if (step === 1) {
                                router.replace("/(onboarding)/role-selection");
                            } else if (step === 2) {
                                router.replace("/(onboarding)/personal-details");
                            } else if (step === 3) {
                                router.replace("/(onboarding)/professional-details");
                            } else if (step === 4) {
                                router.replace("/(onboarding)/plan-choose");
                            } else {
                                // Default to role selection
                                router.replace("/(onboarding)/role-selection");
                            }
                        }, 1500);
                    }
                } catch (error) {
                    // Token is invalid or expired, clear it and redirect to login
                    console.warn("Token validation failed:", error);
                    await AsyncStorage.removeItem('authToken');
                    await AsyncStorage.removeItem('userData');
                    setIsCheckingAuth(false);
                    setTimeout(() => {
                        router.replace("/(auth)/login");
                    }, 1500);
                }
            } catch (error) {
                // Error checking auth, redirect to login
                console.warn("Auth check error:", error);
                setIsCheckingAuth(false);
                setTimeout(() => {
                    router.replace("/(auth)/login");
                }, 1500);
            }
        };

        checkAuth();
    }, [router]);

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    return (
        <SafeAreaView
            className={`flex-1 items-center justify-center ${isDark ? "bg-background-dark" : "bg-background-light"
                }`}
        >
            {/* Main content */}
            <View className="items-center px-8">
                <Image
                    source={require("../assets/logo.png")}
                    className="w-[300px] h-[300px] mb-5"
                    resizeMode="contain"
                />
                <Text
                    className={`text-4xl font-bold mb-2 ${isDark ? "text-white" : "text-primary"
                        }`}
                >
                    Revalidate
                </Text>
                <Text
                    className={`text-base font-medium text-center ${isDark ? "text-gray-400" : "text-gray-500"
                        }`}
                >
                    Your Professional Portfolio, Simplified
                </Text>
            </View>

            {/* Bottom spinning loader */}
            <View className="absolute bottom-12 items-center">
                <Animated.View
                    style={{ transform: [{ rotate: spin }] }}
                    className={`w-8 h-8 border-4 ${isDark ? "border-gray-800" : "border-gray-200"
                        } border-t-primary rounded-full`}
                />
                <View className="flex-col items-center mt-2 space-y-1">
                    <Text
                        className={`text-[10px] uppercase tracking-widest font-semibold ${isDark ? "text-gray-500" : "text-gray-400"
                            }`}
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

            {/* Background circles */}
            <View className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <View className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Dark mode toggle button */}
            <Pressable
                className={`absolute top-4 right-4 p-2 rounded-full shadow-lg ${
                    isDark ? "bg-slate-800/80" : "bg-white/80"
                }`}
                onPress={toggleTheme}
            >
                <MaterialIcons
                    name={isDark ? "light-mode" : "dark-mode"}
                    size={20}
                    color={isDark ? "#D1D5DB" : "#4B5563"}
                />
            </Pressable>
        </SafeAreaView>
    );
}
