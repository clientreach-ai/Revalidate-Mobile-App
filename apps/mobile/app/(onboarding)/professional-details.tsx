import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Modal, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver, SubmitHandler } from "react-hook-form";
import {
    onboardingProfessionalDetailsSchema,
    type OnboardingProfessionalDetailsInput,
} from "@/validation/schema";
import "../global.css";

const roleConfig = {
    doctor: {
        registrationLabel: "GMC Registration Number",
        registrationPlaceholder: "e.g. 12345678",
        registrationBody: "GMC",
        workSettings: [
            { value: "nhs-hospital", label: "NHS Hospital" },
            { value: "nhs-community", label: "NHS Community" },
            { value: "private-practice", label: "Private Practice" },
            { value: "gp-surgery", label: "GP Surgery" },
            { value: "other", label: "Other" },
        ],
        scopeOfPractice: [
            { value: "full-time", label: "Full Time" },
            { value: "part-time", label: "Part Time" },
            { value: "locum", label: "Locum" },
            { value: "consultant", label: "Consultant" },
            { value: "specialist", label: "Specialist" },
            { value: "gp", label: "General Practice" },
        ],
    },
    nurse: {
        registrationLabel: "NMC Registration Number",
        registrationPlaceholder: "e.g. 12A3456B",
        registrationBody: "NMC",
        workSettings: [
            { value: "nhs-hospital", label: "NHS Hospital" },
            { value: "nhs-community", label: "NHS Community" },
            { value: "private-practice", label: "Private Practice" },
            { value: "gp-surgery", label: "GP Surgery" },
            { value: "other", label: "Other" },
        ],
        scopeOfPractice: [
            { value: "full-time", label: "Full Time" },
            { value: "part-time", label: "Part Time" },
            { value: "bank", label: "Bank" },
            { value: "agency", label: "Agency" },
            { value: "specialist", label: "Specialist" },
        ],
    },
    pharmacist: {
        registrationLabel: "GPhC Registration Number",
        registrationPlaceholder: "e.g. 1234567",
        registrationBody: "GPhC",
        workSettings: [
            { value: "pharmacy", label: "Community Pharmacy" },
            { value: "nhs-hospital", label: "NHS Hospital" },
            { value: "private-practice", label: "Private Practice" },
            { value: "other", label: "Other" },
        ],
        scopeOfPractice: [
            { value: "full-time", label: "Full Time" },
            { value: "part-time", label: "Part Time" },
            { value: "locum", label: "Locum" },
            { value: "superintendent", label: "Superintendent" },
        ],
    },
    dentist: {
        registrationLabel: "GDC Registration Number",
        registrationPlaceholder: "e.g. 123456",
        registrationBody: "GDC",
        workSettings: [
            { value: "dental-practice", label: "Dental Practice" },
            { value: "nhs-hospital", label: "NHS Hospital" },
            { value: "private-practice", label: "Private Practice" },
            { value: "other", label: "Other" },
        ],
        scopeOfPractice: [
            { value: "full-time", label: "Full Time" },
            { value: "part-time", label: "Part Time" },
            { value: "locum", label: "Locum" },
            { value: "specialist", label: "Specialist" },
        ],
    },
    other: {
        registrationLabel: "Registration Number",
        registrationPlaceholder: "Enter your registration number",
        registrationBody: "",
        workSettings: [
            { value: "nhs-hospital", label: "NHS Hospital" },
            { value: "nhs-community", label: "NHS Community" },
            { value: "private-practice", label: "Private Practice" },
            { value: "gp-surgery", label: "GP Surgery" },
            { value: "pharmacy", label: "Pharmacy" },
            { value: "dental-practice", label: "Dental Practice" },
            { value: "other", label: "Other" },
        ],
        scopeOfPractice: [
            { value: "full-time", label: "Full Time" },
            { value: "part-time", label: "Part Time" },
            { value: "locum", label: "Locum" },
            { value: "consultant", label: "Consultant" },
            { value: "specialist", label: "Specialist" },
            { value: "general", label: "General Practice" },
        ],
    },
};

