import { View, Text, ScrollView, Pressable, TextInput, RefreshControl, ActivityIndicator, Modal, Image, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { usePremium } from '@/hooks/usePremium';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import '../../global.css';

interface Reflection {
  id: string;
  title: string;
  date: string;
  description: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconFilled?: boolean;
}

interface ApiReflection {
  id: number;
  reflectionDate: string;
  reflectionText: string | null;
  documentIds: number[];
  createdAt: string;
  updatedAt: string;
}

export default function ReflectionsScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { isPremium } = usePremium();
  const accentColor = isPremium ? '#D4AF37' : '#2B5F9E';
  const isMountedRef = useRef(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'category' | 'evidence'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReflection, setNewReflection] = useState({
    date: new Date().toISOString().split('T')[0],
    text: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showError, setShowError] = useState(false);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{ name: string, type: string } | null>(null);

  // Date Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'DECEMBER'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    isMountedRef.current = true;
    loadReflections();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadReflections = async (forceRefresh = false) => {
    try {
      if (isMountedRef.current) {
        setLoading(true);
      }
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        // Using the global expo-router `router` avoids relying on a per-screen
        // navigation context which may be unavailable during teardown/re-mount.
        try {
          router.replace('/(auth)/login');
        } catch (e) {
          console.warn('Navigation not ready for login redirect:', e);
        }
        return;
      }

      const response = await apiService.get<{
        success: boolean;
        data: ApiReflection[];
        pagination: { total: number };
      }>(API_ENDPOINTS.REFLECTIONS.LIST, token, forceRefresh);

      if (response?.data) {
        const mappedReflections: Reflection[] = response.data.map((r) => {
          // Extract title from first line of reflection text or use a placeholder
          const text = r.reflectionText || '';
          const lines = text.split('\n').filter(line => line.trim());
          const title = lines[0]?.substring(0, 50) || 'Reflective Account';
          const description = text || 'No description provided';

          // Format date
          const date = formatDate(r.reflectionDate || r.createdAt);

          // Determine icon based on whether there are attached documents
          const hasDocuments = r.documentIds && r.documentIds.length > 0;

          return {
            id: String(r.id),
            title,
            date,
            description,
            icon: hasDocuments ? 'attachment' : undefined,
          };
        });

        // Sort by date descending
        mappedReflections.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (isMountedRef.current) {
          setReflections(mappedReflections);
        }
      }
    } catch (error: any) {
      console.error('Error loading reflections:', error);
      if (!error?.message?.includes('OFFLINE_MODE')) {
        showToast.error(error?.message || 'Failed to load reflections', 'Error');
      }
      if (isMountedRef.current) {
        setReflections([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateString;
    }
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
    setNewReflection({ ...newReflection, date: iso });
    setShowDatePicker(false);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const nodes: any[] = [];
    for (let i = 0; i < firstDay; i++) nodes.push(<View key={`empty-${i}`} className="w-10 h-10" />);
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = newReflection.date === formatYMD(selectedYear, selectedMonth, day);
      nodes.push(
        <Pressable
          key={day}
          onPress={() => handleDateSelect(day)}
          className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-[#2B5E9C]' : isDark ? 'bg-slate-700/50' : 'bg-transparent'}`}
        >
          <Text className={`text-sm font-medium ${isSelected ? 'text-white' : isDark ? 'text-white' : 'text-gray-900'}`}>{day}</Text>
        </Pressable>
      );
    }
    return nodes;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReflections(true);
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

  const handleAddReflection = async () => {
    if (!newReflection.date) {
      showToast.error('Please select a date', 'Validation Error');
      return;
    }

    if (!newReflection.text.trim()) {
      setShowError(true);
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      // Upload file if selected
      let documentIds: number[] = [];
      if (fileUri && attachment) {
        try {
          const uploadRes: any = await apiService.uploadFile(
            API_ENDPOINTS.DOCUMENTS.UPLOAD,
            { uri: fileUri, type: attachment.type, name: attachment.name },
            token,
            { title: 'Reflection Attachment', category: 'reflection' }
          );
          if (uploadRes?.data?.id) {
            documentIds.push(uploadRes.data.id);
          }
        } catch (e) {
          console.error("Upload failed", e);
          // Continue without attachment or show error?
          // For now continue but maybe warn?
        }
      }

      await apiService.post(API_ENDPOINTS.REFLECTIONS.CREATE, {
        reflection_date: newReflection.date,
        reflection_text: newReflection.text,
        document_ids: documentIds.length > 0 ? documentIds : undefined,
      }, token);

      showToast.success('Reflection added', 'Success');
      setShowAddModal(false);
      setShowError(false);
      setFileUri(null);
      setAttachment(null);
      loadReflections(true);
      setNewReflection({
        date: new Date().toISOString().split('T')[0],
        text: '',
      });
    } catch (error: any) {
      console.error('Error creating reflection:', error);
      showToast.error(error.message || 'Failed to create reflection', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredReflections = reflections.filter((reflection) => {
    if (searchQuery) {
      return (
        reflection.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reflection.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      {/* Header */}
      <View className={`border-b ${isDark ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-gray-100"
        }`}>
        <View className="flex-row items-center justify-between px-4 py-2">
          <View className="flex-row items-center" style={{ gap: 8 }}>
           
            <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-[#121417]"}`}>
              Reflections
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/gallery')}
            className="px-3 py-1 bg-[#2B5E9C]/10 rounded-full"
          >
            <Text className="text-[#2B5E9C] text-xs font-bold">
              {reflections.length} total
            </Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="px-4 py-3 flex-row" style={{ gap: 8 }}>
          <View className={`flex-1 flex-row items-center rounded-lg h-10 ${isDark ? "bg-slate-700" : "bg-gray-100"
            }`}>
            <View className="pl-3 items-center justify-center">
              <MaterialIcons name="search" size={20} color={isDark ? "#9CA3AF" : "#687482"} />
            </View>
            <TextInput
              className={`flex-1 px-2 text-sm ${isDark ? "text-white" : "text-[#121417]"}`}
              placeholder="Search reflections..."
              placeholderTextColor={isDark ? "#6B7280" : "#687482"}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable className={`w-10 h-10 shrink-0 items-center justify-center rounded-lg ${isDark ? "bg-slate-700" : "bg-gray-100"
            }`}>
            <MaterialIcons name="tune" size={20} color={isDark ? "#E5E7EB" : "#121417"} />
          </Pressable>
        </View>


      </View>

      {/* Loading State */}
      {loading && !refreshing && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={isDark ? accentColor : '#2B5F9E'} />
          <Text className={`mt-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Loading reflections...
          </Text>
        </View>
      )}

      {/* Reflections List */}
      {!loading && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
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
          {filteredReflections.length > 0 ? (
            <View style={{ gap: 16 }}>
              {filteredReflections.map((reflection) => (
                <View
                  key={reflection.id}
                  className={`rounded-xl shadow-sm border overflow-hidden ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"
                    }`}
                >
                  <View className="p-4">
                    <View className="flex-row justify-between items-start mb-1">
                      <Text className={`text-lg font-bold flex-1 ${isDark ? "text-white" : "text-[#121417]"
                        }`}>
                        {reflection.title}
                      </Text>
                      {reflection.icon && (
                        <MaterialIcons
                          name={reflection.icon}
                          size={24}
                          color="#2B5E9C"
                        />
                      )}
                    </View>
                    <Text className={`text-xs font-medium mb-2 uppercase tracking-wider ${isDark ? "text-gray-400" : "text-[#687482]"
                      }`}>
                      {reflection.date}
                    </Text>
                    <Text
                      className={`text-sm font-normal leading-relaxed mb-3 ${isDark ? "text-gray-300" : "text-[#121417]"
                        }`}
                      numberOfLines={3}
                    >
                      {reflection.description}
                    </Text>
                    <View className={`mt-3 pt-3 border-t flex-row justify-end ${isDark ? "border-slate-700" : "border-gray-50"
                      }`}>
                      <Pressable onPress={() => router.push(`/(tabs)/reflections/${reflection.id}`)} className="flex-row items-center" style={{ gap: 4 }}>
                        <Text className="text-[#2B5E9C] text-xs font-bold">
                          VIEW FULL ACCOUNT
                        </Text>
                        <MaterialIcons name="chevron-right" size={16} color="#2B5E9C" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className={`p-8 rounded-2xl border items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
              }`}>
              <MaterialIcons name="description" size={48} color={isDark ? "#4B5563" : "#CBD5E1"} />
              <Text className={`mt-4 text-center font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>
                No reflections yet
              </Text>
              <Text className={`mt-2 text-center text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                Tap the + button to add your first reflective account
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Floating Action Button */}
      <View
        className="absolute right-6 items-center"
        style={{ bottom: 80 + insets.bottom }}
      >
        <Pressable
          onPress={() => setShowAddModal(true)}
          className="w-14 h-14 bg-[#2B5E9C] rounded-full shadow-lg items-center justify-center"
        >
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Add Reflection Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`rounded-t-3xl ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <View className="p-6 border-b border-gray-200 flex-row justify-between items-center">
              <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Add Reflection</Text>
              <Pressable onPress={() => { setShowAddModal(false); setShowError(false); }}>
                <MaterialIcons name="close" size={24} color={isDark ? "#9CA3AF" : "#64748B"} />
              </Pressable>
            </View>
            <View className="p-6 gap-4">
              <View>
                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Date</Text>
                <Pressable
                  onPress={() => {
                    if (newReflection.date) {
                      const parts = newReflection.date.split('-').map(Number);
                      if (parts.length === 3) {
                        setSelectedYear(parts[0]);
                        setSelectedMonth(parts[1] - 1);
                      }
                    } else {
                      const now = new Date();
                      setSelectedYear(now.getFullYear());
                      setSelectedMonth(now.getMonth());
                    }
                    setShowDatePicker(true);
                  }}
                  className={`flex-row justify-between items-center p-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-300"}`}
                >
                  <Text className={isDark ? "text-white" : "text-slate-800"}>
                    {newReflection.date ? formatDate(newReflection.date) : "Select date..."}
                  </Text>
                  <MaterialIcons name="calendar-today" size={20} color={isDark ? "#ccc" : "#666"} />
                </Pressable>
              </View>
              <View>
                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Reflection Content</Text>
                <TextInput
                  value={newReflection.text}
                  onChangeText={(t) => {
                    setNewReflection({ ...newReflection, text: t });
                    if (t.trim()) setShowError(false);
                  }}
                  className={`p-3 rounded-lg border ${showError ? "border-red-500 bg-red-50/50" : isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-slate-800"}`}
                  placeholder="Describe your reflective account..."
                  multiline
                  numberOfLines={6}
                  style={{ minHeight: 120 }}
                />
                {showError && (
                  <Text className="text-red-500 text-xs mt-1 font-medium italic">
                    * Reflection content cannot be empty
                  </Text>
                )}
              </View>

              <View>
                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Attach Evidence</Text>
                {fileUri && attachment ? (
                  <View className={`flex-row items-center justify-between p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                    <View className="flex-row items-center flex-1">
                      <MaterialIcons name="description" size={20} color="#2B5E9C" />
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
              <Pressable
                onPress={handleAddReflection}
                disabled={isSubmitting}
                className={`mt-4 p-4 rounded-xl items-center justify-center ${isSubmitting ? "bg-gray-400" : "bg-[#2B5E9C]"
                  }`}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">Save Reflection</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
    </SafeAreaView>
  );
}
