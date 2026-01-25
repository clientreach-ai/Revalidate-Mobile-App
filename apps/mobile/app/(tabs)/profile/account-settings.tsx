import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useThemeStore } from '@/features/theme/theme.store';
import '../../global.css';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { isDark } = useThemeStore();
  const [name, setName] = useState('Sarah Jenkins');
  const [email, setEmail] = useState('sarah.jenkins@example.com');
  const [phone, setPhone] = useState('+44 7700 900123');
  const [role, setRole] = useState('Nurse');
  const [registrationNumber, setRegistrationNumber] = useState('12A3456B');

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8 px-6 pt-4">
          <Pressable 
            onPress={() => router.back()}
            className={`w-10 h-10 items-center justify-center rounded-full shadow-sm ${
              isDark ? "bg-slate-800" : "bg-white"
            }`}
          >
            <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? "#E5E7EB" : "#1F2937"} />
          </Pressable>
          <Text className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>
            Account Settings
          </Text>
          <View className="w-10" />
        </View>

        {/* Profile Picture Section */}
        <View className="items-center mb-8">
          <View className="relative">
            <View className={`w-32 h-32 rounded-full border-4 overflow-hidden shadow-sm ${
              isDark ? "border-slate-800" : "border-white"
            }`}>
              <View className="w-full h-full bg-teal-200 items-center justify-center">
                <MaterialIcons name="person" size={64} color="#14B8A6" />
              </View>
            </View>
            <Pressable className={`absolute bottom-1 right-1 bg-[#2563EB] p-2 rounded-full border-2 shadow-lg ${
              isDark ? "border-slate-800" : "border-white"
            }`}>
              <MaterialIcons name="edit" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Form Fields */}
        <View className="px-6" style={{ gap: 16 }}>
          {/* Name */}
          <View>
            <Text className={`text-sm font-medium mb-2 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
              Full Name
            </Text>
            <View className={`rounded-2xl p-4 shadow-sm ${
              isDark ? "bg-slate-800" : "bg-white"
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
            <View className={`rounded-2xl p-4 shadow-sm ${
              isDark ? "bg-slate-800" : "bg-white"
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
            <View className={`rounded-2xl p-4 shadow-sm ${
              isDark ? "bg-slate-800" : "bg-white"
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
            <View className={`rounded-2xl p-4 shadow-sm ${
              isDark ? "bg-slate-800" : "bg-white"
            }`}>
              <TextInput
                value={role}
                onChangeText={setRole}
                className={`text-base ${isDark ? "text-white" : "text-slate-800"}`}
                placeholder="Enter your role"
                placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              />
            </View>
          </View>

          {/* Registration Number */}
          <View>
            <Text className={`text-sm font-medium mb-2 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
              Registration Number
            </Text>
            <View className={`rounded-2xl p-4 shadow-sm ${
              isDark ? "bg-slate-800" : "bg-white"
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
          <Pressable className="bg-[#2563EB] rounded-2xl p-4 items-center shadow-sm mt-4">
            <Text className="text-white font-semibold text-base">Save Changes</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
