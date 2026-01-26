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
import { useForm, Controller, type SubmitHandler, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/validation/schema";
import { useThemeStore } from "@/features/theme/theme.store";
import "../global.css";

export default function Register() {
    const router = useRouter();
    const { isDark, toggleTheme } = useThemeStore();
    const [showPassword, setShowPassword] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema) as Resolver<RegisterInput>,
        defaultValues: {
            email: "",
            password: "",
            termsAccepted: false,
            marketingOptIn: false,
        },
    });

    const onSubmit: SubmitHandler<RegisterInput> = (data) => {
        console.log("Register form submitted:", data);
    };

    const onFormSubmit = handleSubmit(onSubmit);

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
                contentContainerStyle={{ paddingBottom: 16, flexGrow: 1, justifyContent: 'space-between' }}
                showsVerticalScrollIndicator={false}
            >
                <View className="h-16" />

                <View className="flex-1 px-5 pb-4 w-full justify-between">
                    {/* Header */}
                    <View className="mt-6 mb-8">
                        <View className="mb-3">
                            <Text
                                className={`text-4xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
                            >
                                Create Account
                            </Text>
                            <View className="w-16 h-1 bg-primary rounded-full" />
                        </View>
                        <Text
                            className={`text-base font-light leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        >
                            Join thousands of healthcare professionals managing revalidation.
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
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                            >
                                Create Password
                            </Text>
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
                                            placeholder="At least 8 characters"
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

                        {/* Checkboxes */}
                        <View className="gap-4 pt-3">
                            {/* Terms Checkbox */}
                            <Controller
                                control={control}
                                name="termsAccepted"
                                render={({ field: { value, onChange } }) => (
                                    <View className="flex-row items-start">
                                        <Pressable
                                            onPress={() => onChange(!value)}
                                            className={`h-6 w-6 rounded-full border-2 mr-3 mt-0.5 flex items-center justify-center ${
                                                isDark
                                                    ? "border-slate-700 bg-slate-800"
                                                    : "border-gray-300 bg-white"
                                            } ${value ? "bg-primary border-primary" : ""} ${errors.termsAccepted ? "border-red-500" : ""}`}
                                        >
                                            {value && (
                                                <MaterialIcons name="check" size={16} color="white" />
                                            )}
                                        </Pressable>
                                        <View className="flex-1">
                                            <Text
                                                className={isDark ? "text-gray-400" : "text-gray-600"}
                                            >
                                                I agree to the{" "}
                                                <Text className="text-primary font-medium">Terms of Service</Text>{" "}
                                                and{" "}
                                                <Text className="text-primary font-medium">Privacy Policy</Text>.
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            />
                            {errors.termsAccepted && (
                                <Text className="text-red-500 text-sm mt-1 ml-9">
                                    {errors.termsAccepted.message}
                                </Text>
                            )}

                            {/* Marketing Checkbox */}
                            <Controller
                                control={control}
                                name="marketingOptIn"
                                render={({ field: { value, onChange } }) => (
                                    <View className="flex-row items-start">
                                        <Pressable
                                            onPress={() => onChange(!value)}
                                            className={`h-6 w-6 rounded-full border-2 mr-3 mt-0.5 flex items-center justify-center ${
                                                isDark
                                                    ? "border-slate-700 bg-slate-800"
                                                    : "border-gray-300 bg-white"
                                            } ${value ? "bg-primary border-primary" : ""}`}
                                        >
                                            {value && (
                                                <MaterialIcons name="check" size={16} color="white" />
                                            )}
                                        </Pressable>
                                        <View className="flex-1">
                                            <Text
                                                className={isDark ? "text-gray-400" : "text-gray-600"}
                                            >
                                                Receive monthly revalidation tips and UK healthcare updates via
                                                email.
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            />
                        </View>

                        {/* Submit Button */}
                        <View className="pt-6">
                            <Pressable
                                onPress={onFormSubmit}
                                className="w-full bg-primary py-4 rounded-2xl active:opacity-90 flex-row justify-center items-center gap-2 overflow-hidden"
                                style={{
                                    shadowColor: "#2563eb",
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 12,
                                    elevation: 8,
                                }}
                            >
                                <Text className="text-white font-bold text-base">Create Account</Text>
                                <MaterialIcons name="arrow-forward" size={22} color="white" />
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
                        Already have an account?{" "}
                    </Text>
                    <Pressable onPress={() => router.push("/(auth)/login")}>
                        <Text className="text-primary font-bold text-base">Log In</Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}
