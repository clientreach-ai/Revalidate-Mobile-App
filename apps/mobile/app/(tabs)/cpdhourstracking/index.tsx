import { View, Text, ScrollView, Pressable, RefreshControl, Modal, TextInput, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, API_ENDPOINTS } from '@/services/api';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { showToast } from '@/utils/toast';
import { Image } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useThemeStore } from '@/features/theme/theme.store';
import { usePremium } from '@/hooks/usePremium';
import '../../global.css';

interface CPDActivity {
  id: string;
  title: string;
  date: string;
  hours: number;
  type: 'participatory' | 'non-participatory';
  learningMethod?: string;
  cpdLearningType?: string;
  linkToStandard?: string;
  linkToStandardProficiency?: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBgColor: string;
  iconColor: string;
  hasCertificate?: boolean;
}

export default function CPDHoursTrackingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { isPremium } = usePremium();
  const accentColor = isPremium ? '#D4AF37' : '#2B5F9E';
  const [refreshing, setRefreshing] = useState(false);

  // CPD Data (fetched from API)
  const [totalHours, setTotalHours] = useState<number>(0);
  const targetHours = 35;
  const [participatoryHours, setParticipatoryHours] = useState<number>(0);
  const [nonParticipatoryHours, setNonParticipatoryHours] = useState<number>(0);
  const [allActivities, setAllActivities] = useState<CPDActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddCpdModal, setShowAddCpdModal] = useState(false);
  const [cpdForm, setCpdForm] = useState({
    trainingName: '',
    activityDate: '', // YYYY-MM-DD
    durationMinutes: 0,
    activityType: 'participatory',
    learningMethod: 'independent learning',
    cpdLearningType: 'work based learning',
    linkToStandard: '',
    linkToStandardProficiency: '',
  });
  const [cpdSubmitting, setCpdSubmitting] = useState(false);
  const [cpdFormErrors, setCpdFormErrors] = useState<{ trainingName?: string; activityDate?: string; durationMinutes?: string }>({});
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [cpdFile, setCpdFile] = useState<{ name: string; size: string; type: string } | null>(null);
  const [showCpdDatePicker, setShowCpdDatePicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Info Modal States
  const [showHCPCInfo, setShowHCPCInfo] = useState(false);
  const [showNMCInfo, setShowNMCInfo] = useState(false);

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const formatCpdDateDisplay = (iso?: string) => {
    if (!iso) return 'Select date (YYYY-MM-DD)';
    return iso;
  };

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

  const handleCpdDateSelect = (day: number) => {
    const iso = formatYMD(selectedYear, selectedMonth, day);
    setCpdForm({ ...cpdForm, activityDate: iso });
    if (cpdFormErrors.activityDate) {
      setCpdFormErrors((prev) => ({ ...prev, activityDate: undefined }));
    }
    setShowCpdDatePicker(false);
  };

  const renderCpdCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const nodes: any[] = [];
    for (let i = 0; i < firstDay; i++) nodes.push(<View key={`empty-${i}`} className="w-10 h-10" />);
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = cpdForm.activityDate === formatYMD(selectedYear, selectedMonth, day);
      nodes.push(
        <Pressable
          key={day}
          onPress={() => handleCpdDateSelect(day)}
          className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? '' : isDark ? 'bg-slate-700/50' : 'bg-transparent'}`}
          style={isSelected ? { backgroundColor: accentColor } : undefined}
        >
          <Text className={`text-sm font-medium ${isSelected ? 'text-white' : isDark ? 'text-white' : 'text-gray-900'}`}>{day}</Text>
        </Pressable>
      );
    }
    return nodes;
  };
  const progress = (totalHours / targetHours) * 100;

  const handleFileSelect = async (source: 'gallery' | 'camera' | 'files') => {
    try {
      let result: any;

      if (source === 'gallery') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          showToast.error('Permission to access gallery is required', 'Permission Denied');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          allowsEditing: false,
          quality: 1
        });
        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];
          const sizeInMB = asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Unknown size';
          const mimeType = asset.mimeType || (asset.type === 'image' ? 'image/jpeg' : asset.type === 'video' ? 'video/mp4' : 'application/octet-stream');

          setFileUri(asset.uri);
          setCpdFile({
            name: asset.fileName || `image_${Date.now()}.jpg`,
            size: sizeInMB,
            type: mimeType
          });
        }
      } else if (source === 'camera') {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
          showToast.error('Permission to access camera is required', 'Permission Denied');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 1
        });
        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];
          const sizeInMB = asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Unknown size';
          const mimeType = asset.mimeType || (asset.type === 'image' ? 'image/jpeg' : asset.type === 'video' ? 'video/mp4' : 'application/octet-stream');

          setFileUri(asset.uri);
          setCpdFile({
            name: asset.fileName || `photo_${Date.now()}.jpg`,
            size: sizeInMB,
            type: mimeType
          });
        }
      }
      else if (source === 'files') {
        result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
        if (!result.canceled && result.size != null) {
          const sizeInMB = `${(result.size / (1024 * 1024)).toFixed(2)} MB`;
          setFileUri(result.uri);
          setCpdFile({ name: result.name, size: sizeInMB, type: result.mimeType || 'application/octet-stream' });
        }
      }
    } catch (error: any) {
      console.error('Error selecting file for CPD:', error);
      showToast.error(error.message || 'Failed to select file', 'Error');
    }
  };

  // Calculate circle progress
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Filter activities based on active filter - using all for summary view
  const displayActivities = allActivities.slice(0, 5); // Show recent 5

  useEffect(() => {
    loadCpdActivities();
  }, []);

  const loadCpdActivities = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      // Fetch user's CPD entries
      const resp = await apiService.get<{ success?: boolean; data: Array<any> }>(`/api/v1/cpd-hours?limit=100`, token, forceRefresh);
      const items = Array.isArray(resp?.data) ? resp.data : [];

      const mapped: CPDActivity[] = items.map((it: any) => ({
        id: String(it.id),
        title: it.trainingName || it.training_name || it.training || 'CPD Activity',
        date: it.activityDate || it.activity_date || it.createdAt || it.created_at || '',
        hours: (it.durationMinutes || it.duration_minutes || 0) / 60,
        type: (it.activityType || it.activity_type) as 'participatory' | 'non-participatory',
        learningMethod: it.learningMethod || it.learning_method || '',
        cpdLearningType: it.cpdLearningType || it.cpd_learning_type || '',
        linkToStandard: it.linkToStandard || it.link_to_standard || it.linkCode || it.link_code || '',
        linkToStandardProficiency: it.linkToStandardProficiency || it.link_to_standard_proficiency || it.standardsProficiency || it.standards_proficiency || '',
        icon: (it.activityType || it.activity_type) === 'participatory' ? 'school' : 'menu-book',
        iconBgColor: (it.activityType || it.activity_type) === 'participatory' ? 'bg-blue-100' : 'bg-amber-100',
        iconColor: (it.activityType || it.activity_type) === 'participatory' ? '#2563EB' : '#F59E0B',
        hasCertificate: (it.documentIds && it.documentIds.length > 0) || (it.document_ids && it.document_ids.length > 0),
      }));

      // Sort by date desc if not already
      mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAllActivities(mapped);

      // calculate totals
      const total = mapped.reduce((s, a) => s + a.hours, 0);
      const part = mapped.filter(a => a.type === 'participatory').reduce((s, a) => s + a.hours, 0);
      const nonPart = mapped.filter(a => a.type === 'non-participatory').reduce((s, a) => s + a.hours, 0);

      setTotalHours(Math.round(total * 10) / 10);
      setParticipatoryHours(Math.round(part * 10) / 10);
      setNonParticipatoryHours(Math.round(nonPart * 10) / 10);
    } catch (error) {
      console.warn('Error loading CPD activities:', error);
    } finally {
      setLoading(false);
    }
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
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 1000);
            }}
            tintColor={isDark ? accentColor : '#2B5F9E'}
            colors={[accentColor, '#2B5F9E']}
          />
        }
      >
        {/* Header */}
        <View className="px-6 pb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
              CPD Portfolio
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/gallery')}
              className={`w-10 h-10 rounded-full shadow-sm items-center justify-center border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                }`}
            >
              <MaterialIcons name="photo-library" size={20} color={isDark ? "#9CA3AF" : "#64748B"} />
            </Pressable>
          </View>
          <Text className={`text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Professional Revalidation 2024
          </Text>
        </View>

        {/* CPD Summary Card */}
        <View className="px-6 mb-6">
          <View className={`rounded-3xl p-6 shadow-sm border items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
            }`}>

            {/* Breakdown Cards */}
            <View className="w-full flex-row" style={{ gap: 16 }}>
              {/* Participatory Hours */}
              <View className={`flex-1 p-4 rounded-2xl border ${isDark ? "bg-slate-700 border-slate-600" : "bg-slate-50 border-slate-100"
                }`}>
                <View className="flex-row items-center mb-1" style={{ gap: 8 }}>
                  <View className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                  <Text className={`text-xs font-semibold uppercase ${isDark ? "text-gray-400" : "text-slate-500"
                    }`}>
                    Participatory
                  </Text>
                </View>
                <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                  {participatoryHours} hrs
                </Text>
                <Text className={`text-[10px] mt-1 ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                  Min 20 required
                </Text>
              </View>

              {/* Non-Participatory Hours */}
              <View className={`flex-1 p-4 rounded-2xl border ${isDark ? "bg-slate-700 border-slate-600" : "bg-slate-50 border-slate-100"
                }`}>
                <View className="flex-row items-center mb-1" style={{ gap: 8 }}>
                  <View className={`w-2 h-2 rounded-full ${isDark ? "bg-gray-500" : "bg-slate-300"}`} />
                  <Text className={`text-xs font-semibold uppercase ${isDark ? "text-gray-400" : "text-slate-500"
                    }`}>
                    Non-Part.
                  </Text>
                </View>
                <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                  {nonParticipatoryHours} hrs
                </Text>
                <Text className={`text-[10px] mt-1 ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                  Flexible allocation
                </Text>
              </View>
            </View>
          </View>
        </View>


        {/* Activities Section */}
        <View className="px-6" style={{ gap: 16 }}>
          <View className="flex-row items-center justify-between">
            <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
              Activities
            </Text>
            {allActivities.length > 5 && (
              <Pressable onPress={() => router.push('/(tabs)/cpdhourstracking/all-logs')}>
                <Text className="text-sm font-semibold" style={{ color: accentColor }}>View All</Text>
              </Pressable>
            )}
          </View>

          <View style={{ gap: 12 }}>
            {displayActivities.length > 0 ? (
              displayActivities.map((activity) => (
                <Pressable
                  key={activity.id}
                  onPress={() => router.push(`/(tabs)/cpdhourstracking/${activity.id}`)}
                  className={`p-4 rounded-2xl border shadow-sm flex-row items-center ${isDark
                    ? "bg-slate-800 border-slate-700 active:bg-slate-700"
                    : "bg-white border-slate-100 active:bg-slate-50"
                    }`}
                  style={{ gap: 16 }}
                >
                  <View className={`w-12 h-12 rounded-xl ${activity.iconBgColor} items-center justify-center flex-shrink-0`}>
                    <MaterialIcons
                      name={activity.icon}
                      size={24}
                      color={activity.iconColor}
                    />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-800"}`} numberOfLines={1}>
                      {activity.title}
                    </Text>
                    <Text className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                      {activity.date} • {activity.hours} Hours
                    </Text>
                    <View className="flex-row mt-2" style={{ gap: 8 }}>
                      <View className={`px-2 py-0.5 rounded-md ${isDark ? "bg-slate-700" : "bg-slate-100"
                        }`}>
                        <Text className={`text-[10px] font-semibold ${isDark ? "text-gray-300" : "text-slate-600"
                          }`}>
                          {activity.type === 'participatory' ? 'Participatory' : 'Non-Participatory'}
                        </Text>
                      </View>
                      {activity.hasCertificate && (
                        <View className="flex-row items-center px-2 py-0.5 rounded-md" style={{ gap: 4, backgroundColor: isPremium ? 'rgba(212, 175, 55, 0.12)' : '#DBEAFE' }}>
                          <MaterialIcons name="description" size={14} color={accentColor} />
                          <Text className="text-[10px] font-semibold" style={{ color: accentColor }}>
                            Certificate
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              ))
            ) : (
              <View className={`p-8 rounded-2xl border items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                }`}>
                <MaterialIcons name="inbox" size={48} color={isDark ? "#4B5563" : "#CBD5E1"} />
                <Text className={`mt-4 text-center ${isDark ? "text-gray-400" : "text-slate-400"}`}>
                  No activities found. Add your first CPD activity!
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View
        className="absolute right-6 items-center"
        style={{ bottom: 80 + insets.bottom }}
      >
        <Pressable
          onPress={() => setShowAddCpdModal(true)}
          className="w-14 h-14 rounded-full shadow-lg items-center justify-center active:opacity-80"
          style={{ backgroundColor: accentColor }}
        >
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Add CPD Modal */}
      <Modal
        visible={showAddCpdModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowAddCpdModal(false);
          setCpdFormErrors({});
        }}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`rounded-t-3xl max-h-[90%] flex-1 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <SafeAreaView edges={['bottom']} className="flex-1">
              <View className={`flex-row items-center justify-between px-6 pt-4 pb-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Add CPD Activity</Text>
                <Pressable onPress={() => {
                  setShowAddCpdModal(false);
                  setCpdFormErrors({});
                }}>
                  <MaterialIcons name="close" size={24} color={isDark ? '#9CA3AF' : '#64748B'} />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                <View className="px-6 pt-6" style={{ gap: 16 }}>
                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Topic *</Text>
                    <TextInput
                      value={cpdForm.trainingName}
                      onChangeText={(t) => {
                        setCpdForm({ ...cpdForm, trainingName: t });
                        if (cpdFormErrors.trainingName && t.trim()) {
                          setCpdFormErrors((prev) => ({ ...prev, trainingName: undefined }));
                        }
                      }}
                      placeholder="e.g. Clinical Assessment"
                      placeholderTextColor={isDark ? '#6B7280' : '#94A3B8'}
                      className={`border rounded-2xl px-4 py-3 text-base ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-800'} ${cpdFormErrors.trainingName ? 'border-red-500' : isDark ? 'border-slate-600' : 'border-slate-200'}`}
                    />
                    {cpdFormErrors.trainingName ? (
                      <Text className="text-xs text-red-500 mt-2">{cpdFormErrors.trainingName}</Text>
                    ) : null}
                  </View>

                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Learning Method *</Text>
                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                      {['independent learning', 'online learning', 'course attendance', 'other'].map((m) => (
                        <Pressable
                          key={m}
                          onPress={() => setCpdForm({ ...cpdForm, learningMethod: m })}
                          className={`px-4 py-2 rounded-xl border ${cpdForm.learningMethod === m ? '' : isDark ? 'border-slate-600' : 'border-slate-200'}`}
                          style={cpdForm.learningMethod === m ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
                        >
                          <Text className={`text-xs capitalize ${cpdForm.learningMethod === m ? 'text-white font-bold' : isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                            {m}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Type of CPD Learning *</Text>
                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                      {['work based learning', 'professional activities', 'formal and educational', 'other'].map((t) => (
                        <Pressable
                          key={t}
                          onPress={() => setCpdForm({ ...cpdForm, cpdLearningType: t })}
                          className={`px-4 py-2 rounded-xl border ${cpdForm.cpdLearningType === t ? '' : isDark ? 'border-slate-600' : 'border-slate-200'}`}
                          style={cpdForm.cpdLearningType === t ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
                        >
                          <Text className={`text-xs capitalize ${cpdForm.cpdLearningType === t ? 'text-white font-bold' : isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                            {t}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View>
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Date *</Text>
                      <Pressable onPress={() => setShowHCPCInfo(true)}>
                        <MaterialIcons name="info-outline" size={18} color={accentColor} />
                      </Pressable>
                    </View>
                    <Pressable
                      onPress={() => {
                        if (cpdForm.activityDate) {
                          const parts = cpdForm.activityDate.split('-').map(Number);
                          if (parts.length === 3) {
                            setSelectedYear(parts[0]);
                            setSelectedMonth(parts[1] - 1);
                          }
                        } else {
                          const now = new Date();
                          setSelectedYear(now.getFullYear());
                          setSelectedMonth(now.getMonth());
                        }
                        setShowCpdDatePicker(true);
                      }}
                      className={`border rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-700' : 'bg-white'} ${cpdFormErrors.activityDate ? 'border-red-500' : isDark ? 'border-slate-600' : 'border-slate-200'}`}
                    >
                      <Text className={`${isDark ? 'text-white' : 'text-slate-800'}`}>{formatCpdDateDisplay(cpdForm.activityDate)}</Text>
                    </Pressable>
                    {cpdFormErrors.activityDate ? (
                      <Text className="text-xs text-red-500 mt-2">{cpdFormErrors.activityDate}</Text>
                    ) : null}
                  </View>

                  <View className="flex-row items-center" style={{ gap: 12 }}>
                    <View className="flex-1">
                      <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Number of Hours *</Text>
                      <TextInput
                        value={cpdForm.durationMinutes ? String(cpdForm.durationMinutes / 60) : ''}
                        onChangeText={(t) => {
                          const minutes = Math.round(parseFloat(t || '0') * 60);
                          setCpdForm({ ...cpdForm, durationMinutes: minutes });
                          if (cpdFormErrors.durationMinutes && minutes > 0) {
                            setCpdFormErrors((prev) => ({ ...prev, durationMinutes: undefined }));
                          }
                        }}
                        placeholder="e.g. 2.5"
                        keyboardType={Platform.OS === 'web' ? 'numeric' : 'decimal-pad'}
                        placeholderTextColor={isDark ? '#6B7280' : '#94A3B8'}
                        className={`border rounded-2xl px-4 py-3 text-base ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-800'} ${cpdFormErrors.durationMinutes ? 'border-red-500' : isDark ? 'border-slate-600' : 'border-slate-200'}`}
                      />
                      {cpdFormErrors.durationMinutes ? (
                        <Text className="text-xs text-red-500 mt-2">{cpdFormErrors.durationMinutes}</Text>
                      ) : null}
                    </View>
                    <View className="flex-1">
                      <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Activity Type</Text>
                      <View className="flex-row items-center border rounded-2xl overflow-hidden" style={{ borderColor: isDark ? '#475569' : '#E2E8F0' }}>
                        <Pressable
                          onPress={() => setCpdForm({ ...cpdForm, activityType: 'participatory' })}
                          className={`flex-1 py-3 items-center ${cpdForm.activityType === 'participatory' ? '' : 'bg-transparent'}`}
                          style={cpdForm.activityType === 'participatory' ? { backgroundColor: accentColor } : undefined}
                        >
                          <Text className={`text-[10px] font-bold ${cpdForm.activityType === 'participatory' ? 'text-white' : isDark ? 'text-gray-400' : 'text-slate-500'}`}>Part.</Text>
                        </Pressable>
                        <View className={`w-[1px] h-full ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />
                        <Pressable
                          onPress={() => setCpdForm({ ...cpdForm, activityType: 'non-participatory' })}
                          className={`flex-1 py-3 items-center ${cpdForm.activityType === 'non-participatory' ? '' : 'bg-transparent'}`}
                          style={cpdForm.activityType === 'non-participatory' ? { backgroundColor: accentColor } : undefined}
                        >
                          <Text className={`text-[10px] font-bold ${cpdForm.activityType === 'non-participatory' ? 'text-white' : isDark ? 'text-gray-400' : 'text-slate-500'}`}>Non-Part.</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Link to code/standard</Text>
                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                      {['HCPC Standard 1', 'HCPC Standard 2', 'HCPC Standard 3', 'HCPC Standard 4'].map((standard) => (
                        <Pressable
                          key={standard}
                          onPress={() => setCpdForm({ ...cpdForm, linkToStandard: standard })}
                          className={`px-4 py-2 rounded-xl border ${cpdForm.linkToStandard === standard ? '' : isDark ? 'border-slate-600' : 'border-slate-200'}`}
                          style={cpdForm.linkToStandard === standard ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
                        >
                          <Text className={`text-xs ${cpdForm.linkToStandard === standard ? 'text-white font-bold' : isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                            {standard}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View>
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Link to standard proficiency</Text>
                      <Pressable onPress={() => setShowNMCInfo(true)}>
                        <MaterialIcons name="help-outline" size={18} color={accentColor} />
                      </Pressable>
                    </View>
                    <TextInput
                      value={cpdForm.linkToStandardProficiency}
                      onChangeText={(t) => setCpdForm({ ...cpdForm, linkToStandardProficiency: t })}
                      placeholder="Identify parts of relevant standard"
                      placeholderTextColor={isDark ? '#6B7280' : '#94A3B8'}
                      className={`border rounded-2xl px-4 py-3 text-base ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-800 border-slate-200'}`}
                    />
                  </View>

                  <View className="pt-2">
                    <Pressable
                      onPress={async () => {
                        const errors: { trainingName?: string; activityDate?: string; durationMinutes?: string } = {};
                        if (!cpdForm.trainingName.trim()) errors.trainingName = 'Please enter a topic.';
                        if (!cpdForm.activityDate) errors.activityDate = 'Please select a date.';
                        if (cpdForm.durationMinutes <= 0) errors.durationMinutes = 'Please enter hours.';

                        if (Object.keys(errors).length > 0) {
                          setCpdFormErrors(errors);
                          showToast.error('Please fill all required fields (*)', 'Missing Info');
                          return;
                        }
                        setCpdSubmitting(true);
                        try {
                          const token = await AsyncStorage.getItem('authToken');
                          if (!token) throw new Error('Not authenticated');

                          // If there's an attached file, upload it first and include the document id
                          let documentIds: number[] | undefined = undefined;
                          if (cpdFile && fileUri) {
                            try {
                              const uploadRes: any = await apiService.uploadFile(
                                API_ENDPOINTS.DOCUMENTS.UPLOAD,
                                { uri: fileUri, type: cpdFile.type, name: cpdFile.name },
                                token,
                                { title: cpdForm.trainingName, category: 'cpd' }
                              );

                              const createdId = uploadRes?.data?.id || uploadRes?.id;
                              if (createdId) documentIds = [createdId];
                            } catch (err) {
                              console.error('Error uploading file for CPD:', err);
                              showToast.error('Failed to upload attachment', 'Error');
                              // continue without attachment
                            }
                          }

                          await apiService.post('/api/v1/cpd-hours', {
                            training_name: cpdForm.trainingName,
                            activity_date: cpdForm.activityDate,
                            duration_minutes: cpdForm.durationMinutes,
                            activity_type: cpdForm.activityType,
                            learning_method: cpdForm.learningMethod,
                            cpd_learning_type: cpdForm.cpdLearningType,
                            link_to_standard: cpdForm.linkToStandard,
                            link_to_standard_proficiency: cpdForm.linkToStandardProficiency,
                            ...(documentIds ? { document_ids: documentIds } : {}),
                          }, token);

                          // reload
                          await loadCpdActivities(true);
                          setShowAddCpdModal(false);
                          setCpdForm({
                            trainingName: '',
                            activityDate: '',
                            durationMinutes: 0,
                            activityType: 'participatory',
                            learningMethod: 'independent learning',
                            cpdLearningType: 'work based learning',
                            linkToStandard: '',
                            linkToStandardProficiency: '',
                          });
                          setCpdFormErrors({});
                          setCpdFile(null);
                          setFileUri(null);
                        } catch (err) {
                          console.error('Error creating CPD entry:', err);
                          showToast.error((err as any)?.message || 'Failed to create CPD entry', 'Error');
                        } finally {
                          setCpdSubmitting(false);
                        }
                      }}
                      className={`px-6 py-3 rounded-2xl items-center justify-center ${isDark ? 'bg-slate-700' : ''}`}
                      style={!isDark ? { backgroundColor: accentColor } : undefined}
                      disabled={cpdSubmitting}
                    >
                      {cpdSubmitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="text-white font-bold">Add Activity</Text>
                      )}
                    </Pressable>
                  </View>
                  <View className="pt-4">
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Attach Certificate / Evidence (optional)</Text>
                    <View className="flex-row" style={{ gap: 8 }}>
                      <Pressable onPress={() => handleFileSelect('gallery')} className={`px-4 py-2 rounded-2xl border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <Text className={`${isDark ? 'text-white' : 'text-slate-800'}`}>Choose Photo</Text>
                      </Pressable>
                      <Pressable onPress={() => handleFileSelect('camera')} className={`px-4 py-2 rounded-2xl border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <Text className={`${isDark ? 'text-white' : 'text-slate-800'}`}>Take Photo</Text>
                      </Pressable>
                      <Pressable onPress={() => handleFileSelect('files')} className={`px-4 py-2 rounded-2xl border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                        <Text className={`${isDark ? 'text-white' : 'text-slate-800'}`}>Choose File</Text>
                      </Pressable>
                    </View>

                    {cpdFile && (
                      <View className="mt-3 flex-row items-center" style={{ gap: 8 }}>
                        {cpdFile.type.startsWith('image/') && fileUri ? (
                          <Image source={{ uri: fileUri }} style={{ width: 64, height: 64, borderRadius: 8 }} />
                        ) : null}
                        <View className="flex-1">
                          <Text className={`${isDark ? 'text-white' : 'text-slate-800'} font-medium`} numberOfLines={1}>{cpdFile.name}</Text>
                          <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{cpdFile.size}</Text>
                        </View>
                        <Pressable onPress={() => { setCpdFile(null); setFileUri(null); }} className="p-2">
                          <MaterialIcons name="close" size={18} color={isDark ? '#9CA3AF' : '#64748B'} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      {/* CPD Date Picker Modal */}
      <Modal
        visible={showCpdDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCpdDatePicker(false)}
      >
        <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setShowCpdDatePicker(false)}>
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

            <View className="flex-row flex-wrap justify-between mb-6">{renderCpdCalendar()}</View>

            <View className="flex-row gap-3">
              <Pressable onPress={() => setShowCpdDatePicker(false)} className={`flex-1 py-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                <Text className={`text-center font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* HCPC Standards Info Modal */}
      <Modal
        visible={showHCPCInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHCPCInfo(false)}
      >
        <Pressable className="flex-1 bg-black/50 items-center justify-center p-6" onPress={() => setShowHCPCInfo(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-3xl p-8 w-full max-w-sm`}>
            <View className="flex-row items-center mb-6">
              <View className="w-12 h-12 rounded-2xl bg-blue-100 items-center justify-center mr-4">
                <MaterialIcons name="info" size={28} color={accentColor} />
              </View>
              <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>HCPC Standards</Text>
            </View>

            <ScrollView className="max-h-96">
              <View style={{ gap: 16 }}>
                <View>
                  <Text className={`font-bold ${isDark ? 'text-white' : 'text-slate-700'}`}>Standard 1</Text>
                  <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>A registrant must maintain a continuous, up-to-date and accurate record of their CPD activities.</Text>
                </View>
                <View>
                  <Text className={`font-bold ${isDark ? 'text-white' : 'text-slate-700'}`}>Standard 2</Text>
                  <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>A registrant must demonstrate that their CPD activities are a mixture of learning activities relevant to current or future practice.</Text>
                </View>
                <View>
                  <Text className={`font-bold ${isDark ? 'text-white' : 'text-slate-700'}`}>Standard 3</Text>
                  <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>A registrant must seek to ensure that their CPD has contributed to the quality of their practice and service delivery.</Text>
                </View>
                <View>
                  <Text className={`font-bold ${isDark ? 'text-white' : 'text-slate-700'}`}>Standard 4</Text>
                  <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>A registrant must seek to ensure that their CPD benefits the service user.</Text>
                </View>
                <View>
                  <Text className={`font-bold ${isDark ? 'text-white' : 'text-slate-700'}`}>Standard 5</Text>
                  <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>A registrant must present a written profile explaining how they have met the standards for CPD if requested by the HCPC.</Text>
                </View>
                <Text className={`text-xs italic mt-4 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>HCPC, 2024</Text>
              </View>
            </ScrollView>

            <Pressable
              onPress={() => setShowHCPCInfo(false)}
              className="mt-8 py-4 rounded-2xl items-center"
              style={{ backgroundColor: accentColor }}
            >
              <Text className="text-white font-bold">Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* NMC Standards Info Modal */}
      <Modal
        visible={showNMCInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNMCInfo(false)}
      >
        <Pressable className="flex-1 bg-black/50 items-center justify-center p-6" onPress={() => setShowNMCInfo(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-3xl p-8 w-full max-w-sm`}>
            <View className="flex-row items-center mb-6">
              <View className="w-12 h-12 rounded-2xl bg-amber-100 items-center justify-center mr-4">
                <MaterialIcons name="help" size={28} color={accentColor} />
              </View>
              <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Standard Proficiency</Text>
            </View>

            <View>
              <Text className={`text-base leading-6 mb-4 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                Please identify the parts of the relevant standard that you used to inform your CPD.
              </Text>
              <Text className={`text-xs italic ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>NMC, 2024</Text>
            </View>

            <Pressable
              onPress={() => setShowNMCInfo(false)}
              className="mt-8 py-4 rounded-2xl items-center"
              style={{ backgroundColor: accentColor }}
            >
              <Text className="text-white font-bold">Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
