import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import '../../global.css';

interface WorkSession {
  id: number;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  workDescription: string | null;
  location: string | null;
  shiftType: string | null;
  hourlyRate: number | null;
  totalEarnings: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EarningsEntry {
  id: string;
  date: string;
  location: string;
  hours: number;
  rate: number;
  amount: string;
  status: 'paid' | 'pending';
  icon: keyof typeof MaterialIcons.glyphMap;
  startTime: string;
}

interface MonthGroup {
  month: string;
  year: number;
  entries: EarningsEntry[];
}

export default function EarningsScreen() {
  const router = useRouter();
  const { isDark } = useThemeStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<EarningsEntry[]>([]);
  const [hourlyRate, setHourlyRate] = useState(35); // Default hourly rate
  const [isRateModalVisible, setIsRateModalVisible] = useState(false);
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);

  // New session state
  const [newSession, setNewSession] = useState({
    location: '',
    shiftType: 'Day',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    hoursWorked: '8',
    hourlyRate: '35',
    totalEarnings: '280',
    description: '',
    documents: [] as any[],
  });

  // Load work hours and calculate earnings
  const loadEarnings = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      // Get hourly rate from user settings or use default
      try {
        const userResponse = await apiService.get<{
          success: boolean;
          data: { hourlyRate?: number };
        }>(API_ENDPOINTS.USERS.ME, token);
        if (userResponse?.data?.hourlyRate) {
          setHourlyRate(userResponse.data.hourlyRate);
        }
      } catch (error) {
        console.warn('Could not load hourly rate, using default');
      }

      // Fetch completed work sessions (not active ones)
      const response = await apiService.get<{
        success: boolean;
        data: WorkSession[];
        pagination: { total: number };
      }>(API_ENDPOINTS.WORK_HOURS.LIST, token);

