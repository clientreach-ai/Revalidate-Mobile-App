import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/features/theme/theme.store';
import '../../global.css';

export default function PrivacyScreen() {
    const router = useRouter();
    const { isDark } = useThemeStore();

    const textColor = isDark ? 'text-white' : 'text-slate-800';
    const secondaryTextColor = isDark ? 'text-gray-400' : 'text-slate-600';
    const headingColor = isDark ? 'text-gray-200' : 'text-slate-700';

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
                        <Pressable onPress={() => router.back()} className="w-12 h-12 shrink-0 items-center justify-center">
                            <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? '#E5E7EB' : '#121417'} />
                        </Pressable>
                        <Text className={`text-lg font-bold flex-1 text-center ${textColor}`}>
                            Privacy Policy
                        </Text>
                        <View className="w-12" />
                    </View>
                </View>

                {/* Content */}
                <View className="px-6 py-6" style={{ gap: 20 }}>
                    <View className={`${isDark ? 'bg-blue-900/30' : 'bg-blue-50'} rounded-2xl p-4 flex-row items-start`}>
                        <MaterialIcons name="security" size={24} color={isDark ? '#60A5FA' : '#2563EB'} />
                        <View className="flex-1 ml-3">
                            <Text className={`font-medium ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
                                Your privacy matters
                            </Text>
                            <Text className={`text-sm mt-1 ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                                We are committed to protecting your personal data and complying with GDPR and NHS data protection requirements.
                            </Text>
                        </View>
                    </View>

                    <Text className={`text-sm ${secondaryTextColor}`}>
                        Last updated: January 2024
                    </Text>

                    <View style={{ gap: 16 }}>
                        <View>
                            <Text className={`text-base font-semibold mb-2 ${headingColor}`}>1. Information We Collect</Text>
                            <Text className={`${secondaryTextColor} leading-5`}>
                                We collect information you provide directly, including:
                                {'\n\n'}• Account information (name, email, professional role)
                                {'\n'}• Professional registration details
                                {'\n'}• Practice hours and work descriptions
                                {'\n'}• CPD activity records
                                {'\n'}• Reflective accounts and feedback
                                {'\n'}• Documents you upload
                                {'\n'}• Calendar events and appointments
                            </Text>
                        </View>

                        <View>
                            <Text className={`text-base font-semibold mb-2 ${headingColor}`}>2. How We Use Your Data</Text>
                            <Text className={`${secondaryTextColor} leading-5`}>
                                Your data is used to:
                                {'\n\n'}• Provide and maintain the Revalidate service
                                {'\n'}• Track your revalidation progress
                                {'\n'}• Send reminders and notifications
                                {'\n'}• Generate reports and analytics
                                {'\n'}• Improve our services
                                {'\n'}• Comply with legal obligations
                            </Text>
                        </View>

                        <View>
                            <Text className={`text-base font-semibold mb-2 ${headingColor}`}>3. Data Security</Text>
                            <Text className={`${secondaryTextColor} leading-5`}>
                                We implement industry-standard security measures including:
                                {'\n\n'}• Encryption of data in transit and at rest
                                {'\n'}• Secure cloud infrastructure
                                {'\n'}• Regular security audits
                                {'\n'}• Access controls and authentication
                                {'\n'}• Automatic session timeouts
                            </Text>
                        </View>

                        <View>
                            <Text className={`text-base font-semibold mb-2 ${headingColor}`}>4. Data Sharing</Text>
                            <Text className={`${secondaryTextColor} leading-5`}>
                                We do not sell your personal data. We may share data with:
                                {'\n\n'}• Service providers who help us operate the app
                                {'\n'}• Legal authorities if required by law
                                {'\n'}• Third parties with your explicit consent
                                {'\n\n'}All third parties are contractually obligated to protect your data.
                            </Text>
                        </View>

                        <View>
                            <Text className={`text-base font-semibold mb-2 ${headingColor}`}>5. Your Rights (GDPR)</Text>
                            <Text className={`${secondaryTextColor} leading-5`}>
                                Under GDPR, you have the right to:
                                {'\n\n'}• Access your personal data
                                {'\n'}• Rectify inaccurate data
                                {'\n'}• Erase your data ("right to be forgotten")
                                {'\n'}• Restrict processing
                                {'\n'}• Data portability
                                {'\n'}• Object to processing
                                {'\n'}• Withdraw consent at any time
                            </Text>
                        </View>

                        <View>
                            <Text className={`text-base font-semibold mb-2 ${headingColor}`}>6. Data Retention</Text>
                            <Text className={`${secondaryTextColor} leading-5`}>
                                We retain your data for as long as your account is active or as needed to provide services.
                                After account deletion, we may retain certain data for legal compliance for up to 7 years,
                                after which it will be securely destroyed.
                            </Text>
                        </View>

                        <View>
                            <Text className={`text-base font-semibold mb-2 ${headingColor}`}>7. Cookies and Analytics</Text>
                            <Text className={`${secondaryTextColor} leading-5`}>
                                We use analytics to improve our service. This may include anonymised usage data. You can
                                opt out of marketing communications at any time through your account settings.
                            </Text>
                        </View>

                        <View>
                            <Text className={`text-base font-semibold mb-2 ${headingColor}`}>8. Contact Us</Text>
                            <Text className={`${secondaryTextColor} leading-5`}>
                                For privacy-related enquiries or to exercise your data rights, contact our Data Protection
                                Officer at privacy@revalidate.app
                                {'\n\n'}You also have the right to lodge a complaint with the Information Commissioner's Office (ICO).
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
