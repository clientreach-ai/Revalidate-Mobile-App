import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/features/theme/theme.store';
import '../../global.css';

export default function AboutScreen() {
    const router = useRouter();
    const { isDark } = useThemeStore();

    const textColor = isDark ? 'text-white' : 'text-slate-800';
    const secondaryTextColor = isDark ? 'text-gray-400' : 'text-slate-600';
    const cardBg = isDark ? 'bg-slate-800' : 'bg-white';

    const handleOpenUrl = (url: string) => {
        Linking.openURL(url).catch(() => { });
    };

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-slate-50'}`} edges={['top']}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View className={`border-b ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-gray-100'}`}>
                    <View className="flex-row items-center justify-between px-4 py-2">
                       
                        <Text className={`text-lg font-bold flex-1 text-center ${textColor}`}>
                            About
                        </Text>
                        <View className="w-12" />
                    </View>
                </View>

                {/* App Logo and Info */}
                <View className="items-center py-8 px-6">
                    <View className={`w-24 h-24 rounded-3xl items-center justify-center mb-4 ${isDark ? 'bg-blue-900' : 'bg-blue-100'}`}>
                        <MaterialIcons name="verified-user" size={48} color={isDark ? '#60A5FA' : '#2563EB'} />
                    </View>
                    <Text className={`text-2xl font-bold ${textColor}`}>Revalidate</Text>
                    <Text className={`text-base ${secondaryTextColor} mt-1`}>Version 1.0.0</Text>
                    <Text className={`text-sm ${secondaryTextColor} mt-3 text-center`}>
                        Professional revalidation tracking for UK healthcare practitioners
                    </Text>
                </View>

                {/* About Content */}
                <View className="px-6" style={{ gap: 16 }}>
                    {/* Description */}
                    <View className={`${cardBg} rounded-2xl p-5`}>
                        <Text className={`font-semibold mb-2 ${textColor}`}>What is Revalidate?</Text>
                        <Text className={`${secondaryTextColor} leading-5`}>
                            Revalidate helps nurses, midwives, and other healthcare professionals easily track their
                            revalidation requirements. Log your practice hours, CPD activities, reflections, feedback,
                            and confirmation discussions all in one place.
                        </Text>
                    </View>

                    {/* Features */}
                    <View className={`${cardBg} rounded-2xl p-5`}>
                        <Text className={`font-semibold mb-3 ${textColor}`}>Key Features</Text>
                        <View style={{ gap: 12 }}>
                            {[
                                { icon: 'timer', text: 'Work hours tracking with timer' },
                                { icon: 'school', text: 'CPD activity logging' },
                                { icon: 'psychology', text: 'Reflective account recording' },
                                { icon: 'feedback', text: 'Feedback collection' },
                                { icon: 'calendar-month', text: 'Calendar & scheduling' },
                                { icon: 'folder', text: 'Document gallery' },
                            ].map((feature, index) => (
                                <View key={index} className="flex-row items-center">
                                    <MaterialIcons name={feature.icon as any} size={20} color={isDark ? '#60A5FA' : '#2563EB'} />
                                    <Text className={`ml-3 ${secondaryTextColor}`}>{feature.text}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Links */}
                    <View className={`${cardBg} rounded-2xl overflow-hidden`}>
                        <Pressable
                            className="flex-row items-center p-4 border-b border-gray-100"
                            onPress={() => router.push('/(tabs)/profile/terms' as any)}
                        >
                            <MaterialIcons name="description" size={20} color={isDark ? '#9CA3AF' : '#64748B'} />
                            <Text className={`flex-1 ml-3 ${textColor}`}>Terms & Conditions</Text>
                            <MaterialIcons name="chevron-right" size={20} color={isDark ? '#6B7280' : '#94A3B8'} />
                        </Pressable>
                        <Pressable
                            className="flex-row items-center p-4 border-b border-gray-100"
                            onPress={() => router.push('/(tabs)/profile/privacy' as any)}
                        >
                            <MaterialIcons name="privacy-tip" size={20} color={isDark ? '#9CA3AF' : '#64748B'} />
                            <Text className={`flex-1 ml-3 ${textColor}`}>Privacy Policy</Text>
                            <MaterialIcons name="chevron-right" size={20} color={isDark ? '#6B7280' : '#94A3B8'} />
                        </Pressable>
                        <Pressable
                            className="flex-row items-center p-4"
                            onPress={() => handleOpenUrl('https://revalidate.app')}
                        >
                            <MaterialIcons name="language" size={20} color={isDark ? '#9CA3AF' : '#64748B'} />
                            <Text className={`flex-1 ml-3 ${textColor}`}>Visit Website</Text>
                            <MaterialIcons name="open-in-new" size={20} color={isDark ? '#6B7280' : '#94A3B8'} />
                        </Pressable>
                    </View>

                    {/* Credits */}
                    <View className={`${cardBg} rounded-2xl p-5 items-center`}>
                        <Text className={`text-sm ${secondaryTextColor}`}>Made with ❤️ for healthcare professionals</Text>
                        <Text className={`text-xs ${secondaryTextColor} mt-2`}>© 2024 Revalidate. All rights reserved.</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