export default function ProfessionalDetails() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const role = (params.role as string) || "other";
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.other;

    const [isDark] = useState(false);
    const [showWorkSettingModal, setShowWorkSettingModal] = useState(false);
    const [showScopeModal, setShowScopeModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);

    const {
        control,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<OnboardingProfessionalDetailsInput>({
        resolver: zodResolver(onboardingProfessionalDetailsSchema) as Resolver<OnboardingProfessionalDetailsInput>,
        defaultValues: {
            registrationNumber: "",
        },
    });

    const watchedDate = watch("revalidationDate");
    const watchedWorkSetting = watch("workSetting");
    const watchedScope = watch("scope");

    const selectedWorkSetting = config.workSettings.find((w) => w.value === watchedWorkSetting)?.label ?? "Select work setting";
    const selectedScope = config.scopeOfPractice.find((s) => s.value === watchedScope)?.label ?? "Select scope of practice";

    const formatDate = (date: Date | undefined): string => {
        if (!date) return "";
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const getDaysInMonth = (month: number, year: number): number => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number): number => {
        return new Date(year, month, 1).getDay();
    };

    const handleDateSelect = (day: number) => {
        const newDate = new Date(selectedYear, selectedMonth, day);
        setValue("revalidationDate", newDate);
        setShowDatePicker(false);
    };

    const navigateMonth = (direction: "prev" | "next") => {
        if (direction === "prev") {
            if (selectedMonth === 0) {
                setSelectedMonth(11);
                setSelectedYear(selectedYear - 1);
            } else {
                setSelectedMonth(selectedMonth - 1);
            }
        } else {
            if (selectedMonth === 11) {
                setSelectedMonth(0);
                setSelectedYear(selectedYear + 1);
            } else {
                setSelectedMonth(selectedMonth + 1);
            }
        }
    };

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Generate years (10 years back and 10 years forward from current)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
        const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
        const days = [];

        // Empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            days.push(<View key={`empty-${i}`} className="w-10 h-10" />);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const isSelected = watchedDate &&
                watchedDate.getDate() === day &&
                watchedDate.getMonth() === selectedMonth &&
                watchedDate.getFullYear() === selectedYear;

            days.push(
                <Pressable
                    key={day}
                    onPress={() => handleDateSelect(day)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isSelected
                            ? "bg-primary"
                            : isDark
                            ? "bg-slate-700/50"
                            : "bg-transparent"
                    }`}
                >
                    <Text
                        className={`text-sm font-medium ${
                            isSelected
                                ? "text-white"
                                : isDark
                                ? "text-white"
                                : "text-gray-900"
                        }`}
                    >
                        {day}
                    </Text>
                </Pressable>
            );
        }

        return days;
    };

    const onSubmit: SubmitHandler<OnboardingProfessionalDetailsInput> = (data) => {
        console.log("Onboarding professional details submitted:", data);
        router.push("/(onboarding)/plan-choose");
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
                                Professional Details
                            </Text>
                            <View className="w-16 h-1 bg-primary rounded-full" />
                        </View>
                        <Text
                            className={`text-base font-light leading-relaxed ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        >
                            Complete your professional profile to get started with revalidation tracking.
                        </Text>
                    </View>

                    {/* Form */}
                    <View className="gap-5">
                        {/* Registration Number */}
                        <View>
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                            >
                                {config.registrationLabel}
                            </Text>
                            <Controller
                                control={control}
                                name="registrationNumber"
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <View className="relative">
                                        <View className="absolute inset-y-0 left-0 pl-4 flex items-center justify-center pointer-events-none z-10">
                                            <MaterialIcons
                                                name="badge"
                                                size={22}
                                                color={isDark ? "#6B7280" : "#9CA3AF"}
                                            />
                                        </View>
                                        <TextInput
                                            className={`w-full pl-12 pr-4 py-4 rounded-2xl ${
                                                isDark
                                                    ? "bg-slate-800/90 text-white border border-slate-700/50"
                                                    : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                                            } ${errors.registrationNumber ? "border-red-500" : ""}`}
                                            style={{
                                                shadowColor: isDark ? "#000" : "#000",
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: isDark ? 0.1 : 0.05,
                                                shadowRadius: 4,
                                                elevation: 2,
                                            }}
                                            placeholder={config.registrationPlaceholder}
                                            placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            autoCapitalize="characters"
                                            autoCorrect={false}
                                        />
                                    </View>
                                )}
                            />
                            {errors.registrationNumber && (
                                <Text className="text-red-500 text-sm mt-1.5">
                                    {errors.registrationNumber.message}
                                </Text>
                            )}
                        </View>

                        {/* Revalidation Date */}
                        <View>
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                            >
                                Revalidation Date
                            </Text>
                            <Pressable
                                onPress={() => {
                                    if (watchedDate) {
                                        setSelectedMonth(watchedDate.getMonth());
                                        setSelectedYear(watchedDate.getFullYear());
                                    }
                                    setShowDatePicker(true);
                                }}
                                className={`w-full pl-12 pr-4 py-4 rounded-2xl flex-row items-center ${
                                    isDark
                                        ? "bg-slate-800/90 border border-slate-700/50"
                                        : "bg-white border border-gray-200 shadow-sm"
                                } ${errors.revalidationDate ? "border-red-500" : ""}`}
                                style={{
                                    shadowColor: isDark ? "#000" : "#000",
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: isDark ? 0.1 : 0.05,
                                    shadowRadius: 4,
                                    elevation: 2,
                                }}
                            >
                                <View className="absolute inset-y-0 left-0 pl-4 flex items-center justify-center z-10">
                                    <MaterialIcons
                                        name="event"
                                        size={22}
                                        color={isDark ? "#6B7280" : "#9CA3AF"}
                                    />
                                </View>
                                <Text
                                    className={`flex-1 ${
                                        watchedDate
                                            ? isDark
                                                ? "text-white"
                                                : "text-gray-900"
                                            : isDark
                                            ? "text-gray-400"
                                            : "text-gray-400"
                                    }`}
                                >
                                    {watchedDate ? formatDate(watchedDate) : "Select date (DD/MM/YYYY)"}
                                </Text>
                                <MaterialIcons
                                    name="calendar-today"
                                    size={20}
                                    color={isDark ? "#6B7280" : "#9CA3AF"}
                                />
                            </Pressable>
                            {errors.revalidationDate && (
                                <Text className="text-red-500 text-sm mt-1.5">
                                    {errors.revalidationDate.message}
                                </Text>
                            )}
                        </View>

                        {/* Work Setting */}
                        <View>
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                            >
                                Work Setting
                            </Text>
                            <Pressable
                                onPress={() => setShowWorkSettingModal(true)}
                                className={`w-full pl-12 pr-10 py-4 rounded-2xl flex-row items-center ${
                                    isDark
                                        ? "bg-slate-800/90 border border-slate-700/50"
                                        : "bg-white border border-gray-200 shadow-sm"
                                } ${errors.workSetting ? "border-red-500" : ""}`}
                                style={{
                                    shadowColor: isDark ? "#000" : "#000",
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: isDark ? 0.1 : 0.05,
                                    shadowRadius: 4,
                                    elevation: 2,
                                }}
                            >
                                <View className="absolute inset-y-0 left-0 pl-4 flex items-center justify-center z-10">
                                    <MaterialIcons
                                        name="business"
                                        size={22}
                                        color={isDark ? "#6B7280" : "#9CA3AF"}
                                    />
                                </View>
                                <Text
                                    className={`flex-1 ${
                                        watchedWorkSetting
                                            ? isDark
                                                ? "text-white"
                                                : "text-gray-900"
                                            : isDark
                                            ? "text-gray-400"
                                            : "text-gray-400"
                                    }`}
                                >
                                    {selectedWorkSetting}
                                </Text>
                                <MaterialIcons
                                    name="expand-more"
                                    size={22}
                                    color={isDark ? "#6B7280" : "#9CA3AF"}
                                />
                            </Pressable>
                            {errors.workSetting && (
                                <Text className="text-red-500 text-sm mt-1.5">
                                    {errors.workSetting.message}
                                </Text>
                            )}
                        </View>

                        {/* Scope of Practice */}
                        <View>
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                            >
                                Scope of Practice
                            </Text>
                            <Pressable
                                onPress={() => setShowScopeModal(true)}
                                className={`w-full pl-12 pr-10 py-4 rounded-2xl flex-row items-center ${
                                    isDark
                                        ? "bg-slate-800/90 border border-slate-700/50"
                                        : "bg-white border border-gray-200 shadow-sm"
                                } ${errors.scope ? "border-red-500" : ""}`}
                                style={{
                                    shadowColor: isDark ? "#000" : "#000",
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: isDark ? 0.1 : 0.05,
                                    shadowRadius: 4,
                                    elevation: 2,
                                }}
                            >
                                <View className="absolute inset-y-0 left-0 pl-4 flex items-center justify-center z-10">
                                    <MaterialIcons
                                        name="work"
                                        size={22}
                                        color={isDark ? "#6B7280" : "#9CA3AF"}
                                    />
                                </View>
                                <Text
                                    className={`flex-1 ${
                                        watchedScope
                                            ? isDark
                                                ? "text-white"
                                                : "text-gray-900"
                                            : isDark
                                            ? "text-gray-400"
                                            : "text-gray-400"
                                    }`}
                                >
                                    {selectedScope}
                                </Text>
                                <MaterialIcons
                                    name="expand-more"
                                    size={22}
                                    color={isDark ? "#6B7280" : "#9CA3AF"}
                                />
                            </Pressable>
                            {errors.scope && (
                                <Text className="text-red-500 text-sm mt-1.5">
                                    {errors.scope.message}
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
                    <Text className="text-white font-semibold text-base">Complete Setup</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                </Pressable>
            </View>

            {/* Work Setting Modal */}
            <Modal
                visible={showWorkSettingModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowWorkSettingModal(false)}
            >
                <Pressable
                    className="flex-1 bg-black/50 justify-end"
                    onPress={() => setShowWorkSettingModal(false)}
                >
                    <View
                        className={`${
                            isDark ? "bg-slate-800" : "bg-white"
                        } rounded-t-3xl p-6 max-h-[80%]`}
                    >
                        <Text
                            className={`text-lg font-bold mb-4 ${
                                isDark ? "text-white" : "text-gray-900"
                            }`}
                        >
                            Select Work Setting
                        </Text>
                        <ScrollView>
                            {config.workSettings.map((setting) => (
                                <TouchableOpacity
                                    key={setting.value}
                                    onPress={() => {
                                        setValue("workSetting", setting.value as OnboardingProfessionalDetailsInput["workSetting"]);
                                        setShowWorkSettingModal(false);
                                    }}
                                    className={`py-4 px-4 rounded-xl mb-2 ${
                                        watchedWorkSetting === setting.value
                                            ? "bg-primary/10"
                                            : isDark
                                            ? "bg-slate-700"
                                            : "bg-gray-50"
                                    }`}
                                >
                                    <Text
                                        className={`${
                                            watchedWorkSetting === setting.value
                                                ? "text-primary font-semibold"
                                                : isDark
                                                ? "text-white"
                                                : "text-gray-900"
                                        }`}
                                    >
                                        {setting.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <Pressable
                            onPress={() => setShowWorkSettingModal(false)}
                            className={`mt-4 py-3 rounded-xl ${isDark ? "bg-slate-700" : "bg-gray-100"}`}
                        >
                            <Text className={`text-center font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                Cancel
                            </Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* Scope of Practice Modal */}
            <Modal
                visible={showScopeModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowScopeModal(false)}
            >
                <Pressable
                    className="flex-1 bg-black/50 justify-end"
                    onPress={() => setShowScopeModal(false)}
                >
                    <View
                        className={`${
                            isDark ? "bg-slate-800" : "bg-white"
                        } rounded-t-3xl p-6 max-h-[80%]`}
                    >
                        <Text
                            className={`text-lg font-bold mb-4 ${
                                isDark ? "text-white" : "text-gray-900"
                            }`}
                        >
                            Select Scope of Practice
                        </Text>
                        <ScrollView>
                            {config.scopeOfPractice.map((item) => (
                                <TouchableOpacity
                                    key={item.value}
                                    onPress={() => {
                                        setValue("scope", item.value as OnboardingProfessionalDetailsInput["scope"]);
                                        setShowScopeModal(false);
                                    }}
                                    className={`py-4 px-4 rounded-xl mb-2 ${
                                        watchedScope === item.value
                                            ? "bg-primary/10"
                                            : isDark
                                            ? "bg-slate-700"
                                            : "bg-gray-50"
                                    }`}
                                >
                                    <Text
                                        className={`${
                                            watchedScope === item.value
                                                ? "text-primary font-semibold"
                                                : isDark
                                                ? "text-white"
                                                : "text-gray-900"
                                        }`}
                                    >
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <Pressable
                            onPress={() => setShowScopeModal(false)}
                            className={`mt-4 py-3 rounded-xl ${isDark ? "bg-slate-700" : "bg-gray-100"}`}
                        >
                            <Text className={`text-center font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                Cancel
                            </Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* Date Picker Modal */}
            <Modal
                visible={showDatePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDatePicker(false)}
            >
                <Pressable
                    className="flex-1 bg-black/50 justify-end"
                    onPress={() => setShowDatePicker(false)}
                >
                    <Pressable
                        onPress={(e) => e.stopPropagation()}
                        className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-t-3xl p-6`}
                    >
                        {/* Calendar Header */}
                        <View className="flex-row items-center justify-between mb-6">
                            <Pressable
                                onPress={() => navigateMonth("prev")}
                                className="p-2 rounded-full"
                            >
                                <MaterialIcons
                                    name="chevron-left"
                                    size={24}
                                    color={isDark ? "#D1D5DB" : "#4B5563"}
                                />
                            </Pressable>
                            <View className="flex-row items-center gap-2">
                                <Pressable
                                    onPress={() => setShowMonthPicker(true)}
                                    className="px-4 py-2 rounded-xl"
                                >
                                    <Text
                                        className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                                    >
                                        {monthNames[selectedMonth]}
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => setShowYearPicker(true)}
                                    className="px-4 py-2 rounded-xl"
                                >
                                    <Text
                                        className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                                    >
                                        {selectedYear}
                                    </Text>
                                </Pressable>
                            </View>
                            <Pressable
                                onPress={() => navigateMonth("next")}
                                className="p-2 rounded-full"
                            >
                                <MaterialIcons
                                    name="chevron-right"
                                    size={24}
                                    color={isDark ? "#D1D5DB" : "#4B5563"}
                                />
                            </Pressable>
                        </View>

                        {/* Day Names Header */}
                        <View className="flex-row justify-between mb-3">
                            {dayNames.map((day) => (
                                <View key={day} className="w-10 items-center">
                                    <Text
                                        className={`text-xs font-semibold ${
                                            isDark ? "text-gray-400" : "text-gray-500"
                                        }`}
                                    >
                                        {day}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Calendar Grid */}
                        <View className="flex-row flex-wrap justify-between mb-6">
                            {renderCalendar()}
                        </View>

                        {/* Actions */}
                        <View className="flex-row gap-3">
                            <Pressable
                                onPress={() => setShowDatePicker(false)}
                                className={`flex-1 py-3 rounded-xl ${isDark ? "bg-slate-700" : "bg-gray-100"}`}
                            >
                                <Text className={`text-center font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                    Cancel
                                </Text>
                            </Pressable>
                            {watchedDate && (
                                <Pressable
                                    onPress={() => {
                                        setValue("revalidationDate", undefined as unknown as Date);
                                        setShowDatePicker(false);
                                    }}
                                    className={`flex-1 py-3 rounded-xl ${isDark ? "bg-slate-700" : "bg-gray-100"}`}
                                >
                                    <Text className={`text-center font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                        Clear
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Month Picker Modal */}
            <Modal
                visible={showMonthPicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowMonthPicker(false)}
            >
                <Pressable
                    className="flex-1 bg-black/50 justify-center items-center"
                    onPress={() => setShowMonthPicker(false)}
                >
                    <Pressable
                        onPress={(e) => e.stopPropagation()}
                        className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-3xl p-6 w-[85%] max-w-sm`}
                    >
                        <Text
                            className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
                        >
                            Select Month
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                            {monthNames.map((month, index) => (
                                <Pressable
                                    key={index}
                                    onPress={() => {
                                        setSelectedMonth(index);
                                        setShowMonthPicker(false);
                                    }}
                                    className={`flex-1 min-w-[30%] py-3 px-4 rounded-xl ${
                                        selectedMonth === index
                                            ? "bg-primary"
                                            : isDark
                                            ? "bg-slate-700"
                                            : "bg-gray-100"
                                    }`}
                                >
                                    <Text
                                        className={`text-center font-medium ${
                                            selectedMonth === index
                                                ? "text-white"
                                                : isDark
                                                ? "text-white"
                                                : "text-gray-900"
                                        }`}
                                    >
                                        {month.substring(0, 3)}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        <Pressable
                            onPress={() => setShowMonthPicker(false)}
                            className={`mt-4 py-3 rounded-xl ${isDark ? "bg-slate-700" : "bg-gray-100"}`}
                        >
                            <Text className={`text-center font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                Cancel
                            </Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Year Picker Modal */}
            <Modal
                visible={showYearPicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowYearPicker(false)}
            >
                <Pressable
                    className="flex-1 bg-black/50 justify-center items-center"
                    onPress={() => setShowYearPicker(false)}
                >
                    <Pressable
                        onPress={(e) => e.stopPropagation()}
                        className={`${isDark ? "bg-slate-800" : "bg-white"} rounded-3xl p-6 w-[85%] max-w-sm max-h-[70%]`}
                    >
                        <Text
                            className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
                        >
                            Select Year
                        </Text>
                        <ScrollView className="max-h-64">
                            <View className="flex-row flex-wrap gap-2">
                                {years.map((year) => (
                                    <Pressable
                                        key={year}
                                        onPress={() => {
                                            setSelectedYear(year);
                                            setShowYearPicker(false);
                                        }}
                                        className={`w-[30%] py-3 px-4 rounded-xl ${
                                            selectedYear === year
                                                ? "bg-primary"
                                                : isDark
                                                ? "bg-slate-700"
                                                : "bg-gray-100"
                                        }`}
                                    >
                                        <Text
                                            className={`text-center font-medium ${
                                                selectedYear === year
                                                    ? "text-white"
                                                    : isDark
                                                    ? "text-white"
                                                    : "text-gray-900"
                                            }`}
                                        >
                                            {year}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>
                        <Pressable
                            onPress={() => setShowYearPicker(false)}
                            className={`mt-4 py-3 rounded-xl ${isDark ? "bg-slate-700" : "bg-gray-100"}`}
                        >
                            <Text className={`text-center font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                Cancel
                            </Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}
