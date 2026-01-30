import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';

const DISCOVERY_OPTIONS = [
    { id: 'social_media', label: 'Social Media', icon: 'share' as const },
    { id: 'search_engine', label: 'Search Engine (Google, Bing)', icon: 'search' as const },
    { id: 'word_of_mouth', label: 'Word of Mouth / Friend Referral', icon: 'people' as const },
    { id: 'professional_conference', label: 'Professional Conference / Event', icon: 'event' as const },
    { id: 'nhs_colleagues', label: 'NHS Colleagues', icon: 'local-hospital' as const },
    { id: 'app_store', label: 'App Store Discovery', icon: 'store' as const },
    { id: 'advertisement', label: 'Advertisement', icon: 'campaign' as const },
    { id: 'other', label: 'Other', icon: 'more-horiz' as const },
];

interface DiscoveryModalProps {
    visible: boolean;
    onClose: () => void;
}

export const DiscoveryModal: React.FC<DiscoveryModalProps> = ({ visible, onClose }) => {
    const { isDark } = useThemeStore();
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedOption) return;

        setIsSubmitting(true);
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                showToast.error('Please login again');
                return;
            }

            await apiService.post(
                API_ENDPOINTS.USERS.DISCOVERY_SOURCE,
                { source: selectedOption },
                token
            );

            // Mark as answered locally to prevent showing again
            await AsyncStorage.setItem('discoveryAnswered', 'true');

            showToast.success('Thank you for your feedback!');
            onClose();
        } catch (error) {
            console.error('Error saving discovery source:', error);
            showToast.error('Failed to save. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = async () => {
        // Mark as skipped to prevent showing again this session
        await AsyncStorage.setItem('discoverySkipped', 'true');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleSkip}
        >
            <View className="flex-1 justify-center items-center bg-black/50 px-4">
                <View
                    className={`w-full max-w-md rounded-3xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'
                        }`}
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.25,
                        shadowRadius: 20,
                        elevation: 10,
                    }}
                >
                    {/* Header */}
                    <View className="items-center mb-6">
                        <View
                            className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'
                                }`}
                        >
                            <MaterialIcons name="help-outline" size={32} color="#2563EB" />
                        </View>
                        <Text
                            className={`text-xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-slate-800'
                                }`}
                        >
                            How did you hear about us?
                        </Text>
                        <Text
                            className={`text-sm text-center ${isDark ? 'text-gray-400' : 'text-slate-500'
                                }`}
                        >
                            This helps us improve our outreach and serve you better.
                        </Text>
                    </View>

                    {/* Options */}
                    <ScrollView
                        className="max-h-80 mb-4"
                        showsVerticalScrollIndicator={false}
                    >
                        {DISCOVERY_OPTIONS.map((option) => (
                            <Pressable
                                key={option.id}
                                onPress={() => setSelectedOption(option.id)}
                                className={`flex-row items-center p-4 rounded-2xl mb-2 border-2 ${selectedOption === option.id
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : isDark
                                            ? 'border-slate-700 bg-slate-700/50'
                                            : 'border-slate-200 bg-slate-50'
                                    }`}
                            >
                                <View
                                    className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${selectedOption === option.id
                                            ? 'bg-blue-500'
                                            : isDark
                                                ? 'bg-slate-600'
                                                : 'bg-slate-200'
                                        }`}
                                >
                                    <MaterialIcons
                                        name={option.icon}
                                        size={20}
                                        color={selectedOption === option.id ? '#fff' : isDark ? '#9CA3AF' : '#64748B'}
                                    />
                                </View>
                                <Text
                                    className={`flex-1 font-medium ${selectedOption === option.id
                                            ? 'text-blue-500'
                                            : isDark
                                                ? 'text-gray-300'
                                                : 'text-slate-700'
                                        }`}
                                >
                                    {option.label}
                                </Text>
                                {selectedOption === option.id && (
                                    <MaterialIcons name="check-circle" size={24} color="#2563EB" />
                                )}
                            </Pressable>
                        ))}
                    </ScrollView>

                    {/* Actions */}
                    <View className="flex-row gap-3">
                        <Pressable
                            onPress={handleSkip}
                            className={`flex-1 py-3 rounded-xl items-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'
                                }`}
                        >
                            <Text
                                className={`font-semibold ${isDark ? 'text-gray-300' : 'text-slate-600'
                                    }`}
                            >
                                Skip
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={handleSubmit}
                            disabled={!selectedOption || isSubmitting}
                            className={`flex-1 py-3 rounded-xl items-center ${selectedOption && !isSubmitting
                                    ? 'bg-blue-500'
                                    : isDark
                                        ? 'bg-slate-600'
                                        : 'bg-slate-300'
                                }`}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text className="text-white font-semibold">Submit</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

/**
 * Hook to manage discovery modal visibility
 */
export const useDiscoveryModal = () => {
    const [showModal, setShowModal] = useState(false);

    const checkShouldShowModal = async (): Promise<boolean> => {
        try {
            // Check if already answered or skipped
            const answered = await AsyncStorage.getItem('discoveryAnswered');
            const skipped = await AsyncStorage.getItem('discoverySkipped');

            if (answered === 'true') {
                return false;
            }

            // If skipped, don't show this session
            if (skipped === 'true') {
                return false;
            }

            // Check with API if user has answered
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return false;

            const response = await apiService.get<{ data: { hasAnswered: boolean } }>(
                API_ENDPOINTS.USERS.DISCOVERY_SOURCE,
                token
            );

            if (response?.data?.hasAnswered) {
                await AsyncStorage.setItem('discoveryAnswered', 'true');
                return false;
            }

            return true;
        } catch (error) {
            console.warn('Error checking discovery status:', error);
            return false;
        }
    };

    const showDiscoveryModal = async () => {
        const shouldShow = await checkShouldShowModal();
        if (shouldShow) {
            setShowModal(true);
        }
    };

    const hideModal = () => {
        setShowModal(false);
    };

    return {
        showModal,
        showDiscoveryModal,
        hideModal,
    };
};
