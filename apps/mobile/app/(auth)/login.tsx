import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/validation/schema";
import { useThemeStore } from "@/features/theme/theme.store";
import { useAuthStore } from "@/features/auth/auth.store";
import { apiService, API_ENDPOINTS } from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showToast } from "@/utils/toast";
import { setSubscriptionInfo } from "@/utils/subscription";
import "../global.css";

export default function Login() {
    const router = useRouter();
    const { isDark, toggleTheme } = useThemeStore();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // Check if user is already logged in
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = await AsyncStorage.getItem('authToken');
                if (token) {
                    // Always send logged-in users to onboarding
                    router.replace("/(onboarding)/role-selection");
                    return;
                }
            } catch (error) {
                console.warn("Auth check error:", error);
            } finally {
                setIsCheckingAuth(false);
            }
        };

        checkAuth();
    }, [router]);
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    });

    const onSubmit = async (data: LoginInput) => {
        try {
            setIsLoading(true);

            // Call the login API
            const response = await apiService.post<{
                success: boolean;
                data: {
                    user: {
                        id: string;
                        email: string;
                        professionalRole?: string;
                        revalidationDate?: string;
                    };
                    token: string;
                };
            }>(
                API_ENDPOINTS.AUTH.LOGIN,
                {
                    email: data.email,
                    password: data.password,
                }
            );

            // Store token and user data
            if (response?.data?.token) {
                const token = response.data.token;
                const user = response.data.user;

                await AsyncStorage.setItem('authToken', token);
                await AsyncStorage.setItem('userData', JSON.stringify(user));

                // Save to auth store for persistent state
                useAuthStore.getState().setAuth(token, {
                    id: user.id,
                    email: user.email,
                    firstName: (user as any).firstName,
                    lastName: (user as any).lastName,
                });

                // After successful login, check onboarding status and route accordingly
                try {
                    // Fetch profile to check subscription and onboarding status
                    try {
                        const profile = await apiService.get<any>(API_ENDPOINTS.USERS.ME, token);
                        if (profile?.data) {
                            const tier = profile.data.subscriptionTier || 'free';
                            const isPremium = tier === 'premium' || tier === 'premium_yearly';

                            await setSubscriptionInfo({
                                subscriptionTier: tier as 'free' | 'premium' | 'premium_yearly',
                                subscriptionStatus: (profile.data.subscriptionStatus || 'active') as 'active' | 'trial' | 'expired' | 'cancelled',
                                isPremium,
                                canUseOffline: isPremium,
                            });

                            // Check if onboarding is completed
                            if (profile.data.onboardingCompleted) {
                                useAuthStore.getState().setOnboardingCompleted(true);

                                // Persist this critical flag to AsyncStorage for offline/restore stability
                                try {
                                    const storedUserStr = await AsyncStorage.getItem('userData');
                                    if (storedUserStr) {
                                        const storedUser = JSON.parse(storedUserStr);
                                        storedUser.onboardingCompleted = true;
                                        await AsyncStorage.setItem('userData', JSON.stringify(storedUser));
                                    }
                                } catch (e) {
                                    console.warn('Failed to update userData storage', e);
                                }

                                router.replace("/(tabs)/home");
                                return;
                            }
                        }
                    } catch (_) {
                        // ignore profile fetch errors — still send to onboarding
                    }

                    router.replace("/(onboarding)/role-selection");
                } catch (err) {
                    console.warn('Routing after login failed:', err);
                    router.replace("/(onboarding)/role-selection");
                }
            } else {
                throw new Error("Invalid response from server");
            }
        } catch (error: unknown) {
            // Handle error — prefer server-provided message when available
            let errorMessage = "Invalid email or password. Please try again.";

            const anyErr = error as any;
            const serverMessage = anyErr?.response?.data?.message || anyErr?.response?.data?.error || anyErr?.message || '';
            const msg = String(serverMessage).toLowerCase();

            if (msg.includes('blocked')) {
                errorMessage = 'Account is blocked. Please contact support.';
            } else if (msg.includes('inactive')) {
                errorMessage = 'Account is inactive. Please contact support.';
            } else if (msg.includes('401') || msg.includes('invalid')) {
                errorMessage = 'Invalid email or password. Please check your credentials.';
            } else if (msg.includes('404') || msg.includes('not found')) {
                errorMessage = 'User not found. Please register first.';
            } else if (serverMessage) {
                errorMessage = String(serverMessage);
            }

            showToast.error(errorMessage, 'Login Failed');
        } finally {
            setIsLoading(false);
        }
    };

    // Show loading state while checking auth
    if (isCheckingAuth) {
        return (
            <SafeAreaView
                className={`flex-1 items-center justify-center ${isDark ? "bg-background-dark dark" : "bg-background-light"}`}
            >
                <View className="items-center">
                    <MaterialIcons name="lock" size={48} color={isDark ? "#D1D5DB" : "#4B5563"} />
                    <Text className={`mt-4 text-base ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        Checking authentication...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            className={`flex-1 ${isDark ? "bg-background-dark dark" : "bg-background-light"}`}
        >
            {/* Background decorative elements */}
            <View className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <View className="absolute -bottom-32 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

            {/* Dark mode toggle */}
            <Pressable
                className={`absolute top-10 right-4 p-3 rounded-full z-50 ${isDark
                    ? "bg-slate-800/80 border border-slate-700"
                    : "bg-white/80 border border-gray-200"
                    } shadow-lg`}
                onPress={toggleTheme}
            >
                <MaterialIcons
                    name={isDark ? "light-mode" : "dark-mode"}
                    size={22}
                    color={isDark ? "#D1D5DB" : "#4B5563"}
                />
            </Pressable>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'center',
                    paddingVertical: 20
                }}
                showsVerticalScrollIndicator={false}
            >
                <View className="px-5 w-full">
                    {/* Header */}
                    <View className="mb-8">
                        <View className="mb-3">
                            <Text
                                className={`text-4xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
                            >
                                Welcome Back
                            </Text>
                            <View className="w-16 h-1 bg-primary rounded-full" />
                        </View>
                        <Text
                            className={`text-base font-light leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        >
                            Sign in to continue managing your revalidation journey.
                        </Text>
                    </View>

                    {/* Form */}
                    <View className="gap-5">
                        {/* Email Input */}
                        <View>
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                            >
                                Work Email Address
                            </Text>
                            <Controller
                                control={control}
                                name="email"
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <View className="relative">
                                        <View className="absolute inset-y-0 left-0 pl-4 flex items-center justify-center pointer-events-none z-10">
                                            <MaterialIcons
                                                name="mail"
                                                size={22}
                                                color={isDark ? "#6B7280" : "#9CA3AF"}
                                            />
                                        </View>
                                        <TextInput
                                            className={`w-full pl-12 pr-4 py-4 rounded-2xl ${isDark
                                                ? "bg-slate-800/90 text-white border border-slate-700/50"
                                                : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                                                } ${errors.email ? "border-red-500" : ""}`}
                                            style={{
                                                shadowColor: isDark ? "#000" : "#000",
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: isDark ? 0.1 : 0.05,
                                                shadowRadius: 4,
                                                elevation: 2,
                                            }}
                                            placeholder="e.g. name@nhs.net"
                                            placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                    </View>
                                )}
                            />
                            {errors.email && (
                                <Text className="text-red-500 text-sm mt-1.5">
                                    {errors.email.message}
                                </Text>
                            )}
                        </View>

                        {/* Password Input */}
                        <View>
                            <View className="flex-row items-center justify-between mb-3">
                                <Text
                                    className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}
                                >
                                    Password
                                </Text>
                                <Pressable onPress={() => router.push("/(auth)/forgot-password")}>
                                    <Text className="text-primary font-semibold text-sm">
                                        Forgot Password?
                                    </Text>
                                </Pressable>
                            </View>
                            <Controller
                                control={control}
                                name="password"
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <View className="relative">
                                        <View className="absolute inset-y-0 left-0 pl-4 flex items-center justify-center pointer-events-none z-10">
                                            <MaterialIcons
                                                name="lock"
                                                size={22}
                                                color={isDark ? "#6B7280" : "#9CA3AF"}
                                            />
                                        </View>
                                        <TextInput
                                            className={`w-full pl-12 pr-12 py-4 rounded-2xl ${isDark
                                                ? "bg-slate-800/90 text-white border border-slate-700/50"
                                                : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                                                } ${errors.password ? "border-red-500" : ""}`}
                                            style={{
                                                shadowColor: isDark ? "#000" : "#000",
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: isDark ? 0.1 : 0.05,
                                                shadowRadius: 4,
                                                elevation: 2,
                                            }}
                                            placeholder="Enter your password"
                                            placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            secureTextEntry={!showPassword}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                        <Pressable
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center justify-center z-10"
                                            onPress={() => setShowPassword(!showPassword)}
                                        >
                                            <MaterialIcons
                                                name={showPassword ? "visibility-off" : "visibility"}
                                                size={22}
                                                color={isDark ? "#6B7280" : "#9CA3AF"}
                                            />
                                        </Pressable>
                                    </View>
                                )}
                            />
                            {errors.password && (
                                <Text className="text-red-500 text-sm mt-1.5">
                                    {errors.password.message}
                                </Text>
                            )}
                        </View>

                        {/* Submit Button */}
                        <View className="pt-6">
                            <Pressable
                                onPress={handleSubmit(onSubmit)}
                                disabled={isLoading}
                                className={`w-full py-4 rounded-2xl active:opacity-90 flex-row justify-center items-center gap-2 overflow-hidden ${isLoading ? "bg-primary/50" : "bg-primary"
                                    }`}
                                style={{
                                    shadowColor: "#2563eb",
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 12,
                                    elevation: 8,
                                }}
                            >
                                {isLoading ? (
                                    <Text className="text-white font-bold text-base">Signing In...</Text>
                                ) : (
                                    <>
                                        <Text className="text-white font-bold text-base">Sign In</Text>
                                        <MaterialIcons name="arrow-forward" size={22} color="white" />
                                    </>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Footer */}
            <View className={`py-4 px-5 border-t ${isDark ? "border-slate-700/50" : "border-gray-200"}`}>
                <View className="flex-row items-center justify-center">
                    <Text
                        className={isDark ? "text-gray-400" : "text-gray-500"}
                    >
                        Don't have an account?{" "}
                    </Text>
                    <Pressable onPress={() => router.push("/(auth)/register")}>
                        <Text className="text-primary font-bold text-base">Sign Up</Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}
