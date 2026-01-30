import { View, Text, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import '../../global.css';

interface AppraisalDetail {
    id: number;
    appraisalType?: string;
    appraisalDate: string;
    discussionWith?: string;
    hospitalId?: number;
    hospitalName?: string;
    notes: string | null;
    documentIds: number[];
    createdAt: string;
    updatedAt: string;
}

export default function AppraisalDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDark } = useThemeStore();
    const [loading, setLoading] = useState(true);
    const [appraisal, setAppraisal] = useState<AppraisalDetail | null>(null);

    useEffect(() => {
        loadAppraisal();
    }, [id]);

    const loadAppraisal = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;

            const response = await apiService.get<{
                success: boolean;
                data: AppraisalDetail;
            }>(`${API_ENDPOINTS.APPRAISALS.LIST}/${id}`, token);

            if (response?.data) {
                setAppraisal(response.data);
            }
        } catch (error: any) {
            console.error('Error loading appraisal detail:', error);
            showToast.error(error?.message || 'Failed to load appraisal details', 'Error');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string): string => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        } catch {
            return dateString;
        }
    };

    if (loading) {
        return (
            <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`}>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#E11D48" />
                </View>
            </SafeAreaView>
        );
    }

    if (!appraisal) {
        return (
            <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`}>
                <View className="p-4 flex-row items-center">
                    <Pressable onPress={() => router.back()}>
                        <MaterialIcons name="arrow-back" size={24} color={isDark ? "white" : "black"} />
                    </Pressable>
                </View>
                <View className="flex-1 items-center justify-center">
                    <Text className={isDark ? "text-white" : "text-black"}>Appraisal not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
            <View className={`border-b ${isDark ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-gray-100"}`}>
                <View className="flex-row items-center px-4 py-2">
                    <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
                        <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? "#E5E7EB" : "#121417"} />
                    </Pressable>
                    <Text className={`text-lg font-bold ml-2 ${isDark ? "text-white" : "text-[#121417]"}`}>Detail Account</Text>
                </View>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
                <View className={`p-6 rounded-3xl mb-6 shadow-sm border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
                    <View className="flex-row items-center gap-3 mb-6">
                        <View className="w-12 h-12 rounded-2xl bg-rose-50 items-center justify-center">
                            <MaterialIcons name="verified" size={28} color="#E11D48" />
                        </View>
                        <View>
                            <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                                {appraisal.appraisalType || 'Annual Appraisal'}
                            </Text>
                            <Text className={`text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>{formatDate(appraisal.appraisalDate)}</Text>
                        </View>
                    </View>

                    <View className="gap-5">
                        <View>
                            <Text className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDark ? "text-gray-500" : "text-slate-400"}`}>Discussion With</Text>
                            <Text className={`text-base font-medium ${isDark ? "text-gray-200" : "text-slate-700"}`}>{appraisal.discussionWith || 'Not specified'}</Text>
                        </View>

                        {appraisal.hospitalName ? (
                            <View>
                                <Text className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDark ? "text-gray-500" : "text-slate-400"}`}>Location</Text>
                                <View className="flex-row items-center gap-1">
                                    <MaterialIcons name="place" size={16} color="#E11D48" />
                                    <Text className={`text-base font-medium ${isDark ? "text-gray-200" : "text-slate-700"}`}>{appraisal.hospitalName}</Text>
                                </View>
                            </View>
                        ) : appraisal.hospitalId ? (
                            <View>
                                <Text className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDark ? "text-gray-500" : "text-slate-400"}`}>Location</Text>
                                <View className="flex-row items-center gap-1">
                                    <MaterialIcons name="place" size={16} color="#E11D48" />
                                    <Text className={`text-base font-medium ${isDark ? "text-gray-200" : "text-slate-700"}`}>Hospital ID: {appraisal.hospitalId}</Text>
                                </View>
                            </View>
                        ) : null}

                        <View>
                            <Text className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? "text-gray-500" : "text-slate-400"}`}>Notes & Outcome</Text>
                            <Text className={`text-base leading-relaxed ${isDark ? "text-gray-300" : "text-slate-800"}`}>
                                {appraisal.notes || 'No notes provided for this appraisal.'}
                            </Text>
                        </View>

                        {appraisal.documentIds.length > 0 && (
                            <View>
                                <Text className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? "text-gray-500" : "text-slate-400"}`}>Evidence Attached</Text>
                                <View className={`p-4 rounded-2xl flex-row items-center justify-between border ${isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-100"}`}>
                                    <View className="flex-row items-center gap-3">
                                        <View className="w-10 h-10 rounded-xl bg-blue-100 items-center justify-center">
                                            <MaterialIcons name="description" size={20} color="#2B5E9C" />
                                        </View>
                                        <View>
                                            <Text className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Appraisal Document</Text>
                                            <Text className="text-xs text-gray-400">ID: {appraisal.documentIds[0]}</Text>
                                        </View>
                                    </View>
                                    <MaterialIcons name="file-download" size={24} color="#2B5E9C" />
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                <Pressable
                    onPress={() => router.back()}
                    className={`p-4 rounded-2xl items-center border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
                >
                    <Text className={`font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Back to List</Text>
                </Pressable>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}
