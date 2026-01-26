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

export default function VerifyOTP() {
    const router = useRouter();
    const params = useLocalSearchParams<{ email: string }>();
    const { isDark, toggleTheme } = useThemeStore();
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
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

    const handleVerify = async () => {
        const otpString = otp.join("");
        
        if (otpString.length !== 6) {
            showToast.error("Please enter all 6 digits", "Invalid OTP");
            return;
        }

        if (!email) {
            showToast.error("Email not found. Please register again.", "Error");
            router.replace("/(auth)/register");
            return;
        }

        try {
            setIsLoading(true);

            await apiService.post(
                API_ENDPOINTS.AUTH.VERIFY_OTP,
                {
                    email: email,
                    otp: otpString,
                }
            );

            showToast.success("Email verified successfully! Your account has been activated.", "Success");
            // Navigate after a short delay to allow toast to be visible
            setTimeout(() => {
                router.replace("/(auth)/login");
            }, 1500);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error 
                ? error.message 
                : "Invalid or expired OTP. Please try again.";
            
            showToast.error(errorMessage, "Verification Failed");
            // Clear OTP on error
            setOtp(["", "", "", "", "", ""]);
            inputRefs.current[0]?.focus();
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email) {
            showToast.error("Email not found. Please register again.", "Error");
            router.replace("/(auth)/register");
            return;
        }

        try {
            setIsResending(true);

            await apiService.post(
                API_ENDPOINTS.AUTH.RESEND_OTP,
                {
                    email: email,
                }
            );

            showToast.success("Verification code sent successfully. Please check your email.", "Success");
            // Clear OTP
            setOtp(["", "", "", "", "", ""]);
            inputRefs.current[0]?.focus();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error 
                ? error.message 
                : "Failed to resend verification code. Please try again.";
            
            showToast.error(errorMessage, "Error");
        } finally {
            setIsResending(false);
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
                                Verify Email
                            </Text>
                            <View className="w-16 h-1 bg-primary rounded-full" />
                        </View>
                        <Text
                            className={`text-base font-light leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        >
                            We've sent a 6-digit verification code to{" "}
                            <Text className="font-semibold">{email}</Text>
                        </Text>
                    </View>

                    {/* OTP Input */}
                    <View className="mb-8">
                        <View className="flex-row justify-between gap-3 mb-6">
                            {otp.map((digit, index) => (
                                <TextInput
                                    key={index}
                                    ref={(ref) => {
                                        inputRefs.current[index] = ref;
                                    }}
                                    className={`flex-1 aspect-square rounded-2xl text-center text-2xl font-bold ${
                                        isDark
                                            ? "bg-slate-800/90 text-white border border-slate-700/50"
                                            : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                                    } ${digit ? "border-primary" : ""}`}
                                    style={{
                                        shadowColor: isDark ? "#000" : "#000",
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: isDark ? 0.1 : 0.05,
                                        shadowRadius: 4,
                                        elevation: 2,
                                    }}
                                    value={digit}
                                    onChangeText={(value) => handleOtpChange(value, index)}
                                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                                    onPaste={(e) => {
                                        const text = e.nativeEvent.text;
                                        handlePaste(text);
                                    }}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    selectTextOnFocus
                                    autoFocus={index === 0}
                                />
                            ))}
                        </View>

                        {/* Verify Button */}
                        <Pressable
                            onPress={handleVerify}
                            disabled={isLoading || otp.join("").length !== 6}
                            className={`w-full py-4 rounded-2xl active:opacity-90 flex-row justify-center items-center gap-2 overflow-hidden ${
                                isLoading || otp.join("").length !== 6
                                    ? "bg-primary/50"
                                    : "bg-primary"
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
                                <Text className="text-white font-bold text-base">Verifying...</Text>
                            ) : (
                                <>
                                    <Text className="text-white font-bold text-base">Verify</Text>
                                    <MaterialIcons name="check-circle" size={22} color="white" />
                                </>
                            )}
                        </Pressable>
                    </View>

                    {/* Resend OTP */}
                    <View className="items-center">
                        <Text
                            className={`text-sm mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        >
                            Didn't receive the code?
                        </Text>
                        <Pressable
                            onPress={handleResend}
                            disabled={isResending}
                        >
                            <Text className={`text-primary font-semibold text-base ${isResending ? "opacity-50" : ""}`}>
                                {isResending ? "Sending..." : "Resend Code"}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>

            {/* Footer */}
            <View className={`py-4 px-5 border-t ${isDark ? "border-slate-700/50" : "border-gray-200"}`}>
                <View className="flex-row items-center justify-center">
                    <Text
                        className={isDark ? "text-gray-400" : "text-gray-500"}
                    >
                        Wrong email?{" "}
                    </Text>
                    <Pressable onPress={() => router.replace("/(auth)/register")}>
                        <Text className="text-primary font-bold text-base">Go Back</Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}
