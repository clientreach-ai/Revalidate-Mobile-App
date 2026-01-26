import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemeStore } from "@/features/theme/theme.store";
import { apiService, API_ENDPOINTS } from "@/services/api";
import "../global.css";

export default function ForgotPassword() {
    const router = useRouter();
    const { isDark, toggleTheme } = useThemeStore();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!email.trim()) {
            Alert.alert("Error", "Please enter your email address");
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert("Error", "Please enter a valid email address");
            return;
        }

        try {
            setIsLoading(true);

            const response = await apiService.post<{
                success: boolean;
                message: string;
            }>(
                API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
                {
                    email: email.trim(),
                }
            );

            // Check if the response indicates success
            if (response?.success) {
                Alert.alert(
                    "Reset Code Sent",
                    "Password reset code has been sent to your email. Please check your inbox.",
                    [
                        {
                            text: "OK",
                            onPress: () => router.push({
                                pathname: "/(auth)/reset-password",
                                params: { email: email.trim() },
                            }),
                        },
                    ]
                );
            }
        } catch (error: unknown) {
            let errorMessage = "Failed to send reset code. Please try again.";
            
            if (error instanceof Error) {
                // Check for specific error messages
                const errorMsg = error.message.toLowerCase();
                if (errorMsg.includes("404") || errorMsg.includes("does not exist") || errorMsg.includes("account does not exist")) {
                    errorMessage = "Account does not exist with this email address.";
                } else if (errorMsg.includes("403") || errorMsg.includes("not verified")) {
                    errorMessage = "Account is not verified. Please verify your email first.";
                } else {
                    errorMessage = error.message;
                }
            }
            
            Alert.alert("Error", errorMessage);
            // Don't navigate if there's an error
            return;
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
                    {/* Back Button */}
                    <Pressable
                        onPress={() => router.back()}
                        className="mb-6 self-start"
                    >
                        <MaterialIcons
                            name="arrow-back"
                            size={24}
                            color={isDark ? "#D1D5DB" : "#4B5563"}
                        />
                    </Pressable>

                    {/* Header */}
                    <View className="mb-8">
                        <View className="mb-3">
                            <Text
                                className={`text-4xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
                            >
                                Forgot Password?
                            </Text>
                            <View className="w-16 h-1 bg-primary rounded-full" />
                        </View>
                        <Text
                            className={`text-base font-light leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        >
                            Enter your email address and we'll send you a code to reset your password.
                        </Text>
                    </View>

                    {/* Email Input */}
                    <View className="mb-6">
                        <Text
                            className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                        >
                            Email Address
                        </Text>
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
                                }`}
                                style={{
                                    shadowColor: isDark ? "#000" : "#000",
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: isDark ? 0.1 : 0.05,
                                    shadowRadius: 4,
                                    elevation: 2,
                                }}
                                placeholder="e.g. name@nhs.net"
                                placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!isLoading}
                            />
                        </View>
                    </View>

                    {/* Submit Button */}
                    <Pressable
                        onPress={handleSubmit}
                        disabled={isLoading}
                        className={`w-full py-4 rounded-2xl flex-row items-center justify-center active:opacity-90 ${
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
                            <Text className="text-white font-bold text-base">Sending...</Text>
                        ) : (
                            <>
                                <Text className="text-white font-bold text-base">Send Reset Code</Text>
                                <MaterialIcons name="arrow-forward" size={22} color="white" style={{ marginLeft: 8 }} />
                            </>
                        )}
                    </Pressable>
                </View>
            </ScrollView>

            {/* Footer */}
            <View className={`py-4 px-5 border-t ${isDark ? "border-slate-700/50" : "border-gray-200"}`}>
                <View className="flex-row items-center justify-center">
                    <Text
                        className={isDark ? "text-gray-400" : "text-gray-500"}
                    >
                        Remember your password?{" "}
                    </Text>
                    <Pressable onPress={() => router.replace("/(auth)/login")}>
                        <Text className="text-primary font-bold text-base">Sign In</Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}
