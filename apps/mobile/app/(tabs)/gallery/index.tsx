import { View, Text, ScrollView, Pressable, TextInput, Modal, RefreshControl, ActivityIndicator, Alert } from 'react-native';
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
  dotColor?: string; // Add this if needed or rely on iconColor
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
  const [fileUri, setFileUri] = useState<string | null>(null);

  // Static category definitions
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
      route: '/(tabs)/appraisal',
    },
    {
      id: '6',
      title: 'General Gallery',
      icon: 'folder',
      iconBgColor: 'bg-slate-100',
      iconColor: '#64748B',
      dotColor: '#94A3B8',
      route: '/(tabs)/gallery/general',
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
      }>(`${API_ENDPOINTS.DOCUMENTS.LIST}?limit=1000`, token);

      if (response.success && response.data) {
        const mappedDocuments: Document[] = response.data.map((apiDoc) => {
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
            fileSize: fileSize || 0,
            mimeType: mimeType,
            category: apiDoc.category,
            createdAt: apiDoc.created_at,
            updatedAt: apiDoc.updated_at,
          };
        });

        const normalize = (v?: string | number | null) => {
          if (v === null || v === undefined) return '';
          return String(v).toLowerCase().replace(/[^a-z0-9]/g, '');
        };

        // Standardized mapping of variations to canonical UI titles
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

        const mapToTitle = (docCat?: string | null) => {
          if (!docCat) return '';
          const key = normalize(docCat);
          return categoryMap[key] || docCat;
        };

        const updatedCategories = categoryDefinitions.map(cat => {
          const catKey = normalize(cat.title);

          // Documents belonging to this specific category
          const categoryDocs = mappedDocuments.filter(doc => {
            const mappedTitle = mapToTitle(doc.category);
            const mappedKey = normalize(mappedTitle);

            // Check for explicit match
            if (mappedKey && mappedKey === catKey) return true;

            // For General Gallery (ID '6'), include everything that doesn't match other cards
            if (cat.id === '6') {
              const hasNoCategory = !doc.category || normalize(doc.category) === '';
              if (hasNoCategory) return true;

              const matchesAnyOther = categoryDefinitions
                .filter(c => c.id !== '6')
                .some(c => {
                  const otherKey = normalize(c.title);
                  return mappedKey === otherKey;
                });

              return !matchesAnyOther;
            }

            return false;
          });

          const count = categoryDocs.length;
          const latestDoc = [...categoryDocs].sort((a, b) =>
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

        const recent = mappedDocuments
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map(doc => {
            const isPdf = doc.mimeType === 'application/pdf';
            const sizeStr = doc.fileSize && doc.fileSize > 0
              ? `${(doc.fileSize / (1024 * 1024)).toFixed(1)} MB`
              : 'Unknown';
            return {
              id: String(doc.id),
              name: doc.originalFilename || doc.filename,
              category: doc.category || 'General Gallery',
              size: sizeStr,
              icon: (isPdf ? 'picture-as-pdf' : 'image') as keyof typeof MaterialIcons.glyphMap,
              iconBgColor: isPdf ? 'bg-red-100' : 'bg-blue-100',
              iconColor: isPdf ? '#DC2626' : '#2563EB',
            };
          });
        setRecentFiles(recent);
      }
    } catch (error: any) {
      console.error('Error loading documents:', error);
      const errorMessage = error.message || '';
      if (!errorMessage.includes('Internal server error') && !errorMessage.includes('500')) {
        showToast.error(errorMessage || 'Failed to load documents', 'Error');
      }
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

    if (diffMins < 60) return `${diffMins}M AGO`;
    if (diffHours < 24) return `${diffHours}H AGO`;
    if (diffDays < 7) return `${diffDays}D AGO`;
    return `${Math.floor(diffDays / 7)}W AGO`;
  };

  const validateDocumentForm = () => {
    const errors: Record<string, string> = {};
    if (!documentForm.title.trim()) errors.title = 'Document title is required';
    if (!documentForm.category) errors.category = 'Please select a category';
    if (!documentForm.file) errors.file = 'Please upload a file';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUploadClick = () => {
    Alert.alert(
      "Select File Source",
      "Choose where to pick your document or image from",
      [
        {
          text: "Camera",
          onPress: () => handleFileSelect('camera')
        },
        {
          text: "Photo Gallery",
          onPress: () => handleFileSelect('gallery')
        },
        {
          text: "Documents",
          onPress: () => handleFileSelect('files')
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const handleFileSelect = async (source: 'gallery' | 'camera' | 'files') => {
    try {
      let result;

      if (source === 'gallery') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          showToast.error('Gallery permission required', 'Permission Denied');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All, // Allows videos too? Document picker is safer for docs. But user wanted "choose document".
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
          if (formErrors.file) setFormErrors({ ...formErrors, file: '' });
        }
      } else if (source === 'camera') {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
          showToast.error('Camera permission required', 'Permission Denied');
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
          if (formErrors.file) setFormErrors({ ...formErrors, file: '' });
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
          if (formErrors.file) setFormErrors({ ...formErrors, file: '' });
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
        setDocumentForm({ title: '', description: '', category: '', file: null });
        setFileUri(null);
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
            <Pressable
              onPress={() => setShowAddDocumentModal(true)}
              className="w-10 h-10 rounded-full bg-[#2B5F9E]/10 items-center justify-center"
            >
              <MaterialIcons name="cloud-upload" size={20} color="#2B5F9E" />
            </Pressable>
          </View>


        </View>

        {loading && !refreshing && (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
            <Text className={`mt-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              Loading documents...
            </Text>
          </View>
        )}

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
                  className={`p-5 rounded-[24px] shadow-sm border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
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
                  <View className={`mt-4 pt-4 border-t flex-row items-center ${isDark ? "border-slate-700" : "border-slate-50"
                    }`} style={{ gap: 6 }}>
                    <View
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: category.dotColor }}
                    />
                    <Text className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? "text-gray-500" : "text-slate-400"
                      }`}>
                      {category.updated}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}


      </ScrollView>

      <View
        className="absolute left-0 right-0 items-center"
        style={{ bottom: 80 + insets.bottom }}
      >
        <Pressable
          onPress={() => {
            setDocumentForm({ title: '', description: '', category: '', file: null });
            setFileUri(null);
            setFormErrors({});
            setShowAddDocumentModal(true);
          }}
          className="w-14 h-14 bg-[#2B5F9E] rounded-full shadow-lg items-center justify-center active:opacity-80"
        >
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      </View>

      <Modal
        visible={showAddDocumentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddDocumentModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`rounded-t-3xl max-h-[90%] flex-1 ${isDark ? "bg-slate-800" : "bg-white"
            }`}>
            <SafeAreaView edges={['bottom']} className="flex-1">
              <View className={`flex-row items-center justify-between px-6 pt-4 pb-4 border-b ${isDark ? "border-slate-700" : "border-slate-100"
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
                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                      Document Title *
                    </Text>
                    <TextInput
                      value={documentForm.title}
                      onChangeText={(text) => {
                        setDocumentForm({ ...documentForm, title: text });
                        if (formErrors.title) setFormErrors({ ...formErrors, title: '' });
                      }}
                      placeholder="Enter document title"
                      placeholderTextColor={isDark ? "#6B7280" : "#94A3B8"}
                      className={`border rounded-2xl px-4 py-4 text-base ${isDark
                        ? "bg-slate-700 text-white border-slate-600"
                        : "bg-white text-slate-800 border-slate-200"
                        } ${formErrors.title ? 'border-red-500' : ''}`}
                    />
                    {formErrors.title && <Text className="text-red-500 text-xs mt-1">{formErrors.title}</Text>}
                  </View>

                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
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
                              if (formErrors.category) setFormErrors({ ...formErrors, category: '' });
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
                            <Text className={`text-sm font-medium ${isSelected
                              ? (isDark ? 'text-white' : 'text-slate-800')
                              : (isDark ? 'text-gray-300' : 'text-slate-600')
                              }`}>
                              {category.title}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {formErrors.category && <Text className="text-red-500 text-xs mt-1">{formErrors.category}</Text>}
                  </View>

                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                      Upload File *
                    </Text>
                    <Pressable
                      onPress={handleUploadClick}
                      className={`border-2 border-dashed rounded-2xl p-6 items-center ${isDark ? "bg-slate-700" : "bg-slate-50"
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
                              if (formErrors.file) setFormErrors({ ...formErrors, file: '' });
                            }}
                            className="mt-3 px-4 py-2 bg-red-50 rounded-xl"
                          >
                            <Text className="text-red-600 text-xs font-semibold">Remove</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View className="items-center">
                          <View className={`w-16 h-16 rounded-xl items-center justify-center mb-3 ${isDark ? "bg-slate-600" : "bg-slate-200"
                            }`}>
                            <MaterialIcons name="cloud-upload" size={32} color={isDark ? "#9CA3AF" : "#64748B"} />
                          </View>
                          <Text className={`font-semibold text-sm mb-1 ${isDark ? "text-gray-300" : "text-slate-600"
                            }`}>
                            Tap to upload
                          </Text>
                          <Text className={`text-xs ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                            PDF, JPG, PNG up to 10MB
                          </Text>
                        </View>
                      )}
                    </Pressable>
                    {formErrors.file && <Text className="text-red-500 text-xs mt-1">{formErrors.file}</Text>}
                  </View>

                  {/* Upload Button */}
                  <Pressable
                    onPress={handleUploadDocument}
                    disabled={isUploading}
                    className={`rounded-2xl p-4 items-center shadow-sm mt-4 ${isUploading ? "bg-gray-400" : "bg-[#2B5E9C]"
                      }`}
                  >
                    {isUploading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-semibold text-base">Upload Document</Text>
                    )}
                  </Pressable>

                </View>
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
