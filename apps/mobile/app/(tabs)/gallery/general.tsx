import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, Image, Dimensions, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { usePremium } from '@/hooks/usePremium';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import { ImageViewerModal } from '@/features/documents/components/ImageViewerModal';
import { downloadAndShareFile } from '@/utils/document';
import { useGeneralGalleryData } from '@/features/gallery/hooks/useGeneralGalleryData';
import { useGalleryData } from '@/features/gallery/hooks/useGalleryData';
import { AddDocumentModal } from '@/features/gallery/components/AddDocumentModal';
import '../../global.css';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const CONTAINER_PADDING = 24;
const GAP = 12;
const ITEM_WIDTH = (width - (CONTAINER_PADDING * 2) - (GAP * (COLUMN_COUNT - 1))) / COLUMN_COUNT;

export default function GeneralGalleryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDark } = useThemeStore();
    const { isPremium } = usePremium();
    const accentColor = isPremium ? '#D4AF37' : '#2B5F9E';
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    const {
        loading,
        refreshing,
        documents,
        loadDocuments,
        onRefresh,
        deleteDocument
    } = useGeneralGalleryData();

    const {
        categories,
        loadDocuments: loadGalleryMeta
    } = useGalleryData();

    useEffect(() => {
        loadDocuments();
        loadGalleryMeta();
    }, [loadDocuments, loadGalleryMeta]);

    const getFullUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
            return url;
        }
        const pathPart = url.startsWith('http')
            ? url.replace(/^https?:\/\/[^\/]+/, '')
            : url;
        const apiBase = apiService.baseUrl;
        return `${apiBase}${pathPart.startsWith('/') ? '' : '/'}${pathPart}`;
    };

    const handleViewDocument = async (file: any) => {
        try {
            let url = file.fullUrl;

            if (!url) {
                const token = await AsyncStorage.getItem('authToken');
                if (!token) {
                    router.replace('/(auth)/login');
                    return;
                }

                try {
                    const res = await apiService.get<{ data: { document: string } }>(
                        `${API_ENDPOINTS.DOCUMENTS.GET_BY_ID}/${file.id}`,
                        token || ''
                    );
                    url = res?.data?.document ? getFullUrl(res.data.document) : '';
                } catch (e) {
                    console.error('Failed to fetch document URL:', e);
                    url = '';
                }
            }

            if (url) {
                if (file.isImage) {
                    setViewerUrl(url);
                    setViewerVisible(true);
                } else {
                    await downloadAndShareFile(url, file.name || 'document');
                }
            } else {
                showToast.error('Document URL not found', 'Error');
            }
        } catch (e) {
            console.error('Error opening document:', e);
            showToast.error('Failed to open document', 'Error');
        }
    };

    const handleLongPress = (file: any) => {
        Alert.alert(
            "Delete Document",
            `Are you sure you want to delete "${file.name}"? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteDocument(file.id)
                }
            ]
        );
    };

    return (
        <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
            <View className="flex-row items-center justify-between px-6 pt-4 mb-2">
                <Pressable
                    onPress={() => router.back()}
                    className={`w-10 h-10 items-center justify-center rounded-full shadow-sm ${isDark ? "bg-slate-800" : "bg-white"}`}
                >
                    <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? "#E5E7EB" : "#1F2937"} />
                </Pressable>
                <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                    General Gallery
                </Text>
                <Pressable
                    onPress={() => setShowAddModal(true)}
                    className="w-10 h-10 rounded-full bg-[#2B5F9E]/10 items-center justify-center"
                >
                    <MaterialIcons name="cloud-upload" size={20} color="#2B5F9E" />
                </Pressable>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: CONTAINER_PADDING }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={isDark ? accentColor : '#2B5F9E'}
                        colors={[accentColor, '#2B5F9E']}
                    />
                }
            >
                {loading && !refreshing ? (
                    <View className="flex-1 items-center justify-center py-20">
                        <ActivityIndicator size="large" color={isDark ? accentColor : '#2B5F9E'} />
                    </View>
                ) : (
                    <View className="flex-row flex-wrap" style={{ gap: GAP, marginTop: 16 }}>
                        {documents.length > 0 ? (
                            [...documents]
                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                .map((file) => (
                                    <Pressable
                                        key={file.id}
                                        onPress={() => handleViewDocument(file)}
                                        onLongPress={() => handleLongPress(file)}
                                        style={{ width: ITEM_WIDTH, height: ITEM_WIDTH }}
                                        className={`rounded-2xl overflow-hidden border shadow-sm active:opacity-80 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}
                                    >
                                        {file.isImage && file.fullUrl ? (
                                            <Image
                                                source={{ uri: file.fullUrl }}
                                                className="w-full h-full"
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View className="flex-1 items-center justify-center p-4">
                                                <MaterialIcons
                                                    name={file.icon}
                                                    size={32}
                                                    color={file.icon === 'picture-as-pdf' ? '#EF4444' : (isDark ? '#6B7280' : '#94A3B8')}
                                                />
                                                <Text
                                                    className={`text-[9px] mt-2 text-center font-medium ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
                                                    numberOfLines={2}
                                                >
                                                    {file.name}
                                                </Text>
                                            </View>
                                        )}
                                    </Pressable>
                                ))
                        ) : (
                            <View className={`w-full py-20 rounded-3xl border items-center ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100"}`}>
                                <MaterialIcons name="photo-library" size={48} color={isDark ? "#4B5563" : "#CBD5E1"} />
                                <Text className={`mt-4 text-center font-medium ${isDark ? "text-gray-400" : "text-slate-400"}`}>
                                    No photos or documents found
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            <View
                className="absolute left-0 right-0 items-center"
                style={{ bottom: 80 + insets.bottom }}
            >
                <Pressable
                    onPress={() => setShowAddModal(true)}
                    className="w-14 h-14 bg-[#2B5F9E] rounded-full shadow-lg items-center justify-center active:opacity-80"
                >
                    <MaterialIcons name="add" size={32} color="#FFFFFF" />
                </Pressable>
            </View>

            <ImageViewerModal
                isVisible={viewerVisible}
                imageUrl={viewerUrl}
                onClose={() => setViewerVisible(false)}
            />

            <AddDocumentModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                categories={categories}
                isDark={isDark}
                onSuccess={loadDocuments}
            />
        </SafeAreaView>
    );
}
