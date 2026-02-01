import { View, Text, ScrollView, Pressable, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import { Hospital } from '../appraisal.types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { usePremium } from '@/hooks/usePremium';

interface AddAppraisalModalProps {
    visible: boolean;
    onClose: () => void;
    isDark: boolean;
    onSuccess: () => void;
    hospitals: Hospital[];
    onLoadHospitals: () => void;
    onSearchHospitals: (query: string) => void;
    setHospitals: (hospitals: Hospital[]) => void;
}

export const AddAppraisalModal = ({
    visible,
    onClose,
    isDark,
    onSuccess,
    hospitals,
    onLoadHospitals,
    onSearchHospitals,
    setHospitals,
}: AddAppraisalModalProps) => {
    const [isUploading, setIsUploading] = useState(false);
    const [fileUri, setFileUri] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showHospitalPicker, setShowHospitalPicker] = useState(false);
    const [hospitalSearch, setHospitalSearch] = useState('');
    const { isPremium } = usePremium();
    const accentColor = isPremium ? '#D4AF37' : '#2B5E9C';

    const [form, setForm] = useState({
        hospital_id: null as number | null,
        hospital_name: '',
        appraisal_date: new Date(),
        appraisal_type: 'Annual Appraisal',
        discussion_with: 'line manager',
        notes: '',
        file: null as { name: string; size: string; type: string } | null,
    });

    useEffect(() => {
        if (visible) {
            onLoadHospitals();
        }
    }, [visible, onLoadHospitals]);

    const appraisalTypes = [
        'Annual Appraisal',
        'Mid-year review',
        'Probationary review',
        'Other'
    ];

    const discussionWithOptions = [
        'a trusted colleague',
        'line manager',
        'another health + social professionals',
        'group of peers',
        'a mentor/ coach',
        'other'
    ];

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!form.hospital_id) errors.hospital = 'Please select a hospital';
        if (!form.appraisal_date) errors.date = 'Please select a date';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleFileSelect = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                setFileUri(asset.uri);
                setForm({
                    ...form,
                    file: {
                        name: asset.name,
                        size: `${((asset.size || 0) / (1024 * 1024)).toFixed(2)} MB`,
                        type: asset.mimeType || 'application/pdf',
                    },
                });
            }
        } catch (e) {
            console.warn('File select error', e);
        }
    };

    const handleAddAppraisal = async () => {
        if (!validateForm()) return;

        try {
            setIsUploading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;

            const payload: any = {
                hospital_id: form.hospital_id,
                appraisal_date: format(form.appraisal_date, 'yyyy-MM-dd'),
                appraisal_type: form.appraisal_type,
                discussion_with: form.discussion_with,
                notes: form.notes || '',
            };

            if (fileUri && form.file) {
                await apiService.uploadFile(
                    API_ENDPOINTS.APPRAISALS.UPLOAD,
                    { uri: fileUri, type: form.file.type, name: form.file.name },
                    token,
                    payload
                );
            } else {
                await apiService.post(API_ENDPOINTS.APPRAISALS.CREATE, payload, token);
            }

            showToast.success('Appraisal logged successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            showToast.error(error.message || 'Failed to log appraisal');
        } finally {
            setIsUploading(false);
        }
    };

    const handleHospitalSelect = (h: Hospital) => {
        setForm({ ...form, hospital_id: h.id as number, hospital_name: h.name });
        setHospitalSearch('');
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View className="flex-1 bg-black/50 justify-end">
                <View className={`rounded-t-3xl max-h-[95%] flex-1 ${isDark ? "bg-slate-800" : "bg-white"}`}>
                    <SafeAreaView edges={['bottom']} className="flex-1">
                        <View className={`flex-row items-center justify-between px-6 pt-4 pb-4 border-b ${isDark ? "border-slate-700" : "border-slate-100"}`}>
                            <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Log Appraisal</Text>
                            <Pressable onPress={onClose}>
                                <MaterialIcons name="close" size={24} color={isDark ? "#9CA3AF" : "#64748B"} />
                            </Pressable>
                        </View>

                        <ScrollView
                            className="flex-1"
                            contentContainerStyle={{ paddingBottom: 20 }}
                            showsVerticalScrollIndicator={false}
                        >
                            <View className="px-6 pt-6" style={{ gap: 20 }}>
                                {/* Hospital Selection Field */}
                                <View>
                                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Hospital *</Text>
                                    <Pressable
                                        onPress={() => {
                                            setShowHospitalPicker(true);
                                            onLoadHospitals();
                                        }}
                                        className={`border rounded-2xl px-4 py-4 flex-row items-center justify-between ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-slate-200"}`}
                                    >
                                        <Text className={`text-base flex-1 ${form.hospital_id ? (isDark ? "text-white" : "text-slate-800") : (isDark ? "text-gray-400" : "text-slate-400")}`} numberOfLines={1}>
                                            {form.hospital_name || "Select Hospital"}
                                        </Text>
                                        <MaterialIcons name="keyboard-arrow-right" size={24} color={isDark ? "#9CA3AF" : "#64748B"} />
                                    </Pressable>
                                    {formErrors.hospital && <Text className="text-red-500 text-xs mt-1 font-medium">{formErrors.hospital}</Text>}
                                </View>

                                {/* Hospital Picker Modal */}
                                <Modal visible={showHospitalPicker} animationType="slide">
                                    <View className={`flex-1 ${isDark ? "bg-slate-900" : "bg-white"}`}>
                                        <SafeAreaView className="flex-1">
                                            <View className={`px-6 py-4 border-b flex-row items-center justify-between ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                                                <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Select Hospital</Text>
                                                <Pressable onPress={() => { setShowHospitalPicker(false); setHospitalSearch(''); }}>
                                                    <MaterialIcons name="close" size={24} color={isDark ? "white" : "black"} />
                                                </Pressable>
                                            </View>

                                            <View className="px-6 py-4">
                                                <View className={`flex-row items-center px-4 py-2 rounded-2xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                                                    <MaterialIcons name="search" size={20} color="gray" className="mr-2" />
                                                    <TextInput
                                                        value={hospitalSearch}
                                                        onChangeText={(text) => {
                                                            setHospitalSearch(text);
                                                            onSearchHospitals(text);
                                                        }}
                                                        placeholder="Search by name, town or postcode..."
                                                        placeholderTextColor="gray"
                                                        className={`flex-1 py-2 ${isDark ? "text-white" : "text-slate-800"}`}
                                                    />
                                                </View>
                                            </View>

                                            <ScrollView className="flex-1 px-6">
                                                {hospitals.map((h) => (
                                                    <Pressable
                                                        key={h.id}
                                                        onPress={() => {
                                                            handleHospitalSelect(h);
                                                            setShowHospitalPicker(false);
                                                            setHospitalSearch('');
                                                        }}
                                                        className={`py-5 border-b ${isDark ? "border-slate-800" : "border-slate-100"}`}
                                                    >
                                                        <Text className={`text-lg font-medium ${isDark ? "text-white" : "text-slate-800"}`}>{h.name}</Text>
                                                        {(h as any).town || (h as any).postcode ? (
                                                            <Text className="text-sm text-slate-500 mt-1">
                                                                {(h as any).town}
                                                                {(h as any).town && (h as any).postcode ? ', ' : ''}
                                                                {(h as any).postcode}
                                                            </Text>
                                                        ) : null}
                                                    </Pressable>
                                                ))}
                                                {hospitals.length === 0 && (
                                                    <View className="py-20 items-center">
                                                        <MaterialIcons name="location-off" size={48} color="gray" />
                                                        <Text className="text-gray-500 mt-4">No hospitals found</Text>
                                                    </View>
                                                )}
                                                <View className="h-20" />
                                            </ScrollView>
                                        </SafeAreaView>
                                    </View>
                                </Modal>

                                {/* Appraisal Type Dropdown */}
                                <View>
                                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Appraisal Type *</Text>
                                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                                        {appraisalTypes.map((type) => (
                                            <Pressable
                                                key={type}
                                                onPress={() => setForm({ ...form, appraisal_type: type })}
                                                className={`px-4 py-2 rounded-full border ${form.appraisal_type === type
                                                    ? ''
                                                    : (isDark ? "bg-slate-700 border-slate-600" : "bg-white border-slate-200")
                                                    }`}
                                                style={form.appraisal_type === type ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
                                            >
                                                <Text className={`text-sm ${form.appraisal_type === type ? "text-white font-semibold" : (isDark ? "text-gray-400" : "text-slate-600")}`}>
                                                    {type}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>

                                {/* Discussion With Dropdown */}
                                <View>
                                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Discussion With *</Text>
                                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                                        {discussionWithOptions.map((option) => (
                                            <Pressable
                                                key={option}
                                                onPress={() => setForm({ ...form, discussion_with: option })}
                                                className={`px-4 py-2 rounded-full border ${form.discussion_with === option
                                                    ? ''
                                                    : (isDark ? "bg-slate-700 border-slate-600" : "bg-white border-slate-200")
                                                    }`}
                                                style={form.discussion_with === option ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
                                            >
                                                <Text className={`text-sm ${form.discussion_with === option ? "text-white font-semibold" : (isDark ? "text-gray-400" : "text-slate-600")}`}>
                                                    {option}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>

                                {/* Date Picker */}
                                <View>
                                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Date of Appraisal *</Text>
                                    <Pressable
                                        onPress={() => setShowDatePicker(true)}
                                        className={`border rounded-2xl px-4 py-4 flex-row items-center justify-between ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-slate-200"}`}
                                    >
                                        <Text className={`text-base ${isDark ? "text-white" : "text-slate-800"}`}>{format(form.appraisal_date, 'MMMM d, yyyy')}</Text>
                                        <MaterialIcons name="calendar-today" size={20} color={isDark ? "#9CA3AF" : "#64748B"} />
                                    </Pressable>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={form.appraisal_date}
                                            mode="date"
                                            display="default"
                                            onChange={(_event, selectedDate) => {
                                                setShowDatePicker(false);
                                                if (selectedDate) setForm({ ...form, appraisal_date: selectedDate });
                                            }}
                                        />
                                    )}
                                    {formErrors.date && <Text className="text-red-500 text-xs mt-1">{formErrors.date}</Text>}
                                </View>

                                {/* Notes */}
                                <View>
                                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Comments / Notes</Text>
                                    <TextInput
                                        value={form.notes}
                                        onChangeText={(text) => setForm({ ...form, notes: text })}
                                        placeholder="Add any notes about this appraisal..."
                                        placeholderTextColor={isDark ? "#6B7280" : "#94A3B8"}
                                        multiline
                                        numberOfLines={4}
                                        className={`border rounded-2xl px-4 py-4 text-base min-h-[120px] ${isDark ? "bg-slate-700 text-white border-slate-600" : "bg-white text-slate-800 border-slate-200"}`}
                                        textAlignVertical="top"
                                    />
                                </View>

                                {/* File Upload */}
                                <View>
                                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Appraisal Document (Optional)</Text>
                                    <Pressable
                                        onPress={handleFileSelect}
                                        className={`border-2 border-dashed rounded-2xl p-6 items-center ${isDark ? "bg-slate-700 border-slate-600" : "bg-slate-50 border-slate-300"}`}
                                    >
                                        {form.file ? (
                                            <View className="items-center">
                                                <MaterialIcons name="picture-as-pdf" size={32} color="#EF4444" />
                                                <Text className={`font-semibold text-sm mt-3 ${isDark ? "text-white" : "text-slate-800"}`} numberOfLines={1}>{form.file.name}</Text>
                                                <Pressable onPress={() => { setFileUri(null); setForm({ ...form, file: null }); }} className="mt-2"><Text className="text-red-600 text-xs">Remove</Text></Pressable>
                                            </View>
                                        ) : (
                                            <View className="items-center">
                                                <MaterialIcons name="cloud-upload" size={32} color={isDark ? "#9CA3AF" : "#64748B"} />
                                                <Text className={`font-semibold text-sm mt-2 ${isDark ? "text-gray-300" : "text-slate-600"}`}>Upload PDF document</Text>
                                            </View>
                                        )}
                                    </Pressable>
                                </View>

                                <Pressable
                                    onPress={handleAddAppraisal}
                                    disabled={isUploading}
                                    className={`rounded-2xl p-4 items-center shadow-sm mt-4 ${isUploading ? "bg-gray-400" : ""}`}
                                    style={!isUploading ? { backgroundColor: accentColor } : undefined}
                                >
                                    {isUploading ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Save Appraisal</Text>}
                                </Pressable>
                            </View>
                        </ScrollView>
                    </SafeAreaView>
                </View>
            </View>
        </Modal>
    );
};
