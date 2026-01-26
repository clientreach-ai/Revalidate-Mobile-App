import React, { useState, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useThemeStore } from "@/features/theme/theme.store";
import { apiService, API_ENDPOINTS } from "@/services/api";
import { showToast } from "@/utils/toast";
import "../global.css";

export default function ResetPassword() {
    const router = useRouter();
    const params = useLocalSearchParams<{ email: string }>();
    const { isDark, toggleTheme } = useThemeStore();
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const email = params.email || "";

    const handleOtpChange = (value: string, index: number) => {
        // Only allow numbers
        if (value && !/^\d+$/.test(value)) {
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // Only take the last character
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (text: string) => {
        const digits = text.replace(/\D/g, "").slice(0, 6);
        const newOtp = [...otp];
        for (let i = 0; i < 6; i++) {
            newOtp[i] = digits[i] || "";
        }
        setOtp(newOtp);
        // Focus the last filled input or the last input
        const lastFilledIndex = Math.min(digits.length - 1, 5);
        inputRefs.current[lastFilledIndex]?.focus();
    };

    const handleResendOTP = async () => {
        if (!email) {
            showToast.error("Email not found. Please go back and try again.", "Error");
            return;
        }

        try {
            setIsResending(true);

            await apiService.post(
                API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
                {
                    email: email,
                }
            );

            showToast.success("A new password reset code has been sent to your email.", "Code Sent");
        } catch (error: unknown) {
            const errorMessage = error instanceof Error 
                ? error.message 
                : "Failed to resend code. Please try again.";
            
            showToast.error(errorMessage, "Error");
        } finally {
            setIsResending(false);
        }
    };

    const handleReset = async () => {
        const otpString = otp.join("");
        
        if (otpString.length !== 6) {
            showToast.error("Please enter all 6 digits", "Invalid OTP");
            return;
        }

        if (!password) {
            showToast.error("Please enter a new password", "Error");
            return;
        }

        if (password.length < 8) {
            showToast.error("Password must be at least 8 characters long", "Error");
            return;
        }

        if (password !== confirmPassword) {
            showToast.error("Passwords do not match", "Error");
            return;
        }

        if (!email) {
            showToast.error("Email not found. Please go back and try again.", "Error");
            router.replace("/(auth)/forgot-password");
            return;
        }

        try {
            setIsLoading(true);

            await apiService.post(
                API_ENDPOINTS.AUTH.RESET_PASSWORD,
                {
                    email: email,
                    otp: otpString,
                    newPassword: password,
                }
            );

            showToast.success("Password has been reset successfully. You can now login with your new password.", "Success");
            // Navigate after a short delay to allow toast to be visible
            setTimeout(() => {
                router.replace("/(auth)/login");
            }, 1500);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error 
                ? error.message 
                : "Failed to reset password. Please try again.";
            
            showToast.error(errorMessage, "Error");
            // Clear OTP on error
            setOtp(["", "", "", "", "", ""]);
            inputRefs.current[0]?.focus();
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
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 20 }}
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
                                Reset Password
                            </Text>
                            <View className="w-16 h-1 bg-primary rounded-full" />
                        </View>
                        <Text className={`text-base text-center ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                            Please enter the 6-digit code sent to <Text className="font-semibold">{email}</Text> and your new password.
                        </Text>
                    </View>

                    <View className="gap-5 mt-8">
                        {/* OTP Input Fields */}
                        <View>
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                            >
                                Verification Code
                            </Text>
                            <View className="flex-row justify-between items-center">
                                {otp.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => (inputRefs.current[index] = ref)}
                                        className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 ${
                                            isDark
                                                ? "bg-slate-800 text-white border-slate-700"
                                                : "bg-white text-gray-900 border-gray-300"
                                        } focus:border-primary`}
                                        keyboardType="number-pad"
                                        maxLength={1}
                                        value={digit}
                                        onChangeText={(text) => handleOtpChange(text, index)}
                                        onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                                        onPaste={handlePaste}
                                        editable={!isLoading}
                                    />
                                ))}
                            </View>
                        </View>

                        {/* New Password Input */}
                        <View>
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                            >
                                New Password
                            </Text>
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
                                    }`}
                                    style={{
                                        shadowColor: isDark ? "#000" : "#000",
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: isDark ? 0.1 : 0.05,
                                        shadowRadius: 4,
                                        elevation: 2,
                                    }}
                                    placeholder="Enter new password"
                                    placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    editable={!isLoading}
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
                        </View>

                        {/* Confirm Password Input */}
                        <View>
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                            >
                                Confirm Password
                            </Text>
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
                                    }`}
                                    style={{
                                        shadowColor: isDark ? "#000" : "#000",
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: isDark ? 0.1 : 0.05,
                                        shadowRadius: 4,
                                        elevation: 2,
                                    }}
                                    placeholder="Confirm new password"
                                    placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirmPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    editable={!isLoading}
                                />
                                <Pressable
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center justify-center z-10"
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <MaterialIcons
                                        name={showConfirmPassword ? "visibility-off" : "visibility"}
                                        size={22}
                                        color={isDark ? "#6B7280" : "#9CA3AF"}
                                    />
                                </Pressable>
                            </View>
                        </View>

                        {/* Reset Button */}
                        <View className="pt-4">
                            <Pressable
                                onPress={handleReset}
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
                                    <Text className="text-white font-bold text-base">Resetting...</Text>
                                ) : (
                                    <>
                                        <Text className="text-white font-bold text-base">Reset Password</Text>
                                        <MaterialIcons name="arrow-forward" size={22} color="white" style={{ marginLeft: 8 }} />
                                    </>
                                )}
                            </Pressable>
                        </View>

                        {/* Resend OTP */}
                        <View className="flex-row items-center justify-center gap-2">
                            <Text className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                Didn't receive the code?
                            </Text>
                            <Pressable onPress={handleResendOTP} disabled={isResending}>
                                <Text className="text-primary font-semibold text-sm">
                                    {isResending ? "Sending..." : "Resend Code"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
