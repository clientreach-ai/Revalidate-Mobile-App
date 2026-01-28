import { View, Text, ScrollView, Pressable, TextInput, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { useProfile } from '@/hooks/useProfile';
import { showToast } from '@/utils/toast';
import '../../global.css';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { isDark } = useThemeStore();
  const { profile, refresh: refreshProfile } = useProfile();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      // Fetch all onboarding data
      const response = await apiService.get<{
        success: boolean;
        data: any;
      }>(API_ENDPOINTS.USERS.ONBOARDING.DATA, token);

      if (response?.data) {
        const data = response.data;
        setName(data.step2?.name || profile?.name || '');
        setEmail(data.step2?.email || profile?.email || '');
        setPhone(data.step2?.phone || '');
        setRole(data.step1?.role || profile?.professionalRole || '');
        setRegistrationNumber(data.step3?.registrationNumber || profile?.registrationNumber || '');
      }
    } catch (error: any) {
      console.error('Error loading user data:', error);
      // Don't show error to user, just rely on useProfile fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
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
        professional_role: apiRole // Send plain string or validated role
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

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-slate-50"}`} edges={['top']}>
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
        <View className={`border-b ${isDark ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-gray-100"}`}>
          <View className="flex-row items-center justify-between px-4 py-2">
            <Pressable onPress={() => router.back()} className="w-12 h-12 shrink-0 items-center justify-center">
              <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? "#E5E7EB" : "#121417"} />
            </Pressable>
            <Text className={`text-lg font-bold flex-1 text-center ${isDark ? "text-white" : "text-[#121417]"}`}>
              Account Settings
            </Text>
            <View className="w-12" />
          </View>
        </View>

        {loading && !refreshing && !profile ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
          </View>
        ) : (
          <>
            {/* Profile Picture Section */}
            <View className="items-center my-8">
              <View className="relative">
                <View className={`w-32 h-32 rounded-full border-4 overflow-hidden shadow-sm ${isDark ? "border-slate-800" : "border-slate-200"
                  }`}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} className="w-full h-full" />
                  ) : (
                    <View className="w-full h-full bg-[#2B5E9C]/20 items-center justify-center">
                      <MaterialIcons name="person" size={64} color="#2B5E9C" />
                    </View>
                  )}
                </View>
                <Pressable
                  onPress={handleImagePick}
                  className={`absolute bottom-1 right-1 bg-[#2B5E9C] p-2 rounded-full border-2 shadow-lg ${isDark ? "border-slate-800" : "border-slate-200"
                    }`}
                >
                  <MaterialIcons name="camera-alt" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>

            {/* Form Fields */}
            <View className="px-6 pb-8" style={{ gap: 16 }}>
              {/* Name */}
              <View>
                <Text className={`text-sm font-medium mb-2 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                  Full Name
                </Text>
                <View className={`rounded-2xl p-4 shadow-sm border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"
                  }`}>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    className={`text-base ${isDark ? "text-white" : "text-slate-800"}`}
                    placeholder="Enter your full name"
                    placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  />
                </View>
              </View>

              {/* Email */}
              <View>
                <Text className={`text-sm font-medium mb-2 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                  Email Address
                </Text>
                <View className={`rounded-2xl p-4 shadow-sm border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"
                  }`}>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    className={`text-base ${isDark ? "text-white" : "text-slate-800"}`}
                    placeholder="Enter your email"
                    placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Phone */}
              <View>
                <Text className={`text-sm font-medium mb-2 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                  Phone Number
                </Text>
                <View className={`rounded-2xl p-4 shadow-sm border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"
                  }`}>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    className={`text-base ${isDark ? "text-white" : "text-slate-800"}`}
                    placeholder="Enter your phone number"
                    placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Role */}
              <View>
                <Text className={`text-sm font-medium mb-2 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                  Professional Role
                </Text>
                <View className={`rounded-2xl p-4 shadow-sm border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"
                  }`}>
                  <TextInput
                    value={role}
                    onChangeText={setRole}
                    className={`text-base ${isDark ? "text-white" : "text-slate-800"}`}
                    placeholder="e.g. Doctor, Nurse"
                    placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  />
                </View>
                <Text className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                  Supported: Doctor, Nurse, Pharmacist, Other
                </Text>
              </View>

              {/* Registration Number */}
              <View>
                <Text className={`text-sm font-medium mb-2 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                  Registration Number
                </Text>
                <View className={`rounded-2xl p-4 shadow-sm border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"
                  }`}>
                  <TextInput
                    value={registrationNumber}
                    onChangeText={setRegistrationNumber}
                    className={`text-base ${isDark ? "text-white" : "text-slate-800"}`}
                    placeholder="Enter registration number"
                    placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  />
                </View>
              </View>

              {/* Save Button */}
              <Pressable
                onPress={handleSave}
                disabled={isSaving}
                className={`rounded-2xl p-4 items-center shadow-sm mt-4 ${isSaving ? "bg-gray-400" : "bg-[#2B5E9C]"
                  }`}
              >
                {isSaving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-base">Save Changes</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
