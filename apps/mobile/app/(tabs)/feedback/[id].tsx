import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, Modal, TextInput, Linking, Image } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';

import '../../global.css';

interface FeedbackDetail {
    id: string;
    title: string;
    source: string;
    method: string;
    date: string;
    rating: number;
    feedback: string;
    type: 'patient' | 'colleague' | 'manager';
    documentIds: number[];
}

interface ApiFeedback {
    id: number;
    feedbackDate: string;
    feedbackType: 'patient' | 'colleague' | 'manager';
    feedbackText: string | null;
    documentIds: number[];
    createdAt: string;
    updatedAt: string;
}

export default function FeedbackDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const { isDark } = useThemeStore();

    const [feedback, setFeedback] = useState<FeedbackDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userRole, setUserRole] = useState<string>('');

    // Edit State
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        title: '',
        date: '',
        source: '',
        method: '',
        text: '',
        rating: '5',
    });

    // Calendar State (reused)
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
    const [fileUri, setFileUri] = useState<string | null>(null);
    const [attachment, setAttachment] = useState<{ name: string, type: string } | null>(null);
    const [hasExistingAttachment, setHasExistingAttachment] = useState(false);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    useEffect(() => {
        if (feedback?.documentIds && feedback.documentIds.length > 0) {
            checkAttachment(feedback.documentIds[0]);
        }
    }, [feedback]);

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

    useEffect(() => {
        loadUserRole();
        if (id) loadFeedbackDetail();
    }, [id]);

    const loadUserRole = async () => {
        try {
            const userDataStr = await AsyncStorage.getItem('userData');
            if (userDataStr) {
                const userData = JSON.parse(userDataStr);
                if (userData.professionalRole) setUserRole(userData.professionalRole);
            }
        } catch (e) {
            console.log('Failed to load user role', e);
        }
    };

    const parseFeedback = (f: ApiFeedback): FeedbackDetail => {
        const rawText = f.feedbackText || '';
        let title = 'Feedback Entry';
        let source = 'Unknown Source';
        let method = 'Unknown Method';
        let rating = 0;
        let content = rawText;

        const titleMatch = rawText.match(/\[Title: (.*?)\]/);
        if (titleMatch && titleMatch[0]) {
            title = titleMatch[1] || '';
            content = content.replace(titleMatch[0], '');
        }

        const sourceMatch = rawText.match(/\[Source: (.*?)\]/);
        if (sourceMatch && sourceMatch[0]) {
            source = sourceMatch[1] || '';
            content = content.replace(sourceMatch[0], '');
        } else {
            if (f.feedbackType === 'patient') source = 'Patient';
            else if (f.feedbackType === 'manager') source = 'Manager';
            else source = 'Colleague';
        }

        const methodMatch = rawText.match(/\[Method: (.*?)\]/);
        if (methodMatch && methodMatch[0]) {
            method = methodMatch[1] || '';
            content = content.replace(methodMatch[0], '');
        }

        const ratingMatch = rawText.match(/\[Rating: (\d)\]/);
        if (ratingMatch && ratingMatch[0]) {
            rating = parseInt(ratingMatch[1] || '0', 10);
            content = content.replace(ratingMatch[0], '');
        }

        return {
            id: String(f.id),
            title,
            source,
            method,
            date: f.feedbackDate || (f.createdAt || '').split('T')[0] || '',
            rating,
            feedback: content.trim(),
            type: f.feedbackType,
            documentIds: f.documentIds || [],
        };
    };

    const loadFeedbackDetail = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return router.replace('/(auth)/login');

            const response = await apiService.get<{ success: boolean; data: ApiFeedback }>(
                `${API_ENDPOINTS.FEEDBACK.GET_BY_ID}/${id}`,
                token
            );

            if (response?.data) {
                setFeedback(parseFeedback(response.data));
            } else {
                showToast.error('Feedback not found', 'Error');
                router.back();
            }
        } catch (error: any) {
            console.error('Error loading detail:', error);
            showToast.error('Failed to load feedback', 'Error');
            router.back();
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleViewDocument = async (docId: number) => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;

            const response = await apiService.get<{ success: boolean, data: { document: string } }>(
                `${API_ENDPOINTS.DOCUMENTS.GET_BY_ID}/${docId}`,
                token
            );

            if (response?.data?.document) {
                let url = response.data.document;
                if (!url.startsWith('http')) {
                    url = apiService.baseUrl + (url.startsWith('/') ? '' : '/') + url;
                }
                const canOpen = await Linking.canOpenURL(url);
                if (canOpen) {
                    await Linking.openURL(url);
                } else {
                    showToast.error('Cannot open document URL', 'Error');
                }
            } else {
                showToast.error('Document URL not found', 'Error');
            }
        } catch (e) {
            console.error('Document view error:', e);
            showToast.error('Failed to open document', 'Error');
        }
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
                    setHasExistingAttachment(false); // Replace existing
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

    const handleEditOpen = () => {
        if (!feedback) return;
        setForm({
            title: feedback.title,
            date: feedback.date,
            source: feedback.source,
            method: feedback.method,
            text: feedback.feedback,
            rating: String(feedback.rating),
        });

        // Reset file state
        setFileUri(null);
        setAttachment(null);
        setHasExistingAttachment(feedback.documentIds.length > 0);

        // Set calendar to this date
        if (feedback.date) {
            const d = new Date(feedback.date);
            if (!isNaN(d.getTime())) {
                setSelectedMonth(d.getMonth());
                setSelectedYear(d.getFullYear());
            }
        }
        setShowEditModal(true);
    };

    const handleUpdate = async () => {
        if (!form.title || !form.source || !form.method || !form.date) {
            return showToast.error('Please fill all required fields', 'Validation Error');
        }

        setIsSubmitting(true);
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;

            let packedText = `[Title: ${form.title}]\n[Source: ${form.source}]\n[Method: ${form.method}]\n[Rating: ${form.rating}]\n${form.text}`;

            let apiType: 'patient' | 'colleague' | 'manager' = 'colleague';
            const s = form.source.toLowerCase();
            if (s.includes('patient')) apiType = 'patient';
            else if (s.includes('manager') || s.includes('appraisal')) apiType = 'manager';

            // We use existing functionality to update. Note: document update support is omitted for simplicity in edit mode unless requested, 
            // but we preserve existing ones if backend allows (backend usually replaces or merges? API usually updates fields provided).
            // Assuming PUT replaces, PATCH updates. apiService usually uses PUT or PATCH.
            // Let's us PATCH if available or PUT. The endpoint is likely /api/v1/feedback/:id.

            // My API service methods: update -> PUT usually.
            // Let's use apiService.put or apiService.patch.
            // feedback.controller.ts uses update -> updateFeedbackSchema.

            // Upload new file if selected
            let documentIds: number[] = hasExistingAttachment && feedback ? feedback.documentIds : [];

            if (fileUri && attachment) {
                try {
                    const uploadRes: any = await apiService.uploadFile(
                        API_ENDPOINTS.DOCUMENTS.UPLOAD,
                        { uri: fileUri, type: attachment.type, name: attachment.name },
                        token,
                        { title: form.title, category: 'feedback' }
                    );
                    if (uploadRes?.data?.id) {
                        documentIds = [uploadRes.data.id]; // Replace with new
                    }
                } catch (e) {
                    console.error("Upload failed in edit", e);
                    showToast.error("Failed to upload new document", "Error");
                    setIsSubmitting(false);
                    return;
                }
            } else if (!hasExistingAttachment && !fileUri) {
                documentIds = []; // Removed
            }

            await apiService.put(`${API_ENDPOINTS.FEEDBACK.UPDATE}/${id}`, {
                feedback_date: form.date,
                feedback_type: apiType,
                feedback_text: packedText,
                document_ids: documentIds
            }, token);

            showToast.success('Feedback updated', 'Success');
            setShowEditModal(false);
            loadFeedbackDetail(); // Reload to see changes
        } catch (error: any) {
            console.error('Update failed:', error);
            showToast.error(error.message || 'Failed to update', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calendar Helpers
    const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();
    const formatYMD = (year: number, month: number, day: number) => {
        const m = String(month + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${year}-${m}-${d}`;
    };
    const handleDateSelect = (day: number) => {
        setForm({ ...form, date: formatYMD(selectedYear, selectedMonth, day) });
        setShowDatePicker(false);
    };
    const navigateMonth = (direction: 'prev' | 'next') => {
        if (direction === 'prev') {
            if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
            else setSelectedMonth(selectedMonth - 1);
        } else {
            if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
            else setSelectedMonth(selectedMonth + 1);
        }
    };

    // Dynamic Options
    const isDoctor = userRole.toLowerCase().includes('doctor');
    const sourceOptions = [
        'Annual Appraisal', isDoctor ? 'Nurses' : 'Doctors', 'Midwives',
        'Other Healthcare Professionals', 'Patient', 'Manager', 'Colleague'
    ];
    const methodOptions = ['Verbal', 'Letter or card', 'Survey', 'Report', 'Email', 'Other'];

    if (loading) return (
        <SafeAreaView className={`flex-1 items-center justify-center ${isDark ? "bg-background-dark" : "bg-background-light"}`}>
            <ActivityIndicator size="large" color="#2B5E9C" />
        </SafeAreaView>
    );

    if (!feedback) return null;

    return (
        <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
            {/* Header */}
            <View className={`border-b px-4 py-3 flex-row items-center justify-between ${isDark ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-white"}`}>
                <View className="flex-row items-center">
                    <Pressable onPress={() => router.back()} className="p-2 mr-2 rounded-full active:bg-gray-100 dark:active:bg-slate-700">
                        <MaterialIcons name="arrow-back" size={24} color={isDark ? "#fff" : "#333"} />
                    </Pressable>
                    <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Feedback Details</Text>
                </View>
                <Pressable onPress={handleEditOpen} className={`p-2 rounded-full ${isDark ? "active:bg-slate-700" : "active:bg-gray-100"}`}>
                    <MaterialIcons name="edit" size={24} color="#2B5E9C" />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFeedbackDetail(); }} />}>

                {/* Main Card */}
                <View className={`p-5 rounded-2xl border shadow-sm mb-6 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"}`}>
                    <Text className={`text-sm font-semibold uppercase tracking-wider mb-1 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                        Title
                    </Text>
                    <Text className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>{feedback.title}</Text>

                    <View className="flex-row flex-wrap mb-4" style={{ gap: 12 }}>
                        <View className="flex-1 min-w-[140px]">
                            <Text className={`text-xs text-gray-500 mb-1`}>Source</Text>
                            <View className="bg-blue-100 dark:bg-blue-900 px-3 py-1.5 rounded-lg self-start">
                                <Text className="text-blue-700 dark:text-blue-300 font-bold text-xs">{feedback.source}</Text>
                            </View>
                        </View>
                        <View className="flex-1 min-w-[140px]">
                            <Text className={`text-xs text-gray-500 mb-1`}>Method</Text>
                            <View className="bg-purple-100 dark:bg-purple-900 px-3 py-1.5 rounded-lg self-start">
                                <Text className="text-purple-700 dark:text-purple-300 font-bold text-xs">{feedback.method}</Text>
                            </View>
                        </View>
                    </View>

                    <View className="flex-row mb-4" style={{ gap: 12 }}>
                        <View className="flex-1">
                            <Text className={`text-xs text-gray-500 mb-1`}>Date Received</Text>
                            <View className="flex-row items-center">
                                <MaterialIcons name="event" size={16} color={isDark ? "#9ca3af" : "#6b7280"} className="mr-1" />
                                <Text className={`${isDark ? "text-gray-300" : "text-gray-700"} font-medium`}>{feedback.date}</Text>
                            </View>
                        </View>
                        <View className="flex-1">
                            <Text className={`text-xs text-gray-500 mb-1`}>Rating</Text>
                            <View className="flex-row">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <MaterialIcons key={s} name={s <= feedback.rating ? 'star' : 'star-border'} size={18} color={s <= feedback.rating ? '#FBBF24' : '#d1d5db'} />
                                ))}
                            </View>
                        </View>
                    </View>

                    <Text className={`text-xs text-gray-500 mb-2 mt-2 uppercase tracking-widest`}>Feedback Content</Text>
                    <Text className={`text-base leading-7 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        {feedback.feedback}
                    </Text>
                </View>

                {/* Evidence Card */}
                {feedback.documentIds.length > 0 && (
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
                        <Pressable onPress={() => handleViewDocument(feedback.documentIds[0])} className={`bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100 dark:border-slate-600 flex-row items-center active:opacity-70`}>
                            <MaterialIcons name="description" size={24} color="#2B5E9C" />
                            <View className="ml-3">
                                <Text className={`font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>Attached Document</Text>
                                <Text className="text-xs text-blue-500">Tap to View File</Text>
                            </View>
                        </Pressable>
                    </View>
                )}

            </ScrollView>

            {/* Footer Buttons */}
            <View className={`absolute bottom-0 w-full px-4 pt-4 border-t ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}`} style={{ paddingBottom: Math.max(16, insets.bottom + 16) }}>
                <Pressable onPress={handleEditOpen} className="bg-[#2B5E9C] py-4 rounded-xl items-center shadow-sm">
                    <Text className="text-white font-bold text-base">Edit Feedback</Text>
                </Pressable>
            </View>

            {/* Edit Modal */}
            <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className={`rounded-t-3xl max-h-[90%] w-full ${isDark ? "bg-slate-800" : "bg-white"}`}>
                        <SafeAreaView edges={['bottom']}>
                            <View className="flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                                <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Edit Feedback</Text>
                                <Pressable onPress={() => setShowEditModal(false)}><MaterialIcons name="close" size={24} color={isDark ? "#ccc" : "#666"} /></Pressable>
                            </View>

                            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
                                {/* Same form fields as add */}
                                <View>
                                    <Text className={`mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Title</Text>
                                    <TextInput value={form.title} onChangeText={t => setForm({ ...form, title: t })}
                                        className={`p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-200 text-slate-800"}`} />
                                </View>
                                <View>
                                    <Text className={`mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Date</Text>
                                    <Pressable onPress={() => setShowDatePicker(true)}
                                        className={`p-3 rounded-xl border flex-row justify-between items-center ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"}`}>
                                        <Text className={isDark ? "text-white" : "text-slate-800"}>{form.date}</Text>
                                        <MaterialIcons name="event" size={20} color={isDark ? "#999" : "#666"} />
                                    </Pressable>
                                </View>
                                <View>
                                    <Text className={`mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Source</Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {sourceOptions.map(opt => (
                                            <Pressable key={opt} onPress={() => setForm({ ...form, source: opt })}
                                                className={`px-3 py-2 rounded-lg border ${form.source === opt ? 'bg-[#2B5E9C] border-[#2B5E9C]' : (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200')}`}>
                                                <Text className={`text-xs font-medium ${form.source === opt ? 'text-white' : (isDark ? 'text-gray-300' : 'text-slate-700')}`}>{opt}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                                <View>
                                    <Text className={`mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Method</Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {methodOptions.map(opt => (
                                            <Pressable key={opt} onPress={() => setForm({ ...form, method: opt })}
                                                className={`px-3 py-2 rounded-lg border ${form.method === opt ? 'bg-[#2B5E9C] border-[#2B5E9C]' : (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200')}`}>
                                                <Text className={`text-xs font-medium ${form.method === opt ? 'text-white' : (isDark ? 'text-gray-300' : 'text-slate-700')}`}>{opt}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                                <View>
                                    <Text className={`mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Rating</Text>
                                    <View className="flex-row gap-4">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Pressable key={s} onPress={() => setForm({ ...form, rating: String(s) })}>
                                                <MaterialIcons name={s <= parseInt(form.rating) ? 'star' : 'star-border'} size={32} color={s <= parseInt(form.rating) ? '#FBBF24' : (isDark ? '#4b5563' : '#e5e7eb')} />
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                                <View>
                                    <Text className={`mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Content</Text>
                                    <TextInput value={form.text} onChangeText={t => setForm({ ...form, text: t })} multiline numberOfLines={4}
                                        className={`p-3 rounded-xl border min-h-[100px] ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-200 text-slate-800"}`} />
                                </View>

                                {/* Evidence Section in Edit */}
                                <View>
                                    <Text className={`mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Evidence</Text>

                                    {hasExistingAttachment ? (
                                        <View className={`flex-row items-center justify-between p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                                            <View className="flex-row items-center flex-1">
                                                <MaterialIcons name="attach-file" size={20} color={isDark ? "#ccc" : "#666"} />
                                                <Text className={`ml-2 ${isDark ? "text-gray-300" : "text-gray-700"}`} numberOfLines={1}>Existing File (ID: {feedback?.documentIds[0]})</Text>
                                            </View>
                                            <Pressable onPress={() => setHasExistingAttachment(false)} className="p-2">
                                                <MaterialIcons name="close" size={20} color="#EF4444" />
                                            </Pressable>
                                        </View>
                                    ) : fileUri && attachment ? (
                                        <View className={`flex-row items-center justify-between p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                                            <View className="flex-row items-center flex-1">
                                                <MaterialIcons name="upload-file" size={20} color="#2B5E9C" />
                                                <Text className={`ml-2 ${isDark ? "text-gray-300" : "text-gray-700"}`} numberOfLines={1}>{attachment.name}</Text>
                                            </View>
                                            <Pressable onPress={() => { setFileUri(null); setAttachment(null); }} className="p-2">
                                                <MaterialIcons name="close" size={20} color="#EF4444" />
                                            </Pressable>
                                        </View>
                                    ) : (
                                        <View className="flex-row gap-3">
                                            <Pressable onPress={() => handleFileSelect('camera')} className={`flex-1 p-3 rounded-xl border items-center justify-center ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"}`}>
                                                <MaterialIcons name="camera-alt" size={24} color="#2B5E9C" />
                                                <Text className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Camera</Text>
                                            </Pressable>
                                            <Pressable onPress={() => handleFileSelect('gallery')} className={`flex-1 p-3 rounded-xl border items-center justify-center ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"}`}>
                                                <MaterialIcons name="photo-library" size={24} color="#2B5E9C" />
                                                <Text className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Gallery</Text>
                                            </Pressable>
                                            <Pressable onPress={() => handleFileSelect('files')} className={`flex-1 p-3 rounded-xl border items-center justify-center ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"}`}>
                                                <MaterialIcons name="folder" size={24} color="#2B5E9C" />
                                                <Text className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Files</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>

                                {/* Submit */}
                                <Pressable onPress={handleUpdate} disabled={isSubmitting} className={`p-4 rounded-xl items-center mt-4 ${isSubmitting ? "bg-gray-400" : "bg-[#2B5E9C]"}`}>
                                    {isSubmitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Save Changes</Text>}
                                </Pressable>
                                <View className="h-10" />
                            </ScrollView>
                        </SafeAreaView>
                    </View>
                </View>
            </Modal>

            {/* Date Picker Modal (reused logic) */}
            <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
                <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setShowDatePicker(false)}>
                    <Pressable onPress={e => e.stopPropagation()} className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-3xl p-6`}>
                        <View className="flex-row justify-between items-center mb-4">
                            <Pressable onPress={() => navigateMonth('prev')} className="p-2"><MaterialIcons name="chevron-left" size={24} color={isDark ? "#ccc" : "#333"} /></Pressable>
                            <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{monthNames[selectedMonth]} {selectedYear}</Text>
                            <Pressable onPress={() => navigateMonth('next')} className="p-2"><MaterialIcons name="chevron-right" size={24} color={isDark ? "#ccc" : "#333"} /></Pressable>
                        </View>
                        <View className="flex-row flex-wrap justify-between mb-4">
                            {dayNames.map(d => <Text key={d} className={`w-[14%] text-center text-xs font-bold mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{d}</Text>)}
                            {Array.from({ length: getFirstDayOfMonth(selectedMonth, selectedYear) }).map((_, i) => <View key={`e-${i}`} className="w-[14%] h-10" />)}
                            {Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }).map((_, i) => {
                                const day = i + 1;
                                const isSelected = form.date === formatYMD(selectedYear, selectedMonth, day);
                                return (
                                    <Pressable key={day} onPress={() => handleDateSelect(day)}
                                        className={`w-[14%] h-10 items-center justify-center rounded-full mb-1 ${isSelected ? 'bg-[#2B5E9C]' : ''}`}>
                                        <Text className={`text-sm ${isSelected ? 'text-white font-bold' : (isDark ? 'text-white' : 'text-slate-800')}`}>{day}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                        <Pressable onPress={() => setShowDatePicker(false)} className={`py-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                            <Text className={`text-center font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Cancel</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}
