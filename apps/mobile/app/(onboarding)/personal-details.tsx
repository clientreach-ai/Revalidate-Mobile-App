import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver, SubmitHandler } from "react-hook-form";
import {
    onboardingPersonalDetailsSchema,
    type OnboardingPersonalDetailsInput,
} from "@/validation/schema";
import { useThemeStore } from "@/features/theme/theme.store";
import "../global.css";

export default function PersonalDetails() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const role = params.role as string;

    const { isDark } = useThemeStore();

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<OnboardingPersonalDetailsInput>({
        resolver: zodResolver(onboardingPersonalDetailsSchema) as Resolver<OnboardingPersonalDetailsInput>,
        defaultValues: {
            name: "",
            email: "",
            phone: "",
        },
    });

    const onSubmit: SubmitHandler<OnboardingPersonalDetailsInput> = (data) => {
        console.log("Onboarding personal details submitted:", data);
        router.push({
            pathname: "/(onboarding)/professional-details",
            params: { role, ...data },
        });
    };

    const onFormSubmit = handleSubmit(onSubmit);

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
                                Personal Details
                            </Text>
                            <View className="w-16 h-1 bg-primary rounded-full" />
                        </View>
                        <Text
                            className={`text-base font-light leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        >
                            Let's start by getting to know you. Please provide your basic information.
                        </Text>
                    </View>

                    {/* Form */}
                    <View className="gap-5">
                        {/* Name */}
                        <View>
                            <View className="flex-row items-center mb-3">
                                <Text
                                    className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}
                                >
                                    Name
                                </Text>
                                <Text className="text-red-500 ml-1">*</Text>
                            </View>
                            <Controller
                                control={control}
                                name="name"
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <View className="relative">
                                        <View className="absolute inset-y-0 left-0 pl-4 flex items-center justify-center pointer-events-none z-10">
                                            <MaterialIcons
                                                name="person"
                                                size={22}
                                                color={isDark ? "#6B7280" : "#9CA3AF"}
                                            />
                                        </View>
                                        <TextInput
                                            className={`w-full pl-12 pr-4 py-4 rounded-2xl ${
                                                isDark
                                                    ? "bg-slate-800/90 text-white border border-slate-700/50"
                                                    : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                                            } ${errors.name ? "border-red-500" : ""}`}
                                            style={{
                                                shadowColor: isDark ? "#000" : "#000",
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: isDark ? 0.1 : 0.05,
                                                shadowRadius: 4,
                                                elevation: 2,
                                            }}
                                            placeholder="Enter your full name"
                                            placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            autoCapitalize="words"
                                            autoCorrect={false}
                                        />
                                    </View>
                                )}
                            />
                            {errors.name && (
                                <Text className="text-red-500 text-sm mt-1.5">
                                    {errors.name.message}
                                </Text>
                            )}
                        </View>

                        {/* Email */}
                        <View>
                            <View className="flex-row items-center mb-3">
                                <Text
                                    className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}
                                >
                                    Email
                                </Text>
                                <Text className="text-red-500 ml-1">*</Text>
                            </View>
                            <Controller
                                control={control}
                                name="email"
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <View className="relative">
                                        <View className="absolute inset-y-0 left-0 pl-4 flex items-center justify-center pointer-events-none z-10">
                                            <MaterialIcons
                                                name="email"
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
                                            placeholder="Enter your email address"
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

                        {/* Phone */}
                        <View>
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                            >
                                Phone
                            </Text>
                            <Controller
                                control={control}
                                name="phone"
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <View className="relative">
                                        <View className="absolute inset-y-0 left-0 pl-4 flex items-center justify-center pointer-events-none z-10">
                                            <MaterialIcons
                                                name="phone"
                                                size={22}
                                                color={isDark ? "#6B7280" : "#9CA3AF"}
                                            />
                                        </View>
                                        <TextInput
                                            className={`w-full pl-12 pr-4 py-4 rounded-2xl ${
                                                isDark
                                                    ? "bg-slate-800/90 text-white border border-slate-700/50"
                                                    : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                                            } ${errors.phone ? "border-red-500" : ""}`}
                                            style={{
                                                shadowColor: isDark ? "#000" : "#000",
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: isDark ? 0.1 : 0.05,
                                                shadowRadius: 4,
                                                elevation: 2,
                                            }}
                                            placeholder="Enter your phone number"
                                            placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            keyboardType="phone-pad"
                                            autoCorrect={false}
                                        />
                                    </View>
                                )}
                            />
                            {errors.phone && (
                                <Text className="text-red-500 text-sm mt-1.5">
                                    {errors.phone.message}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Continue Button */}
            <View className={`px-6 pb-8 pt-4 border-t ${isDark ? "border-slate-700/50" : "border-gray-200"}`}>
                <Pressable
                    onPress={onFormSubmit}
                    className="w-full py-4 rounded-2xl flex-row items-center justify-center bg-primary active:opacity-90"
                    style={{
                        shadowColor: "#1E5AF3",
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.25,
                        shadowRadius: 12,
                        elevation: 8,
                    }}
                >
                    <Text className="text-white font-semibold text-base">Continue</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
