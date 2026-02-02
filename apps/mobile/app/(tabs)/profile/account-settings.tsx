import { View, Text, ScrollView, Pressable, TextInput, RefreshControl, ActivityIndicator, Image, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { useProfile } from '@/hooks/useProfile';
import { usePremium } from '@/hooks/usePremium';
import { showToast } from '@/utils/toast';
import '../../global.css';

export default function AccountSettingsScreen() {
  const { isDark } = useThemeStore();
  const { profile, refresh: refreshProfile } = useProfile();
  const { isPremium } = usePremium();

  const isMountedRef = useRef(true);

  const premiumGold = '#D4AF37';
  const premiumGoldDark = '#B8860B';
  const accentColor = isPremium ? premiumGold : '#2B5E9C';
  const accentStrong = isPremium ? premiumGoldDark : '#2563EB';
  const accentSoftLight = isPremium ? 'rgba(212, 175, 55, 0.15)' : 'rgba(59, 130, 246, 0.1)';
  const accentSoftDark = isPremium ? 'rgba(212, 175, 55, 0.2)' : 'rgba(30, 58, 138, 0.2)';
  const selectedTextColor = isPremium ? (isDark ? '#F4DFA6' : '#B8860B') : (isDark ? '#60A5FA' : '#2563EB');
  const iconAccentColor = isPremium ? premiumGold : (isDark ? '#D4AF37' : '#2B5E9C');
  const refreshTint = isPremium ? premiumGold : '#2B5F9E';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [revalidationDate, setRevalidationDate] = useState<Date | null>(null);
  const [workSetting, setWorkSetting] = useState('');
  const [scope, setScope] = useState('');
  const [professionalRegistrations, setProfessionalRegistrations] = useState<string[]>([]);
  const [registrationPin, setRegistrationPin] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [workHoursCompleted, setWorkHoursCompleted] = useState('');
  const [trainingHoursCompleted, setTrainingHoursCompleted] = useState('');
  const [earningsCurrentYear, setEarningsCurrentYear] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [notepad, setNotepad] = useState('');

  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Modals / Selection state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWorkSettingModal, setShowWorkSettingModal] = useState(false);
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [registrationOptions, setRegistrationOptions] = useState<{ value: string; label: string }[]>([]);
  const [workSettingsOptions, setWorkSettingsOptions] = useState<{ value: string; label: string }[]>([]);
  const [scopeOptions, setScopeOptions] = useState<{ value: string; label: string }[]>([]);

  // Calendar state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadUserData();
    loadProfileImage();
  }, []);

  // Hydrate form from profile if onboarding data fails
  useEffect(() => {
    if (!name && profile?.name) setName(profile.name);
    if (!email && profile?.email) setEmail(profile.email);
    if (!role && profile?.professionalRole) setRole(profile.professionalRole);
    if (!registrationNumber && profile?.registrationNumber) setRegistrationNumber(profile.registrationNumber);
    if (profile?.image) setProfileImage(profile.image);
  }, [profile]);

  const loadProfileImage = async () => {
    try {
      const key = profile?.id ? `profile_image_uri_${profile.id}` : 'profile_image_uri';
      let savedImage = await AsyncStorage.getItem(key);

      // migrate legacy key to per-user key when possible
      if (!savedImage && profile?.id) {
        const legacy = await AsyncStorage.getItem('profile_image_uri');
        if (legacy) {
          savedImage = legacy;
          await AsyncStorage.setItem(`profile_image_uri_${profile.id}`, legacy);
          await AsyncStorage.removeItem('profile_image_uri');
        }
      }

      if (savedImage && !profile?.image) setProfileImage(savedImage);
    } catch (e) {
      console.log('Failed to load profile image', e);
    }
  };

  const loadUserData = async () => {
    try {
      if (isMountedRef.current) {
        setLoading(true);
      }
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        try {
          router.replace('/(auth)/login');
        } catch (e) {
          console.warn('Navigation not ready for login redirect:', e);
        }
        return;
      }

      // Fetch all onboarding data
      const response = await apiService.get<{
        success: boolean;
        data: any;
      }>(API_ENDPOINTS.USERS.ONBOARDING.DATA, token);

      if (response?.data) {
        const data = response.data;
        if (isMountedRef.current) {
          setName(data.step2?.name || profile?.name || '');
          setEmail(data.step2?.email || profile?.email || '');
          setPhone(data.step2?.phone || '');
          setRole(data.step1?.role || profile?.professionalRole || '');
          setRegistrationNumber(data.step3?.registrationNumber || profile?.registrationNumber || '');
        }

        if (data.step3) {
          const s3 = data.step3;
          if (isMountedRef.current) {
            if (s3.revalidationDate) setRevalidationDate(new Date(s3.revalidationDate));
            setWorkSetting(s3.workSetting || '');
            setScope(s3.scope || '');
            setProfessionalRegistrations(Array.isArray(s3.professionalRegistrations) ? s3.professionalRegistrations : []);
            setRegistrationPin(s3.registrationPin || '');
            setHourlyRate(String(s3.hourlyRate || ''));
            setWorkHoursCompleted(String(s3.workHoursCompleted || ''));
            setTrainingHoursCompleted(String(s3.trainingHoursCompleted || ''));
            setEarningsCurrentYear(String(s3.earningsCurrentYear || ''));
            setWorkDescription(s3.workDescription || '');
            setNotepad(s3.notepad || '');
          }
        }
      }

      // Load master lists for dropdowns
      try {
        const [rolesResp, workResp, scopeResp] = await Promise.all([
          apiService.get<any>(API_ENDPOINTS.USERS.ONBOARDING.ROLES, token),
          apiService.get<any>('/api/v1/profile/work', token),
          apiService.get<any>('/api/v1/profile/scope', token),
        ]);

        if (rolesResp?.data?.roles) {
          // Flatten roles into registration types if needed, or follow onboarding logic
          // For now let's just use the ones already provided in onboarding
        }

        if (workResp?.data || Array.isArray(workResp)) {
          const items = Array.isArray(workResp) ? workResp : workResp.data;
          if (isMountedRef.current) {
            setWorkSettingsOptions(items.filter((i: any) => i.status === 'one').map((i: any) => ({ value: i.name || i.id, label: i.name })));
          }
        }

        if (scopeResp?.data || Array.isArray(scopeResp)) {
          const items = Array.isArray(scopeResp) ? scopeResp : scopeResp.data;
          if (isMountedRef.current) {
            setScopeOptions(items.filter((i: any) => i.status === 'one').map((i: any) => ({ value: i.name || i.id, label: i.name })));
          }
        }

        // Fetch registration options
        const regResp = await apiService.get<any>('/api/v1/profile/registration', token);
        if (regResp?.data || Array.isArray(regResp)) {
          const items = Array.isArray(regResp) ? regResp : regResp.data;
          if (isMountedRef.current) {
            setRegistrationOptions(items.filter((i: any) => i.status === 'one').map((i: any) => ({ value: i.name || i.id, label: i.name })));
          }
        }

      } catch (e) {
        console.log('Failed to load master lists', e);
      }
    } catch (error: any) {
      console.error('Error loading user data:', error);
      // Don't show error to user, just rely on useProfile fallback
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const handleImagePick = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast.error('Gallery permission required', 'Permission');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setProfileImage(uri);
        const key = profile?.id ? `profile_image_uri_${profile.id}` : 'profile_image_uri';
        await AsyncStorage.setItem(key, uri);

        // Upload silently
        try {
          const token = await AsyncStorage.getItem('authToken');
          if (token) {
            await apiService.uploadFile(
              API_ENDPOINTS.DOCUMENTS.UPLOAD,
              { uri, type: 'image/jpeg', name: 'profile_pic.jpg' },
              token,
              { category: 'profile_picture' }
            );
            await refreshProfile();
          }
        } catch (e) {
          console.log('Background upload failed', e);
        }
      }
    } catch (e) {
      showToast.error('Failed to pick image', 'Error');
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      // Update personal details (Step 2)
      await apiService.post(API_ENDPOINTS.USERS.ONBOARDING.STEP_2, {
        name,
        email,
        phone_number: phone,
      }, token);

      // Update professional details (Profile)
      let apiRole = role.toLowerCase();
      const validRoles = ['doctor', 'nurse', 'pharmacist', 'other', 'other_healthcare'];

      const updatePayload: any = {
        registration_number: registrationNumber,
        revalidation_date: revalidationDate ? revalidationDate.toISOString().split('T')[0] : undefined,
        work_setting: workSetting,
        scope_of_practice: scope,
        professional_registrations: professionalRegistrations.join(','),
        registration_reference_pin: registrationPin,
        hourly_rate: parseFloat(hourlyRate) || 0,
        work_hours_completed_already: parseInt(workHoursCompleted) || 0,
        training_hours_completed_already: parseInt(trainingHoursCompleted) || 0,
        earned_current_financial_year: parseFloat(earningsCurrentYear) || 0,
        brief_description_of_work: workDescription,
        notepad: notepad,
      };

      if (validRoles.includes(apiRole)) {
        updatePayload.professional_role = apiRole;
      }

      await apiService.put(API_ENDPOINTS.USERS.UPDATE_PROFILE, updatePayload, token);

      // Refresh global profile logic
      await refreshProfile();

      showToast.success('Settings updated successfully', 'Success');
      loadUserData();
    } catch (error: any) {
      console.error('Error updating settings:', error);
      showToast.error(error.message || 'Failed to update settings', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    await refreshProfile();
  };

  const RESET_SECTIONS = [
    { id: 'work_hours', label: 'Work Hours', icon: 'schedule' },
    { id: 'cpd_hours', label: 'CPD Hours', icon: 'school' },
    { id: 'reflections', label: 'Reflections', icon: 'note' },
    { id: 'feedback', label: 'Feedback', icon: 'feedback' },
    { id: 'documents', label: 'Documents', icon: 'folder' },
  ] as const;

  const handleResetSection = (section: typeof RESET_SECTIONS[number]) => {
    Alert.alert(
      `Reset ${section.label}?`,
      `This will permanently delete all your ${section.label.toLowerCase()} data. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsResetting(true);
              const token = await AsyncStorage.getItem('authToken');
              if (!token) {
                showToast.error('Please login again');
                return;
              }

              await apiService.post(
                API_ENDPOINTS.USERS.RESET_SECTION,
                { section: section.id },
                token
              );

              showToast.success(`${section.label} data has been reset`);
              loadUserData();
            } catch (error: any) {
              console.error('Error resetting section:', error);
              showToast.error(error?.message || 'Failed to reset data');
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const handleDateSelect = (day: number) => {
    setRevalidationDate(new Date(selectedYear, selectedMonth, day));
    setShowDatePicker(false);
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

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const nodes: any[] = [];
    for (let i = 0; i < firstDay; i++) nodes.push(<View key={`empty-${i}`} className="w-10 h-10" />);
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = revalidationDate?.getDate() === day && revalidationDate?.getMonth() === selectedMonth && revalidationDate?.getFullYear() === selectedYear;
      nodes.push(
        <Pressable
          key={day}
          onPress={() => handleDateSelect(day)}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: isSelected ? accentStrong : (isDark ? 'rgba(51, 65, 85, 0.5)' : 'transparent') }}
        >
          <Text className={`text-sm font-medium ${isSelected ? 'text-white' : isDark ? 'text-white' : 'text-gray-900'}`}>{day}</Text>
        </Pressable>
      );
    }
    return nodes;
  };

  const toggleRegistration = (value: string) => {
    if (professionalRegistrations.includes(value)) {
      setProfessionalRegistrations(professionalRegistrations.filter(r => r !== value));
    } else {
      setProfessionalRegistrations([...professionalRegistrations, value]);
    }
  };

  const SectionHeader = ({ icon, title }: { icon: keyof typeof MaterialIcons.glyphMap; title: string }) => (
    <View className="flex-row items-center mb-2 mt-4 px-1" style={{ gap: 8 }}>
      <MaterialIcons name={icon} size={20} color={iconAccentColor} />
      <Text className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-slate-500"}`}>
        {title}
      </Text>
    </View>
  );

  const InputField = ({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false }: any) => (
    <View>
      <Text className={`text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>{label}</Text>
      <View className={`rounded-2xl border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={isDark ? "#6B7280" : "#94A3B8"}
          className={`px-4 py-3 text-base ${isDark ? "text-white" : "text-slate-900"}`}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          style={multiline ? { textAlignVertical: 'top', minHeight: 100 } : {}}
        />
      </View>
    </View>
  );

  const SelectField = ({ label, value, onPress, placeholder }: any) => (
    <View>
      <Text className={`text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>{label}</Text>
      <Pressable
        onPress={onPress}
        className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}
      >
        <Text className={`text-base ${value ? (isDark ? "text-white" : "text-slate-900") : (isDark ? "text-gray-500" : "text-slate-400")}`}>
          {value || placeholder}
        </Text>
        <MaterialIcons name="keyboard-arrow-down" size={20} color={isDark ? "#6B7280" : "#9CA3AF"} />
      </Pressable>
    </View>
  );

  const SectionSaveButton = ({ label }: { label: string }) => (
    <Pressable
      onPress={handleSave}
      disabled={isSaving}
      className="rounded-2xl p-3 items-center shadow-sm"
      style={{ backgroundColor: isSaving ? '#9CA3AF' : accentColor }}
    >
      {isSaving ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className="text-white font-semibold text-base">{label}</Text>
      )}
    </Pressable>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-slate-50"}`} edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={refreshTint}
            colors={[refreshTint]}
          />
        }
      >
        {/* Header */}
        <View className={`border-b ${isDark ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-gray-100"}`}>
          <View className="flex-row items-center justify-between px-4 py-2">
           
            <Text className={`text-lg font-bold flex-1 text-center ${isDark ? "text-white" : "text-[#121417]"}`}>
              Account Settings
            </Text>
            <View className="w-12" />
          </View>
        </View>

        {loading && !refreshing && !profile ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={refreshTint} />
          </View>
        ) : (
          <View className="px-6 pb-8" style={{ gap: 24 }}>
            {/* Profile Picture Section */}
            <View className="items-center my-8">
              <View className="relative">
                <View className={`w-32 h-32 rounded-full border-4 overflow-hidden shadow-sm ${isDark ? "border-slate-800" : "border-slate-200"
                  }`}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} className="w-full h-full" />
                  ) : (
                    <View className="w-full h-full items-center justify-center" style={{ backgroundColor: isPremium ? 'rgba(212, 175, 55, 0.2)' : 'rgba(43, 94, 156, 0.2)' }}>
                      <MaterialIcons name="person" size={64} color={accentColor} />
                    </View>
                  )}
                </View>
                <Pressable
                  onPress={handleImagePick}
                  className={`absolute bottom-1 right-1 p-2 rounded-full border-2 shadow-lg ${isDark ? "border-slate-800" : "border-slate-200"
                    }`}
                  style={{ backgroundColor: accentColor }}
                >
                  <MaterialIcons name="camera-alt" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>

            {/* Personal Details */}
            <View style={{ gap: 16 }}>
              <SectionHeader icon="person" title="Personal Details" />
              <InputField label="Full Name" value={name} onChangeText={setName} placeholder="Enter your full name" />
              <InputField label="Email Address" value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" />
              <InputField label="Phone Number" value={phone} onChangeText={setPhone} placeholder="Enter your phone number" keyboardType="phone-pad" />
              <View>
                <Text className={`text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Professional Role</Text>
                <View className={`rounded-2xl border px-4 py-3 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200 shadow-sm"}`}>
                  <Text className={`text-base ${isDark ? "text-white" : "text-slate-900"}`}>{role || 'Other'}</Text>
                </View>
                <Text className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                  Role is set during onboarding and affects requirements.
                </Text>
              </View>
              <SectionSaveButton label="Save Personal Details" />
            </View>

            {/* Professional Details */}
            <View style={{ gap: 16 }}>
              <SectionHeader icon="badge" title="Professional Details" />
              <InputField label="Registration Number" value={registrationNumber} onChangeText={setRegistrationNumber} placeholder="Enter registration number" />
              <SelectField
                label="Revalidation Date"
                value={revalidationDate ? formatDate(revalidationDate) : ''}
                onPress={() => setShowDatePicker(true)}
                placeholder="Select revalidation date"
              />
              <InputField label="Registration PIN" value={registrationPin} onChangeText={setRegistrationPin} placeholder="Enter PIN (if applicable)" />
              <SelectField
                label="Professional Registrations"
                value={professionalRegistrations.length > 0 ? `${professionalRegistrations.length} items selected` : ''}
                onPress={() => setShowRegistrationsModal(true)}
                placeholder="Select registrations"
              />
              <SectionSaveButton label="Save Professional Details" />
            </View>

            {/* Practice Settings */}
            <View style={{ gap: 16 }}>
              <SectionHeader icon="business" title="Practice Settings" />
              <SelectField
                label="Work Setting"
                value={workSetting}
                onPress={() => setShowWorkSettingModal(true)}
                placeholder="Select work setting"
              />
              <SelectField
                label="Scope of Practice"
                value={scope}
                onPress={() => setShowScopeModal(true)}
                placeholder="Select scope of practice"
              />
              <SectionSaveButton label="Save Practice Settings" />
            </View>

            {/* Financial Details */}
            <View style={{ gap: 16 }}>
              <SectionHeader icon="payments" title="Financial Details" />
              <InputField label="Hourly Rate (£)" value={hourlyRate} onChangeText={setHourlyRate} placeholder="e.g. 50" keyboardType="numeric" />
              <InputField label="Earned This Financial Year (£)" value={earningsCurrentYear} onChangeText={setEarningsCurrentYear} placeholder="e.g. 0" keyboardType="numeric" />
              <SectionSaveButton label="Save Financial Details" />
            </View>

            {/* Work Load */}
            <View style={{ gap: 16 }}>
              <SectionHeader icon="history" title="Work Load History" />
              <InputField label="Work Hours Already Completed" value={workHoursCompleted} onChangeText={setWorkHoursCompleted} placeholder="e.g. 450" keyboardType="numeric" />
              <InputField label="Training Hours Already Completed" value={trainingHoursCompleted} onChangeText={setTrainingHoursCompleted} placeholder="e.g. 35" keyboardType="numeric" />
              <SectionSaveButton label="Save Work Load" />
            </View>

            {/* Notes */}
            <View style={{ gap: 16 }}>
              <SectionHeader icon="notes" title="Additional Information" />
              <InputField label="Brief Description of Work" value={workDescription} onChangeText={setWorkDescription} placeholder="Describe your current role..." multiline />
              <InputField label="Notepad" value={notepad} onChangeText={setNotepad} placeholder="Personal notes..." multiline />
              <SectionSaveButton label="Save Additional Info" />
            </View>

            {/* Reset Data Section - Premium Only */}
            {isPremium && (
              <View style={{ gap: 16 }}>
                <SectionHeader icon="refresh" title="Reset Data" />
                <View className={`rounded-2xl border p-4 ${isDark ? 'bg-red-900/10 border-red-900/30' : 'bg-red-50 border-red-200'}`}>
                  <View className="flex-row items-center mb-3" style={{ gap: 8 }}>
                    <MaterialIcons name="warning" size={20} color={isDark ? '#FCA5A5' : '#EF4444'} />
                    <Text className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                      Danger Zone
                    </Text>
                  </View>
                  <Text className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                    Reset specific sections of your data. This action cannot be undone.
                  </Text>
                  <View style={{ gap: 8 }}>
                    {RESET_SECTIONS.map((section) => (
                      <Pressable
                        key={section.id}
                        onPress={() => handleResetSection(section)}
                        disabled={isResetting}
                        className={`flex-row items-center justify-between p-3 rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
                          }`}
                      >
                        <View className="flex-row items-center" style={{ gap: 12 }}>
                          <View className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'
                            }`}>
                            <MaterialIcons
                              name={section.icon as keyof typeof MaterialIcons.glyphMap}
                              size={16}
                              color={isDark ? '#9CA3AF' : '#64748B'}
                            />
                          </View>
                          <Text className={`font-medium ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                            {section.label}
                          </Text>
                        </View>
                        {isResetting ? (
                          <ActivityIndicator size="small" color={isDark ? '#9CA3AF' : '#64748B'} />
                        ) : (
                          <MaterialIcons name="delete-outline" size={20} color={isDark ? '#F87171' : '#EF4444'} />
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              className="rounded-2xl p-4 items-center shadow-md mt-6"
              style={[
                { backgroundColor: isSaving ? '#9CA3AF' : accentColor },
                {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 8,
                },
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">Save All Changes</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
        <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setShowDatePicker(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-3xl p-6`}>
            <View className="flex-row items-center justify-between mb-4">
              <Pressable onPress={() => navigateMonth('prev')} className="p-2">
                <MaterialIcons name="chevron-left" size={24} color={isDark ? '#D1D5DB' : '#4B5563'} />
              </Pressable>
              <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{monthNames[selectedMonth]} {selectedYear}</Text>
              <Pressable onPress={() => navigateMonth('next')} className="p-2">
                <MaterialIcons name="chevron-right" size={24} color={isDark ? '#D1D5DB' : '#4B5563'} />
              </Pressable>
            </View>
            <View className="flex-row justify-between mb-3">
              {dayNames.map(d => <View key={d} className="w-10 items-center"><Text className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{d}</Text></View>)}
            </View>
            <View className="flex-row flex-wrap justify-between mb-6">{renderCalendar()}</View>
            <Pressable onPress={() => setShowDatePicker(false)} className={`py-4 rounded-2xl items-center ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
              <Text className={`font-semibold ${isDark ? 'text-white' : 'text-gray-700'}`}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Selection Lists (Work Setting, Scope) */}
      <Modal visible={showWorkSettingModal || showScopeModal} transparent animationType="fade" onRequestClose={() => { setShowWorkSettingModal(false); setShowScopeModal(false); }}>
        <Pressable className="flex-1 bg-black/50 justify-center px-6" onPress={() => { setShowWorkSettingModal(false); setShowScopeModal(false); }}>
          <View className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-3xl p-6 max-h-[70%]`}>
            <Text className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {showWorkSettingModal ? 'Select Work Setting' : 'Select Scope of Practice'}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(showWorkSettingModal ? workSettingsOptions : scopeOptions).map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    if (showWorkSettingModal) setWorkSetting(opt.label);
                    else setScope(opt.label);
                    setShowWorkSettingModal(false);
                    setShowScopeModal(false);
                  }}
                  className={`py-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}
                >
                  <Text className={`text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>{opt.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Multi-select Registrations */}
      <Modal visible={showRegistrationsModal} transparent animationType="slide" onRequestClose={() => setShowRegistrationsModal(false)}>
        <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setShowRegistrationsModal(false)}>
          <View className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-3xl p-6 max-h-[85%]`}>
            <View className="flex-row items-center justify-between mb-6">
              <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Professional Registrations</Text>
              <Pressable onPress={() => setShowRegistrationsModal(false)}>
                <MaterialIcons name="close" size={24} color={isDark ? '#9CA3AF' : '#64748B'} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
              <View className="gap-3">
                {registrationOptions.map((opt) => {
                  const isSelected = professionalRegistrations.includes(opt.value);
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => toggleRegistration(opt.value)}
                      className={`flex-row items-center p-4 rounded-2xl border ${isSelected ? '' : (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200')}`}
                      style={isSelected ? {
                        backgroundColor: isDark ? accentSoftDark : accentSoftLight,
                        borderColor: accentStrong,
                      } : undefined}
                    >
                      <View className="flex-1">
                        <Text
                          className={`text-base font-medium ${isSelected ? '' : (isDark ? 'text-white' : 'text-gray-800')}`}
                          style={isSelected ? { color: selectedTextColor } : undefined}
                        >
                          {opt.label}
                        </Text>
                      </View>
                      {isSelected && <MaterialIcons name="check-circle" size={20} color={accentStrong} />}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <Pressable
              onPress={() => setShowRegistrationsModal(false)}
              className="py-4 rounded-2xl items-center"
              style={{ backgroundColor: accentStrong }}
            >
              <Text className="text-white font-bold text-base">Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
