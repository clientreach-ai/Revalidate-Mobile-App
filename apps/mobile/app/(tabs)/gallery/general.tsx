import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import { ImageViewerModal } from '@/features/documents/components/ImageViewerModal';
import { downloadAndShareFile, isImageFile } from '@/utils/document';
import '../../global.css';

interface ApiDocument {
    id: number;
    name: string;
    category?: string;
    size?: string;
    type?: string;
    document?: string; // The Actual file URL
    created_at: string;
    updated_at: string;
}

export default function GeneralGalleryScreen() {
    const router = useRouter();
    const { isDark } = useThemeStore();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [documents, setDocuments] = useState<any[]>([]);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);

    useEffect(() => {
        loadDocuments();
    }, []);

    const normalize = (v?: string | number | null) => {
        if (v === null || v === undefined) return '';
        return String(v).toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    const categoryMap: Record<string, string> = {
        'cpd': 'CPD Hours',
        'cpdhours': 'CPD Hours',
        'working': 'Working Hours',
        'work': 'Working Hours',
        'workinghours': 'Working Hours',
        'feedback': 'Feedback Log',
        'feedbacklog': 'Feedback Log',
        'reflection': 'Reflective Accounts',
        'reflections': 'Reflective Accounts',
        'reflective': 'Reflective Accounts',
        'appraisal': 'Appraisal',
        'gallery': 'General Gallery',
        'personal': 'General Gallery',
        'general': 'General Gallery',
        'uncategorized': 'General Gallery',
        'profilepicture': 'General Gallery',
        'discussion': 'Feedback Log',
    };

    const otherCategoryNames = [
        'Working Hours',
        'CPD Hours',
        'Feedback Log',
        'Reflective Accounts',
        'Appraisal'
    ].map(n => normalize(n));

    const loadDocuments = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            // Fetch ALL documents and filter locally to match Gallery index logic
            const response = await apiService.get<{
                success: boolean;
                data: ApiDocument[];
            }>(`${API_ENDPOINTS.DOCUMENTS.LIST}?limit=1000`, token);

            if (response.success && response.data) {
                const filtered = response.data.filter((apiDoc) => {
                    const docCat = apiDoc.category || '';
                    const normCat = normalize(docCat);
                    const mappedTitleToken = categoryMap[normCat] || docCat;
                    const normMapped = normalize(mappedTitleToken);

                    // Check if it belongs to any other specific category
                    const matchesAnyOther = otherCategoryNames.some(otherNorm => normMapped === otherNorm);

                    // If it doesn't match any other, or has no category, it's "General"
                    return !matchesAnyOther || normCat === '' || normMapped === normalize('General Gallery');
                });

                const mapped = filtered.map((apiDoc) => {
                    const isPdf = (apiDoc.type === 'file' || apiDoc.name.toLowerCase().endsWith('.pdf'));

                    return {
                        id: String(apiDoc.id),
                        name: apiDoc.name,
                        category: apiDoc.category || 'General',
                        size: apiDoc.size || '0.0 MB',
                        document: apiDoc.document,
                        icon: (isPdf ? 'picture-as-pdf' : 'image') as keyof typeof MaterialIcons.glyphMap,
                        iconBgColor: isPdf ? 'bg-red-100' : 'bg-blue-100',
                        iconColor: isPdf ? '#DC2626' : '#2563EB',
                        created_at: apiDoc.created_at
                    };
                });
                setDocuments(mapped);
            }
        } catch (error: any) {
            console.error('Error loading documents:', error);
            showToast.error('Failed to load documents', 'Error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleViewDocument = async (file: any) => {
        try {
            let url = file.document;
            if (!url) {
                // Fetch full detail if URL missing
                const token = await AsyncStorage.getItem('authToken');
                const res = await apiService.get<{ data: { document: string } }>(`${API_ENDPOINTS.DOCUMENTS.GET_BY_ID}/${file.id}`, token || '');
                url = res?.data?.document;
            }

            if (url) {
                let fullUrl = url;

                if (!fullUrl.startsWith('http') || fullUrl.includes('localhost') || fullUrl.includes('127.0.0.1')) {
                    const pathPart = fullUrl.startsWith('http')
                        ? fullUrl.replace(/^https?:\/\/[^\/]+/, '')
                        : fullUrl;

                    const apiBase = apiService.baseUrl;
                    fullUrl = `${apiBase}${pathPart.startsWith('/') ? '' : '/'}${pathPart}`;
                }

                if (isImageFile(fullUrl)) {
                    setViewerUrl(fullUrl);
                    setViewerVisible(true);
                } else {
                    await downloadAndShareFile(fullUrl, file.name || 'document');
                }
            } else {
                showToast.error('Document URL not found', 'Error');
            }
        } catch (e) {
            console.error('Error opening document:', e);
            showToast.error('Failed to open document', 'Error');
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadDocuments();
    };

    return (
        <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={isDark ? '#D4AF37' : '#2B5F9E'}
                        colors={['#D4AF37', '#2B5F9E']}
                    />
                }
            >
                {/* Header */}
                <View className="flex-row items-center justify-between mb-6 px-6 pt-4">
                    <Pressable
                        onPress={() => router.back()}
                        className={`w-10 h-10 items-center justify-center rounded-full shadow-sm ${isDark ? "bg-slate-800" : "bg-white"
                            }`}
                    >
                        <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? "#E5E7EB" : "#1F2937"} />
                    </Pressable>
                    <Text className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>
                        General Gallery
                    </Text>
                    <View className="w-10" />
                </View>

                {loading && !refreshing ? (
                    <View className="flex-1 items-center justify-center py-20">
                        <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
                    </View>
                ) : (
                    <View className="px-6 pb-4">
                        {documents.length > 0 ? (
                            <View style={{ gap: 12 }}>
                                {documents.map((file) => (
                                    <Pressable
                                        key={file.id}
                                        onPress={() => handleViewDocument(file)}
                                        className={`p-3 rounded-2xl border flex-row items-center active:opacity-70 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                                            }`}
                                        style={{ gap: 12 }}
                                    >
                                        <View className={`w-10 h-10 ${file.iconBgColor} rounded-xl items-center justify-center`}>
                                            <MaterialIcons
                                                name={file.icon}
                                                size={20}
                                                color={file.iconColor}
                                            />
                                        </View>
                                        <View className="flex-1 min-w-0">
                                            <Text className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-800"}`} numberOfLines={1}>
                                                {file.name}
                                            </Text>
                                            <Text className={`text-[11px] mt-0.5 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                                                {file.category} • {file.size}
                                            </Text>
                                        </View>
                                        <Pressable>
                                            <MaterialIcons name="more-vert" size={20} color={isDark ? "#6B7280" : "#94A3B8"} />
                                        </Pressable>
                                    </Pressable>
                                ))}
                            </View>
                        ) : (
                            <View className={`p-6 rounded-2xl border items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                                }`}>
                                <MaterialIcons name="folder-open" size={48} color={isDark ? "#4B5563" : "#CBD5E1"} />
                                <Text className={`mt-4 text-center ${isDark ? "text-gray-400" : "text-slate-400"}`}>
                                    No general documents found
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
            <ImageViewerModal
                isVisible={viewerVisible}
                imageUrl={viewerUrl}
                onClose={() => setViewerVisible(false)}
            />
        </SafeAreaView>
    );
}
