import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from '@react-navigation/native';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver, SubmitHandler } from "react-hook-form";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    onboardingRoleSchema,
    type OnboardingRoleInput,
} from "@/validation/schema";
import { useThemeStore } from "@/features/theme/theme.store";
import { apiService, API_ENDPOINTS } from "@/services/api";
import { showToast } from "@/utils/toast";
import "../global.css";

const DEFAULT_ROLES = [
    { value: "doctor" as const, label: "Doctor / GP", icon: "healing", description: "General practitioners and medical doctors" },
    { value: "nurse" as const, label: "Nurse / Midwife", icon: "local-hospital", description: "Registered nurses and midwives" },
    { value: "pharmacist" as const, label: "Pharmacist", icon: "science", description: "Registered pharmacists" },
    { value: "dentist" as const, label: "Dentist", icon: "health-and-safety", description: "Dental practitioners" },
    { value: "other" as const, label: "Other Healthcare Professional", icon: "person", description: "Other regulated healthcare roles" },
] as const;

type RoleItem = {
    value: string;
    label: string;
    icon: string;
    description: string;
};


export default function RoleSelection() {
    const router = useRouter();
    const { isDark } = useThemeStore();
    const [isLoading, setIsLoading] = useState(false);

    const {
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<OnboardingRoleInput>({
        resolver: zodResolver(onboardingRoleSchema) as Resolver<OnboardingRoleInput>,
        defaultValues: {},
    });

    const [availableRoles, setAvailableRoles] = useState<RoleItem[]>(() => []);

    const watchedRole = watch("role");

    // Helper to map backend roles -> frontend RoleItem
    const mapBackendRoles = (roles: { name: string; status: string; type: string }[]) => {
        // Only include roles with status === 'one' (exclude 'zero' or others)
        const filtered = roles.filter(r => (r.status || '').toString() === 'one');

        const mapped = filtered.map(r => {
            const rawName = (r.name || '').trim();
            const lower = rawName.toLowerCase();

            // Derive frontend value from database name so DB edits are reflected live
            // Keep canonical keys for common professions, otherwise slugify the DB name
            let value: string;
            if (lower.includes('doctor')) value = 'doctor';
            else if (lower.includes('nurse')) value = 'nurse';
            else if (lower.includes('pharmacist')) value = 'pharmacist';
            else {
                // Slugify unknown role names so they become distinct selectable items
                value = rawName
                    .toLowerCase()
                    .replace(/\s+/g, '_')
                    .replace(/[^a-z0-9_]/g, '');
                if (!value) value = 'other';
            }

            // Use a friendly label: prefer the DB label if present, otherwise fall back to meta
            const meta = getRoleMeta(value);
            const label = rawName || meta.label;

            return { value, label, icon: meta.icon, description: meta.description } as RoleItem;
        });

        // Remove duplicates by value while preserving order
        const unique: RoleItem[] = [];
        const seen = new Set<string>();
        for (const item of mapped) {
            if (!seen.has(item.value)) {
                seen.add(item.value);
                unique.push(item);
            }
        }

        // Return what we have (do not fallback to defaults)
        return unique;
    };

    // Fetch roles from backend (protected or public) and update availableRoles
    const fetchRolesFromBackend = async (token?: string | null) => {
        try {
            if (token) {
                try {
                    const rolesResp = await apiService.get<{
                        success: boolean;
                        data: { roles: { name: string; status: string; type: string }[] };
                    }>(API_ENDPOINTS.USERS.ONBOARDING.ROLES, token);

                    if (rolesResp?.data?.roles) {
                        setAvailableRoles(mapBackendRoles(rolesResp.data.roles));
                        return;
                    }
                } catch (e) {
                    console.log('Protected roles fetch failed, will try public endpoint', (e as any)?.message || e);
                }
            }

                // If fetch fails or backend returns no roles, leave `availableRoles` empty (no fallback)
                setAvailableRoles([]);
        } catch (err) {
            console.log('Failed to fetch roles', err);
        }
    };

    // Load saved onboarding data and initial roles on mount
    useEffect(() => {
        let mounted = true;
        const loadSavedData = async () => {
            try {
                const token = await AsyncStorage.getItem('authToken');
                // Initial roles load
                await fetchRolesFromBackend(token);

                // Load saved onboarding step data
                const response = await apiService.get<{
                    success: boolean;
                    data: {
                        step1: { role: string | null };
                    };
                }>(API_ENDPOINTS.USERS.ONBOARDING.DATA, token ?? undefined);

                if (response?.data?.step1?.role && mounted) {
                    const backendRole = response.data.step1.role;
                    let frontendRole = backendRole;
                    if (backendRole === 'other_healthcare') frontendRole = 'other';
                    reset({ role: frontendRole as any });
                } else {
                    // Fallback: if backend didn't return saved role, try local AsyncStorage
                    const localRole = await AsyncStorage.getItem('onboardingRole');
                    if (localRole && mounted) {
                        reset({ role: localRole as any });
                    }
                }
            } catch (error) {
                console.log('No saved role data found');
            }
        };

        loadSavedData();

        return () => { mounted = false; };
    }, [reset]);

    // Polling interval reference
    const pollRef = useRef<number | null>(null);

    // Re-fetch roles when the screen is focused
    useFocusEffect(
        React.useCallback(() => {
            let isActive = true;
            (async () => {
                const token = await AsyncStorage.getItem('authToken');
                if (isActive) await fetchRolesFromBackend(token);
            })();

            return () => { isActive = false; };
        }, [])
    );

    // Persist role selection immediately when user taps a role card
    const handleRoleSelect = async (roleValue: string) => {
        try {
            // update form state immediately for instant UI feedback
            setValue("role", roleValue as any);

            // save locally so selection persists even if backend isn't reachable
            await AsyncStorage.setItem('onboardingRole', roleValue);

            // attempt to save to backend if we have an auth token
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;

            const backendRole = mapRoleToBackend(roleValue);
            await apiService.post(
                API_ENDPOINTS.USERS.ONBOARDING.STEP_1,
                { professional_role: backendRole },
                token ?? undefined
            );
        } catch (err) {
            console.log('Failed to persist role selection', (err as any)?.message || err);
        }
    };

    // Start a periodic poll to keep roles in sync with backend
    useEffect(() => {
        const startPolling = async () => {
            const token = await AsyncStorage.getItem('authToken');
            // Poll every 30 seconds
            pollRef.current = setInterval(async () => {
                await fetchRolesFromBackend(token);
            }, 30_000) as unknown as number;
        };

        startPolling();

        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current as any);
                pollRef.current = null;
            }
        };
    }, []);

    // Map frontend role values to backend API values
    const mapRoleToBackend = (role: string): 'doctor' | 'nurse' | 'pharmacist' | 'other_healthcare' => {
        if (role === 'doctor' || role === 'nurse' || role === 'pharmacist') {
            return role;
        }
        // Map 'dentist' and 'other' to 'other_healthcare'
        return 'other_healthcare';
    };

    function getRoleMeta(value: string) {
        switch (value) {
            case 'doctor':
                return { label: 'Doctor / GP', icon: 'healing', description: 'General practitioners and medical doctors' };
            case 'nurse':
                return { label: 'Nurse / Midwife', icon: 'local-hospital', description: 'Registered nurses and midwives' };
            case 'pharmacist':
                return { label: 'Pharmacist', icon: 'science', description: 'Registered pharmacists' };
            case 'dentist':
                return { label: 'Dentist', icon: 'health-and-safety', description: 'Dental practitioners' };
            default:
                return { label: 'Other Healthcare Professional', icon: 'person', description: 'Other regulated healthcare roles' };
        }
    }

    const onSubmit: SubmitHandler<OnboardingRoleInput> = async (data) => {
        try {
            setIsLoading(true);

            // Get auth token
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                showToast.error("Please log in again", "Error");
                router.replace("/(auth)/login");
                return;
            }

            // Map role to backend format
            const backendRole = mapRoleToBackend(data.role);

            // Call API to save role
            await apiService.post(
                API_ENDPOINTS.USERS.ONBOARDING.STEP_1,
                {
                    professional_role: backendRole,
                },
                token
            );

            // Navigate to next step
        router.push({
            pathname: "/(onboarding)/personal-details",
            params: { role: data.role },
        });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error 
                ? error.message 
                : "Failed to save role. Please try again.";
            
            showToast.error(errorMessage, "Error");
        } finally {
            setIsLoading(false);
        }
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
                        {availableRoles.map((role) => {
                            const isSelected = watchedRole === role.value;

                            return (
                                <Pressable
                                    key={role.value}
                                    onPress={() => handleRoleSelect(role.value)}
                                    className={`w-full rounded-2xl p-5 flex-row items-center gap-4 ${
                                        isSelected
                                            ? "bg-primary/10"
                                            : isDark
                                            ? "bg-slate-800/90"
                                            : "bg-white"
                                    }`}
                                    style={{
                                        borderWidth: isSelected ? 3 : 1,
                                        borderColor: isSelected 
                                            ? "#1E5AF3" 
                                            : isDark 
                                            ? "rgba(51, 65, 85, 0.5)" 
                                            : "#E5E7EB",
                                        shadowColor: isDark ? "#000" : "#000",
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: isDark ? 0.1 : 0.05,
                                        shadowRadius: 4,
                                        elevation: 2,
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
                    disabled={isLoading}
                    className={`w-full py-4 rounded-2xl flex-row items-center justify-center active:opacity-90 ${
                        isLoading ? "bg-primary/50" : "bg-primary"
                    }`}
                    style={{
                        shadowColor: "#1E5AF3",
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.25,
                        shadowRadius: 12,
                        elevation: 8,
                    }}
                >
                    {isLoading ? (
                        <Text className="text-white font-semibold text-base">Saving...</Text>
                    ) : (
                        <>
                    <Text className="text-white font-semibold text-base">Continue</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                        </>
                    )}
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
