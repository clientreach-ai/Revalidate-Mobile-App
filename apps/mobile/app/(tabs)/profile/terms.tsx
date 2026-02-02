import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/features/theme/theme.store';
import '../../global.css';

export default function TermsScreen() {
    const router = useRouter();
    const { isDark } = useThemeStore();

    const textColor = isDark ? 'text-white' : 'text-slate-800';
    const secondaryTextColor = isDark ? 'text-gray-400' : 'text-slate-600';
    const headingColor = isDark ? 'text-gray-200' : 'text-slate-700';

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background-light'}`} edges={['top']}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View className={`border-b ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-gray-100'}`}>
                    <View className="flex-row items-center justify-between px-4 py-2">
                        
                        <Text className={`text-lg font-bold flex-1 text-center ${textColor}`}>
                            Terms & Conditions
                        </Text>
                        <View className="w-12" />
                    </View>
                </View>

                {/* Content */}
                <View className="px-6 py-6" style={{ gap: 20 }}>
                    <Text className={`text-sm ${secondaryTextColor}`}>
                        Last updated: January 2024
                    </Text>

                    <View style={{ gap: 16 }}>
                        <View>
                            <Text className={`text-base font-semibold mb-2 ${headingColor}`}>1. Acceptance of Terms</Text>
                            <Text className={`${secondaryTextColor} leading-5`}>
                                By accessing and using the Revalidate mobile application, you accept and agree to be bound by the
                                terms and conditions of this agreement. If you do not agree to abide by these terms, please do not
                                use this application.
                            </Text>
                        </View>

                        <View>
                            <Text className={`text-base font-semibold mb-2 ${headingColor}`}>2. Use License</Text>
                            <Text className={`${secondaryTextColor} leading-5`}>
                                Permission is granted to temporarily download one copy of Revalidate for personal, non-commercial
                                use only. This is the grant of a license, not a transfer of title, and under this license you may not:
                                {'\n\n'}• Modify or copy the materials
                                {'\n'}• Use the materials for any commercial purpose
                                {'\n'}• Attempt to decompile or reverse engineer any software
                                {'\n'}• Remove any copyright or proprietary notations
                                {'\n'}• Transfer the materials to another person
                            </Text>
                        </View>

                        <View>
                            <Text className={`text-base font-semibold mb-2 ${headingColor}`}>3. User Account</Text>
                            <Text className={`${secondaryTextColor} leading-5`}>
                                You are responsible for maintaining the confidentiality of your account and password. You agree to
                                accept responsibility for all activities that occur under your account. You must notify us immediately
                                upon becoming aware of any breach of security or unauthorised use of your account.
                            </Text>
                        </View>

                        <View>
                            <Text className={`text-base font-semibold mb-2 ${headingColor}`}>4. Data Storage</Text>
                            <Text className={`${secondaryTextColor} leading-5`}>
                                Revalidate stores your professional practice data securely. While we take reasonable precautions to
                                protect your information, you acknowledge that electronic data transmission and storage cannot be
                                guaranteed to be 100% secure. You are responsible for maintaining your own backup of important records.
                            </Text>
                        </View>

                        <View>
                            <Text className={`text-base font-semibold mb-2 ${headingColor}`}>5. Professional Responsibility</Text>
                            <Text className={`${secondaryTextColor} leading-5`}>
                                Revalidate is a tool to help you track your revalidation requirements. It is your responsibility to
                                ensure all information entered is accurate and that you meet all professional regulatory requirements.
                                This app does not provide professional or legal advice.
                            </Text>
                        </View>

                        <View>
                            <Text className={`text-base font-semibold mb-2 ${headingColor}`}>6. Subscription & Premium Features</Text>
                            <Text className={`${secondaryTextColor} leading-5`}>
                                Premium features require an active subscription. Subscriptions automatically renew unless cancelled
                                at least 24 hours before the end of the current period. You can manage your subscription through your
                                account settings.
                            </Text>
                        </View>

                        <View>
                            <Text className={`text-base font-semibold mb-2 ${headingColor}`}>7. Limitation of Liability</Text>
                            <Text className={`${secondaryTextColor} leading-5`}>
                                Revalidate shall not be held liable for any indirect, incidental, special, consequential, or punitive
                                damages resulting from your use of or inability to use the application.
                            </Text>
                        </View>

                        <View>
                            <Text className={`text-base font-semibold mb-2 ${headingColor}`}>8. Governing Law</Text>
                            <Text className={`${secondaryTextColor} leading-5`}>
                                These terms shall be governed by and construed in accordance with the laws of England and Wales. Any
                                disputes relating to these terms will be subject to the exclusive jurisdiction of the courts of England
                                and Wales.
                            </Text>
                        </View>

                        <View>
                            <Text className={`text-base font-semibold mb-2 ${headingColor}`}>9. Contact</Text>
                            <Text className={`${secondaryTextColor} leading-5`}>
                                If you have any questions about these Terms & Conditions, please contact us at support@revalidate.app
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
