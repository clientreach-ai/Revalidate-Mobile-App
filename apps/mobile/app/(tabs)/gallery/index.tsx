import { View, Text, ScrollView, Pressable, TextInput, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useThemeStore } from '@/features/theme/theme.store';
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
  
  const categories: Category[] = [
    {
      id: '1',
      title: 'Working Hours',
      documentCount: '12 Documents',
      updated: 'UPDATED 2D AGO',
      icon: 'schedule',
      iconBgColor: 'bg-blue-100',
      iconColor: '#2563EB',
      dotColor: '#3B82F6',
      route: '/(tabs)/workinghours',
    },
    {
      id: '2',
      title: 'CPD Hours',
      documentCount: '45 Documents',
      updated: 'UPDATED 4H AGO',
      icon: 'school',
      iconBgColor: 'bg-amber-100',
      iconColor: '#F59E0B',
      dotColor: '#F59E0B',
      route: '/(tabs)/cpdhourstracking',
    },
    {
      id: '3',
      title: 'Feedback Log',
      documentCount: '8 Documents',
      updated: 'UPDATED 1W AGO',
      icon: 'forum',
      iconBgColor: 'bg-emerald-100',
      iconColor: '#10B981',
      dotColor: '#10B981',
      route: '/(tabs)/feedback',
    },
    {
      id: '4',
      title: 'Reflective Accounts',
      documentCount: '5 Documents',
      updated: 'UPDATED 3D AGO',
      icon: 'edit-note',
      iconBgColor: 'bg-purple-100',
      iconColor: '#9333EA',
      dotColor: '#9333EA',
      route: '/(tabs)/reflections',
    },
    {
      id: '5',
      title: 'Appraisal',
      documentCount: '2 Documents',
      updated: 'UPDATED DEC 2023',
      icon: 'verified',
      iconBgColor: 'bg-rose-100',
      iconColor: '#E11D48',
      dotColor: '#E11D48',
    },
    {
      id: '6',
      title: 'General Gallery',
      documentCount: '32 Documents',
      updated: 'UPDATED YESTERDAY',
      icon: 'folder',
      iconBgColor: 'bg-slate-100',
      iconColor: '#64748B',
      dotColor: '#94A3B8',
    },
  ];

  const recentFiles: RecentFile[] = [
    {
      id: '1',
      name: 'Reflection_Patient_04.pdf',
      category: 'Reflective Accounts',
      size: '2.4 MB',
      icon: 'picture-as-pdf',
      iconBgColor: 'bg-red-100',
      iconColor: '#DC2626',
    },
    {
      id: '2',
      name: 'Seminar_Certificate.jpg',
      category: 'CPD Hours',
      size: '1.1 MB',
      icon: 'image',
      iconBgColor: 'bg-blue-100',
      iconColor: '#2563EB',
    },
  ];

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

  const handleFileSelect = (source: 'gallery' | 'camera' | 'files') => {
    const mockFiles = {
      gallery: { name: 'Document_Image.jpg', size: '2.4 MB', type: 'image/jpeg' },
      camera: { name: 'Photo_Capture.jpg', size: '1.8 MB', type: 'image/jpeg' },
      files: { name: 'Report_2024.pdf', size: '3.2 MB', type: 'application/pdf' },
    };

    setDocumentForm({ ...documentForm, file: mockFiles[source] });
    if (formErrors.file) {
      setFormErrors({ ...formErrors, file: '' });
    }
  };

  const handleUploadDocument = () => {
    if (validateDocumentForm()) {
      setIsUploading(true);
      setTimeout(() => {
        console.log('Document uploaded:', documentForm);
        setIsUploading(false);
        setShowAddDocumentModal(false);
        setFormErrors({});
        setDocumentForm({
          title: '',
          description: '',
          category: '',
          file: null,
        });
      }, 1500);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
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

        {/* Category Grid */}
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

        {/* Recent Files Section */}
        <View className="px-6 mt-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className={`font-bold text-lg ${isDark ? "text-white" : "text-slate-800"}`}>
              Recent Files
            </Text>
            <Pressable>
              <Text className="text-[#2B5F9E] text-sm font-semibold">View All</Text>
            </Pressable>
          </View>
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
        </View>
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
