import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    Modal,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import "../global.css";

const roles = [
    { value: "doctor", label: "Doctor / GP" },
    { value: "nurse", label: "Nurse / Midwife" },
    { value: "pharmacist", label: "Pharmacist" },
    { value: "dentist", label: "Dentist" },
    { value: "other", label: "Other Healthcare Professional" },
];

export default function Register() {
    const router = useRouter();
    const [isDark, setIsDark] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [marketingOptIn, setMarketingOptIn] = useState(false);

    const handleSubmit = () => {
        // Handle form submission
        console.log({ email, password, role: selectedRole, termsAccepted, marketingOptIn });
    };

    const selectedRoleLabel = roles.find((r) => r.value === selectedRole)?.label || "Choose your profession";

    return (
        <SafeAreaView
            className={`flex-1 ${isDark ? "bg-background-dark dark" : "bg-background-light"}`}
        >
            {/* Dark mode toggle */}
            <Pressable
                className="absolute top-10 right-4 p-2 rounded-full border border-gray-200 dark:border-slate-700 shadow-sm z-50"
                onPress={() => setIsDark(!isDark)}
            >
                <MaterialIcons
                    name="dark-mode"
                    size={20}
                    color={isDark ? "#D1D5DB" : "#4B5563"}
                />
            </Pressable>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 16, flexGrow: 1, justifyContent: 'space-between' }}
                showsVerticalScrollIndicator={false}
            >
                <View className="h-12" />

                <View className="flex-1 px-4 pb-4 w-full justify-between">
                    {/* Header */}
                    <View className="mt-4 mb-6">
                        <Text
                            className={`text-3xl font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
                        >
                            Create Account
                        </Text>
                        <Text
                            className={`text-base font-light leading-snug ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        >
                            Join thousands of healthcare professionals managing revalidation.
                        </Text>
                    </View>

                    {/* Form */}
                    <View className="gap-4">
                        {/* Email Input */}
                        <View>
                            <Text
                                className={`text-sm font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                            >
                                Work Email Address
                            </Text>
                            <View className="relative">
                                <View className="absolute inset-y-0 left-0 pl-4 flex items-center justify-center pointer-events-none">
                                    <MaterialIcons
                                        name="mail"
                                        size={20}
                                        color={isDark ? "#9CA3AF" : "#9CA3AF"}
                                    />
                                </View>
                                <TextInput
                                    className={`w-full pl-11 pr-4 py-4 rounded-2xl ${
                                        isDark
                                            ? "bg-slate-800 text-white border border-slate-700"
                                            : "bg-white text-gray-900 border border-gray-200"
                                    }`}
                                    placeholder="e.g. name@nhs.net"
                                    placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        {/* Password Input */}
                        <View>
                            <Text
                                className={`text-sm font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                            >
                                Create Password
                            </Text>
                            <View className="relative">
                                <View className="absolute inset-y-0 left-0 pl-4 flex items-center justify-center pointer-events-none">
                                    <MaterialIcons
                                        name="lock"
                                        size={20}
                                        color={isDark ? "#9CA3AF" : "#9CA3AF"}
                                    />
                                </View>
                                <TextInput
                                    className={`w-full pl-11 pr-12 py-4 rounded-2xl ${
                                        isDark
                                            ? "bg-slate-800 text-white border border-slate-700"
                                            : "bg-white text-gray-900 border border-gray-200"
                                    }`}
                                    placeholder="At least 8 characters"
                                    placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <Pressable
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center justify-center"
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <MaterialIcons
                                        name={showPassword ? "visibility-off" : "visibility"}
                                        size={20}
                                        color={isDark ? "#9CA3AF" : "#9CA3AF"}
                                    />
                                </Pressable>
                            </View>
                        </View>

                        {/* Role Selector */}
                        <View>
                            <Text
                                className={`text-sm font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                            >
                                Select Your Role
                            </Text>
                            <Pressable
                                onPress={() => setShowRoleDropdown(true)}
                                className={`w-full pl-11 pr-10 py-4 rounded-2xl flex-row items-center ${
                                    isDark
                                        ? "bg-slate-800 border border-slate-700"
                                        : "bg-white border border-gray-200"
                                }`}
                            >
                                <View className="absolute inset-y-0 left-0 pl-4 flex items-center justify-center">
                                    <MaterialIcons
                                        name="badge"
                                        size={20}
                                        color={isDark ? "#9CA3AF" : "#9CA3AF"}
                                    />
                                </View>
                                <Text
                                    className={`flex-1 ${
                                        selectedRole
                                            ? isDark
                                                ? "text-white"
                                                : "text-gray-900"
                                            : isDark
                                            ? "text-gray-400"
                                            : "text-gray-400"
                                    }`}
                                >
                                    {selectedRoleLabel}
                                </Text>
                                <MaterialIcons
                                    name="expand-more"
                                    size={20}
                                    color={isDark ? "#9CA3AF" : "#9CA3AF"}
                                />
                            </Pressable>
                        </View>

                        {/* Checkboxes */}
                        <View className="gap-4 pt-2">
                            {/* Terms Checkbox */}
                            <View className="flex-row items-start">
                                <Pressable
                                    onPress={() => setTermsAccepted(!termsAccepted)}
                                    className={`h-6 w-6 rounded-full border-2 mr-3 mt-0.5 flex items-center justify-center ${
                                        isDark
                                            ? "border-slate-700 bg-slate-800"
                                            : "border-gray-300 bg-white"
                                    } ${termsAccepted ? "bg-primary border-primary" : ""}`}
                                >
                                    {termsAccepted && (
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

                            {/* Marketing Checkbox */}
                            <View className="flex-row items-start">
                                <Pressable
                                    onPress={() => setMarketingOptIn(!marketingOptIn)}
                                    className={`h-6 w-6 rounded-full border-2 mr-3 mt-0.5 flex items-center justify-center ${
                                        isDark
                                            ? "border-slate-700 bg-slate-800"
                                            : "border-gray-300 bg-white"
                                    } ${marketingOptIn ? "bg-primary border-primary" : ""}`}
                                >
                                    {marketingOptIn && (
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
                        </View>

                        {/* Submit Button */}
                        <View className="pt-4">
                            <Pressable
                                onPress={handleSubmit}
                                className="w-full bg-primary py-4 rounded-2xl shadow-lg active:opacity-90 flex-row justify-center items-center gap-2"
                            >
                                <Text className="text-white font-bold text-base">Create Account</Text>
                                <MaterialIcons name="arrow-forward" size={20} color="white" />
                            </Pressable>
                        </View>
                    </View>

                    {/* Divider */}
                    <View className="mt-6 relative">
                        <View className="absolute inset-0 flex items-center">
                            <View
                                className={`w-full border-t ${
                                    isDark ? "border-slate-800" : "border-gray-200"
                                }`}
                            />
                        </View>
                        <View className="relative flex items-center justify-center">
                            <Text
                                className={`px-4 text-sm ${
                                    isDark ? "bg-background-dark text-gray-500" : "bg-background-light text-gray-500"
                                }`}
                            >
                                Or sign up with
                            </Text>
                        </View>
                    </View>

                    {/* Social Login Buttons */}
                    <View className="mt-4 flex-row gap-3">
                        <Pressable
                            className={`flex-1 py-3 px-4 rounded-xl border flex-row items-center justify-center gap-2 ${
                                isDark
                                    ? "bg-slate-800 border-slate-700"
                                    : "bg-white border-gray-200"
                            } active:opacity-70`}
                        >
                            <FontAwesome5
                                name="google"
                                size={20}
                                color={isDark ? "#FFFFFF" : "#4285F4"}
                            />
                            <Text
                                className={`text-sm font-semibold ${
                                    isDark ? "text-white" : "text-gray-700"
                                }`}
                            >
                                Google
                            </Text>
                        </Pressable>

                        <Pressable
                            className={`flex-1 py-3 px-4 rounded-xl border flex-row items-center justify-center gap-2 ${
                                isDark
                                    ? "bg-slate-800 border-slate-700"
                                    : "bg-white border-gray-200"
                            } active:opacity-70`}
                        >
                            <FontAwesome5
                                name="apple"
                                size={20}
                                color={isDark ? "#FFFFFF" : "#000000"}
                            />
                            <Text
                                className={`text-sm font-semibold ${
                                    isDark ? "text-white" : "text-gray-700"
                                }`}
                            >
                                Apple
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>

            {/* Footer */}
            <View className={`py-3 px-4 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                <View className="flex-row items-center justify-center">
                    <Text
                        className={isDark ? "text-gray-400" : "text-gray-600"}
                    >
                        Already have an account?{" "}
                    </Text>
                    <Pressable onPress={() => router.push("/(auth)/login")}>
                        <Text className="text-primary font-bold">Log In</Text>
                    </Pressable>
                </View>
            </View>

            {/* Role Dropdown Modal */}
            <Modal
                visible={showRoleDropdown}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowRoleDropdown(false)}
            >
                <Pressable
                    className="flex-1 bg-black/50 justify-end"
                    onPress={() => setShowRoleDropdown(false)}
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
                            Select Your Role
                        </Text>
                        <ScrollView>
                            {roles.map((role) => (
                                <TouchableOpacity
                                    key={role.value}
                                    onPress={() => {
                                        setSelectedRole(role.value);
                                        setShowRoleDropdown(false);
                                    }}
                                    className={`py-4 px-4 rounded-xl mb-2 ${
                                        selectedRole === role.value
                                            ? "bg-primary/10"
                                            : isDark
                                            ? "bg-slate-700"
                                            : "bg-gray-50"
                                    }`}
                                >
                                    <Text
                                        className={`${
                                            selectedRole === role.value
                                                ? "text-primary font-semibold"
                                                : isDark
                                                ? "text-white"
                                                : "text-gray-900"
                                        }`}
                                    >
                                        {role.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <Pressable
                            onPress={() => setShowRoleDropdown(false)}
                            className="mt-4 py-3 rounded-xl bg-gray-100 dark:bg-slate-700"
                        >
                            <Text className="text-center text-gray-700 dark:text-gray-300 font-semibold">
                                Cancel
                            </Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}
