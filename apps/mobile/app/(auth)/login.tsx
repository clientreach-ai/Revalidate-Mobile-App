import React, { useState } from "react";
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
import { apiService, API_ENDPOINTS } from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import "../global.css";

export default function Login() {
    const router = useRouter();
    const { isDark, toggleTheme } = useThemeStore();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

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
                await AsyncStorage.setItem('authToken', token);
                await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
                
                // Fetch full user profile to check onboarding status
                try {
                    const userProfile = await apiService.get<{
                        success: boolean;
                        data: {
                            id: string;
                            email: string;
                            registration?: string | null;
                            dueDate?: string | null;
                            workSettings?: number | null;
                            scopePractice?: number | null;
                            description?: string | null;
                        };
                    }>(API_ENDPOINTS.USERS.ME, token);
                    
                    // Check if user has completed onboarding
                    // User needs: registration number and revalidation date (dueDate)
                    const hasOnboardingData = 
                        userProfile?.data?.registration && 
                        userProfile?.data?.dueDate;
                    
                    if (!hasOnboardingData) {
                        // User hasn't completed onboarding - navigate to onboarding
                        router.replace("/(onboarding)");
                    } else {
                        // User has completed onboarding - navigate to dashboard
                        router.replace("/(tabs)/home");
                    }
                } catch (profileError) {
                    // If profile fetch fails, assume onboarding not complete
                    console.warn("Failed to fetch user profile, redirecting to onboarding:", profileError);
                    router.replace("/(onboarding)");
                }
            } else {
                throw new Error("Invalid response from server");
            }
        } catch (error: unknown) {
            // Handle error
            let errorMessage = "Invalid email or password. Please try again.";
            
            if (error instanceof Error) {
                // Extract error message from API response
                if (error.message.includes("401") || error.message.includes("Invalid")) {
                    errorMessage = "Invalid email or password. Please check your credentials.";
                } else if (error.message.includes("403")) {
                    errorMessage = "Account is inactive. Please contact support.";
                } else if (error.message.includes("404")) {
                    errorMessage = "User not found. Please register first.";
                } else {
                    errorMessage = error.message;
                }
            }
            
            Alert.alert("Login Failed", errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView
            className={`flex-1 ${isDark ? "bg-background-dark dark" : "bg-background-light"}`}
        >
            {/* Background decorative elements */}
            <View className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <View className="absolute -bottom-32 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

            {/* Dark mode toggle */}
            <Pressable
                className={`absolute top-10 right-4 p-3 rounded-full z-50 ${
                    isDark 
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
                                            className={`w-full pl-12 pr-4 py-4 rounded-2xl ${
                                                isDark
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
                                <Pressable onPress={() => {}}>
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
                                            className={`w-full pl-12 pr-12 py-4 rounded-2xl ${
                                                isDark
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
                                className={`w-full py-4 rounded-2xl active:opacity-90 flex-row justify-center items-center gap-2 overflow-hidden ${
                                    isLoading ? "bg-primary/50" : "bg-primary"
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
