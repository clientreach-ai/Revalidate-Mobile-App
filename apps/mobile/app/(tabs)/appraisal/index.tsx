import { View, Text, ScrollView, Pressable, TextInput, RefreshControl, ActivityIndicator, Modal, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import '../../global.css';

interface Appraisal {
    id: string;
    date: string;
    notes: string;
    discussionWith?: string;
    hospitalName?: string;
    hasDocuments?: boolean;
    createdAt: string;
}

interface ApiAppraisal {
    id: number;
    appraisalDate: string;
    discussionWith?: string;
    hospitalId?: number;
    notes: string | null;
    documentIds: number[];
    createdAt: string;
    updatedAt: string;
}

interface Hospital {
    id: number;
    name: string;
    town: string;
    postcode: string;
}

const DISCUSSION_PARTNERS = [
    'Trusted colleague',
    'Line manager',
    'Group of peers',
    'Mentor/Coach',
    'Other'
];

export default function AppraisalScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDark } = useThemeStore();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [appraisals, setAppraisals] = useState<Appraisal[]>([]);

    // Form State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newAppraisal, setNewAppraisal] = useState({
        date: new Date().toISOString().split('T')[0],
        notes: '',
        discussionWith: '',
    });

    // Hospital Search State
    const [hospitalQuery, setHospitalQuery] = useState('');
    const [hospitalResults, setHospitalResults] = useState<Hospital[]>([]);
    const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
    const [isSearchingHospitals, setIsSearchingHospitals] = useState(false);
    const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);

    // Discussion Selection State
    const [showDiscussionDropdown, setShowDiscussionDropdown] = useState(false);

    // File State
    const [fileUri, setFileUri] = useState<string | null>(null);
    const [attachment, setAttachment] = useState<{ name: string, type: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadAppraisals();
    }, []);

    // Debounced hospital search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (hospitalQuery.length >= 2 && !selectedHospital) {
                searchHospitals(hospitalQuery);
            } else if (hospitalQuery.length < 2) {
                setHospitalResults([]);
                setShowHospitalDropdown(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [hospitalQuery]);

    const loadAppraisals = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return router.replace('/(auth)/login');

            const response = await apiService.get<{
                success: boolean;
                data: ApiAppraisal[];
                pagination: { total: number };
            }>(API_ENDPOINTS.APPRAISALS.LIST, token);

            if (response?.data) {
                const mappedAppraisals: Appraisal[] = response.data.map((a) => {
                    return {
                        id: String(a.id),
                        date: formatDate(a.appraisalDate),
                        notes: a.notes || 'No notes provided',
                        discussionWith: a.discussionWith,
                        hasDocuments: a.documentIds && a.documentIds.length > 0,
                        createdAt: a.createdAt,
                    };
                });
                mappedAppraisals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setAppraisals(mappedAppraisals);
            }
        } catch (error: any) {
            console.error('Error loading appraisals:', error);
            showToast.error(error?.message || 'Failed to load appraisals', 'Error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const searchHospitals = async (query: string) => {
        try {
            setIsSearchingHospitals(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;
            const res = await apiService.get<{ success: boolean, data: Hospital[] }>(`${API_ENDPOINTS.HOSPITALS.LIST}?search=${encodeURIComponent(query)}`, token);
            if (res?.success && res.data) {
                setHospitalResults(res.data);
                setShowHospitalDropdown(true);
            } else if (Array.isArray(res)) {
                // Handle case where API might return array directly
                setHospitalResults(res);
                setShowHospitalDropdown(true);
            }
        } catch (e) {
            console.warn('Search failed', e);
        } finally {
            setIsSearchingHospitals(false);
        }
    };

    const formatDate = (dateString: string): string => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch { return dateString; }
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
                }
            } else if (source === 'camera') {
                const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                if (!permissionResult.granted) return showToast.error('Camera permission required', 'Permission Denied');
                result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 1 });
                if (!result.canceled && result.assets?.[0]) {
                    const asset = result.assets[0];
                    setFileUri(asset.uri);
                    setAttachment({ name: 'photo.jpg', type: 'image/jpeg' });
                }
            } else if (source === 'files') {
                result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
                if (!result.canceled && result.assets?.[0]) {
                    const doc = result.assets[0];
                    setFileUri(doc.uri);
                    setAttachment({ name: doc.name, type: doc.mimeType || 'application/octet-stream' });
                }
            }
        } catch (e) {
            console.warn('File select error', e);
        }
    };

    const handleAddAppraisal = async () => {
        if (!newAppraisal.date) return showToast.error('Please select a date', 'Validation Error');
        if (!newAppraisal.discussionWith) return showToast.error('Please select discussion partner', 'Validation Error');

        try {
            setIsSubmitting(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;

            // Upload document if present
            let documentIds: number[] = [];
            if (fileUri && attachment) {
                try {
                    const uploadRes: any = await apiService.uploadFile(
                        API_ENDPOINTS.DOCUMENTS.UPLOAD,
                        { uri: fileUri, type: attachment.type, name: attachment.name },
                        token,
                        { title: 'Appraisal Evidence', category: 'appraisal' }
                    );
                    if (uploadRes?.data?.id) documentIds.push(uploadRes.data.id);
                } catch (e) {
                    console.error("Upload failed", e);
                }
            }

            await apiService.post(API_ENDPOINTS.APPRAISALS.CREATE, {
                appraisal_date: newAppraisal.date,
                discussion_with: newAppraisal.discussionWith,
                hospital_id: selectedHospital?.id,
                notes: newAppraisal.notes,
                document_ids: documentIds.length > 0 ? documentIds : undefined
            }, token);

            showToast.success('Appraisal record added', 'Success');
            resetForm();
            loadAppraisals();
        } catch (error: any) {
            console.error('Error creating appraisal:', error);
            showToast.error(error.message || 'Failed to create appraisal', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setShowAddModal(false);
        setNewAppraisal({ date: new Date().toISOString().split('T')[0], notes: '', discussionWith: '' });
        setHospitalQuery('');
        setSelectedHospital(null);
        setFileUri(null);
        setAttachment(null);
        setShowHospitalDropdown(false);
        setShowDiscussionDropdown(false);
    };

    return (
        <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
            <View className={`border-b ${isDark ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-gray-100"}`}>
                <View className="flex-row items-center justify-between px-4 py-2">
                    <Pressable onPress={() => router.back()} className="w-12 h-12 shrink-0 items-center justify-center">
                        <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? "#E5E7EB" : "#121417"} />
                    </Pressable>
                    <Text className={`text-lg font-bold flex-1 text-center ${isDark ? "text-white" : "text-[#121417]"}`}>Appraisals</Text>
                    <Pressable onPress={() => setShowAddModal(true)} className="w-12 h-12 shrink-0 items-center justify-center active:opacity-60">
                        <MaterialIcons name="add" size={32} color="#E11D48" />
                    </Pressable>
                </View>
            </View>

            {loading && !refreshing ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
                </View>
            ) : (
                <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAppraisals(); }} />}>
                    {appraisals.length > 0 ? (
                        <View style={{ gap: 16 }}>
                            {appraisals.map((appraisal) => (
                                <View key={appraisal.id} className={`rounded-xl shadow-sm border p-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"}`}>
                                    <View className="flex-row justify-between items-start mb-2">
                                        <View className="flex-row items-center gap-2">
                                            <MaterialIcons name="verified" size={20} color="#E11D48" />
                                            <Text className={`font-bold text-base ${isDark ? "text-white" : "text-[#121417]"}`}>
                                                Annual Appraisal
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center gap-2">
                                            {appraisal.hasDocuments && <MaterialIcons name="attachment" size={16} color="#2B5E9C" />}
                                            <Text className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-[#687482]"}`}>
                                                {appraisal.date}
                                            </Text>
                                        </View>
                                    </View>
                                    {appraisal.discussionWith && <Text className={`text-xs mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>With: {appraisal.discussionWith}</Text>}
                                    <Text className={`text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-[#121417]"}`} numberOfLines={3}>
                                        {appraisal.notes}
                                    </Text>
                                    <View className={`mt-3 pt-3 border-t flex-row justify-end ${isDark ? "border-slate-700" : "border-gray-50"}`}>
                                        <Pressable
                                            onPress={() => router.push(`/(tabs)/appraisal/${appraisal.id}`)}
                                            className="flex-row items-center"
                                            style={{ gap: 4 }}
                                        >
                                            <Text className="text-[#E11D48] text-xs font-bold uppercase">
                                                View Details
                                            </Text>
                                            <MaterialIcons name="chevron-right" size={16} color="#E11D48" />
                                        </Pressable>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View className={`p-8 rounded-3xl border items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
                            <View className="w-20 h-20 rounded-full bg-rose-50 items-center justify-center mb-4">
                                <MaterialIcons name="verified" size={48} color="#E11D48" />
                            </View>
                            <Text className={`text-xl text-center font-bold mb-2 ${isDark ? "text-white" : "text-slate-800"}`}>No appraisals recorded</Text>
                            <Text className={`text-center text-sm mb-6 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                                Log your annual appraisals to keep your revalidation portofolio up to date.
                            </Text>
                            <Pressable
                                onPress={() => setShowAddModal(true)}
                                className="bg-[#E11D48] px-8 py-3 rounded-2xl shadow-md active:opacity-90"
                            >
                                <Text className="text-white font-bold">Log First Appraisal</Text>
                            </Pressable>
                        </View>
                    )}
                </ScrollView>
            )}

            <View className="absolute right-6 items-center" style={{ bottom: 100 + insets.bottom }}>
                <Pressable onPress={() => setShowAddModal(true)} className="w-14 h-14 bg-[#E11D48] rounded-full shadow-lg items-center justify-center active:bg-[#C41A3B]">
                    <MaterialIcons name="add" size={32} color="#FFFFFF" />
                </Pressable>
            </View>

            {/* Add Appraisal Modal */}
            <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={resetForm}>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className={`rounded-t-3xl h-[85%] ${isDark ? "bg-slate-800" : "bg-white"}`}>
                        <View className="p-4 border-b border-gray-200 flex-row justify-between items-center">
                            <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Log Appraisal</Text>
                            <Pressable onPress={resetForm}><MaterialIcons name="close" size={24} color={isDark ? "#ccc" : "#666"} /></Pressable>
                        </View>

                        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>

                            {/* Discussion With - Dropdown */}
                            <View>
                                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Discussion With</Text>
                                <Pressable onPress={() => setShowDiscussionDropdown(!showDiscussionDropdown)} className={`flex-row justify-between items-center p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"}`}>
                                    <Text className={isDark ? "text-white" : "text-slate-800"}>{newAppraisal.discussionWith || "Select partner..."}</Text>
                                    <MaterialIcons name="arrow-drop-down" size={24} color={isDark ? "#ccc" : "#666"} />
                                </Pressable>
                                {showDiscussionDropdown && (
                                    <View className={`mt-1 rounded-xl border overflow-hidden ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"}`}>
                                        {DISCUSSION_PARTNERS.map(partner => (
                                            <Pressable key={partner} onPress={() => { setNewAppraisal({ ...newAppraisal, discussionWith: partner }); setShowDiscussionDropdown(false); }} className={`p-3 border-b ${isDark ? "border-slate-600 active:bg-slate-600" : "border-gray-100 active:bg-gray-50"}`}>
                                                <Text className={isDark ? "text-white" : "text-slate-800"}>{partner}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Where - Hospital Search */}
                            <View className="z-20">
                                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Where (Hospital/Location)</Text>
                                <View className={`flex-row items-center rounded-xl border ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"}`}>
                                    <TextInput
                                        value={selectedHospital ? selectedHospital.name : hospitalQuery}
                                        onChangeText={(t) => {
                                            setHospitalQuery(t);
                                            setSelectedHospital(null);
                                            setShowHospitalDropdown(true);
                                        }}
                                        className={`flex-1 p-3 ${isDark ? "text-white" : "text-slate-800"}`}
                                        placeholder="Search hospital..."
                                        placeholderTextColor={isDark ? "#9ca3af" : "#9ca3af"}
                                    />
                                    {isSearchingHospitals && <ActivityIndicator size="small" color="#2B5E9C" className="mr-3" />}
                                    {selectedHospital && (
                                        <Pressable onPress={() => { setSelectedHospital(null); setHospitalQuery(''); }} className="mr-3">
                                            <MaterialIcons name="close" size={20} color="#EF4444" />
                                        </Pressable>
                                    )}
                                </View>

                                {showHospitalDropdown && hospitalResults.length > 0 && !selectedHospital && (
                                    <View className={`mt-2 max-h-60 rounded-xl border overflow-hidden ${isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-gray-200"}`}>
                                        {hospitalResults.map((item) => (
                                            <Pressable
                                                key={item.id}
                                                onPress={() => { setSelectedHospital(item); setHospitalQuery(item.name); setShowHospitalDropdown(false); }}
                                                className={`p-3 border-b ${isDark ? "border-slate-700 active:bg-slate-700" : "border-gray-100 active:bg-gray-100"}`}
                                            >
                                                <Text className={`font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>{item.name}</Text>
                                                <Text className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{item.town}, {item.postcode}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Date */}
                            <View className="z-10">
                                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Date (YYYY-MM-DD)</Text>
                                <TextInput
                                    value={newAppraisal.date}
                                    onChangeText={(t) => setNewAppraisal({ ...newAppraisal, date: t })}
                                    className={`p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-200 text-slate-800"}`}
                                    placeholder="2024-03-20"
                                />
                            </View>

                            {/* Notes */}
                            <View>
                                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Notes</Text>
                                <TextInput
                                    value={newAppraisal.notes}
                                    onChangeText={(t) => setNewAppraisal({ ...newAppraisal, notes: t })}
                                    className={`p-3 rounded-xl border min-h-[100px] ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-200 text-slate-800"}`}
                                    placeholder="Summary of discussion..."
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>

                            {/* Upload */}
                            <View>
                                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Upload Document</Text>
                                {fileUri ? (
                                    <View className={`flex-row items-center justify-between p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                                        <View className="flex-row items-center flex-1">
                                            <MaterialIcons name="description" size={20} color="#2B5E9C" />
                                            <Text className={`ml-2 ${isDark ? "text-gray-300" : "text-gray-700"}`} numberOfLines={1}>{attachment?.name}</Text>
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

                            <Pressable onPress={handleAddAppraisal} disabled={isSubmitting} className={`mt-2 p-4 rounded-xl items-center justify-center ${isSubmitting ? "bg-gray-400" : "bg-[#E11D48]"}`}>
                                {isSubmitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Save Appraisal</Text>}
                            </Pressable>
                            <View className="h-10" />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
