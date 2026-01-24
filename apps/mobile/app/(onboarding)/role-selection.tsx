import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver, SubmitHandler } from "react-hook-form";
import {
    onboardingRoleSchema,
    type OnboardingRoleInput,
    type Role,
} from "@/validation/schema";
import "../global.css";

const roles: { value: Role; label: string; icon: string; description: string }[] = [
    { value: "doctor", label: "Doctor / GP", icon: "healing", description: "General practitioners and medical doctors" },
    { value: "nurse", label: "Nurse / Midwife", icon: "local-hospital", description: "Registered nurses and midwives" },
    { value: "pharmacist", label: "Pharmacist", icon: "science", description: "Registered pharmacists" },
    { value: "dentist", label: "Dentist", icon: "health-and-safety", description: "Dental practitioners" },
    { value: "other", label: "Other Healthcare Professional", icon: "person", description: "Other regulated healthcare roles" },
];

export default function RoleSelection() {
    const router = useRouter();
    const [isDark] = useState(false);

    const {
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<OnboardingRoleInput>({
        resolver: zodResolver(onboardingRoleSchema) as Resolver<OnboardingRoleInput>,
        defaultValues: {},
    });

    const watchedRole = watch("role");

    const onSubmit: SubmitHandler<OnboardingRoleInput> = (data) => {
        console.log("Onboarding role submitted:", data);
        router.push({
            pathname: "/(onboarding)/professional-details",
            params: { role: data.role },
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
                                Select Your Role
                            </Text>
                            <View className="w-16 h-1 bg-primary rounded-full" />
                        </View>
                        <Text
                            className={`text-base font-light leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        >
                            Choose your professional role to customize your revalidation requirements.
                        </Text>
                    </View>

                    {/* Role Cards */}
                    <View className="gap-4 mb-6">
                        {roles.map((role) => {
                            const isSelected = watchedRole === role.value;
                            return (
                                <Pressable
                                    key={role.value}
                                    onPress={() => setValue("role", role.value)}
                                    className={`w-full rounded-2xl border-2 p-5 flex-row items-center gap-4 ${
                                        isSelected
                                            ? "bg-primary/10 border-primary"
                                            : isDark
                                            ? "bg-slate-800/90 border-slate-700/50"
                                            : "bg-white border-gray-200 shadow-sm"
                                    }`}
                                    style={{
                                        shadowColor: isSelected ? "#1E5AF3" : isDark ? "#000" : "#000",
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: isSelected ? 0.15 : isDark ? 0.1 : 0.05,
                                        shadowRadius: 4,
                                        elevation: isSelected ? 4 : 2,
                                    }}
                                >
                                    {/* Icon Container */}
                                    <View
                                        className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                                            isSelected
                                                ? "bg-primary"
                                                : isDark
                                                ? "bg-slate-700"
                                                : "bg-slate-100"
                                        }`}
                                    >
                                        <MaterialIcons
                                            name={role.icon as any}
                                            size={32}
                                            color={isSelected ? "#FFFFFF" : isDark ? "#9CA3AF" : "#6B7280"}
                                        />
                                    </View>

                                    {/* Text Content */}
                                    <View className="flex-1">
                                        <Text
                                            className={`text-lg font-bold mb-1 ${
                                                isSelected
                                                    ? "text-primary"
                                                    : isDark
                                                    ? "text-white"
                                                    : "text-gray-900"
                                            }`}
                                        >
                                            {role.label}
                                        </Text>
                                        <Text
                                            className={`text-sm ${
                                                isDark ? "text-gray-400" : "text-gray-500"
                                            }`}
                                        >
                                            {role.description}
                                        </Text>
                                    </View>

                                    {/* Selection Indicator */}
                                    <View
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                            isSelected
                                                ? "bg-primary border-primary"
                                                : isDark
                                                ? "border-slate-600 bg-slate-800"
                                                : "border-gray-300 bg-white"
                                        }`}
                                    >
                                        {isSelected && (
                                            <MaterialIcons name="check" size={16} color="white" />
                                        )}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                    {errors.role && (
                        <Text className="text-red-500 text-sm mt-2 mb-2">
                            {errors.role.message}
                        </Text>
                    )}
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
