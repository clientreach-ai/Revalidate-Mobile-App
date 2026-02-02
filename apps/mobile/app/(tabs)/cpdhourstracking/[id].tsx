import { View, Text, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { useThemeStore } from '@/features/theme/theme.store';
import { showToast } from '@/utils/toast';
import { ImageViewerModal } from '@/features/documents/components/ImageViewerModal';
import { downloadAndShareFile, isImageFile } from '@/utils/document';
import '../../global.css';

interface CPDDetail {
    id: number;
    trainingName: string;
    activityDate: string;
    durationMinutes: number;
    activityType: 'participatory' | 'non-participatory';
    learningMethod: string;
    cpdLearningType: string;
    linkToStandard: string;
    linkToStandardProficiency: string;
    documentIds?: number[];
    documents?: { id: number; name: string; url: string; type: string }[];
    createdAt: string;
    updatedAt: string;
}

export default function CPDDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { isDark } = useThemeStore();
    const [loading, setLoading] = useState(true);
    const [activity, setActivity] = useState<CPDDetail | null>(null);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

    useEffect(() => {
        loadActivity();
    }, [id]);

    useEffect(() => {
        if (activity?.documentIds && activity.documentIds.length > 0) {
            checkAttachment(activity.documentIds[0]);
        }
    }, [activity]);

    const checkAttachment = async (docId: number) => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;
            const res = await apiService.get<{ data: { document: string } }>(`${API_ENDPOINTS.DOCUMENTS.GET_BY_ID}/${docId}`, token);
            if (res?.data?.document) {
                let url = res.data.document;
                if (!url.startsWith('http')) {
                    url = apiService.baseUrl + (url.startsWith('/') ? '' : '/') + url;
                }
                setAttachmentUrl(url);
            }
        } catch (e) {
            console.warn('Failed to load attachment info', e);
        }
    };

    const loadActivity = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;

            // Fetch CPD details
            // The list endpoint returns filtered fields, we might need a specific get-by-id endpoint
            // If API doesn't have efficient get-by-id, we might have to filter from list or update API.
            // Assuming API supports /api/v1/cpd-hours/:id based on standard REST patterns in this project

            const response = await apiService.get<{ success: boolean; data: any }>(`/api/v1/cpd-hours/${id}`, token);

            if (response?.data) {
                const d = response.data;
                setActivity({
                    id: d.id,
                    trainingName: d.trainingName || d.training_name,
                    activityDate: d.activityDate || d.activity_date,
                    durationMinutes: d.durationMinutes || d.duration_minutes,
                    activityType: d.activityType || d.activity_type,
                    learningMethod: d.learningMethod || d.learning_method,
                    cpdLearningType: d.cpdLearningType || d.cpd_learning_type,
                    linkToStandard: d.linkToStandard || d.link_to_standard,
                    linkToStandardProficiency: d.linkToStandardProficiency || d.link_to_standard_proficiency,
                    documentIds: d.documentIds || d.document_ids || [],
                    documents: d.documents || d.document || d.docs || [],
                    createdAt: d.createdAt,
                    updatedAt: d.updatedAt
                });
            }
        } catch (error: any) {
            console.error('Error loading CPD detail:', error);
            showToast.error(error?.message || 'Failed to load activity details', 'Error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`}>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            </SafeAreaView>
        );
    }

    if (!activity) {
        return (
            <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`}>
                <View className="p-4 flex-row items-center">
                    <Pressable onPress={() => router.back()}>
                        <MaterialIcons name="arrow-back" size={24} color={isDark ? "white" : "black"} />
                    </Pressable>
                </View>
                <View className="flex-1 items-center justify-center">
                    <Text className={isDark ? "text-white" : "text-black"}>Activity not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const isParticipatory = activity.activityType === 'participatory';
    const evidenceDoc = activity.documents?.[0];
    const evidenceUrl = evidenceDoc?.url || attachmentUrl || '';
    const isImageEvidence = !!evidenceUrl && (
        (evidenceDoc?.type && evidenceDoc.type.startsWith('image/')) ||
        isImageFile(evidenceUrl)
    );

    return (
        <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
            <View className={`border-b ${isDark ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-gray-100"}`}>
                <View className="flex-row items-center px-4 py-2">
                   
                    <Text className={`text-lg font-bold ml-2 ${isDark ? "text-white" : "text-[#121417]"}`}>Activity Details</Text>
                </View>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
                {/* Header Card */}
                <View className={`p-6 rounded-3xl mb-6 shadow-sm border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
                    <View className="flex-row items-start gap-4 mb-4">
                        <View className={`w-14 h-14 rounded-2xl items-center justify-center ${isParticipatory ? 'bg-blue-100' : 'bg-amber-100'}`}>
                            <MaterialIcons
                                name={isParticipatory ? 'school' : 'menu-book'}
                                size={32}
                                color={isParticipatory ? '#2563EB' : '#D97706'}
                            />
                        </View>
                        <View className="flex-1">
                            <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                                {activity.trainingName}
                            </Text>
                            <Text className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                                {activity.activityDate}
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row gap-2 mt-2">
                        <View className={`px-3 py-1 rounded-full ${isParticipatory ? 'bg-blue-50' : 'bg-amber-50'}`}>
                            <Text className={`text-xs font-bold ${isParticipatory ? 'text-blue-700' : 'text-amber-700'}`}>
                                {isParticipatory ? 'Participatory' : 'Non-Participatory'}
                            </Text>
                        </View>
                        <View className={`px-3 py-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                            <Text className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                {activity.durationMinutes / 60} Hours
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Details Section */}
                <View className="gap-6">
                    {/* Learning Info */}
                    <View>
                        <Text className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? "text-gray-500" : "text-slate-400"}`}>Learning Details</Text>
                        <View className={`p-4 rounded-2xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
                            <View className="mb-4">
                                <Text className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>Learning Method</Text>
                                <Text className={`text-base font-medium capitalize ${isDark ? "text-white" : "text-slate-800"}`}>
                                    {activity.learningMethod || 'Not specified'}
                                </Text>
                            </View>
                            <View>
                                <Text className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>CPD Type</Text>
                                <Text className={`text-base font-medium capitalize ${isDark ? "text-white" : "text-slate-800"}`}>
                                    {activity.cpdLearningType || 'Not specified'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Standards */}
                    <View>
                        <Text className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? "text-gray-500" : "text-slate-400"}`}>Standards & Codes</Text>
                        <View className={`p-4 rounded-2xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
                            <View className="mb-4">
                                <Text className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>HCPC Standard</Text>
                                <Text className={`text-base font-medium ${isDark ? "text-white" : "text-slate-800"}`}>
                                    {activity.linkToStandard || 'None linked'}
                                </Text>
                            </View>
                            <View>
                                <Text className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>Standard Proficiency</Text>
                                <Text className={`text-base font-medium ${isDark ? "text-white" : "text-slate-800"}`}>
                                    {activity.linkToStandardProficiency || 'None linked'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Evidence */}
                    {activity.documentIds && activity.documentIds.length > 0 && (
                        <View>
                            <Text className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? "text-gray-500" : "text-slate-400"}`}>Evidence</Text>
                            {isImageEvidence && evidenceUrl ? (
                                <Pressable
                                    onPress={() => {
                                        setViewerUrl(evidenceUrl);
                                        setViewerVisible(true);
                                    }}
                                    className={`p-4 rounded-2xl border flex-row items-center justify-between ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}
                                >
                                    <View className="flex-row items-center gap-3">
                                        <Image source={{ uri: evidenceUrl }} style={{ width: 40, height: 40, borderRadius: 8 }} />
                                        <View>
                                            <Text className={`font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Attached Image</Text>
                                            <Text className={`text-xs ${isDark ? "text-gray-400" : "text-slate-500"}`} numberOfLines={1}>
                                                {evidenceDoc?.name || `ID: ${activity.documentIds[0]}`}
                                            </Text>
                                        </View>
                                    </View>
                                    <MaterialIcons name="open-in-full" size={22} color="#7C3AED" />
                                </Pressable>
                            ) : (
                                <Pressable
                                    onPress={async () => {
                                        if (!evidenceUrl) return;
                                        try {
                                            await downloadAndShareFile(evidenceUrl, activity.id ? `cpd-${activity.id}` : 'document');
                                        } catch (e) {
                                            showToast.error('Failed to open document', 'Error');
                                        }
                                    }}
                                    className={`p-4 rounded-2xl border flex-row items-center justify-between ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}
                                >
                                    <View className="flex-row items-center gap-3">
                                        <View className="w-10 h-10 rounded-xl bg-purple-100 items-center justify-center">
                                            <MaterialIcons name="attach-file" size={20} color="#7C3AED" />
                                        </View>
                                        <View>
                                            <Text className={`font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Attached Document</Text>
                                            <Text className={`text-xs ${isDark ? "text-gray-400" : "text-slate-500"}`}>ID: {activity.documentIds[0]}</Text>
                                        </View>
                                    </View>
                                    <MaterialIcons name="download" size={24} color="#7C3AED" />
                                </Pressable>
                            )}
                        </View>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
            <ImageViewerModal
                isVisible={viewerVisible}
                imageUrl={viewerUrl}
                onClose={() => setViewerVisible(false)}
            />
        </SafeAreaView>
    );
}
