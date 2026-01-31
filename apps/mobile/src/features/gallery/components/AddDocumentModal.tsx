import { View, Text, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import { Category } from '../gallery.types';

interface AddDocumentModalProps {
    visible: boolean;
    onClose: () => void;
    categories: Category[];
    isDark: boolean;
    onSuccess: () => void;
}

export const AddDocumentModal = ({ visible, onClose, categories, isDark, onSuccess }: AddDocumentModalProps) => {
    const [isUploading, setIsUploading] = useState(false);
    const [fileUri, setFileUri] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [documentForm, setDocumentForm] = useState({
        title: '',
        description: '',
        category: '',
        file: null as { name: string; size: string; type: string } | null,
    });

    const validateDocumentForm = () => {
        const errors: Record<string, string> = {};
        if (!documentForm.title.trim()) errors.title = 'Document title is required';
        if (!documentForm.category) errors.category = 'Please select a category';
        if (!documentForm.file) errors.file = 'Please upload a file';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleFileSelect = async (source: 'gallery' | 'camera' | 'files') => {
        try {
            let result;
            if (source === 'gallery') {
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!permissionResult.granted) return showToast.error('Gallery permission required');
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.All,
                    allowsEditing: false,
                    quality: 1,
                });
                if (!result.canceled && result.assets[0]) {
                    const asset = result.assets[0];
                    setFileUri(asset.uri);
                    setDocumentForm({
                        ...documentForm,
                        file: {
                            name: asset.fileName || `image_${Date.now()}.jpg`,
                            size: `${((asset.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB`,
                            type: asset.mimeType || 'image/jpeg',
                        }
                    });
                }
            } else if (source === 'camera') {
                const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                if (!permissionResult.granted) return showToast.error('Camera permission required');
                result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 1 });
                if (!result.canceled && result.assets[0]) {
                    const asset = result.assets[0];
                    setFileUri(asset.uri);
                    setDocumentForm({
                        ...documentForm,
                        file: {
                            name: asset.fileName || `photo_${Date.now()}.jpg`,
                            size: `${((asset.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB`,
                            type: asset.mimeType || 'image/jpeg',
                        }
                    });
                }
            } else {
                result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
                if (!result.canceled && result.assets[0]) {
                    const asset = result.assets[0];
                    setFileUri(asset.uri);
                    setDocumentForm({
                        ...documentForm,
                        file: {
                            name: asset.name,
                            size: `${((asset.size || 0) / (1024 * 1024)).toFixed(2)} MB`,
                            type: asset.mimeType || 'application/octet-stream',
                        }
                    });
                }
            }
        } catch (e) {
            console.warn('File select error', e);
        }
    };

    const handleUploadClick = () => {
        Alert.alert("Select File Source", "Choose where to pick your document from", [
            { text: "Camera", onPress: () => handleFileSelect('camera') },
            { text: "Gallery", onPress: () => handleFileSelect('gallery') },
            { text: "Files", onPress: () => handleFileSelect('files') },
            { text: "Cancel", style: "cancel" }
        ]);
    };

    const handleUploadDocument = async () => {
        if (!validateDocumentForm() || !documentForm.file || !fileUri) return;

        try {
            setIsUploading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;

            await apiService.uploadFile(
                API_ENDPOINTS.DOCUMENTS.UPLOAD,
                { uri: fileUri, type: documentForm.file.type, name: documentForm.file.name },
                token,
                { title: documentForm.title, description: documentForm.description || '', category: documentForm.category || '' }
            );

            showToast.success('Document uploaded successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            showToast.error(error.message || 'Failed to upload document');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View className="flex-1 bg-black/50 justify-end">
                <View className={`rounded-t-3xl max-h-[90%] flex-1 ${isDark ? "bg-slate-800" : "bg-white"}`}>
                    <SafeAreaView edges={['bottom']} className="flex-1">
                        <View className={`flex-row items-center justify-between px-6 pt-4 pb-4 border-b ${isDark ? "border-slate-700" : "border-slate-100"}`}>
                            <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Add Document</Text>
                            <Pressable onPress={onClose}>
                                <MaterialIcons name="close" size={24} color={isDark ? "#9CA3AF" : "#64748B"} />
                            </Pressable>
                        </View>

                        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                            <View className="px-6 pt-6" style={{ gap: 20 }}>
                                {/* Title */}
                                <View>
                                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Document Title *</Text>
                                    <TextInput
                                        value={documentForm.title}
                                        onChangeText={(text) => setDocumentForm({ ...documentForm, title: text })}
                                        placeholder="Enter document title"
                                        placeholderTextColor={isDark ? "#6B7280" : "#94A3B8"}
                                        className={`border rounded-2xl px-4 py-4 text-base ${isDark ? "bg-slate-700 text-white border-slate-600" : "bg-white text-slate-800 border-slate-200"}`}
                                    />
                                    {formErrors.title && <Text className="text-red-500 text-xs mt-1">{formErrors.title}</Text>}
                                </View>

                                {/* Categories */}
                                <View>
                                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Category *</Text>
                                    <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                                        {categories.map((cat) => (
                                            <Pressable
                                                key={cat.id}
                                                onPress={() => setDocumentForm({ ...documentForm, category: cat.title })}
                                                className="px-4 py-3 rounded-2xl border-2 flex-row items-center"
                                                style={{
                                                    borderColor: documentForm.category === cat.title ? cat.iconColor : (isDark ? '#475569' : '#E2E8F0'),
                                                    backgroundColor: documentForm.category === cat.title ? `${cat.iconColor}15` : (isDark ? '#1E293B' : '#FFFFFF'),
                                                }}
                                            >
                                                <MaterialIcons name={cat.icon} size={18} color={cat.iconColor} style={{ marginRight: 8 }} />
                                                <Text className={`text-sm font-medium ${documentForm.category === cat.title ? (isDark ? 'text-white' : 'text-slate-800') : (isDark ? 'text-gray-300' : 'text-slate-600')}`}>{cat.title}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>

                                {/* File Upload Area */}
                                <Pressable
                                    onPress={handleUploadClick}
                                    className={`border-2 border-dashed rounded-2xl p-6 items-center ${isDark ? "bg-slate-700 border-slate-600" : "bg-slate-50 border-slate-300"}`}
                                >
                                    {documentForm.file ? (
                                        <View className="items-center">
                                            <MaterialIcons name="description" size={32} color="#2563EB" />
                                            <Text className={`font-semibold text-sm mt-3 ${isDark ? "text-white" : "text-slate-800"}`} numberOfLines={1}>{documentForm.file.name}</Text>
                                            <Pressable onPress={() => { setFileUri(null); setDocumentForm({ ...documentForm, file: null }); }} className="mt-2"><Text className="text-red-600 text-xs">Remove</Text></Pressable>
                                        </View>
                                    ) : (
                                        <View className="items-center">
                                            <MaterialIcons name="cloud-upload" size={32} color={isDark ? "#9CA3AF" : "#64748B"} />
                                            <Text className={`font-semibold text-sm mt-2 ${isDark ? "text-gray-300" : "text-slate-600"}`}>Tap to upload</Text>
                                        </View>
                                    )}
                                </Pressable>

                                <Pressable
                                    onPress={handleUploadDocument}
                                    disabled={isUploading}
                                    className={`rounded-2xl p-4 items-center shadow-sm mt-4 ${isUploading ? "bg-gray-400" : "bg-[#2B5E9C]"}`}
                                >
                                    {isUploading ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Upload Document</Text>}
                                </Pressable>
                            </View>
                        </ScrollView>
                    </SafeAreaView>
                </View>
            </View>
        </Modal>
    );
};
