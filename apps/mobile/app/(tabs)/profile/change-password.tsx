import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import '../../global.css';

export default function ChangePasswordScreen() {
    const router = useRouter();
    const { isDark } = useThemeStore();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});

    const validateForm = (): boolean => {
        const newErrors: { current?: string; new?: string; confirm?: string } = {};

        if (!currentPassword) {
            newErrors.current = 'Current password is required';
        }

        if (!newPassword) {
            newErrors.new = 'New password is required';
        } else if (newPassword.length < 8) {
            newErrors.new = 'Password must be at least 8 characters';
        }

        if (!confirmPassword) {
            newErrors.confirm = 'Please confirm your new password';
        } else if (newPassword !== confirmPassword) {
            newErrors.confirm = 'Passwords do not match';
        }

        if (currentPassword && newPassword && currentPassword === newPassword) {
            newErrors.new = 'New password must be different from current password';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChangePassword = async () => {
        if (!validateForm()) return;

        try {
            setIsSubmitting(true);
            const token = await AsyncStorage.getItem('authToken');

            if (!token) {
                showToast.error('Please log in again', 'Authentication Error');
                router.replace('/(auth)/login');
                return;
            }

            await apiService.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
                currentPassword,
                newPassword,
            }, token);

            showToast.success('Password changed successfully', 'Success');

            // Clear form
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setErrors({});

            // Navigate back
            router.back();
        } catch (error: any) {
            console.error('Error changing password:', error);

            // Handle specific error messages
            const errorMessage = error.message || 'Failed to change password';
            if (errorMessage.toLowerCase().includes('incorrect') || errorMessage.toLowerCase().includes('wrong')) {
                setErrors({ current: 'Current password is incorrect' });
            } else {
                showToast.error(errorMessage, 'Error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputBgColor = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100';
    const textColor = isDark ? 'text-white' : 'text-slate-800';
    const labelColor = isDark ? 'text-gray-400' : 'text-slate-600';
    const placeholderColor = isDark ? '#6B7280' : '#9CA3AF';

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background-light'}`} edges={['top']}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View className={`border-b ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-gray-100'}`}>
                    <View className="flex-row items-center justify-between px-4 py-2">
                        <Pressable onPress={() => router.back()} className="w-12 h-12 shrink-0 items-center justify-center">
                            <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? '#E5E7EB' : '#121417'} />
                        </Pressable>
                        <Text className={`text-lg font-bold flex-1 text-center ${isDark ? 'text-white' : 'text-[#121417]'}`}>
                            Change Password
                        </Text>
                        <View className="w-12" />
                    </View>
                </View>

                {/* Security Notice */}
                <View className="px-6 mt-6">
                    <View className={`${isDark ? 'bg-blue-900/30' : 'bg-blue-50'} rounded-2xl p-4 flex-row items-start`}>
                        <MaterialIcons name="security" size={24} color={isDark ? '#60A5FA' : '#2563EB'} />
                        <View className="flex-1 ml-3">
                            <Text className={`font-medium ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
                                Keep your account secure
                            </Text>
                            <Text className={`text-sm mt-1 ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                                Use a strong password with at least 8 characters, including letters and numbers.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Form Fields */}
                <View className="px-6 pt-6 pb-8" style={{ gap: 20 }}>
                    {/* Current Password */}
                    <View>
                        <Text className={`text-sm font-medium mb-2 ${labelColor}`}>
                            Current Password
                        </Text>
                        <View className={`rounded-2xl p-4 shadow-sm border flex-row items-center ${inputBgColor}`}>
                            <TextInput
                                value={currentPassword}
                                onChangeText={(text) => {
                                    setCurrentPassword(text);
                                    if (errors.current) setErrors({ ...errors, current: undefined });
                                }}
                                className={`text-base flex-1 ${textColor}`}
                                placeholder="Enter current password"
                                placeholderTextColor={placeholderColor}
                                secureTextEntry={!showCurrentPassword}
                                autoCapitalize="none"
                                autoComplete="current-password"
                            />
                            <Pressable onPress={() => setShowCurrentPassword(!showCurrentPassword)} className="p-1">
                                <MaterialIcons
                                    name={showCurrentPassword ? 'visibility-off' : 'visibility'}
                                    size={22}
                                    color={isDark ? '#9CA3AF' : '#6B7280'}
                                />
                            </Pressable>
                        </View>
                        {errors.current && (
                            <Text className="text-red-500 text-xs mt-1 ml-1">{errors.current}</Text>
                        )}
                    </View>

                    {/* New Password */}
                    <View>
                        <Text className={`text-sm font-medium mb-2 ${labelColor}`}>
                            New Password
                        </Text>
                        <View className={`rounded-2xl p-4 shadow-sm border flex-row items-center ${inputBgColor}`}>
                            <TextInput
                                value={newPassword}
                                onChangeText={(text) => {
                                    setNewPassword(text);
                                    if (errors.new) setErrors({ ...errors, new: undefined });
                                }}
                                className={`text-base flex-1 ${textColor}`}
                                placeholder="Enter new password"
                                placeholderTextColor={placeholderColor}
                                secureTextEntry={!showNewPassword}
                                autoCapitalize="none"
                                autoComplete="new-password"
                            />
                            <Pressable onPress={() => setShowNewPassword(!showNewPassword)} className="p-1">
                                <MaterialIcons
                                    name={showNewPassword ? 'visibility-off' : 'visibility'}
                                    size={22}
                                    color={isDark ? '#9CA3AF' : '#6B7280'}
                                />
                            </Pressable>
                        </View>
                        {errors.new && (
                            <Text className="text-red-500 text-xs mt-1 ml-1">{errors.new}</Text>
                        )}
                    </View>

                    {/* Confirm Password */}
                    <View>
                        <Text className={`text-sm font-medium mb-2 ${labelColor}`}>
                            Confirm New Password
                        </Text>
                        <View className={`rounded-2xl p-4 shadow-sm border flex-row items-center ${inputBgColor}`}>
                            <TextInput
                                value={confirmPassword}
                                onChangeText={(text) => {
                                    setConfirmPassword(text);
                                    if (errors.confirm) setErrors({ ...errors, confirm: undefined });
                                }}
                                className={`text-base flex-1 ${textColor}`}
                                placeholder="Confirm new password"
                                placeholderTextColor={placeholderColor}
                                secureTextEntry={!showConfirmPassword}
                                autoCapitalize="none"
                                autoComplete="new-password"
                            />
                            <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1">
                                <MaterialIcons
                                    name={showConfirmPassword ? 'visibility-off' : 'visibility'}
                                    size={22}
                                    color={isDark ? '#9CA3AF' : '#6B7280'}
                                />
                            </Pressable>
                        </View>
                        {errors.confirm && (
                            <Text className="text-red-500 text-xs mt-1 ml-1">{errors.confirm}</Text>
                        )}
                    </View>

                    {/* Submit Button */}
                    <Pressable
                        onPress={handleChangePassword}
                        disabled={isSubmitting}
                        className={`rounded-2xl p-4 items-center shadow-sm mt-4 ${isSubmitting ? 'bg-gray-400' : 'bg-[#2B5E9C]'
                            }`}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-semibold text-base">Update Password</Text>
                        )}
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
