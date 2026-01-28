import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import '../../global.css';

export default function DeleteAccountScreen() {
    const router = useRouter();
    const { isDark } = useThemeStore();

    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [step, setStep] = useState<'info' | 'confirm'>('info');

    const CONFIRMATION_TEXT = 'DELETE';

    const handleDeleteAccount = async () => {
        if (confirmText !== CONFIRMATION_TEXT) {
            showToast.error(`Please type "${CONFIRMATION_TEXT}" to confirm`, 'Error');
            return;
        }

        Alert.alert(
            'Final Confirmation',
            'This action is permanent and cannot be undone. Are you absolutely sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Forever',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsDeleting(true);
                            const token = await AsyncStorage.getItem('authToken');

                            if (!token) {
                                showToast.error('Please log in again', 'Authentication Error');
                                router.replace('/(auth)/login');
                                return;
                            }

                            await apiService.delete(API_ENDPOINTS.USERS.PROFILE, token);

                            // Clear all local data
                            await AsyncStorage.clear();

                            showToast.success('Account deleted successfully', 'Success');
                            router.replace('/(auth)/login');
                        } catch (error: any) {
                            console.error('Error deleting account:', error);
                            showToast.error(error.message || 'Failed to delete account', 'Error');
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    const textColor = isDark ? 'text-white' : 'text-slate-800';
    const secondaryTextColor = isDark ? 'text-gray-400' : 'text-slate-600';
    const inputBgColor = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100';

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
                        <Text className={`text-lg font-bold flex-1 text-center ${textColor}`}>
                            Delete Account
                        </Text>
                        <View className="w-12" />
                    </View>
                </View>

                {step === 'info' ? (
                    <>
                        {/* Warning Banner */}
                        <View className="px-6 mt-6">
                            <View className="bg-red-50 rounded-2xl p-4 flex-row items-start border border-red-100">
                                <View className="bg-red-100 p-2 rounded-full">
                                    <MaterialIcons name="warning" size={24} color="#DC2626" />
                                </View>
                                <View className="flex-1 ml-3">
                                    <Text className="font-bold text-red-800 text-base">
                                        This action is permanent
                                    </Text>
                                    <Text className="text-sm mt-1 text-red-600">
                                        Once you delete your account, there is no going back. Please be certain.
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* What will be deleted */}
                        <View className="px-6 mt-6">
                            <Text className={`text-base font-semibold mb-4 ${textColor}`}>
                                What will be deleted:
                            </Text>

                            <View style={{ gap: 12 }}>
                                {[
                                    { icon: 'person', text: 'Your profile and account information' },
                                    { icon: 'work', text: 'All work hour records' },
                                    { icon: 'school', text: 'All CPD activity logs' },
                                    { icon: 'feedback', text: 'All feedback entries' },
                                    { icon: 'psychology', text: 'All reflective accounts' },
                                    { icon: 'rate-review', text: 'All appraisal notes' },
                                    { icon: 'folder', text: 'All uploaded documents' },
                                    { icon: 'calendar-month', text: 'All calendar events' },
                                ].map((item, index) => (
                                    <View key={index} className="flex-row items-center">
                                        <View className="bg-red-100 p-2 rounded-lg mr-3">
                                            <MaterialIcons name={item.icon as any} size={20} color="#DC2626" />
                                        </View>
                                        <Text className={`flex-1 ${secondaryTextColor}`}>{item.text}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Proceed Button */}
                        <View className="px-6 mt-8">
                            <Pressable
                                onPress={() => setStep('confirm')}
                                className="bg-red-600 rounded-2xl p-4 items-center shadow-sm"
                            >
                                <Text className="text-white font-semibold text-base">I Understand, Proceed</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => router.back()}
                                className={`rounded-2xl p-4 items-center mt-3 border ${isDark ? 'border-slate-600' : 'border-gray-200'}`}
                            >
                                <Text className={`font-medium ${textColor}`}>Cancel</Text>
                            </Pressable>
                        </View>
                    </>
                ) : (
                    <>
                        {/* Confirmation Step */}
                        <View className="px-6 mt-6">
                            <View className="bg-red-50 rounded-2xl p-5 items-center border border-red-100">
                                <View className="bg-red-100 p-4 rounded-full mb-4">
                                    <MaterialIcons name="delete-forever" size={48} color="#DC2626" />
                                </View>
                                <Text className="font-bold text-red-800 text-lg text-center">
                                    Confirm Account Deletion
                                </Text>
                                <Text className="text-sm mt-2 text-red-600 text-center">
                                    Type "{CONFIRMATION_TEXT}" below to confirm account deletion
                                </Text>
                            </View>
                        </View>

                        {/* Confirmation Input */}
                        <View className="px-6 mt-6">
                            <Text className={`text-sm font-medium mb-2 ${secondaryTextColor}`}>
                                Type "{CONFIRMATION_TEXT}" to confirm
                            </Text>
                            <View className={`rounded-2xl p-4 shadow-sm border ${inputBgColor}`}>
                                <TextInput
                                    value={confirmText}
                                    onChangeText={setConfirmText}
                                    className={`text-base text-center ${textColor}`}
                                    placeholder={CONFIRMATION_TEXT}
                                    placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View className="px-6 mt-8">
                            <Pressable
                                onPress={handleDeleteAccount}
                                disabled={isDeleting || confirmText !== CONFIRMATION_TEXT}
                                className={`rounded-2xl p-4 items-center shadow-sm ${confirmText === CONFIRMATION_TEXT && !isDeleting
                                        ? 'bg-red-600'
                                        : 'bg-gray-400'
                                    }`}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-semibold text-base">
                                        Delete My Account Permanently
                                    </Text>
                                )}
                            </Pressable>

                            <Pressable
                                onPress={() => setStep('info')}
                                className={`rounded-2xl p-4 items-center mt-3 border ${isDark ? 'border-slate-600' : 'border-gray-200'}`}
                            >
                                <Text className={`font-medium ${textColor}`}>Go Back</Text>
                            </Pressable>
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
