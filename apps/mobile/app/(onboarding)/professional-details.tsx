import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Modal, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    onboardingProfessionalDetailsSchema,
    type OnboardingProfessionalDetailsInput,
} from "@/validation/schema";
import { useThemeStore } from "@/features/theme/theme.store";
import { apiService, API_ENDPOINTS } from "@/services/api";
import { showToast } from "@/utils/toast";
import "../global.css";

const roleConfig = {
    doctor: {
        registrationLabel: "GMC Registration Number",
        registrationPlaceholder: "e.g. 12345678",
        registrationBody: "GMC",
        workSettings: [],
        scopeOfPractice: [],
    },
    nurse: {
        registrationLabel: "NMC Registration Number",
        registrationPlaceholder: "e.g. 12A3456B",
        registrationBody: "NMC",
        workSettings: [],
        scopeOfPractice: [],
    },
    pharmacist: {
        registrationLabel: "GPhC Registration Number",
        registrationPlaceholder: "e.g. 1234567",
        registrationBody: "GPhC",
        workSettings: [],
        scopeOfPractice: [],
    },
    dentist: {
        registrationLabel: "GDC Registration Number",
        registrationPlaceholder: "e.g. 123456",
        registrationBody: "GDC",
        workSettings: [],
        scopeOfPractice: [],
    },
    other: {
        registrationLabel: "Registration Number",
        registrationPlaceholder: "Enter your registration number",
        registrationBody: "",
        workSettings: [],
        scopeOfPractice: [],
    },
};

type Option = { value: string; label: string };

