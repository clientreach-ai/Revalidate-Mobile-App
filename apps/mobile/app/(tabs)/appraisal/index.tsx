import { View, Text, ScrollView, Pressable, TextInput, RefreshControl, ActivityIndicator, Modal, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
    type?: string;
    rawDate: string; // Add this for sorting
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
        type: 'Annual Appraisal', // Default type
        date: new Date().toISOString().split('T')[0],
        notes: '',
        discussionWith: '',
    });

    const APPRAISAL_TYPES = [
        'Annual Appraisal',
        'Interim Review',
        'Academic Appraisal',
        'Clinical Supervisor Review',
        'Educational Supervisor Review',
        'Probationary Review',
        'Return to Work',
        'Other'
    ];
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);

    // Hospital Search State
    const [hospitalQuery, setHospitalQuery] = useState('');
    const [hospitalResults, setHospitalResults] = useState<Hospital[]>([]);
    const [cachedHospitals, setCachedHospitals] = useState<Hospital[]>([]); // Store cached hospitals separately
    const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
    const [isSearchingHospitals, setIsSearchingHospitals] = useState(false);
    const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);

    // Discussion Selection State
    const [showDiscussionDropdown, setShowDiscussionDropdown] = useState(false);

    // Date Picker State
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // File State
    const [fileUri, setFileUri] = useState<string | null>(null);
    const [attachment, setAttachment] = useState<{ name: string, type: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);

    // Filtering State
    const [typeFilter, setTypeFilter] = useState('All');
    const [timeFilter, setTimeFilter] = useState('All');

    const TIME_FILTERS = [
        { label: 'All', value: 'All' },
        { label: 'Last 30 Days', value: '30' },
        { label: 'Last 6 Months', value: '180' },
        { label: 'This Year', value: 'year' },
    ];

    useFocusEffect(
        useCallback(() => {
            loadAppraisals();
            loadCachedHospitals();
        }, [])
    );

    // Load cached hospitals for faster initial display
    const loadCachedHospitals = async () => {
        try {
            const cached = await AsyncStorage.getItem('cached_hospitals');
            if (cached) {
                const hospitals = JSON.parse(cached);
                if (Array.isArray(hospitals) && hospitals.length > 0) {
                    const topHospitals = hospitals.slice(0, 10);
                    setHospitalResults(topHospitals);
                    setCachedHospitals(topHospitals); // Keep copy of cached
                }
            }
        } catch (e) {
            console.log('Error loading cached hospitals:', e);
        }
    };

    // Debounced hospital search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (hospitalQuery.length >= 2 && !selectedHospital) {
                searchHospitals(hospitalQuery);
            } else if (hospitalQuery.length < 2) {
                // Restore cached results if query is empty/short
                setHospitalResults(cachedHospitals);
                // Don't auto-close dropdown here, let user close it or select
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [hospitalQuery, cachedHospitals]);

    const loadAppraisals = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return router.replace('/(auth)/login');

            const response = await apiService.get<any>(API_ENDPOINTS.APPRAISALS.LIST, token, true);

            let rawData: ApiAppraisal[] = [];
            if (response?.data && Array.isArray(response.data)) {
                rawData = response.data;
            } else if (Array.isArray(response)) {
                rawData = response;
            }

            if (rawData.length > 0) {
                const mappedAppraisals: Appraisal[] = rawData.map((a) => {
                    return {
                        id: String(a.id),
                        date: formatDate(a.appraisalDate),
                        notes: a.notes || 'No notes provided',
                        type: (a as any).appraisalType || 'Annual Appraisal', // Use type from API or default
                        discussionWith: a.discussionWith,
                        hasDocuments: a.documentIds && a.documentIds.length > 0,
                        createdAt: a.createdAt,
                        rawDate: a.appraisalDate, // Store the raw ISO date
                    };
                });
                // Sort by appraisal date (descending), then by creation date (descending)
                mappedAppraisals.sort((a, b) => {
                    const dateDiff = new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime();
                    if (dateDiff !== 0) return dateDiff;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                });
                setAppraisals(mappedAppraisals);
            } else {
                setAppraisals([]);
            }
        } catch (error: any) {
            console.error('Error loading appraisals:', error);
            showToast.error(error?.message || 'Failed to load appraisals', 'Error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const filteredAppraisals = useMemo(() => {
        return appraisals.filter(appraisal => {
            // Type Filter
            if (typeFilter !== 'All' && appraisal.type !== typeFilter) {
                return false;
            }

            // Time Filter
            if (timeFilter !== 'All') {
                const appraisalDate = new Date(appraisal.createdAt);
                const now = new Date();

                if (timeFilter === '30') {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(now.getDate() - 30);
                    if (appraisalDate < thirtyDaysAgo) return false;
                } else if (timeFilter === '180') {
                    const sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(now.getMonth() - 6);
                    if (appraisalDate < sixMonthsAgo) return false;
                } else if (timeFilter === 'year') {
                    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
                    if (appraisalDate < firstDayOfYear) return false;
                }
            }

            return true;
        });
    }, [appraisals, typeFilter, timeFilter]);

    const searchHospitals = async (query: string) => {
        try {
            setIsSearchingHospitals(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;
            const res = await apiService.get<{ success: boolean, data: Hospital[] }>(`${API_ENDPOINTS.HOSPITALS.LIST}?search=${encodeURIComponent(query)}`, token);
            if (res?.success && res.data) {
                setHospitalResults(res.data);
                setShowHospitalDropdown(true);
                // Cache hospital results for faster future access
                try {
                    const cached = await AsyncStorage.getItem('cached_hospitals');
                    const existing = cached ? JSON.parse(cached) : [];
                    const merged = [...res.data, ...existing.filter((h: Hospital) => !res.data.some((r: Hospital) => r.id === h.id))];
                    await AsyncStorage.setItem('cached_hospitals', JSON.stringify(merged.slice(0, 100)));
                } catch (e) { /* ignore cache errors */ }
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

    // Calendar logic helpers
    const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

    const formatYMD = (year: number, month: number, day: number) => {
        const m = String(month + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${year}-${m}-${d}`;
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        if (direction === 'prev') {
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

    const handleDateSelect = (day: number) => {
        const iso = formatYMD(selectedYear, selectedMonth, day);
        setNewAppraisal({ ...newAppraisal, date: iso });
        setShowDatePicker(false);
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
        const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
        const nodes: any[] = [];
        for (let i = 0; i < firstDay; i++) nodes.push(<View key={`empty-${i}`} className="w-10 h-10" />);
        for (let day = 1; day <= daysInMonth; day++) {
            const isSelected = newAppraisal.date === formatYMD(selectedYear, selectedMonth, day);
            nodes.push(
                <Pressable
                    key={day}
                    onPress={() => handleDateSelect(day)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-[#E11D48]' : isDark ? 'bg-slate-700/50' : 'bg-transparent'}`}
                >
                    <Text className={`text-sm font-medium ${isSelected ? 'text-white' : isDark ? 'text-white' : 'text-gray-900'}`}>{day}</Text>
                </Pressable>
            );
        }
        return nodes;
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
        if (isSubmittingRef.current) return;
        if (!newAppraisal.date) return showToast.error('Please select a date', 'Validation Error');
        if (!newAppraisal.discussionWith) return showToast.error('Please select discussion partner', 'Validation Error');

        try {
            isSubmittingRef.current = true;
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
                        { title: 'Appraisal Evidence', category: 'Appraisal' }
                    );
                    if (uploadRes?.data?.id) documentIds.push(uploadRes.data.id);
                } catch (e) {
                    console.error("Upload failed", e);
                }
            }

            // Prepare payload with proper types
            const payload: any = {
                appraisal_type: newAppraisal.type,
                appraisal_date: newAppraisal.date, // Should be YYYY-MM-DD format
                discussion_with: newAppraisal.discussionWith,
                notes: newAppraisal.notes || undefined,
            };

            // Ensure hospital_id is an integer if present
            if (selectedHospital?.id) {
                payload.hospital_id = typeof selectedHospital.id === 'string'
                    ? parseInt(selectedHospital.id, 10)
                    : selectedHospital.id;
            }

            // Add document IDs if any
            if (documentIds.length > 0) {
                payload.document_ids = documentIds;
            }

            console.log('Creating appraisal with payload:', JSON.stringify(payload));

            const response: any = await apiService.post(API_ENDPOINTS.APPRAISALS.CREATE, payload, token);

            showToast.success('Appraisal record added', 'Success');
            resetForm();

            // Immediate local update if the response has the data, otherwise full reload
            if (response?.data) {
                const newA = response.data;
                const mappedNew: Appraisal = {
                    id: String(newA.id),
                    date: formatDate(newA.appraisalDate),
                    notes: newA.notes || 'No notes provided',
                    type: (newA as any).appraisalType || payload.appraisal_type || 'Annual Appraisal',
                    discussionWith: newA.discussionWith,
                    hasDocuments: newA.documentIds && newA.documentIds.length > 0,
                    createdAt: newA.createdAt,
                    rawDate: newA.appraisalDate,
                };
                setAppraisals(prev => {
                    const updated = [mappedNew, ...prev];
                    return updated.sort((a, b) => {
                        const dateDiff = new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime();
                        if (dateDiff !== 0) return dateDiff;
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    });
                });
            } else {
                await loadAppraisals();
            }
        } catch (error: any) {
            console.error('Error creating appraisal:', error);
            showToast.error(error.message || 'Failed to create appraisal', 'Error');
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setShowAddModal(false);
        setNewAppraisal({ type: 'Annual Appraisal', date: new Date().toISOString().split('T')[0], notes: '', discussionWith: '' });
        setHospitalQuery('');
        setSelectedHospital(null);
        setFileUri(null);
        setAttachment(null);
        setShowHospitalDropdown(false);
        setShowDiscussionDropdown(false);
        setShowTypeDropdown(false);
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

            {/* Filters Section */}
            <View className="py-2">
                {/* Appraisal Type Filters */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                    className="mb-2"
                >
                    <Pressable
                        onPress={() => setTypeFilter('All')}
                        className={`px-4 py-2 rounded-full border ${typeFilter === 'All' ? 'bg-[#E11D48] border-[#E11D48]' : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
                    >
                        <Text className={`text-xs font-bold ${typeFilter === 'All' ? 'text-white' : isDark ? 'text-gray-400' : 'text-gray-600'}`}>All Types</Text>
                    </Pressable>
                    {APPRAISAL_TYPES.map(type => (
                        <Pressable
                            key={type}
                            onPress={() => setTypeFilter(type)}
                            className={`px-4 py-2 rounded-full border ${typeFilter === type ? 'bg-[#E11D48] border-[#E11D48]' : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
                        >
                            <Text className={`text-xs font-bold ${typeFilter === type ? 'text-white' : isDark ? 'text-gray-400' : 'text-gray-600'}`}>{type}</Text>
                        </Pressable>
                    ))}
                </ScrollView>

                {/* Time Filters */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                >
                    {TIME_FILTERS.map(filter => (
                        <Pressable
                            key={filter.value}
                            onPress={() => setTimeFilter(filter.value)}
                            className={`px-4 py-2 rounded-full border ${timeFilter === filter.value ? 'bg-[#2B5E9C] border-[#2B5E9C]' : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
                        >
                            <Text className={`text-xs font-bold ${timeFilter === filter.value ? 'text-white' : isDark ? 'text-gray-400' : 'text-gray-600'}`}>{filter.label}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            {loading && !refreshing ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
                </View>
            ) : (
                <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAppraisals(); }} />}>
                    {filteredAppraisals.length > 0 ? (
                        <View style={{ gap: 16 }}>
                            {filteredAppraisals.map((appraisal) => (
                                <View key={appraisal.id} className={`rounded-xl shadow-sm border p-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"}`}>
                                    <View className="flex-row justify-between items-start mb-2">
                                        <View className="flex-row items-center gap-2">
                                            <MaterialIcons name="verified" size={20} color={appraisal.type === 'Other' ? '#2B5E9C' : '#E11D48'} />
                                            <Text className={`font-bold text-base ${isDark ? "text-white" : "text-[#121417]"}`}>
                                                {appraisal.type || 'Annual Appraisal'}
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
                    ) : appraisals.length > 0 ? (
                        // Case where we have appraisals but they are filtered out
                        <View className={`p-8 rounded-3xl border items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}>
                            <View className="w-20 h-20 rounded-full bg-rose-50 items-center justify-center mb-4">
                                <MaterialIcons name="filter-list" size={48} color="#E11D48" />
                            </View>
                            <Text className={`text-xl text-center font-bold mb-2 ${isDark ? "text-white" : "text-slate-800"}`}>No matches found</Text>
                            <Text className={`text-center text-sm mb-6 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                                Try adjusting your filters to find what you're looking for.
                            </Text>
                            <Pressable
                                onPress={() => { setTypeFilter('All'); setTimeFilter('All'); }}
                                className="bg-[#E11D48] px-8 py-3 rounded-2xl shadow-md active:opacity-90"
                            >
                                <Text className="text-white font-bold">Clear Filters</Text>
                            </Pressable>
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

                            {/* Type Dropdown */}
                            <View>
                                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Appraisal Type</Text>
                                <Pressable onPress={() => setShowTypeDropdown(!showTypeDropdown)} className={`flex-row justify-between items-center p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"}`}>
                                    <Text className={isDark ? "text-white" : "text-slate-800"}>{newAppraisal.type}</Text>
                                    <MaterialIcons name="arrow-drop-down" size={24} color={isDark ? "#ccc" : "#666"} />
                                </Pressable>
                                {showTypeDropdown && (
                                    <View className={`mt-1 rounded-xl border overflow-hidden ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"}`}>
                                        {APPRAISAL_TYPES.map(type => (
                                            <Pressable key={type} onPress={() => { setNewAppraisal({ ...newAppraisal, type }); setShowTypeDropdown(false); }} className={`p-3 border-b ${isDark ? "border-slate-600 active:bg-slate-600" : "border-gray-100 active:bg-gray-50"}`}>
                                                <Text className={isDark ? "text-white" : "text-slate-800"}>{type}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>

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

                            {/* Where - Hospital Selection (Optional) */}
                            <View className="z-20">
                                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Where (Hospital/Location) - Optional</Text>
                                <Pressable
                                    onPress={() => setShowHospitalDropdown(!showHospitalDropdown)}
                                    className={`flex-row justify-between items-center p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"}`}
                                >
                                    <Text className={selectedHospital ? (isDark ? "text-white" : "text-slate-800") : (isDark ? "text-gray-400" : "text-gray-500")}>
                                        {selectedHospital ? selectedHospital.name : "Select hospital (optional)..."}
                                    </Text>
                                    <View className="flex-row items-center gap-2">
                                        {selectedHospital && (
                                            <Pressable onPress={() => { setSelectedHospital(null); setHospitalQuery(''); }}>
                                                <MaterialIcons name="close" size={20} color="#EF4444" />
                                            </Pressable>
                                        )}
                                        <MaterialIcons name="arrow-drop-down" size={24} color={isDark ? "#ccc" : "#666"} />
                                    </View>
                                </Pressable>

                                {showHospitalDropdown && (
                                    <View className={`mt-2 rounded-xl border overflow-hidden ${isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-gray-200"}`}>
                                        {/* Search Input */}
                                        <View className={`flex-row items-center border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                                            <MaterialIcons name="search" size={20} color={isDark ? "#9ca3af" : "#9ca3af"} style={{ marginLeft: 12 }} />
                                            <TextInput
                                                value={hospitalQuery}
                                                onChangeText={(t) => { setHospitalQuery(t); }}
                                                className={`flex-1 p-3 ${isDark ? "text-white" : "text-slate-800"}`}
                                                placeholder="Search hospitals..."
                                                placeholderTextColor={isDark ? "#9ca3af" : "#9ca3af"}
                                            />
                                            {isSearchingHospitals && <ActivityIndicator size="small" color="#2B5E9C" className="mr-3" />}
                                        </View>

                                        {/* Hospital List */}
                                        <View style={{ height: 200 }}>
                                            <ScrollView
                                                nestedScrollEnabled={true}
                                                keyboardShouldPersistTaps="handled"
                                                contentContainerStyle={{ flexGrow: 1 }}
                                            >
                                                {hospitalResults
                                                    .filter(h => !hospitalQuery || h.name.toLowerCase().includes(hospitalQuery.toLowerCase()))
                                                    .slice(0, 100)
                                                    .map((item) => (
                                                        <Pressable
                                                            key={item.id}
                                                            onPress={() => { setSelectedHospital(item); setHospitalQuery(''); setShowHospitalDropdown(false); }}
                                                            className={`p-3 border-b ${isDark ? "border-slate-700 active:bg-slate-700" : "border-gray-100 active:bg-gray-100"}`}
                                                        >
                                                            <Text className={`font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>{item.name}</Text>
                                                            <Text className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{item.town}, {item.postcode}</Text>
                                                        </Pressable>
                                                    ))}
                                                {hospitalResults.length === 0 && (
                                                    <Text className={`p-3 text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>No hospitals found</Text>
                                                )}
                                            </ScrollView>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Date */}
                            <View className="z-10">
                                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Date</Text>
                                <Pressable
                                    onPress={() => {
                                        if (newAppraisal.date) {
                                            const parts = newAppraisal.date.split('-').map(Number);
                                            if (parts.length === 3) {
                                                const y = parts[0];
                                                const m = parts[1];
                                                if (y !== undefined && m !== undefined && !isNaN(y) && !isNaN(m)) {
                                                    setSelectedYear(y);
                                                    setSelectedMonth(m - 1);
                                                }
                                            }
                                        } else {
                                            const now = new Date();
                                            setSelectedYear(now.getFullYear());
                                            setSelectedMonth(now.getMonth());
                                        }
                                        setShowDatePicker(true);
                                    }}
                                    className={`flex-row justify-between items-center p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"}`}
                                >
                                    <Text className={isDark ? "text-white" : "text-slate-800"}>
                                        {newAppraisal.date ? formatDate(newAppraisal.date) : "Select date..."}
                                    </Text>
                                    <MaterialIcons name="calendar-today" size={20} color={isDark ? "#ccc" : "#666"} />
                                </Pressable>
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
            </Modal >

            {/* Date Picker Modal */}
            <Modal
                visible={showDatePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDatePicker(false)}
            >
                <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setShowDatePicker(false)}>
                    <Pressable onPress={(e) => e.stopPropagation()} className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-3xl p-6`}>
                        <View className="flex-row items-center justify-between mb-4">
                            <Pressable onPress={() => navigateMonth('prev')} className="p-2 rounded-full">
                                <MaterialIcons name="chevron-left" size={24} color={isDark ? '#D1D5DB' : '#4B5563'} />
                            </Pressable>
                            <View className="flex-row items-center gap-2">
                                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{monthNames[selectedMonth]}</Text>
                                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedYear}</Text>
                            </View>
                            <Pressable onPress={() => navigateMonth('next')} className="p-2 rounded-full">
                                <MaterialIcons name="chevron-right" size={24} color={isDark ? '#D1D5DB' : '#4B5563'} />
                            </Pressable>
                        </View>

                        <View className="flex-row justify-between mb-3">
                            {dayNames.map((day) => (
                                <View key={day} className="w-10 items-center">
                                    <Text className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{day}</Text>
                                </View>
                            ))}
                        </View>

                        <View className="flex-row flex-wrap justify-between mb-6">{renderCalendar()}</View>

                        <View className="flex-row gap-3">
                            <Pressable onPress={() => setShowDatePicker(false)} className={`flex-1 py-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                                <Text className={`text-center font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Cancel</Text>
                            </Pressable>
                        </View>
                        <View style={{ height: Platform.OS === 'ios' ? 20 : 0 }} />
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView >
    );
}
