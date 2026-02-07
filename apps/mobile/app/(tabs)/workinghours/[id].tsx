import { View, Text, ScrollView, Pressable, ActivityIndicator, Modal, TextInput, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { usePremium } from '@/hooks/usePremium';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ImageViewerModal } from '@/features/documents/components/ImageViewerModal';
import { downloadAndShareFile, isImageFile } from '@/utils/document';
import '../../global.css';

interface WorkSession {
  id: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  workDescription: string | null;
  location?: string;
  shiftType?: string;
  hourlyRate?: number | null;
  totalEarnings?: number | null;
  documentIds: number[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function WorkHistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useThemeStore();
  const { isPremium } = usePremium();
  const accentColor = isPremium ? '#D4AF37' : '#2B5F9E';
  const accentSoft = isPremium ? 'rgba(212, 175, 55, 0.18)' : 'rgba(43, 95, 158, 0.18)';
  const accentText = isPremium ? '#F9E3A1' : '#FFFFFF';
  const accentTextMuted = isPremium ? '#F0D27A' : 'rgba(255, 255, 255, 0.8)';
  const accentTextSecondary = isPremium ? '#E6C266' : 'rgba(255, 255, 255, 0.7)';
  const isMountedRef = useRef(true);
  const [session, setSession] = useState<WorkSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    description: '',
    location: '',
    shiftType: '',
  });

  // Edit Files State
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{ name: string, type: string } | null>(null);
  const [hasExistingAttachment, setHasExistingAttachment] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (id) {
      loadWorkSession();
    }
  }, [id]);

  useEffect(() => {
    if (session?.documentIds && session.documentIds.length > 0) {
      checkAttachment(session.documentIds[0] as number);
    }
  }, [session]);

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
        if (isMountedRef.current) {
          setAttachmentUrl(url);
        }
      }
    } catch (e) {
      console.warn('Failed to load attachment info', e);
    }
  };

  const loadWorkSession = async () => {
    try {
      if (!refreshing && isMountedRef.current) setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        try {
          router.replace('/(auth)/login');
        } catch (e) {
          console.warn('Navigation not ready for login redirect:', e);
        }
        return;
      }

      const response = await apiService.get<{
        success: boolean;
        data: WorkSession;
      }>(`${API_ENDPOINTS.WORK_HOURS.GET_BY_ID}/${id}`, token);

      if (response.success && response.data) {
        if (isMountedRef.current) {
          setSession(response.data);
        }
      } else {
        showToast.error('Session not found', 'Error');
        router.back();
      }
    } catch (error: any) {
      console.error('Error loading work session:', error);
      showToast.error(error.message || 'Failed to load session', 'Error');
      router.back();
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const handleEditOpen = () => {
    if (!session) return;
    const start = new Date(session.startTime);
    const end = session.endTime ? new Date(session.endTime) : null;

    setForm({
      date: session.startTime.split('T')[0] ?? '',
      startTime: `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`,
      endTime: end ? `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}` : '',
      description: session.workDescription || '',
      location: session.location || '',
      shiftType: session.shiftType || '',
    });

    setFileUri(null);
    setAttachment(null);
    setHasExistingAttachment(session.documentIds && session.documentIds.length > 0);
    setShowEditModal(true);
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
          setHasExistingAttachment(false);
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

  const handleUpdate = async () => {
    if (!form.date || !form.startTime) {
      showToast.error('Date and start time are required', 'Validation Error');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const start_time = new Date(`${form.date}T${form.startTime}:00`).toISOString();
      let end_time = null;
      if (form.endTime) {
        end_time = new Date(`${form.date}T${form.endTime}:00`).toISOString();
      }

      // Upload file if selected
      let documentIds: number[] = hasExistingAttachment && session ? session.documentIds : [];
      if (fileUri && attachment) {
        try {
          const uploadRes: any = await apiService.uploadFile(
            API_ENDPOINTS.DOCUMENTS.UPLOAD,
            { uri: fileUri, type: attachment.type, name: attachment.name },
            token,
            { title: 'Work Session Attachment', category: 'workinghours' }
          );
          if (uploadRes?.data?.id) {
            documentIds = [uploadRes.data.id];
          }
        } catch (e) {
          console.error("Upload failed in edit", e);
        }
      } else if (!hasExistingAttachment && !fileUri) {
        documentIds = [];
      }

      await apiService.put(`${API_ENDPOINTS.WORK_HOURS.UPDATE}/${id}`, {
        start_time,
        end_time,
        work_description: form.description,
        location: form.location,
        shift_type: form.shiftType,
        document_ids: documentIds
      }, token);

      showToast.success('Work session updated', 'Success');
      setShowEditModal(false);
      loadWorkSession();
    } catch (error: any) {
      console.error('Update failed:', error);
      showToast.error(error.message || 'Failed to update session', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDocument = async () => {
    try {
      let url = attachmentUrl;
      if (!url && session?.documentIds && session.documentIds.length > 0) {
        const token = await AsyncStorage.getItem('authToken');
        const res = await apiService.get<{ data: { document: string } }>(`${API_ENDPOINTS.DOCUMENTS.GET_BY_ID}/${session.documentIds[0]}`, token || '');
        url = res?.data?.document;
      }

      if (url) {
        let fullUrl = url;

        if (!fullUrl.startsWith('http') || fullUrl.includes('localhost') || fullUrl.includes('127.0.0.1')) {
          const pathPart = fullUrl.startsWith('http')
            ? fullUrl.replace(/^https?:\/\/[^\/]+/, '')
            : fullUrl;

          const apiBase = apiService.baseUrl;
          fullUrl = `${apiBase}${pathPart.startsWith('/') ? '' : '/'}${pathPart}`;
        }

        if (isImageFile(fullUrl)) {
          setViewerUrl(fullUrl);
          setViewerVisible(true);
        } else {
          await downloadAndShareFile(fullUrl, session?.id ? `work-session-${session.id}` : 'document');
        }
      } else {
        showToast.error('Document URL not found', 'Error');
      }
    } catch (e) {
      console.error('Error opening document:', e);
      showToast.error('Failed to open document', 'Error');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={accentColor} />
          <Text className={`mt-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Loading session details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className={`text-lg ${isDark ? "text-white" : "text-slate-800"}`}>
            Session not found
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-4 px-6 py-3 rounded-full"
            style={{ backgroundColor: accentColor }}
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const month = monthNames[monthIndex] || 'Unknown';
    const year = date.getFullYear();
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
    return { day, month, year, dayOfWeek };
  };

  const dateInfo = formatDate(session.startTime);
  const hours = session.durationMinutes ? session.durationMinutes / 60 : 0;
  const avgHourlyRate = session.hourlyRate ?? 0;
  const earnings = session.totalEarnings ?? (hours * avgHourlyRate);

  const formatDuration = (minutes: number | null, start: string, end?: string | null) => {
    let totalSeconds = 0;
    if (end) {
      const startMs = new Date(start).getTime();
      const endMs = new Date(end).getTime();
      if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
        totalSeconds = Math.floor((endMs - startMs) / 1000);
      }
    }

    if (!totalSeconds && minutes) {
      totalSeconds = Math.round(minutes * 60);
    }

    if (!totalSeconds) return '0h 0m 0s';

    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  // Prioritize dedicated fields, fallback to description parsing for legacy support
  const location = session.location || session.workDescription?.split('\n')[0] || 'Work Session';
  const shiftType = session.shiftType || session.workDescription?.split('\n')[1] || 'General Work';

  // Format time range
  const startTime = new Date(session.startTime);
  const endTime = session.endTime ? new Date(session.endTime) : null;
  const timeRange = endTime
    ? `${startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : `${startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - Ongoing`;

  const DetailRow = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
    <View className={`flex-row items-start mb-4 p-4 rounded-xl ${isDark ? "bg-slate-800 border border-slate-700" : "bg-slate-50 border border-slate-100"
      }`}>
      <View className={`w-10 h-10 rounded-lg items-center justify-center mr-3 ${isDark ? "bg-slate-700" : "bg-white"
        }`}>
        <MaterialIcons name={icon as any} size={20} color={isDark ? "#9CA3AF" : "#64748B"} />
      </View>
      <View className="flex-1">
        <Text className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? "text-gray-400" : "text-slate-500"
          }`}>
          {label}
        </Text>
        <Text className={`text-base font-medium ${isDark ? "text-white" : "text-slate-800"}`}>
          {value}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      {/* Header */}
      <View className={`px-4 py-4 border-b ${isDark ? "border-slate-700" : "border-slate-200"
        }`}>
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className={`w-10 h-10 items-center justify-center rounded-full mr-3 ${isDark ? "bg-slate-700" : "bg-slate-100"
              }`}
          >
            <MaterialIcons name="arrow-back" size={24} color={isDark ? "#9CA3AF" : "#64748B"} />
          </Pressable>
          <View className="flex-1">
            <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
              Work Session Details
            </Text>
            <Text className={`text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              {dateInfo.dayOfWeek}, {dateInfo.month} {dateInfo.day}, {dateInfo.year}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadWorkSession(); }}
            tintColor={accentColor}
          />
        }
      >
        {/* Date Badge Card */}
        <View className="px-4 pt-6 pb-4">
          <View
            className="p-6 rounded-3xl shadow-lg"
            style={{ backgroundColor: isDark ? accentSoft : accentColor }}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text
                  className="text-sm font-medium uppercase tracking-wider mb-2"
                  style={{ color: isDark ? accentTextMuted : accentTextMuted }}
                >
                  Session Date
                </Text>
                <View className="flex-row items-baseline">
                  <Text
                    className="text-4xl font-bold mr-2"
                    style={{ color: isDark ? accentText : '#FFFFFF' }}
                  >
                    {dateInfo.day}
                  </Text>
                  <View>
                    <Text
                      className="text-lg font-semibold"
                      style={{ color: isDark ? accentText : '#FFFFFF' }}
                    >
                      {dateInfo.month.substring(0, 3).toUpperCase()}
                    </Text>
                    <Text
                      className="text-sm"
                      style={{ color: isDark ? accentTextSecondary : accentTextSecondary }}
                    >
                      {dateInfo.year}
                    </Text>
                  </View>
                </View>
              </View>
              <View
                className="w-20 h-20 rounded-2xl items-center justify-center"
                style={{ backgroundColor: isDark ? accentSoft : 'rgba(255, 255, 255, 0.2)' }}
              >
                <MaterialIcons
                  name="schedule"
                  size={40}
                  color={isDark ? accentText : '#FFFFFF'}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Main Details */}
        <View className="px-4 mt-2">
          <DetailRow
            label="Location"
            value={location}
            icon="location-on"
          />
          <DetailRow
            label="Shift Type"
            value={shiftType}
            icon="work"
          />
          <DetailRow
            label="Time Range"
            value={timeRange}
            icon="schedule"
          />
          <DetailRow
            label="Hours Worked"
            value={formatDuration(session.durationMinutes, session.startTime, session.endTime)}
            icon="access-time"
          />
          <DetailRow
            label="Earnings"
            value={`£${earnings.toFixed(2)}`}
            icon="attach-money"
          />
          <DetailRow
            label="Hourly Rate"
            value={`£${avgHourlyRate.toFixed(2)}/hr`}
            icon="payments"
          />
          {session.documentIds && session.documentIds.length > 0 && (
            <DetailRow
              label="Attached Documents"
              value={`${session.documentIds.length} document${session.documentIds.length !== 1 ? 's' : ''}`}
              icon="description"
            />
          )}

          {/* Evidence Preview */}
          {attachmentUrl && (
            <View className={`mt-2 mb-4 p-4 rounded-xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"}`}>
              <View className="flex-row items-center mb-4">
                <MaterialIcons name="attach-file" size={20} color={isDark ? "#fff" : "#333"} />
                <Text className={`text-lg font-bold ml-2 ${isDark ? "text-white" : "text-slate-800"}`}>Evidence</Text>
              </View>

              {/\.(jpg|jpeg|png|gif|webp)$/i.test(attachmentUrl) && (
                <View className="mb-4 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                  <Image source={{ uri: attachmentUrl }} className="w-full h-48 bg-gray-100 dark:bg-slate-700" resizeMode="cover" />
                </View>
              )}

              <Pressable
                onPress={handleViewDocument}
                className={`bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100 dark:border-slate-600 flex-row items-center active:opacity-70`}
              >
                <MaterialIcons name="description" size={24} color={accentColor} />
                <View className="ml-3">
                  <Text className={`font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>Attached Evidence</Text>
                  <Text className="text-xs" style={{ color: accentColor }}>Tap to View File</Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>

        {/* Description Section */}
        {session.workDescription && (
          <View className="px-4 mt-2 mb-6">
            <View className={`p-4 rounded-xl ${isDark ? "bg-slate-800 border border-slate-700" : "bg-slate-50 border border-slate-100"
              }`}>
              <View className="flex-row items-center mb-3">
                <MaterialIcons
                  name="description"
                  size={20}
                  color={isDark ? "#9CA3AF" : "#64748B"}
                />
                <Text className={`text-xs font-semibold uppercase tracking-wider ml-2 ${isDark ? "text-gray-400" : "text-slate-500"
                  }`}>
                  Description
                </Text>
              </View>
              <Text className={`text-base leading-6 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                {session.workDescription}
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View className="px-4 mb-6" style={{ gap: 12 }}>
          <Pressable
            onPress={handleEditOpen}
            className={`p-4 rounded-xl flex-row items-center justify-center active:opacity-70 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-200"
              }`}
          >
            <MaterialIcons
              name="edit"
              size={20}
              color={isDark ? "#9CA3AF" : "#64748B"}
            />
            <Text className={`ml-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>
              Edit Session
            </Text>
          </Pressable>
          <Pressable
            onPress={handleViewDocument}
            className={`p-4 rounded-xl flex-row items-center justify-center active:opacity-70 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-200"
              }`}
          >
            <MaterialIcons
              name="photo-library"
              size={20}
              color={isDark ? "#9CA3AF" : "#64748B"}
            />
            <Text className={`ml-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>
              View Documents
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Edit Session Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`rounded-t-3xl max-h-[90%] w-full ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <SafeAreaView edges={['bottom']}>
              <View className={`flex-row justify-between items-center p-4 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Edit Work Session</Text>
                <Pressable onPress={() => setShowEditModal(false)}>
                  <MaterialIcons name="close" size={24} color={isDark ? "#9CA3AF" : "#64748B"} />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
                <View>
                  <Text className={`mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Date (YYYY-MM-DD)</Text>
                  <TextInput
                    value={form.date}
                    onChangeText={t => setForm({ ...form, date: t })}
                    placeholder="2024-03-20"
                    className={`p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-200 text-slate-800"}`}
                  />
                </View>

                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text className={`mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Start Time (HH:MM)</Text>
                    <TextInput
                      value={form.startTime}
                      onChangeText={t => setForm({ ...form, startTime: t })}
                      placeholder="09:00"
                      className={`p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-200 text-slate-800"}`}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className={`mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>End Time (HH:MM)</Text>
                    <TextInput
                      value={form.endTime}
                      onChangeText={t => setForm({ ...form, endTime: t })}
                      placeholder="17:00"
                      className={`p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-200 text-slate-800"}`}
                    />
                  </View>
                </View>

                <View>
                  <Text className={`mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Location</Text>
                  <TextInput
                    value={form.location}
                    onChangeText={t => setForm({ ...form, location: t })}
                    placeholder="Hospital/Clinic name"
                    className={`p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-200 text-slate-800"}`}
                  />
                </View>

                <View>
                  <Text className={`mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Shift Type</Text>
                  <TextInput
                    value={form.shiftType}
                    onChangeText={t => setForm({ ...form, shiftType: t })}
                    placeholder="Day, Night, Weekend..."
                    className={`p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-200 text-slate-800"}`}
                  />
                </View>

                <View>
                  <Text className={`mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Description</Text>
                  <TextInput
                    value={form.description}
                    onChangeText={t => setForm({ ...form, description: t })}
                    placeholder="Notes about the session..."
                    multiline
                    numberOfLines={4}
                    className={`p-3 rounded-xl border min-h-[100px] ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-200 text-slate-800"}`}
                  />
                </View>

                {/* Evidence Section */}
                <View>
                  <Text className={`mb-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>Evidence</Text>

                  {hasExistingAttachment ? (
                    <View className={`flex-row items-center justify-between p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                      <View className="flex-row items-center flex-1">
                        <MaterialIcons name="attach-file" size={20} color={isDark ? "#9CA3AF" : "#64748B"} />
                        <Text className={`ml-2 ${isDark ? "text-gray-300" : "text-gray-700"}`} numberOfLines={1}>Existing Evidence</Text>
                      </View>
                      <Pressable onPress={() => setHasExistingAttachment(false)} className="p-2">
                        <MaterialIcons name="close" size={20} color="#EF4444" />
                      </Pressable>
                    </View>
                  ) : fileUri && attachment ? (
                    <View className={`flex-row items-center justify-between p-3 rounded-xl border ${isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                      <View className="flex-row items-center flex-1">
                        <MaterialIcons name="upload-file" size={20} color={accentColor} />
                        <Text className={`ml-2 ${isDark ? "text-gray-300" : "text-gray-700"}`} numberOfLines={1}>{attachment.name}</Text>
                      </View>
                      <Pressable onPress={() => { setFileUri(null); setAttachment(null); }} className="p-2">
                        <MaterialIcons name="close" size={20} color="#EF4444" />
                      </Pressable>
                    </View>
                  ) : (
                    <View className="flex-row gap-3">
                      <Pressable onPress={() => handleFileSelect('camera')} className={`flex-1 p-3 rounded-xl border items-center justify-center ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"}`}>
                        <MaterialIcons name="camera-alt" size={24} color={accentColor} />
                        <Text className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Camera</Text>
                      </Pressable>
                      <Pressable onPress={() => handleFileSelect('gallery')} className={`flex-1 p-3 rounded-xl border items-center justify-center ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"}`}>
                        <MaterialIcons name="photo-library" size={24} color={accentColor} />
                        <Text className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Gallery</Text>
                      </Pressable>
                      <Pressable onPress={() => handleFileSelect('files')} className={`flex-1 p-3 rounded-xl border items-center justify-center ${isDark ? "bg-slate-700 border-slate-600" : "bg-white border-gray-200"}`}>
                        <MaterialIcons name="folder" size={24} color={accentColor} />
                        <Text className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Files</Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                <Pressable
                  onPress={handleUpdate}
                  disabled={isSubmitting}
                  className={`p-4 rounded-xl items-center mt-4 shadow-sm ${isSubmitting ? "bg-gray-400" : ""}`}
                  style={!isSubmitting ? { backgroundColor: accentColor } : undefined}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-base">Save Changes</Text>
                  )}
                </Pressable>

                <View style={{ height: 20 }} />
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
      <ImageViewerModal
        isVisible={viewerVisible}
        imageUrl={viewerUrl}
        onClose={() => setViewerVisible(false)}
      />
    </SafeAreaView>
  );
}