export default function ProfessionalDetails() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const role = (params.role as string) || "other";
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.other;

    const { isDark } = useThemeStore();
    const [isLoading, setIsLoading] = useState(false);
    const [, setIsLoadingData] = useState(true);
    const [workSettingsOptions, setWorkSettingsOptions] = useState<Option[]>(() => config.workSettings as Option[]);
    // Do not use mocked defaults for scope; initialize empty and populate from API response only
    const [scopeOptions, setScopeOptions] = useState<Option[]>(() => []);
    const [showWorkSettingModal, setShowWorkSettingModal] = useState(false);
    const [showScopeModal, setShowScopeModal] = useState(false);
    const [showProfessionalRegistrationsModal, setShowProfessionalRegistrationsModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [onboardingSummary, setOnboardingSummary] = useState<string>("");

    const {
        control,
        setValue,
        watch,
        reset,
        formState: { errors },
        getValues,
    } = useForm<OnboardingProfessionalDetailsInput>({
        resolver: zodResolver(onboardingProfessionalDetailsSchema) as Resolver<OnboardingProfessionalDetailsInput>,
        defaultValues: {
            registrationNumber: "",
            professionalRegistrations: [],
            registrationPin: "",
            hourlyRate: 0,
            workHoursCompleted: 0,
            trainingHoursCompleted: 0,
            earningsCurrentYear: 0,
            workDescription: "",
            notepad: "",
        },
    });

    // Load saved data on mount
    useEffect(() => {
        const loadSavedData = async () => {
            try {
                const token = await AsyncStorage.getItem('authToken');
                if (!token) {
                    setIsLoadingData(false);
                    return;
                }

                const response = await apiService.get<{
                    success: boolean;
                    data: {
                        step3: {
                            registrationNumber: string;
                            revalidationDate: string | null;
                            workSetting?: string;
                            scope?: string;
                            professionalRegistrations: string | string[];
                            registrationPin: string;
                            hourlyRate: number;
                            workHoursCompleted: number;
                            trainingHoursCompleted: number;
                            earningsCurrentYear: number;
                            workDescription: string;
                            notepad: string;
                        };
                    };
                }>(API_ENDPOINTS.USERS.ONBOARDING.DATA, token);

                    if (response?.data?.step3) {
                    const step3 = response.data.step3;
                    const revalidationDate = step3.revalidationDate 
                        ? new Date(step3.revalidationDate) 
                        : undefined;

                    // coerce numeric/string values to proper types and normalize registrations
                    const professionalRegistrations = Array.isArray(step3.professionalRegistrations)
                        ? step3.professionalRegistrations
                        : (typeof step3.professionalRegistrations === 'string' && step3.professionalRegistrations.length > 0)
                            ? step3.professionalRegistrations.split(',').map((s: string) => s.trim())
                            : [];

                    reset({
                        registrationNumber: step3.registrationNumber || "",
                        professionalRegistrations: professionalRegistrations as any,
                        registrationPin: step3.registrationPin || "",
                        hourlyRate: Number(step3.hourlyRate) || 0,
                        workHoursCompleted: Number(step3.workHoursCompleted) || 0,
                        trainingHoursCompleted: Number(step3.trainingHoursCompleted) || 0,
                        earningsCurrentYear: Number(step3.earningsCurrentYear) || 0,
                        workDescription: step3.workDescription || "",
                        notepad: step3.notepad || "",
                        revalidationDate: revalidationDate,
                        workSetting: step3.workSetting as any,
                        scope: step3.scope as any,
                    });

                    // Set date picker to saved date if available
                    if (revalidationDate) {
                        setSelectedMonth(revalidationDate.getMonth());
                        setSelectedYear(revalidationDate.getFullYear());
                    }

                    // Build a detailed onboarding summary (include local step1/step2 if API missing)
                    try {
                        const apiData = response?.data as any;

                        // attempt to read local cached onboarding steps
                        let localStep1: any = null;
                        let localStep2: any = null;
                        try {
                            const raw1 = await AsyncStorage.getItem('onboarding.step1');
                            localStep1 = raw1 ? JSON.parse(raw1) : null;
                        } catch (e) {
                            localStep1 = null;
                        }
                        try {
                            const raw2 = await AsyncStorage.getItem('onboarding.step2');
                            localStep2 = raw2 ? JSON.parse(raw2) : null;
                        } catch (e) {
                            localStep2 = null;
                        }

                        const parts: string[] = [];

                        const completedSteps: string[] = [];
                        if (apiData?.step1 || localStep1) completedSteps.push('Personal Details');
                        if (apiData?.step2 || localStep2) completedSteps.push('Contact Details');
                        if (apiData?.step3) completedSteps.push('Professional Details');
                        parts.push(`Completed onboarding forms: ${completedSteps.length ? completedSteps.join(', ') : 'None'}.`);

                        // helper to pretty label keys
                        const prettyKey = (k: string) =>
                            k.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/\s+/g, ' ').trim().replace(/(^|\s)\S/g, s => s.toUpperCase());

                        const buildSection = (title: string, obj: any) => {
                            if (!obj || (typeof obj === 'object' && Object.keys(obj).length === 0)) return;
                            parts.push(`--- ${title} ---`);
                            Object.entries(obj).forEach(([k, v]) => {
                                if (v === null || v === undefined) return;
                                if (typeof v === 'object') {
                                    if (Array.isArray(v)) {
                                        const joined = v.map((x) => (x == null ? '' : String(x))).filter(Boolean).join(', ');
                                        if (joined) parts.push(`${prettyKey(k)}: ${joined}`);
                                    } else {
                                        // shallow stringify small objects
                                        try {
                                            const s = JSON.stringify(v);
                                            parts.push(`${prettyKey(k)}: ${s}`);
                                        } catch (e) { /* ignore */ }
                                    }
                                } else {
                                    const s = String(v).trim();
                                    if (s) parts.push(`${prettyKey(k)}: ${s}`);
                                }
                            });
                        };

                        // Step 1 (local or API)
                        buildSection('Personal Details', apiData?.step1 ?? localStep1 ?? null);

                        // Step 2 (local or API)
                        buildSection('Contact Details', apiData?.step2 ?? localStep2 ?? null);

                        // Step 3 (API)
                        buildSection('Professional Details', step3 ?? null);

                        // If professionalRegistrations normalized earlier, include them explicitly
                        if (professionalRegistrations && professionalRegistrations.length) {
                            parts.push(`Professional Registrations: ${professionalRegistrations.join(', ')}`);
                        }

                        const summaryText = parts.join('\n');
                        if (summaryText.trim()) setOnboardingSummary(summaryText);
                    } catch (e) {
                        // ignore summary generation errors
                    }
                }
                // Fetch dynamic work settings from backend (if available)
                try {
                    // Use profile/work endpoint which returns [{id,name,status}] and show names when status indicates enabled
                    const workResp = await apiService.get<any>('/api/v1/profile/work', token as string);
                    const items = Array.isArray(workResp) ? workResp : workResp?.data ?? [];
                    if (Array.isArray(items)) {
                        const mapped = items
                            .filter((ws: any) => {
                                const s = ws.status ?? ws.active ?? ws.enabled ?? 'one';
                                return String(s) === 'one' || String(s) === '1' || s === 1;
                            })
                            .map((ws: any) => {
                                const name = (ws.name ?? ws.label ?? '').toString().trim();
                                return { value: name, label: name };
                            });

                        // Deduplicate by `value` (name) to avoid repeated items
                        const unique = Array.from(new Map(mapped.map((m) => [m.value, m])).values());
                        setWorkSettingsOptions(unique as Option[]);
                        // If we already built a summary earlier containing a raw workSetting value, replace it with the friendly label
                        try {
                            const raw = response?.data?.step3?.workSetting;
                            if (raw && unique.length) {
                                const label = unique.find((u: any) => u.value === raw)?.label || raw;
                                setOnboardingSummary((prev) => prev ? prev.replace(new RegExp(`Work Setting:\s*.*`), `Work Setting: ${label}`) : prev);
                            }
                        } catch (e) { /* ignore */ }
                    }
                } catch (err) {
                    // ignore and keep defaults
                }

                // Fetch dynamic scope-of-practice values from backend
                try {
                    const scopeResp = await apiService.get<any>('/api/v1/profile/scope', token as string);
                    const items = Array.isArray(scopeResp) ? scopeResp : scopeResp?.data ?? [];
                        if (Array.isArray(items)) {
                            const mapped = items
                                .filter((s: any) => {
                                    const st = s.status ?? s.active ?? s.enabled ?? 'one';
                                    return String(st) === 'one' || String(st) === '1' || st === 1;
                                })
                                .map((s: any) => {
                                    const name = (s.name ?? s.label ?? '').toString().trim();
                                    return { value: name, label: name };
                                });

                            // Deduplicate by `value` (name) to avoid repeated items
                            const unique = Array.from(new Map(mapped.map((m) => [m.value, m])).values());
                            setScopeOptions(unique);
                            // Replace raw scope value in summary with friendly label if present
                            try {
                                const rawScope = response?.data?.step3?.scope;
                                if (rawScope && unique.length) {
                                    const label = unique.find((u: any) => u.value === rawScope)?.label || rawScope;
                                    setOnboardingSummary((prev) => prev ? prev.replace(new RegExp(`Scope of Practice:\s*.*`), `Scope of Practice: ${label}`) : prev);
                                }
                            } catch (e) { /* ignore */ }
                        }
                } catch (err) {
                    // ignore and keep defaults
                }

                // Fetch registration list (for Professional Registrations) from backend
                try {
                    const regResp = await apiService.get<any>('/api/v1/profile/registration', token as string);
                    const items = Array.isArray(regResp) ? regResp : regResp?.data ?? [];
                        if (Array.isArray(items)) {
                        const mapped = items
                            .filter((r: any) => {
                                const st = r.status ?? r.active ?? r.enabled ?? 'one';
                                return String(st) === 'one' || String(st) === '1' || st === 1;
                            })
                            .map((r: any) => {
                                const name = (r.name ?? r.label ?? '').toString().trim();
                                return { value: name, label: name };
                            });

                        // Deduplicate by `value` (name) to avoid duplicate keys/entries
                        const unique = Array.from(new Map(mapped.map((m) => [m.value, m])).values());
                        setRegistrationOptions(unique);
                    
                        // If professional registrations exist in the summary, replace raw values with labels
                        try {
                            const rawRegs = Array.isArray(response?.data?.step3?.professionalRegistrations)
                                ? response?.data?.step3?.professionalRegistrations
                                : (typeof response?.data?.step3?.professionalRegistrations === 'string'
                                    ? response?.data?.step3?.professionalRegistrations.split(',').map((s: string) => s.trim())
                                    : []);

                            if (rawRegs && rawRegs.length && unique.length) {
                                const mappedLabels = rawRegs.map((r: string) => unique.find((u: any) => u.value === r)?.label || r).join(', ');
                                setOnboardingSummary((prev) => prev ? prev.replace(new RegExp(`Professional Registrations:\s*.*`), `Professional Registrations: ${mappedLabels}`) : prev);
                            }
                        } catch (e) { /* ignore */ }
                    }
                } catch (err) {
                    // ignore and keep defaults
                }
            } catch (error) {
                // Silently fail - user might not have saved data yet
                console.log('No saved professional details found');
            } finally {
                setIsLoadingData(false);
            }
        };

        loadSavedData();
    }, [reset]);

    const watchedDate = watch("revalidationDate");
    const watchedWorkSetting = watch("workSetting");
    const watchedScope = watch("scope");
    const watchedProfessionalRegistrations = (watch("professionalRegistrations") ?? []) as string[];

    const selectedWorkSetting = workSettingsOptions.find((w) => w.value === watchedWorkSetting)?.label ?? "Select work setting";
    const selectedScope = scopeOptions.find((s) => s.value === watchedScope)?.label ?? "Select scope of practice";

    // Loaded from API: registration types (e.g. Midwife, Registered Nurse)
    const [registrationOptions, setRegistrationOptions] = useState<Option[]>([]);

    const toggleProfessionalRegistration = (value: string) => {
        const current = watchedProfessionalRegistrations;
        if (current.includes(value as any)) {
            const updated = current.filter((r) => r !== value);
            setValue("professionalRegistrations", updated as any);
            // persist change
            // sanitize and dedupe before saving
            const clean = Array.from(new Set((updated || []).map((s) => (s || '').toString().trim()))).filter(Boolean);
            saveStep3Partial({ professional_registrations: clean.join(',') });
        } else {
            const updated = [...current, value];
            setValue("professionalRegistrations", updated as any);
            // persist change
            const clean = Array.from(new Set((updated || []).map((s) => (s || '').toString().trim()))).filter(Boolean);
            saveStep3Partial({ professional_registrations: clean.join(',') });
        }
    };

    // Persist partial step3 data locally and to backend
    const saveStep3Partial = async (partial: Record<string, any>) => {
        try {
            // merge with existing local cache
            const raw = await AsyncStorage.getItem('onboarding.step3');
            const existing = raw ? JSON.parse(raw) : {};
            // sanitize professional_registrations if present
            if (partial.professional_registrations && typeof partial.professional_registrations === 'string') {
                const parts = partial.professional_registrations
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter(Boolean);
                // dedupe
                partial.professional_registrations = Array.from(new Set(parts)).join(',');
            }

            const merged = { ...existing, ...partial };
            await AsyncStorage.setItem('onboarding.step3', JSON.stringify(merged));
        } catch (e) {
            // ignore local save failures
        }

        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;
            await apiService.post(API_ENDPOINTS.USERS.ONBOARDING.STEP_3, partial, token ?? undefined);
        } catch (e) {
            console.log('Failed to persist onboarding step3 partial', (e as any)?.message || e);
        }
    };

    const handleWorkSettingSelect = async (value: string) => {
        setValue('workSetting', value as any);
        setShowWorkSettingModal(false);
        await saveStep3Partial({ work_setting: value });
    };

    const handleScopeSelect = async (value: string) => {
        setValue('scope', value as any);
        setShowScopeModal(false);
        await saveStep3Partial({ scope_of_practice: value });
    };

    const getSelectedRegistrationsLabel = () => {
        if (watchedProfessionalRegistrations.length === 0) return "Select Items";
        if (watchedProfessionalRegistrations.length === 1) {
            return registrationOptions.find((opt) => opt.value === watchedProfessionalRegistrations[0])?.label || "Select Items";
        }
        return `${watchedProfessionalRegistrations.length} items selected`;
    };

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
        try {
            // persist selected date to backend as YYYY-MM-DD
            saveStep3Partial({ revalidation_date: formatDateForAPI(newDate) });
        } catch (e) {
            // ignore
        }
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

    // Format date to YYYY-MM-DD
    const formatDateForAPI = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Allow completing setup even if some fields fail zod validation by
    // persisting the current form values as a partial payload and
    // navigating to the next step. This keeps the strict schema for
    // the normal validated submit flow but makes the "Complete Setup"
    // button responsive when users want to finish quickly.
    const handleCompleteSetup = async () => {
        try {
            setIsLoading(true);
            const values = getValues();

            const partial: Record<string, any> = {};

            if (values.registrationNumber) partial.registration_number = (values.registrationNumber || '').toString();
            if (values.revalidationDate) partial.revalidation_date = formatDateForAPI(values.revalidationDate as Date);
            if (values.workSetting) partial.work_setting = values.workSetting;
            if (values.scope) partial.scope_of_practice = values.scope;
            if (values.professionalRegistrations && Array.isArray(values.professionalRegistrations) && values.professionalRegistrations.length) {
                partial.professional_registrations = (values.professionalRegistrations || []).map((v: any) => (v || '').toString().trim()).filter(Boolean).join(',');
            }
            if (values.registrationPin) partial.registration_reference_pin = values.registrationPin;
            if (values.hourlyRate !== undefined) partial.hourly_rate = Number(values.hourlyRate || 0);
            if (values.workHoursCompleted !== undefined) partial.work_hours_completed_already = Number(values.workHoursCompleted || 0);
            if (values.trainingHoursCompleted !== undefined) partial.training_hours_completed_already = Number(values.trainingHoursCompleted || 0);
            if (values.earningsCurrentYear !== undefined) partial.earned_current_financial_year = Number(values.earningsCurrentYear || 0);
            if (values.workDescription) partial.brief_description_of_work = values.workDescription;
            if (values.notepad) partial.notepad = values.notepad;

            // Persist locally and to backend
            await saveStep3Partial(partial);

            // Navigate to next onboarding step
            router.push("/(onboarding)/plan-choose");
        } catch (e) {
            console.log('Failed to complete setup', (e as any)?.message || e);
            showToast.error('Failed to complete setup. Please try again', 'Error');
        } finally {
            setIsLoading(false);
        }
    };

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
                                            onBlur={async () => {
                                                onBlur();
                                                try {
                                                    await saveStep3Partial({ gmc_registration_number: value });
                                                } catch (e) {
                                                    /* ignore */
                                                }
                                            }}
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

                        {/* Professional Registrations */}
                        <View>
                            <View className="flex-row items-center mb-3">
                                <Text
                                    className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}
                                >
                                    Professional Registration(s)
                                </Text>
                                <Text className="text-red-500 ml-1">*</Text>
                            </View>
                            <Pressable
                                onPress={() => setShowProfessionalRegistrationsModal(true)}
                                className={`w-full pl-12 pr-10 py-4 rounded-2xl flex-row items-center ${
                                    isDark
                                        ? "bg-slate-800/90 border border-slate-700/50"
                                        : "bg-white border border-gray-200 shadow-sm"
                                } ${errors.professionalRegistrations ? "border-red-500" : ""}`}
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
                                        name="badge"
                                        size={22}
                                        color={isDark ? "#6B7280" : "#9CA3AF"}
                                    />
                                </View>
                                <Text
                                    className={`flex-1 ${
                                        watchedProfessionalRegistrations.length > 0
                                            ? isDark
                                                ? "text-white"
                                                : "text-gray-900"
                                            : isDark
                                            ? "text-gray-400"
                                            : "text-gray-400"
                                    }`}
                                >
                                    {getSelectedRegistrationsLabel()}
                                </Text>
                                <MaterialIcons
                                    name="expand-more"
                                    size={22}
                                    color={isDark ? "#6B7280" : "#9CA3AF"}
                                />
                            </Pressable>
                            {errors.professionalRegistrations && (
                                <Text className="text-red-500 text-sm mt-1.5">
                                    {errors.professionalRegistrations.message}
                                </Text>
                            )}
                        </View>

                        {/* Registration Reference/Pin */}
                        <View>
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                            >
                                Registration Reference/Pin
                            </Text>
                            <Controller
                                control={control}
                                name="registrationPin"
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
                                            className={`w-full pl-12 pr-4 py-4 rounded-2xl ${
                                                isDark
                                                    ? "bg-slate-800/90 text-white border border-slate-700/50"
                                                    : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                                            } ${errors.registrationPin ? "border-red-500" : ""}`}
                                            style={{
                                                shadowColor: isDark ? "#000" : "#000",
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: isDark ? 0.1 : 0.05,
                                                shadowRadius: 4,
                                                elevation: 2,
                                            }}
                                            placeholder="Pin"
                                            placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                                            value={value}
                                            onChangeText={onChange}
                                            onBlur={async () => {
                                                onBlur();
                                                try {
                                                    await saveStep3Partial({ registration_reference_pin: value });
                                                } catch (e) { /* ignore */ }
                                            }}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                    </View>
                                )}
                            />
                            {errors.registrationPin && (
                                <Text className="text-red-500 text-sm mt-1.5">
                                    {errors.registrationPin.message}
                                </Text>
                            )}
                        </View>

                        {/* Hourly Rate */}
                        <View>
                            <View className="flex-row items-center mb-3">
                                <Text
                                    className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}
                                >
                                    Hourly rate
                                </Text>
                                <Text className="text-red-500 ml-1">*</Text>
                                <View className="ml-2 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                    <MaterialIcons name="info" size={14} color="#1E5AF3" />
                                </View>
                            </View>
                            <Controller
                                control={control}
                                name="hourlyRate"
                                render={({ field: { value, onChange, onBlur } }) => {
                                    const [displayValue, setDisplayValue] = useState(
                                        value !== undefined && value !== null ? value.toString() : ""
                                    );
                                    
                                    // Sync display value when form value changes externally (e.g., from saved data)
                                    useEffect(() => {
                                        if (value !== undefined && value !== null) {
                                            setDisplayValue(value.toString());
                                        }
                                    }, [value]);

                                    return (
                                        <View className="relative">
                                            <View className="absolute inset-y-0 left-0 pl-4 flex items-center justify-center pointer-events-none z-10">
                                                <MaterialIcons
                                                    name="attach-money"
                                                    size={22}
                                                    color={isDark ? "#6B7280" : "#9CA3AF"}
                                                />
                                            </View>
                                            <TextInput
                                                className={`w-full pl-12 pr-4 py-4 rounded-2xl ${
                                                    isDark
                                                        ? "bg-slate-800/90 text-white border border-slate-700/50"
                                                        : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                                                } ${errors.hourlyRate ? "border-red-500" : ""}`}
                                                style={{
                                                    shadowColor: isDark ? "#000" : "#000",
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: isDark ? 0.1 : 0.05,
                                                    shadowRadius: 4,
                                                    elevation: 2,
                                                }}
                                                placeholder="0.00"
                                                placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                                                value={displayValue}
                                                onChangeText={(text) => {
                                                    // Allow digits, decimal point, and empty string
                                                    const cleaned = text.replace(/[^0-9.]/g, '');
                                                    // Only allow one decimal point
                                                    const parts = cleaned.split('.');
                                                    const formatted = parts.length > 2 
                                                        ? parts[0] + '.' + parts.slice(1).join('')
                                                        : cleaned;
                                                    setDisplayValue(formatted);
                                                    // Convert to number for form validation
                                                    const num = formatted === '' || formatted === '.' ? 0 : parseFloat(formatted);
                                                    onChange(isNaN(num) ? 0 : num);
                                                }}
                                                onBlur={async () => {
                                                    onBlur();
                                                    // Ensure display value matches the numeric value
                                                    const num = parseFloat(displayValue);
                                                    if (!isNaN(num)) {
                                                        setDisplayValue(num.toString());
                                                        try { await saveStep3Partial({ hourly_rate: num }); } catch (e) { /* ignore */ }
                                                    } else {
                                                        setDisplayValue("");
                                                    }
                                                }}
                                                keyboardType="decimal-pad"
                                                autoCorrect={false}
                                            />
                                        </View>
                                    );
                                }}
                            />
                            {errors.hourlyRate && (
                                <Text className="text-red-500 text-sm mt-1.5">
                                    {errors.hourlyRate.message}
                                </Text>
                            )}
                        </View>

                        {/* Work Hours Completed */}
                        <View>
                            <View className="flex-row items-center mb-3">
                                <Text
                                    className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}
                                >
                                    How many work hours have you completed already?
                                </Text>
                                <Text className="text-red-500 ml-1">*</Text>
                                <View className="ml-2 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                    <MaterialIcons name="info" size={14} color="#1E5AF3" />
                                </View>
                            </View>
                            <Controller
                                control={control}
                                name="workHoursCompleted"
                                render={({ field: { value, onChange, onBlur } }) => {
                                    const [displayValue, setDisplayValue] = useState(
                                        value !== undefined && value !== null ? value.toString() : ""
                                    );
                                    
                                    // Sync display value when form value changes externally (e.g., from saved data)
                                    useEffect(() => {
                                        if (value !== undefined && value !== null) {
                                            setDisplayValue(value.toString());
                                        }
                                    }, [value]);

                                    return (
                                        <View className="relative">
                                            <View className="absolute inset-y-0 left-0 pl-4 flex items-center justify-center pointer-events-none z-10">
                                                <MaterialIcons
                                                    name="access-time"
                                                    size={22}
                                                    color={isDark ? "#6B7280" : "#9CA3AF"}
                                                />
                                            </View>
                                            <TextInput
                                                className={`w-full pl-12 pr-4 py-4 rounded-2xl ${
                                                    isDark
                                                        ? "bg-slate-800/90 text-white border border-slate-700/50"
                                                        : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                                                } ${errors.workHoursCompleted ? "border-red-500" : ""}`}
                                                style={{
                                                    shadowColor: isDark ? "#000" : "#000",
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: isDark ? 0.1 : 0.05,
                                                    shadowRadius: 4,
                                                    elevation: 2,
                                                }}
                                                placeholder="0.00"
                                                placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                                                value={displayValue}
                                                onChangeText={(text) => {
                                                    // Allow digits, decimal point, and empty string
                                                    const cleaned = text.replace(/[^0-9.]/g, '');
                                                    // Only allow one decimal point
                                                    const parts = cleaned.split('.');
                                                    const formatted = parts.length > 2 
                                                        ? parts[0] + '.' + parts.slice(1).join('')
                                                        : cleaned;
                                                    setDisplayValue(formatted);
                                                    // Convert to number for form validation
                                                    const num = formatted === '' || formatted === '.' ? 0 : parseFloat(formatted);
                                                    onChange(isNaN(num) ? 0 : num);
                                                }}
                                                onBlur={async () => {
                                                    onBlur();
                                                    // Ensure display value matches the numeric value
                                                    const num = parseFloat(displayValue);
                                                    if (!isNaN(num)) {
                                                        setDisplayValue(num.toString());
                                                        try { await saveStep3Partial({ work_hours_completed_already: num }); } catch (e) { /* ignore */ }
                                                    } else {
                                                        setDisplayValue("");
                                                    }
                                                }}
                                                keyboardType="decimal-pad"
                                                autoCorrect={false}
                                            />
                                        </View>
                                    );
                                }}
                            />
                            {errors.workHoursCompleted && (
                                <Text className="text-red-500 text-sm mt-1.5">
                                    {errors.workHoursCompleted.message}
                                </Text>
                            )}
                        </View>

                        {/* Training Hours Completed */}
                        <View>
                            <View className="flex-row items-center mb-3">
                                <Text
                                    className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}
                                >
                                    How many training hours have you completed already?
                                </Text>
                                <Text className="text-red-500 ml-1">*</Text>
                                <View className="ml-2 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                    <MaterialIcons name="info" size={14} color="#1E5AF3" />
                                </View>
                            </View>
                            <Controller
                                control={control}
                                name="trainingHoursCompleted"
                                render={({ field: { value, onChange, onBlur } }) => {
                                    const [displayValue, setDisplayValue] = useState(
                                        value !== undefined && value !== null ? value.toString() : ""
                                    );
                                    
                                    // Sync display value when form value changes externally (e.g., from saved data)
                                    useEffect(() => {
                                        if (value !== undefined && value !== null) {
                                            setDisplayValue(value.toString());
                                        }
                                    }, [value]);

                                    return (
                                        <View className="relative">
                                            <View className="absolute inset-y-0 left-0 pl-4 flex items-center justify-center pointer-events-none z-10">
                                                <MaterialIcons
                                                    name="school"
                                                    size={22}
                                                    color={isDark ? "#6B7280" : "#9CA3AF"}
                                                />
                                            </View>
                                            <TextInput
                                                className={`w-full pl-12 pr-4 py-4 rounded-2xl ${
                                                    isDark
                                                        ? "bg-slate-800/90 text-white border border-slate-700/50"
                                                        : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                                                } ${errors.trainingHoursCompleted ? "border-red-500" : ""}`}
                                                style={{
                                                    shadowColor: isDark ? "#000" : "#000",
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: isDark ? 0.1 : 0.05,
                                                    shadowRadius: 4,
                                                    elevation: 2,
                                                }}
                                                placeholder="0.00"
                                                placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                                                value={displayValue}
                                                onChangeText={(text) => {
                                                    // Allow digits, decimal point, and empty string
                                                    const cleaned = text.replace(/[^0-9.]/g, '');
                                                    // Only allow one decimal point
                                                    const parts = cleaned.split('.');
                                                    const formatted = parts.length > 2 
                                                        ? parts[0] + '.' + parts.slice(1).join('')
                                                        : cleaned;
                                                    setDisplayValue(formatted);
                                                    // Convert to number for form validation
                                                    const num = formatted === '' || formatted === '.' ? 0 : parseFloat(formatted);
                                                    onChange(isNaN(num) ? 0 : num);
                                                }}
                                                onBlur={async () => {
                                                    onBlur();
                                                    // Ensure display value matches the numeric value
                                                    const num = parseFloat(displayValue);
                                                    if (!isNaN(num)) {
                                                        setDisplayValue(num.toString());
                                                        try { await saveStep3Partial({ training_hours_completed_already: num }); } catch (e) { /* ignore */ }
                                                    } else {
                                                        setDisplayValue("");
                                                    }
                                                }}
                                                keyboardType="decimal-pad"
                                                autoCorrect={false}
                                            />
                                        </View>
                                    );
                                }}
                            />
                            {errors.trainingHoursCompleted && (
                                <Text className="text-red-500 text-sm mt-1.5">
                                    {errors.trainingHoursCompleted.message}
                                </Text>
                            )}
                        </View>

                        {/* Earnings Current Year */}
                        <View>
                            <View className="flex-row items-center mb-3">
                                <Text
                                    className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}
                                >
                                    How much have you earned in the current financial year?
                                </Text>
                                <Text className="text-red-500 ml-1">*</Text>
                                <View className="ml-2 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                    <MaterialIcons name="info" size={14} color="#1E5AF3" />
                                </View>
                            </View>
                            <Controller
                                control={control}
                                name="earningsCurrentYear"
                                render={({ field: { value, onChange, onBlur } }) => {
                                    const [displayValue, setDisplayValue] = useState(
                                        value !== undefined && value !== null ? value.toString() : ""
                                    );
                                    
                                    // Sync display value when form value changes externally (e.g., from saved data)
                                    useEffect(() => {
                                        if (value !== undefined && value !== null) {
                                            setDisplayValue(value.toString());
                                        }
                                    }, [value]);

                                    return (
                                        <View className="relative">
                                            <View className="absolute inset-y-0 left-0 pl-4 flex items-center justify-center pointer-events-none z-10">
                                                <MaterialIcons
                                                    name="account-balance-wallet"
                                                    size={22}
                                                    color={isDark ? "#6B7280" : "#9CA3AF"}
                                                />
                                            </View>
                                            <TextInput
                                                className={`w-full pl-12 pr-4 py-4 rounded-2xl ${
                                                    isDark
                                                        ? "bg-slate-800/90 text-white border border-slate-700/50"
                                                        : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                                                } ${errors.earningsCurrentYear ? "border-red-500" : ""}`}
                                                style={{
                                                    shadowColor: isDark ? "#000" : "#000",
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: isDark ? 0.1 : 0.05,
                                                    shadowRadius: 4,
                                                    elevation: 2,
                                                }}
                                                placeholder="0.00"
                                                placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                                                value={displayValue}
                                                onChangeText={(text) => {
                                                    // Allow digits, decimal point, and empty string
                                                    const cleaned = text.replace(/[^0-9.]/g, '');
                                                    // Only allow one decimal point
                                                    const parts = cleaned.split('.');
                                                    const formatted = parts.length > 2 
                                                        ? parts[0] + '.' + parts.slice(1).join('')
                                                        : cleaned;
                                                    setDisplayValue(formatted);
                                                    // Convert to number for form validation
                                                    const num = formatted === '' || formatted === '.' ? 0 : parseFloat(formatted);
                                                    onChange(isNaN(num) ? 0 : num);
                                                }}
                                                onBlur={async () => {
                                                    onBlur();
                                                    // Ensure display value matches the numeric value
                                                    const num = parseFloat(displayValue);
                                                    if (!isNaN(num)) {
                                                        setDisplayValue(num.toString());
                                                        try { await saveStep3Partial({ earned_current_financial_year: num }); } catch (e) { /* ignore */ }
                                                    } else {
                                                        setDisplayValue("");
                                                    }
                                                }}
                                                keyboardType="decimal-pad"
                                                autoCorrect={false}
                                            />
                                        </View>
                                    );
                                }}
                            />
                            {errors.earningsCurrentYear && (
                                <Text className="text-red-500 text-sm mt-1.5">
                                    {errors.earningsCurrentYear.message}
                                </Text>
                            )}
                        </View>

                        {/* Work Description (read-only summary card) */}
                        <View>
                            <View className="flex-row items-center mb-3">
                                <Text
                                    className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}
                                >
                                    Brief description of your work
                                </Text>
                            </View>
                            <View
                                className={`w-full px-4 py-4 rounded-2xl min-h-[120px] ${
                                    isDark
                                        ? "bg-slate-800/90 text-white border border-slate-700/50"
                                        : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                                }`}
                                style={{ justifyContent: 'flex-start' }}
                            >
                                {onboardingSummary ? (
                                    onboardingSummary.split('\n').map((line, idx) => (
                                        <Text key={idx} className={`${isDark ? 'text-gray-200' : 'text-gray-800'} mb-1 text-sm`}>
                                            {line}
                                        </Text>
                                    ))
                                ) : (
                                    <Text className={`${isDark ? 'text-gray-400' : 'text-gray-400'} text-sm`}>
                                        No summary available.
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Notepad */}
                        <View>
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                            >
                                Notepad
                            </Text>
                            <Controller
                                control={control}
                                name="notepad"
                                render={({ field: { value, onChange, onBlur } }) => (
                                    <View className="relative">
                                        <TextInput
                                            className={`w-full px-4 py-4 rounded-2xl min-h-[120px] text-align-top ${
                                                isDark
                                                    ? "bg-slate-800/90 text-white border border-slate-700/50"
                                                    : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                                            } ${errors.notepad ? "border-red-500" : ""}`}
                                            style={{
                                                shadowColor: isDark ? "#000" : "#000",
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: isDark ? 0.1 : 0.05,
                                                shadowRadius: 4,
                                                elevation: 2,
                                                textAlignVertical: "top",
                                            }}
                                            placeholder="Add any notes here..."
                                            placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                                            value={value || ""}
                                            onChangeText={onChange}
                                            onBlur={async () => {
                                                onBlur();
                                                try { await saveStep3Partial({ notepad: value }); } catch (e) { /* ignore */ }
                                            }}
                                            multiline
                                            numberOfLines={5}
                                            autoCorrect={false}
                                        />
                                    </View>
                                )}
                            />
                            {errors.notepad && (
                                <Text className="text-red-500 text-sm mt-1.5">
                                    {errors.notepad.message}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Continue Button */}
            <View className={`px-6 pb-8 pt-4 border-t ${isDark ? "border-slate-700/50" : "border-gray-200"}`}>
                <Pressable
                    onPress={handleCompleteSetup}
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
                    <Text className="text-white font-semibold text-base">Complete Setup</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
                        </>
                    )}
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
                            {workSettingsOptions.map((setting, idx) => (
                                <TouchableOpacity
                                    key={`${setting.value}-${idx}`}
                                    onPress={() => handleWorkSettingSelect(setting.value)}
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
                            {scopeOptions.map((item, idx) => (
                                <TouchableOpacity
                                    key={`${item.value}-${idx}`}
                                    onPress={() => handleScopeSelect(item.value)}
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

            {/* Professional Registrations Modal */}
            <Modal
                visible={showProfessionalRegistrationsModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowProfessionalRegistrationsModal(false)}
            >
                <Pressable
                    className="flex-1 bg-black/50 justify-end"
                    onPress={() => setShowProfessionalRegistrationsModal(false)}
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
                            Select Professional Registration(s)
                        </Text>
                        <ScrollView>
                            {registrationOptions.map((option, idx) => {
                                const isSelected = watchedProfessionalRegistrations.includes(option.value as any);
                                return (
                                    <TouchableOpacity
                                        key={`${option.value}-${idx}`}
                                        onPress={() => toggleProfessionalRegistration(option.value)}
                                        className={`py-4 px-4 rounded-xl mb-2 flex-row items-center justify-between ${
                                            isSelected
                                                ? "bg-primary/10"
                                                : isDark
                                                ? "bg-slate-700"
                                                : "bg-gray-50"
                                        }`}
                                    >
                                        <Text
                                            className={`flex-1 ${
                                                isSelected
                                                    ? "text-primary font-semibold"
                                                    : isDark
                                                    ? "text-white"
                                                    : "text-gray-900"
                                            }`}
                                        >
                                            {option.label}
                                        </Text>
                                        {isSelected && (
                                            <MaterialIcons name="check-circle" size={24} color="#1E5AF3" />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        <Pressable
                            onPress={() => setShowProfessionalRegistrationsModal(false)}
                            className={`mt-4 py-3 rounded-xl ${isDark ? "bg-slate-700" : "bg-gray-100"}`}
                        >
                            <Text className={`text-center font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                Done
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
                                    onPress={async () => {
                                        setValue("revalidationDate", undefined as unknown as Date);
                                        setShowDatePicker(false);
                                        try {
                                            await saveStep3Partial({ revalidation_date: null });
                                        } catch (e) { /* ignore */ }
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
