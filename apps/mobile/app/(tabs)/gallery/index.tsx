import { View, Text, ScrollView, Pressable, TextInput, Modal, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import '../../global.css';

interface Category {
  id: string;
  title: string;
  documentCount: string;
  updated: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBgColor: string;
  iconColor: string;
  dotColor: string;
  route?: string;
}

interface RecentFile {
  id: string;
  name: string;
  category: string;
  size: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBgColor: string;
  iconColor: string;
}

interface Document {
  id: number;
  filename: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

// API response format (snake_case)
interface ApiDocument {
  id: number;
  name: string;
  category?: string;
  size?: string;
  type?: string;
  created_at: string;
  updated_at: string;
}

export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    title: '',
    description: '',
    category: '',
    file: null as { name: string; size: string; type: string } | null,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [fileUri, setFileUri] = useState<string | null>(null); // Store file URI for upload

  // Static category definitions (these are UI categories, not API categories)
  const categoryDefinitions: Array<Omit<Category, 'documentCount' | 'updated'>> = [
    {
      id: '1',
      title: 'Working Hours',
      icon: 'schedule',
      iconBgColor: 'bg-blue-100',
      iconColor: '#2563EB',
      dotColor: '#3B82F6',
      route: '/(tabs)/workinghours',
    },
    {
      id: '2',
      title: 'CPD Hours',
      icon: 'school',
      iconBgColor: 'bg-amber-100',
      iconColor: '#F59E0B',
      dotColor: '#F59E0B',
      route: '/(tabs)/cpdhourstracking',
    },
    {
      id: '3',
      title: 'Feedback Log',
      icon: 'forum',
      iconBgColor: 'bg-emerald-100',
      iconColor: '#10B981',
      dotColor: '#10B981',
      route: '/(tabs)/feedback',
    },
    {
      id: '4',
      title: 'Reflective Accounts',
      icon: 'edit-note',
      iconBgColor: 'bg-purple-100',
      iconColor: '#9333EA',
      dotColor: '#9333EA',
      route: '/(tabs)/reflections',
    },
    {
      id: '5',
      title: 'Appraisal',
      icon: 'verified',
      iconBgColor: 'bg-rose-100',
      iconColor: '#E11D48',
      dotColor: '#E11D48',
    },
    {
      id: '6',
      title: 'General Gallery',
      icon: 'folder',
      iconBgColor: 'bg-slate-100',
      iconColor: '#64748B',
      dotColor: '#94A3B8',
    },
  ];

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      const response = await apiService.get<{
        success: boolean;
        data: ApiDocument[];
      }>(API_ENDPOINTS.DOCUMENTS.LIST, token);

      if (response.success && response.data) {
        // Map API response (snake_case) to frontend format (camelCase)
        const mappedDocuments: Document[] = response.data.map((apiDoc) => {
          // Parse size string (e.g., "123.4 KB" or "1.2 MB") to bytes
          let fileSize = 0;
          if (apiDoc.size) {
            const sizeMatch = apiDoc.size.match(/([\d.]+)\s*(KB|MB|GB)/i);
            if (sizeMatch && sizeMatch[1] && sizeMatch[2]) {
              const value = parseFloat(sizeMatch[1]);
              const unit = sizeMatch[2].toUpperCase();
              if (unit === 'KB') fileSize = value * 1024;
              else if (unit === 'MB') fileSize = value * 1024 * 1024;
              else if (unit === 'GB') fileSize = value * 1024 * 1024 * 1024;
            }
          }
          
          // Determine mime type from file type or name
          let mimeType = 'application/octet-stream';
          if (apiDoc.type === 'text') mimeType = 'text/plain';
          else if (apiDoc.type === 'file') mimeType = 'application/pdf';
          else if (apiDoc.name) {
            const ext = apiDoc.name.split('.').pop()?.toLowerCase();
            if (ext === 'pdf') mimeType = 'application/pdf';
            else if (ext && ['jpg', 'jpeg', 'png', 'gif'].includes(ext)) mimeType = `image/${ext}`;
          }
          
          return {
            id: apiDoc.id,
            filename: apiDoc.name,
            originalFilename: apiDoc.name,
            fileSize: fileSize || 1024, // Default to 1KB if size not available
            mimeType: mimeType,
            category: apiDoc.category,
            createdAt: apiDoc.created_at,
            updatedAt: apiDoc.updated_at,
          };
        });
        
        // Update categories with document counts
        const normalize = (v?: string | number | null) => {
          if (v === null || v === undefined) return '';
          return String(v).toLowerCase().replace(/[^a-z0-9]/g, '');
        };

        // Map API category values to UI category titles
        const categoryMap: Record<string, string> = {
          cpd: 'CPD Hours',
          cpd_hours: 'CPD Hours',
          working: 'Working Hours',
          work: 'Working Hours',
          feedback: 'Feedback Log',
          feedback_log: 'Feedback Log',
          reflection: 'Reflective Accounts',
          reflections: 'Reflective Accounts',
          appraisal: 'Appraisal',
          gallery: 'General Gallery',
          personal: 'General Gallery',
        };

        const mapToTitle = (docCat?: string | null) => {
          if (!docCat) return '';
          const key = normalize(docCat);
          return categoryMap[key] || docCat;
        };

        const updatedCategories = categoryDefinitions.map(cat => {
          const catKey = normalize(cat.title);
          const categoryDocs = mappedDocuments.filter(doc => {
            const mappedTitle = mapToTitle(doc.category);
            const mappedKey = normalize(mappedTitle);
            return (mappedKey && mappedKey === catKey) || (!doc.category && cat.id === '6');
          });
          const count = categoryDocs.length;
          const latestDoc = categoryDocs.sort((a, b) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];
          
          const updated = latestDoc
            ? getTimeAgo(new Date(latestDoc.updatedAt))
            : 'NO DOCUMENTS';
          
          return {
            ...cat,
            documentCount: `${count} Document${count !== 1 ? 's' : ''}`,
            updated: updated.toUpperCase(),
          };
        });
        setCategories(updatedCategories);

        // Get recent files (last 5)
        const recent = mappedDocuments
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map(doc => {
            const isPdf = doc.mimeType === 'application/pdf';
            const sizeInMB = (doc.fileSize / (1024 * 1024)).toFixed(1);
            return {
              id: String(doc.id),
              name: doc.originalFilename || doc.filename,
              category: doc.category || 'General Gallery',
              size: `${sizeInMB} MB`,
              icon: (isPdf ? 'picture-as-pdf' : 'image') as keyof typeof MaterialIcons.glyphMap,
              iconBgColor: isPdf ? 'bg-red-100' : 'bg-blue-100',
              iconColor: isPdf ? '#DC2626' : '#2563EB',
            };
          });
        setRecentFiles(recent);
      }
    } catch (error: any) {
      console.error('Error loading documents:', error);
      // Don't show error toast if it's a 500/Internal Server Error (API endpoint not implemented yet)
      const errorMessage = error.message || '';
      if (!errorMessage.includes('Internal server error') && !errorMessage.includes('500')) {
        showToast.error(errorMessage || 'Failed to load documents', 'Error');
      }
      // Set default categories if API fails
      setCategories(categoryDefinitions.map(cat => ({
        ...cat,
        documentCount: '0 Documents',
        updated: 'NO DOCUMENTS',
      })));
      setRecentFiles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 60) return `${diffMins}M AGO`;
    if (diffHours < 24) return `${diffHours}H AGO`;
    if (diffDays < 7) return `${diffDays}D AGO`;
    if (diffWeeks < 4) return `${diffWeeks}W AGO`;
    if (diffMonths < 12) return `${diffMonths}MO AGO`;
    return `${Math.floor(diffDays / 365)}Y AGO`;
  };

  const validateDocumentForm = () => {
    const errors: Record<string, string> = {};

    if (!documentForm.title.trim()) {
      errors.title = 'Document title is required';
    }

    if (!documentForm.category) {
      errors.category = 'Please select a category';
    }

    if (!documentForm.file) {
      errors.file = 'Please upload a file';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileSelect = async (source: 'gallery' | 'camera' | 'files') => {
    try {
      let result;
      
      if (source === 'gallery') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          showToast.error('Permission to access gallery is required', 'Permission Denied');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsEditing: false,
          quality: 1,
        });
        
        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          const sizeInMB = asset.fileSize ? (asset.fileSize / (1024 * 1024)).toFixed(2) : '0';
          setFileUri(asset.uri);
          setDocumentForm({ 
            ...documentForm, 
            file: {
              name: asset.fileName || `image_${Date.now()}.jpg`,
              size: `${sizeInMB} MB`,
              type: asset.mimeType || 'image/jpeg',
            }
          });
          if (formErrors.file) {
            setFormErrors({ ...formErrors, file: '' });
          }
        }
      } else if (source === 'camera') {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
          showToast.error('Permission to access camera is required', 'Permission Denied');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 1,
        });
        
        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          const sizeInMB = asset.fileSize ? (asset.fileSize / (1024 * 1024)).toFixed(2) : '0';
          setFileUri(asset.uri);
          setDocumentForm({ 
            ...documentForm, 
            file: {
              name: asset.fileName || `photo_${Date.now()}.jpg`,
              size: `${sizeInMB} MB`,
              type: asset.mimeType || 'image/jpeg',
            }
          });
          if (formErrors.file) {
            setFormErrors({ ...formErrors, file: '' });
          }
        }
      } else if (source === 'files') {
        result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });
        
        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          const sizeInMB = asset.size ? (asset.size / (1024 * 1024)).toFixed(2) : '0';
          setFileUri(asset.uri);
          setDocumentForm({ 
            ...documentForm, 
            file: {
              name: asset.name,
              size: `${sizeInMB} MB`,
              type: asset.mimeType || 'application/octet-stream',
            }
          });
          if (formErrors.file) {
            setFormErrors({ ...formErrors, file: '' });
          }
        }
      }
    } catch (error: any) {
      console.error('Error selecting file:', error);
      showToast.error(error.message || 'Failed to select file', 'Error');
    }
  };

  const handleUploadDocument = async () => {
    if (validateDocumentForm() && documentForm.file && fileUri) {
      try {
        setIsUploading(true);
        const token = await AsyncStorage.getItem('authToken');
        if (!token) {
          router.replace('/(auth)/login');
          return;
        }

        // Upload file
        await apiService.uploadFile(
          API_ENDPOINTS.DOCUMENTS.UPLOAD,
          {
            uri: fileUri,
            type: documentForm.file.type,
            name: documentForm.file.name,
          },
          token,
          {
            title: documentForm.title,
            description: documentForm.description || '',
            category: documentForm.category || '',
          }
        );

        showToast.success('Document uploaded successfully', 'Success');
        setShowAddDocumentModal(false);
        setFormErrors({});
        setDocumentForm({
          title: '',
          description: '',
          category: '',
          file: null,
        });
        setFileUri(null);
        
        // Reload documents
        await loadDocuments();
      } catch (error: any) {
        console.error('Error uploading document:', error);
        showToast.error(error.message || 'Failed to upload document', 'Error');
      } finally {
        setIsUploading(false);
      }
    } else if (!fileUri) {
      showToast.error('Please select a file first', 'Error');
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
        <View className="px-6 py-4">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
                Evidence Gallery
              </Text>
              <Text className={`text-sm mt-0.5 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                UK Revalidation Portfolio
              </Text>
            </View>
            <Pressable className="w-10 h-10 rounded-full bg-[#2B5F9E]/10 items-center justify-center">
              <MaterialIcons name="cloud-upload" size={20} color="#2B5F9E" />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View className="relative">
            <View className="absolute inset-y-0 left-0 pl-4 items-center justify-center z-10">
              <MaterialIcons name="search" size={20} color={isDark ? "#6B7280" : "#94A3B8"} />
            </View>
            <TextInput
              className={`w-full pl-11 pr-12 py-3.5 border-none rounded-2xl shadow-sm text-sm ${
                isDark ? "bg-slate-800 text-white" : "bg-white text-slate-800"
              }`}
              placeholder="Search documents, tags, or dates..."
              placeholderTextColor={isDark ? "#6B7280" : "#94A3B8"}
            />
            <View className="absolute inset-y-0 right-0 pr-4 items-center justify-center z-10">
              <MaterialIcons name="tune" size={20} color={isDark ? "#6B7280" : "#94A3B8"} />
            </View>
          </View>
        </View>

        {/* Loading State */}
        {loading && !refreshing && (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
            <Text className={`mt-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              Loading documents...
            </Text>
          </View>
        )}

        {/* Category Grid */}
        {!loading && (
        <View className="px-6 mt-2">
          <View className="flex-row flex-wrap" style={{ gap: 16 }}>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => {
                  if (category.route) {
                    router.push(category.route as any);
                  }
                }}
                className={`p-5 rounded-[24px] shadow-sm border ${
                  isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                }`}
                style={{ width: '47%' }}
              >
                <View className={`w-12 h-12 rounded-2xl ${category.iconBgColor} items-center justify-center mb-4`}>
                  <MaterialIcons 
                    name={category.icon} 
                    size={24} 
                    color={category.iconColor} 
                  />
                </View>
                <Text className={`font-bold text-base leading-tight ${isDark ? "text-white" : "text-slate-800"}`}>
                  {category.title}
                </Text>
                <Text className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                  {category.documentCount}
                </Text>
                <View className={`mt-4 pt-4 border-t flex-row items-center ${
                  isDark ? "border-slate-700" : "border-slate-50"
                }`} style={{ gap: 6 }}>
                  <View 
                    className="w-1.5 h-1.5 rounded-full" 
                    style={{ backgroundColor: category.dotColor }}
                  />
                  <Text className={`text-[10px] font-medium uppercase tracking-wider ${
                    isDark ? "text-gray-500" : "text-slate-400"
                  }`}>
                    {category.updated}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
        )}

        {/* Recent Files Section */}
        {!loading && (
        <View className="px-6 mt-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className={`font-bold text-lg ${isDark ? "text-white" : "text-slate-800"}`}>
              Recent Files
            </Text>
            {recentFiles.length > 0 && (
              <Pressable>
                <Text className="text-[#2B5F9E] text-sm font-semibold">View All</Text>
              </Pressable>
            )}
          </View>
          {recentFiles.length > 0 ? (
            <View style={{ gap: 12 }}>
              {recentFiles.map((file) => (
              <View
                key={file.id}
                className={`p-3 rounded-2xl border flex-row items-center ${
                  isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
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
              </View>
              ))}
            </View>
          ) : (
            <View className={`p-6 rounded-2xl border items-center ${
              isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
            }`}>
              <MaterialIcons name="folder-open" size={48} color={isDark ? "#4B5563" : "#CBD5E1"} />
              <Text className={`mt-4 text-center ${isDark ? "text-gray-400" : "text-slate-400"}`}>
                No recent files
              </Text>
            </View>
          )}
        </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <View 
        className="absolute left-0 right-0 items-center"
        style={{ bottom: 80 + insets.bottom }}
      >
        <Pressable 
          onPress={() => {
            setDocumentForm({
              title: '',
              description: '',
              category: '',
              file: null,
            });
            setFileUri(null);
            setFormErrors({});
            setShowAddDocumentModal(true);
          }}
          className="w-14 h-14 bg-[#2B5F9E] rounded-full shadow-lg items-center justify-center active:opacity-80"
        >
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Add Document Modal */}
      <Modal
        visible={showAddDocumentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddDocumentModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`rounded-t-3xl max-h-[90%] ${
            isDark ? "bg-slate-800" : "bg-white"
          }`}>
            <SafeAreaView edges={['bottom']}>
              {/* Header */}
              <View className={`flex-row items-center justify-between px-6 pt-4 pb-4 border-b ${
                isDark ? "border-slate-700" : "border-slate-100"
              }`}>
                <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                  Add Document
                </Text>
                <Pressable onPress={() => setShowAddDocumentModal(false)}>
                  <MaterialIcons name="close" size={24} color={isDark ? "#9CA3AF" : "#64748B"} />
                </Pressable>
              </View>

              <ScrollView 
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              >
                <View className="px-6 pt-6" style={{ gap: 20 }}>
                  {/* Document Title */}
                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${
                      isDark ? "text-gray-300" : "text-slate-700"
                    }`}>
                      Document Title *
                    </Text>
                    <TextInput
                      value={documentForm.title}
                      onChangeText={(text) => {
                        setDocumentForm({ ...documentForm, title: text });
                        if (formErrors.title) {
                          setFormErrors({ ...formErrors, title: '' });
                        }
                      }}
                      placeholder="Enter document title"
                      placeholderTextColor={isDark ? "#6B7280" : "#94A3B8"}
                      className={`border rounded-2xl px-4 py-4 text-base ${
                        isDark 
                          ? "bg-slate-700 text-white border-slate-600" 
                          : "bg-white text-slate-800 border-slate-200"
                      } ${formErrors.title ? 'border-red-500' : ''}`}
                    />
                    {formErrors.title && (
                      <Text className="text-red-500 text-xs mt-1">{formErrors.title}</Text>
                    )}
                  </View>

                  {/* Category Selection */}
                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${
                      isDark ? "text-gray-300" : "text-slate-700"
                    }`}>
                      Category *
                    </Text>
                    <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                      {categories.map((category) => {
                        const isSelected = documentForm.category === category.title;
                        return (
                          <Pressable
                            key={category.id}
                            onPress={() => {
                              setDocumentForm({ ...documentForm, category: category.title });
                              if (formErrors.category) {
                                setFormErrors({ ...formErrors, category: '' });
                              }
                            }}
                            className="px-4 py-3 rounded-2xl border-2 flex-row items-center"
                            style={{
                              borderColor: isSelected ? category.iconColor : formErrors.category ? '#EF4444' : (isDark ? '#475569' : '#E2E8F0'),
                              backgroundColor: isSelected ? `${category.iconColor}15` : (isDark ? '#1E293B' : '#FFFFFF'),
                            }}
                          >
                            <View className={`w-8 h-8 rounded-xl ${category.iconBgColor} items-center justify-center mr-2`}>
                              <MaterialIcons name={category.icon} size={18} color={category.iconColor} />
                            </View>
                            <Text className={`text-sm font-medium ${
                              isSelected 
                                ? (isDark ? 'text-white' : 'text-slate-800')
                                : (isDark ? 'text-gray-300' : 'text-slate-600')
                            }`}>
                              {category.title}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {formErrors.category && (
                      <Text className="text-red-500 text-xs mt-1">{formErrors.category}</Text>
                    )}
                  </View>

                  {/* File Upload */}
                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${
                      isDark ? "text-gray-300" : "text-slate-700"
                    }`}>
                      Upload File *
                    </Text>
                    <Pressable 
                      onPress={() => {
                        // Show upload options
                        handleFileSelect('files');
                      }}
                      className={`border-2 border-dashed rounded-2xl p-6 items-center ${
                        isDark ? "bg-slate-700" : "bg-slate-50"
                      } ${formErrors.file ? 'border-red-500' : (isDark ? 'border-slate-600' : 'border-slate-300')}`}
                    >
                      {documentForm.file ? (
                        <View className="items-center w-full">
                          <View className="w-16 h-16 bg-blue-100 rounded-xl items-center justify-center mb-3">
                            <MaterialIcons name="description" size={32} color="#2563EB" />
                          </View>
                          <Text className={`font-semibold text-sm ${isDark ? "text-white" : "text-slate-800"}`} numberOfLines={1}>
                            {documentForm.file.name}
                          </Text>
                          <Text className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                            {documentForm.file.size}
                          </Text>
                          <Pressable 
                            onPress={() => {
                              setDocumentForm({ ...documentForm, file: null });
                              setFileUri(null);
                              if (formErrors.file) {
                                setFormErrors({ ...formErrors, file: '' });
                              }
                            }}
                            className="mt-3 px-4 py-2 bg-red-50 rounded-xl"
                          >
                            <Text className="text-red-600 text-xs font-semibold">Remove</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View className="items-center">
                          <View className={`w-16 h-16 rounded-xl items-center justify-center mb-3 ${
                            isDark ? "bg-slate-600" : "bg-slate-200"
                          }`}>
                            <MaterialIcons name="cloud-upload" size={32} color={isDark ? "#9CA3AF" : "#64748B"} />
                          </View>
                          <Text className={`font-semibold text-sm mb-1 ${
                            isDark ? "text-gray-300" : "text-slate-600"
                          }`}>
                            Tap to upload
                          </Text>
                          <Text className={`text-xs ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                            PDF, JPG, PNG up to 10MB
                          </Text>
                        </View>
                      )}
                    </Pressable>
                    {formErrors.file && (
                      <Text className="text-red-500 text-xs mt-1">{formErrors.file}</Text>
                    )}
                  </View>

                  {/* Description */}
                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${
                      isDark ? "text-gray-300" : "text-slate-700"
                    }`}>
                      Description
                    </Text>
                    <TextInput
                      value={documentForm.description}
                      onChangeText={(text) => setDocumentForm({ ...documentForm, description: text })}
                      placeholder="Enter document description or notes"
                      placeholderTextColor={isDark ? "#6B7280" : "#94A3B8"}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      className={`border rounded-2xl px-4 py-4 text-base min-h-[100px] ${
                        isDark 
                          ? "bg-slate-700 text-white border-slate-600" 
                          : "bg-white text-slate-800 border-slate-200"
                      }`}
                    />
                  </View>

                  {/* Upload Options */}
                  <View>
                    <Text className={`text-sm font-semibold mb-3 ${
                      isDark ? "text-gray-300" : "text-slate-700"
                    }`}>
                      Upload From
                    </Text>
                    <View className="flex-row" style={{ gap: 12 }}>
                      <Pressable 
                        onPress={() => handleFileSelect('gallery')}
                        className={`flex-1 border rounded-2xl p-4 items-center ${
                          isDark 
                            ? "bg-slate-700 border-slate-600 active:bg-slate-600" 
                            : "bg-white border-slate-200 active:bg-blue-50"
                        }`}
                      >
                        <View className="w-12 h-12 bg-blue-50 rounded-xl items-center justify-center mb-2">
                          <MaterialIcons name="photo-library" size={24} color="#2563EB" />
                        </View>
                        <Text className={`font-medium text-sm ${
                          isDark ? "text-gray-300" : "text-slate-700"
                        }`}>
                          Gallery
                        </Text>
                      </Pressable>
                      <Pressable 
                        onPress={() => handleFileSelect('camera')}
                        className={`flex-1 border rounded-2xl p-4 items-center ${
                          isDark 
                            ? "bg-slate-700 border-slate-600 active:bg-slate-600" 
                            : "bg-white border-slate-200 active:bg-green-50"
                        }`}
                      >
                        <View className="w-12 h-12 bg-green-50 rounded-xl items-center justify-center mb-2">
                          <MaterialIcons name="camera-alt" size={24} color="#10B981" />
                        </View>
                        <Text className={`font-medium text-sm ${
                          isDark ? "text-gray-300" : "text-slate-700"
                        }`}>
                          Camera
                        </Text>
                      </Pressable>
                      <Pressable 
                        onPress={() => handleFileSelect('files')}
                        className={`flex-1 border rounded-2xl p-4 items-center ${
                          isDark 
                            ? "bg-slate-700 border-slate-600 active:bg-slate-600" 
                            : "bg-white border-slate-200 active:bg-purple-50"
                        }`}
                      >
                        <View className="w-12 h-12 bg-purple-50 rounded-xl items-center justify-center mb-2">
                          <MaterialIcons name="folder" size={24} color="#9333EA" />
                        </View>
                        <Text className={`font-medium text-sm ${
                          isDark ? "text-gray-300" : "text-slate-700"
                        }`}>
                          Files
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Footer Actions */}
              <View className={`px-6 pt-4 pb-6 border-t flex-row ${
                isDark ? "border-slate-700" : "border-slate-100"
              }`} style={{ gap: 12 }}>
                <Pressable
                  onPress={() => setShowAddDocumentModal(false)}
                  className={`flex-1 py-4 rounded-2xl items-center ${
                    isDark ? "bg-slate-700" : "bg-slate-100"
                  }`}
                >
                  <Text className={`font-semibold text-base ${
                    isDark ? "text-gray-300" : "text-slate-700"
                  }`}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleUploadDocument}
                  disabled={isUploading}
                  className={`flex-1 py-4 rounded-2xl items-center ${
                    isUploading ? 'bg-[#2B5F9E]/50' : 'bg-[#2B5F9E]'
                  }`}
                >
                  {isUploading ? (
                    <View className="flex-row items-center">
                      <MaterialIcons name="hourglass-empty" size={20} color="#FFFFFF" />
                      <Text className="text-white font-semibold text-base ml-2">Uploading...</Text>
                    </View>
                  ) : (
                    <Text className="text-white font-semibold text-base">Upload Document</Text>
                  )}
                </Pressable>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