      if (response.success && response.data) {
        // Filter out active sessions and convert to earnings entries
        const completedSessions = response.data.filter(session =>
          !session.isActive && session.endTime && session.durationMinutes
        );

        const earningsEntries: EarningsEntry[] = completedSessions.map((session) => {
          const hours = session.durationMinutes ? session.durationMinutes / 60 : 0;
          const rate = session.hourlyRate || hourlyRate;
          const amountValue = session.totalEarnings || (hours * rate);
          const startDate = new Date(session.startTime);

          const location = session.location || (session.workDescription || '').split('\n')[0] || 'Work Session';

          // Determine icon based on description
          let icon: keyof typeof MaterialIcons.glyphMap = 'schedule';
          if (location.toLowerCase().includes('hospital') || location.toLowerCase().includes('a&e')) {
            icon = 'local-hospital';
          } else if (location.toLowerCase().includes('gp') || location.toLowerCase().includes('locum')) {
            icon = 'healing';
          } else if (location.toLowerCase().includes('checkup') || location.toLowerCase().includes('health')) {
            icon = 'verified-user';
          }

          // Determine status: if session is older than 7 days, consider it paid
          const daysSinceEnd = (new Date().getTime() - new Date(session.endTime!).getTime()) / (1000 * 60 * 60 * 24);
          const status: 'paid' | 'pending' = daysSinceEnd > 7 ? 'paid' : 'pending';

          return {
            id: String(session.id),
            date: startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            location,
            hours: Math.round(hours * 10) / 10,
            rate: rate,
            amount: `£${amountValue.toFixed(2)}`,
            status,
            icon,
            startTime: session.startTime,
          };
        });

        // Sort by date (newest first)
        earningsEntries.sort((a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );

        setEarnings(earningsEntries);
      }
    } catch (error: any) {
      console.error('Error loading earnings:', error);
      showToast.error(error.message || 'Failed to load earnings', 'Error');
      setEarnings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSetRate = async () => {
    const rate = parseFloat(newSession.hourlyRate);
    const earningsValue = parseFloat(newSession.totalEarnings);

    if (!newSession.location) {
      showToast.error('Please enter a location', 'Error');
      return;
    }

    try {
      setIsUpdatingRate(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const startDateTime = new Date(`${newSession.date}T${newSession.startTime}:00`).toISOString();
      const endDateTime = new Date(`${newSession.date}T${newSession.endTime}:00`).toISOString();

      const response = await apiService.post<{ success: boolean; data: any }>(
        API_ENDPOINTS.WORK_HOURS.CREATE,
        {
          start_time: startDateTime,
          end_time: endDateTime,
          location: newSession.location,
          shift_type: newSession.shiftType,
          hourly_rate: rate,
          total_earnings: earningsValue,
          work_description: newSession.description,
          duration_minutes: parseFloat(newSession.hoursWorked) * 60,
          // document_ids: newSession.documents.map(d => d.id) // backend needs to handle upload first
        },
        token
      );

      if (response.success) {
        setIsRateModalVisible(false);
        showToast.success('Session added successfully', 'Success');
        loadEarnings();
      }
    } catch (error: any) {
      console.error('Error adding session:', error);
      showToast.error(error.message || 'Failed to add session', 'Error');
    } finally {
      setIsUpdatingRate(false);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
      });

      if (!result.canceled) {
        setNewSession(prev => ({
          ...prev,
          documents: [...prev.documents, ...result.assets]
        }));
      }
    } catch (error) {
      console.error('Error picking document:', error);
      showToast.error('Failed to pick document', 'Error');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled) {
        setNewSession(prev => ({
          ...prev,
          documents: [...prev.documents, ...result.assets]
        }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showToast.error('Failed to pick image', 'Error');
    }
  };

  const removeDocument = (index: number) => {
    setNewSession(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const updateCalculatedEarnings = (hours: string, rate: string) => {
    const h = parseFloat(hours) || 0;
    const r = parseFloat(rate) || 0;
    setNewSession(prev => ({
      ...prev,
      hoursWorked: hours,
      hourlyRate: rate,
      totalEarnings: (h * r).toFixed(2)
    }));
  };

  useEffect(() => {
    loadEarnings();
  }, []);

  // Group earnings by month
  const groupedEarnings: MonthGroup[] = earnings.reduce((acc: MonthGroup[], entry) => {
    const entryDate = new Date(entry.startTime);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[entryDate.getMonth()] || 'Unknown';
    const year = entryDate.getFullYear();

    const existingGroup = acc.find(g => g.month === month && g.year === year);
    if (existingGroup) {
      existingGroup.entries.push(entry);
    } else {
      acc.push({ month, year, entries: [entry] });
    }

    return acc;
  }, []);

  // Sort groups by date (newest first)
  groupedEarnings.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months.indexOf(b.month) - months.indexOf(a.month);
  });

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      {/* Header */}
      <View className={`border-b ${isDark ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-zinc-100"}`}>
        <View className="flex-row items-center px-4 py-2 justify-between">
          <Pressable onPress={() => router.back()} className="w-12 h-12 shrink-0 items-center justify-center">
            <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? "#E5E7EB" : "#121417"} />
          </Pressable>
          <Text className={`text-lg font-bold flex-1 text-center ${isDark ? "text-white" : "text-[#121417]"}`}>
            Earnings & Financials
          </Text>
          <Pressable className="w-12 h-12 items-center justify-center">
            <MaterialIcons name="settings" size={20} color={isDark ? "#E5E7EB" : "#121417"} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadEarnings}
            tintColor={isDark ? '#D4AF37' : '#2B5F9E'}
            colors={['#D4AF37', '#2B5F9E']}
          />
        }
      >
        {/* Action Buttons */}
        <View className="flex-row gap-3 px-4 pt-6 pb-2">
          <Pressable
            onPress={() => {
              setNewSession({
                ...newSession,
                hourlyRate: hourlyRate.toString(),
                totalEarnings: (8 * hourlyRate).toFixed(2)
              });
              setIsRateModalVisible(true);
            }}
            className="flex-1 flex-row items-center justify-center gap-2 px-4 h-11 bg-[#2B5E9C]/10 rounded-lg"
          >
            <MaterialIcons name="add" size={20} color="#2B5E9C" />
            <Text className="text-[#2B5E9C] font-semibold text-sm">
              Add Session
            </Text>
          </Pressable>

        </View>

        {/* Loading State */}
        {loading && earnings.length === 0 && (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
            <Text className={`mt-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              Loading earnings...
            </Text>
          </View>
        )}

        {/* Earnings List */}
        {!loading && earnings.length === 0 && (
          <View className={`p-8 rounded-2xl border items-center mx-4 mt-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
            }`}>
            <MaterialIcons name="payments" size={48} color={isDark ? "#4B5563" : "#CBD5E1"} />
            <Text className={`mt-4 text-center ${isDark ? "text-gray-400" : "text-slate-400"}`}>
              No earnings data available
            </Text>
            <Text className={`text-sm mt-2 text-center ${isDark ? "text-gray-500" : "text-slate-500"}`}>
              Complete work sessions to see your earnings here
            </Text>
          </View>
        )}

        {earnings.length > 0 && (
          <View className="px-4" style={{ gap: 24 }}>
            {groupedEarnings.map((group) => (
              <View key={`${group.month}-${group.year}`}>
                <View className="flex-row justify-between items-center pb-2 pt-6">
                  <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-[#121417]"}`}>
                    {group.month} {group.year}
                  </Text>
                  <Pressable onPress={() => router.push('/(tabs)/gallery')}>
                    <Text className="text-[#2B5E9C] text-sm font-semibold">See all</Text>
                  </Pressable>
                </View>

                <View className={`flex-col ${isDark ? "divide-y divide-slate-700" : "divide-y divide-zinc-100"}`}>
                  {group.entries.map((entry) => (
                    <Pressable
                      key={entry.id}
                      onPress={() => {
                        router.push(`/(tabs)/workinghours/${entry.id}` as any);
                      }}
                      className={`flex-row gap-4 px-4 py-4 justify-between items-center ${isDark ? "bg-slate-800" : "bg-white"
                        }`}
                    >
                      <View className="flex-row items-start flex-1 min-w-0" style={{ gap: 16 }}>
                        <View className="text-[#2B5E9C] items-center justify-center rounded-lg bg-[#2B5E9C]/10 shrink-0 w-12 h-12">
                          <MaterialIcons name={entry.icon} size={24} color="#2B5E9C" />
                        </View>
                        <View className="flex-1 flex-col justify-center min-w-0">
                          <Text className={`text-base font-semibold mb-1 ${isDark ? "text-white" : "text-[#121417]"}`} numberOfLines={1}>
                            {entry.date} - {entry.location}
                          </Text>
                          <Text className={`text-xs font-normal ${isDark ? "text-gray-400" : "text-[#687482]"}`}>
                            {entry.hours} hrs @ £{entry.rate}/hr
                          </Text>
                        </View>
                      </View>
                      <View className="shrink-0 text-right ml-2">
                        <Text className={`text-base font-bold ${entry.status === 'paid' ? 'text-[#00C853]' : (isDark ? 'text-white' : 'text-[#121417]')
                          }`}>
                          {entry.amount}
                        </Text>
                        <Text className={`text-[10px] uppercase ${entry.status === 'paid' ? 'text-[#00C853]' : (isDark ? 'text-gray-400' : 'text-[#687482]')
                          }`}>
                          {entry.status === 'paid' ? 'Paid' : 'Pending'}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Earning Session Modal */}
      <Modal
        visible={isRateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsRateModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className={`w-full rounded-t-[40px] p-8 pb-12 ${isDark ? 'bg-slate-900 border-t border-slate-800' : 'bg-white shadow-2xl'}`}>
            <View className="items-center mb-6">
              <View className="w-12 h-1.5 rounded-full bg-slate-300 mb-6" />
              <Text className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Add Earning Session</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[70vh]">
              <View className="gap-5">
                {/* Location */}
                <View>
                  <Text className={`text-sm font-bold mb-2 ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Location</Text>
                  <View className={`flex-row items-center px-4 h-14 rounded-2xl border-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <MaterialIcons name="location-on" size={20} color="#94A3B8" className="mr-2" />
                    <TextInput
                      value={newSession.location}
                      onChangeText={(t) => setNewSession(prev => ({ ...prev, location: t }))}
                      placeholder="Hospital, GP Clinic, etc."
                      placeholderTextColor="#94A3B8"
                      className={`flex-1 text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
                    />
                  </View>
                </View>

                {/* Shift Type & Date */}
                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text className={`text-sm font-bold mb-2 ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Shift Type</Text>
                    <View className={`h-14 rounded-2xl border-2 justify-center px-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <TextInput
                        value={newSession.shiftType}
                        onChangeText={(t) => setNewSession(prev => ({ ...prev, shiftType: t }))}
                        className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
                      />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-bold mb-2 ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Date</Text>
                    <View className={`h-14 rounded-2xl border-2 justify-center px-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <TextInput
                        value={newSession.date}
                        onChangeText={(t) => setNewSession(prev => ({ ...prev, date: t }))}
                        className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
                      />
                    </View>
                  </View>
                </View>

                {/* Time Range */}
                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text className={`text-sm font-bold mb-2 ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Start Time</Text>
                    <View className={`h-14 rounded-2xl border-2 justify-center px-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <TextInput
                        value={newSession.startTime}
                        onChangeText={(t) => setNewSession(prev => ({ ...prev, startTime: t }))}
                        className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
                      />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-bold mb-2 ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>End Time</Text>
                    <View className={`h-14 rounded-2xl border-2 justify-center px-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <TextInput
                        value={newSession.endTime}
                        onChangeText={(t) => setNewSession(prev => ({ ...prev, endTime: t }))}
                        className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
                      />
                    </View>
                  </View>
                </View>

                {/* Hours & Rate */}
                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Text className={`text-sm font-bold mb-2 ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Hours</Text>
                    <View className={`h-14 rounded-2xl border-2 justify-center px-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <TextInput
                        value={newSession.hoursWorked}
                        onChangeText={(t) => updateCalculatedEarnings(t, newSession.hourlyRate)}
                        keyboardType="decimal-pad"
                        className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
                      />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-bold mb-2 ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Rate (£/hr)</Text>
                    <View className={`h-14 rounded-2xl border-2 justify-center px-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <TextInput
                        value={newSession.hourlyRate}
                        onChangeText={(t) => updateCalculatedEarnings(newSession.hoursWorked, t)}
                        keyboardType="decimal-pad"
                        className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
                      />
                    </View>
                  </View>
                </View>

                {/* Total Earnings */}
                <View>
                  <Text className={`text-sm font-bold mb-2 ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Estimated Earnings</Text>
                  <View className={`flex-row items-center px-4 h-16 rounded-2xl bg-green-50 border-2 border-green-100 ${isDark ? 'bg-green-500/10 border-green-500/20' : ''}`}>
                    <Text className="text-2xl font-black text-green-600 mr-2">£</Text>
                    <TextInput
                      value={newSession.totalEarnings}
                      onChangeText={(t) => setNewSession(prev => ({ ...prev, totalEarnings: t }))}
                      keyboardType="decimal-pad"
                      className={`flex-1 text-2xl font-black text-green-600`}
                    />
                  </View>
                </View>

                {/* Description */}
                <View>
                  <Text className={`text-sm font-bold mb-2 ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Description (Optional)</Text>
                  <View className={`p-4 rounded-2xl border-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <TextInput
                      value={newSession.description}
                      onChangeText={(t) => setNewSession(prev => ({ ...prev, description: t }))}
                      placeholder="Add any additional notes..."
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={3}
                      className={`text-base font-semibold min-h-[80px] ${isDark ? 'text-white' : 'text-slate-900'}`}
                    />
                  </View>
                </View>

                {/* Documents */}
                <View>
                  <Text className={`text-sm font-bold mb-2 ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Attachments</Text>

                  {newSession.documents.length > 0 && (
                    <View className="flex-row flex-wrap gap-2 mb-3">
                      {newSession.documents.map((doc, idx) => (
                        <View key={idx} className={`flex-row items-center gap-2 px-3 py-2 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                          <MaterialIcons name={doc.mimeType?.includes('image') ? 'image' : 'insert-drive-file'} size={16} color="#64748B" />
                          <Text className={`text-xs font-semibold max-w-[100px] ${isDark ? 'text-white' : 'text-slate-700'}`} numberOfLines={1}>
                            {doc.name}
                          </Text>
                          <Pressable onPress={() => removeDocument(idx)}>
                            <MaterialIcons name="cancel" size={16} color="#EF4444" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}

                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={handlePickDocument}
                      className={`flex-1 flex-row items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed ${isDark ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50'}`}
                    >
                      <MaterialIcons name="upload-file" size={20} color="#64748B" />
                      <Text className="text-slate-500 font-bold text-xs text-center">Files</Text>
                    </Pressable>
                    <Pressable
                      onPress={handlePickImage}
                      className={`flex-1 flex-row items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed ${isDark ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50'}`}
                    >
                      <MaterialIcons name="camera-alt" size={20} color="#64748B" />
                      <Text className="text-slate-500 font-bold text-xs text-center">Images</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View className="flex-row gap-4 mt-8">
              <Pressable
                onPress={() => setIsRateModalVisible(false)}
                className={`flex-1 h-14 items-center justify-center rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
              >
                <Text className={`font-bold text-base ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSetRate}
                disabled={isUpdatingRate}
                className="flex-[2] h-14 items-center justify-center bg-[#2B5E9C] rounded-2xl shadow-xl shadow-blue-500/30"
              >
                {isUpdatingRate ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-black text-lg">Save Session</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
