import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, Modal, TextInput, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { usePremium } from '@/hooks/usePremium';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { ImageViewerModal } from '@/features/documents/components/ImageViewerModal';
import { downloadAndShareFile, isImageFile } from '@/utils/document';
import '../../global.css';

interface ReflectionDetail {
    id: string;
    title: string;
    date: string;
    text: string;
    documentIds: number[];
}

interface ApiReflection {
    id: number;
    reflectionDate: string;
    reflectionText: string | null;
    documentIds: number[];
    createdAt: string;
    updatedAt: string;
}

export default function ReflectionDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const { isDark } = useThemeStore();
    const { isPremium } = usePremium();
    const accentColor = isPremium ? '#D4AF37' : '#2B5F9E';
    const tabBarHeight = useBottomTabBarHeight();

    const [reflection, setReflection] = useState<ReflectionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Attachment State
    const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

    // Edit State
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        date: '',
        text: '',
    });

    // Edit Files State
    const [fileUri, setFileUri] = useState<string | null>(null);
    const [attachment, setAttachment] = useState<{ name: string, type: string } | null>(null);
    const [hasExistingAttachment, setHasExistingAttachment] = useState(false);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);

    useEffect(() => {
        if (id) loadReflectionDetail();
    }, [id]);

    useEffect(() => {
        if (reflection?.documentIds && reflection.documentIds.length > 0) {
            checkAttachment(reflection.documentIds[0] as number);
        }
    }, [reflection]);

    const loadReflectionDetail = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return router.replace('/(auth)/login');

            const response = await apiService.get<{ success: boolean; data: ApiReflection }>(
                `${API_ENDPOINTS.REFLECTIONS.GET_BY_ID}/${id}`,
                token
            );

            if (response?.data) {
                const r = response.data;
                const rawText = r.reflectionText || '';
                const lines = rawText.split('\n').filter(l => l.trim());
                const title = lines[0]?.substring(0, 50) || 'Reflective Account';

                setReflection({
                    id: String(r.id),
                    title,
                    date: r.reflectionDate || (r.createdAt || '').split('T')[0] || '',
                    text: rawText,
                    documentIds: r.documentIds || [],
                });
            } else {
                showToast.error('Reflection not found', 'Error');
                router.back();
            }
        } catch (error: any) {
            console.error('Error loading detail:', error);
            showToast.error('Failed to load reflection', 'Error');
            router.back();
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

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
        } catch (e) { console.warn('Failed to load attachment info', e); }
    };

    const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url);

    const handleViewDocument = async (docId: number) => {
        try {
            let url = attachmentUrl;
            if (!url) {
                const token = await AsyncStorage.getItem('authToken');
                const res = await apiService.get<{ data: { document: string } }>(`${API_ENDPOINTS.DOCUMENTS.GET_BY_ID}/${docId}`, token || '');
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
                    await downloadAndShareFile(fullUrl, reflection?.id ? `reflection-${reflection.id}` : 'document');
                }
            } else {
                showToast.error('Document URL not found', 'Error');
            }
        } catch (e) {
            console.error('Error opening document:', e);
            showToast.error('Failed to open document', 'Error');
        }
    };

    const handleEditOpen = () => {
        if (!reflection) return;
        setForm({
            date: reflection.date,
            text: reflection.text,
        });

        // Reset file state
        setFileUri(null);
        setAttachment(null);
        setHasExistingAttachment(reflection.documentIds.length > 0);

        setShowEditModal(true);
    };

    const handleFileSelect = async (source: 'gallery' | 'camera' | 'files') => {
        try {
            let result: any;
            if (source === 'gallery') {
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!permissionResult.granted) return showToast.error('Gallery permission required', 'Permission Denied');
                result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, allowsEditing: false, quality: 1 });
                if (!result.canceled && result.assets?.[0]) {
                    const asset = result.assets[0];
                    setFileUri(asset.uri);
                    setAttachment({ name: asset.fileName || 'image.jpg', type: asset.type || 'image/jpeg' });
                    setHasExistingAttachment(false);
                }
            } else if (source === 'camera') {
                const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                if (!permissionResult.granted) return showToast.error('Camera permission required', 'Permission Denied');
                result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 1 });
                if (!result.canceled && result.assets?.[0]) {
                    const asset = result.assets[0];
                    setFileUri(asset.uri);
                    setAttachment({ name: 'photo.jpg', type: 'image/jpeg' });
                    setHasExistingAttachment(false);
                }
            } else if (source === 'files') {
                result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
                if (!result.canceled && result.assets?.[0]) {
                    const doc = result.assets[0];
                    setFileUri(doc.uri);
                    setAttachment({ name: doc.name, type: doc.mimeType || 'application/octet-stream' });
                    setHasExistingAttachment(false);
                }
            }
        } catch (e) {
            console.warn('File select error', e);
        }
    };

    const handleUpdate = async () => {
        if (!form.date || !form.text) return showToast.error('Required fields missing', 'Error');

        setIsSubmitting(true);
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;

            // Upload new file if selected
            let documentIds: number[] = hasExistingAttachment && reflection ? reflection.documentIds : [];

            if (fileUri && attachment) {
                try {
                    const uploadRes: any = await apiService.uploadFile(
                        API_ENDPOINTS.DOCUMENTS.UPLOAD,
                        { uri: fileUri, type: attachment.type, name: attachment.name },
                        token,
                        { title: 'Reflection Update', category: 'reflection' }
                    );
                    if (uploadRes?.data?.id) {
                        documentIds = [uploadRes.data.id];
                    }
                } catch (e) {
                    console.error("Upload failed in edit", e);
                }
            } else if (!hasExistingAttachment && !fileUri) {
                documentIds = [];
            }

            await apiService.put(`${API_ENDPOINTS.REFLECTIONS.UPDATE}/${id}`, {
                reflection_date: form.date,
                reflection_text: form.text,
                document_ids: documentIds
            }, token);

            showToast.success('Reflection updated', 'Success');
            setShowEditModal(false);
            loadReflectionDetail();
        } catch (error: any) {
            console.error('Update failed:', error);
            showToast.error('Failed to update', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <SafeAreaView className={`flex-1 items-center justify-center ${isDark ? "bg-background-dark" : "bg-background-light"}`}>
            <ActivityIndicator size="large" color={accentColor} />
        </SafeAreaView>
    );

    if (!reflection) return null;

    return (
        <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
            {/* Header */}
            <View className={`border-b px-4 py-3 flex-row items-center justify-between ${isDark ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-white"}`}>
                <View className="flex-row items-center">
                    <Pressable onPress={() => router.back()} className="p-2 mr-2 rounded-full active:bg-gray-100 dark:active:bg-slate-700">
                        <MaterialIcons name="arrow-back" size={24} color={isDark ? "#fff" : "#333"} />
                    </Pressable>
                    <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Reflection Details</Text>
                </View>
                <Pressable onPress={handleEditOpen} className={`p-2 rounded-full ${isDark ? "active:bg-slate-700" : "active:bg-gray-100"}`}>
                    <MaterialIcons name="edit" size={24} color={accentColor} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: Math.max(140, tabBarHeight + 140) }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReflectionDetail(); }} tintColor={isDark ? accentColor : '#2B5F9E'} colors={[accentColor, '#2B5F9E']} />}>

                {/* Main Card */}
                <View className={`p-5 rounded-2xl border shadow-sm mb-6 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"}`}>
                    <View className="flex-row items-center mb-4">
                        <MaterialIcons name="event" size={20} color={isDark ? "#9ca3af" : "#6b7280"} className="mr-2" />
                        <Text className={`${isDark ? "text-gray-300" : "text-gray-700"} font-medium`}>{reflection.date}</Text>
                    </View>

                    <Text className={`text-base leading-7 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        {reflection.text}
                    </Text>
                </View>

                {/* Evidence Card */}
                {reflection.documentIds.length > 0 && (
                    <View className={`p-5 rounded-2xl border shadow-sm mb-6 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"}`}>
                        <View className="flex-row items-center mb-4">
                            <MaterialIcons name="attach-file" size={20} color={isDark ? "#fff" : "#333"} />
                            <Text className={`text-lg font-bold ml-2 ${isDark ? "text-white" : "text-slate-800"}`}>Evidence</Text>
                        </View>

                        {attachmentUrl && isImage(attachmentUrl) && (
                            <View className="mb-4 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                                <Image source={{ uri: attachmentUrl }} className="w-full h-48 bg-gray-100 dark:bg-slate-700" resizeMode="cover" />
                            </View>
                        )}

                        <Pressable onPress={() => handleViewDocument(reflection.documentIds[0] as number)} className={`bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100 dark:border-slate-600 flex-row items-center active:opacity-70`}>
                            <MaterialIcons name="description" size={24} color={accentColor} />
                            <View className="ml-3">
                                <Text className={`font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>Attached Document</Text>
                                <Text className="text-xs" style={{ color: accentColor }}>Tap to View File</Text>
                            </View>
                        </Pressable>
                    </View>
                )}

            </ScrollView>

            {/* Footer */}
            <View className={`absolute w-full px-4 pt-4 border-t ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}`} style={{ bottom: tabBarHeight, paddingBottom: Math.max(16, insets.bottom + 16) }}>
                <Pressable onPress={handleEditOpen} className="py-4 rounded-xl items-center shadow-sm" style={{ backgroundColor: accentColor }}>
                    <Text className="text-white font-bold text-base">Edit Reflection</Text>
                </Pressable>
            </View>

            {/* Edit Modal */}
            <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className={`rounded-t-3xl max-h-[90%] w-full ${isDark ? "bg-slate-800" : "bg-white"}`}>
                        <SafeAreaView edges={['bottom']}>
                            <View className="flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                                <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Edit Reflection</Text>
                                <Pressable onPress={() => setShowEditModal(false)}><MaterialIcons name="close" size={24} color={isDark ? "#ccc" : "#666"} /></Pressable>
                            </View>

                            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
                                <View>
                                    <Text className={`mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Date (YYYY-MM-DD)</Text>
                                    <TextInput value={form.date} onChangeText={t => setForm({ ...form, date: t })}
                                        className={`p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-200 text-slate-800"}`} />
                                </View>
                                <View>
                                    <Text className={`mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Content</Text>
                                    <TextInput value={form.text} onChangeText={t => setForm({ ...form, text: t })} multiline numberOfLines={6}
                                        className={`p-3 rounded-xl border min-h-[120px] ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-200 text-slate-800"}`} />
                                </View>

                                {/* Evidence Edit */}
                                <View>
                                    <Text className={`mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Evidence</Text>

                                    {hasExistingAttachment ? (
                                        <View className={`flex-row items-center justify-between p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                                            <View className="flex-row items-center flex-1">
                                                <MaterialIcons name="attach-file" size={20} color={isDark ? "#ccc" : "#666"} />
                                                <Text className={`ml-2 ${isDark ? "text-gray-300" : "text-gray-700"}`} numberOfLines={1}>Existing File</Text>
                                            </View>
                                            <Pressable onPress={() => setHasExistingAttachment(false)} className="p-2">
                                                <MaterialIcons name="close" size={20} color="#EF4444" />
                                            </Pressable>
                                        </View>
                                    ) : fileUri && attachment ? (
                                        <View className={`flex-row items-center justify-between p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                                            <View className="flex-row items-center flex-1">
                                                <MaterialIcons name="upload-file" size={20} color={accentColor} />
                                                <Text className={`ml-2 ${isDark ? "text-gray-300" : "text-gray-700"}`} numberOfLines={1}>{attachment.name}</Text>
                                            </View>
                                            <Pressable onPress={() => { setFileUri(null); setAttachment(null); }} className="p-2">
                                                <MaterialIcons name="close" size={20} color="#EF4444" />
                                            </Pressable>
                                        </View>
                                    ) : (
                                        <View className="flex-row gap-3">
                                            <Pressable onPress={() => handleFileSelect('camera')} className={`flex-1 p-3 rounded-xl border items-center justify-center ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"}`}>
                                                <MaterialIcons name="camera-alt" size={24} color={accentColor} />
                                                <Text className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Camera</Text>
                                            </Pressable>
                                            <Pressable onPress={() => handleFileSelect('gallery')} className={`flex-1 p-3 rounded-xl border items-center justify-center ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"}`}>
                                                <MaterialIcons name="photo-library" size={24} color={accentColor} />
                                                <Text className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Gallery</Text>
                                            </Pressable>
                                            <Pressable onPress={() => handleFileSelect('files')} className={`flex-1 p-3 rounded-xl border items-center justify-center ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"}`}>
                                                <MaterialIcons name="folder" size={24} color={accentColor} />
                                                <Text className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Files</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>

                                <Pressable onPress={handleUpdate} disabled={isSubmitting} className={`p-4 rounded-xl items-center mt-4 ${isSubmitting ? "bg-gray-400" : ""}`} style={!isSubmitting ? { backgroundColor: accentColor } : undefined}>
                                    {isSubmitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Save Changes</Text>}
                                </Pressable>
                                <View className="h-10" />
                            </ScrollView>
                        </SafeAreaView>
                    </View>
                </View>
            </Modal>
            <ImageViewerModal
                isVisible={viewerVisible}
                imageUrl={viewerUrl}
                onClose={() => setViewerVisible(false)}
            />
        </SafeAreaView>
    );
}
