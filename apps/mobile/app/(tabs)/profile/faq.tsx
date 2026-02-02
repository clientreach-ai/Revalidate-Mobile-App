import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useThemeStore } from '@/features/theme/theme.store';
import '../../global.css';

interface FAQItem {
    question: string;
    answer: string;
    category: string;
}

const faqData: FAQItem[] = [
    {
        category: 'General',
        question: 'What is Revalidate?',
        answer: 'Revalidate is a mobile app designed to help UK healthcare professionals track their revalidation requirements. It allows you to log practice hours, CPD activities, reflections, feedback, and confirmation discussions in one convenient place.',
    },
    {
        category: 'General',
        question: 'Who is Revalidate for?',
        answer: 'Revalidate is designed for nurses, midwives, and other healthcare professionals in the UK who need to meet NMC revalidation requirements or similar professional regulatory standards.',
    },
    {
        category: 'Account',
        question: 'How do I create an account?',
        answer: 'Download the app and tap "Sign Up". Enter your email address and create a password. You\'ll receive a verification email, then complete your profile with your professional details.',
    },
    {
        category: 'Account',
        question: 'How do I reset my password?',
        answer: 'On the login screen, tap "Forgot Password". Enter your email address and we\'ll send you a one-time code to reset your password.',
    },
    {
        category: 'Account',
        question: 'Can I delete my account?',
        answer: 'Yes, go to Profile → Settings → Delete Account. Please note this action is permanent and all your data will be deleted.',
    },
    {
        category: 'Features',
        question: 'How do I log practice hours?',
        answer: 'Use the timer on the Home screen to track hours in real-time, or go to Working Hours to manually add completed sessions with dates and descriptions.',
    },
    {
        category: 'Features',
        question: 'How do I add CPD activities?',
        answer: 'Navigate to CPD Hours from the Home screen. Tap the + button to add a new activity, including the type (participatory or non-participatory), hours, and optional evidence.',
    },
    {
        category: 'Features',
        question: 'Can I upload documents?',
        answer: 'Yes! Go to the Gallery tab to upload and organise evidence documents. You can upload from your camera, photo gallery, or files.',
    },
    {
        category: 'Features',
        question: 'How do I export my portfolio?',
        answer: 'Premium users can export their entire portfolio as a PDF from Profile → Export. Select the sections you want to include and download or share the document.',
    },
    {
        category: 'Subscription',
        question: 'What\'s included in Premium?',
        answer: 'Premium includes: PDF portfolio export, advanced analytics, offline mode with sync, reset section capabilities, and enhanced notification reminders.',
    },
    {
        category: 'Subscription',
        question: 'How do I cancel my subscription?',
        answer: 'You can cancel your subscription through Profile → Subscription. Cancellations take effect at the end of your current billing period.',
    },
    {
        category: 'Subscription',
        question: 'Is there a free trial?',
        answer: 'Yes! New users get a 28-day free trial of Premium features. You can cancel anytime during the trial period.',
    },
    {
        category: 'Data',
        question: 'Is my data secure?',
        answer: 'Yes, we use industry-standard encryption and secure cloud infrastructure. We are GDPR compliant and follow NHS data protection guidelines.',
    },
    {
        category: 'Data',
        question: 'Can I use the app offline?',
        answer: 'Premium users can enter data offline. Your data will automatically sync when you regain internet connectivity.',
    },
];

export default function FAQScreen() {
    const router = useRouter();
    const { isDark } = useThemeStore();
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const textColor = isDark ? 'text-white' : 'text-slate-800';
    const secondaryTextColor = isDark ? 'text-gray-400' : 'text-slate-600';
    const cardBg = isDark ? 'bg-slate-800' : 'bg-white';

    const categories = [...new Set(faqData.map(item => item.category))];

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
                            Help & FAQ
                        </Text>
                        <View className="w-12" />
                    </View>
                </View>

                {/* Search hint */}
                <View className="px-6 pt-6">
                    <View className={`${isDark ? 'bg-blue-900/30' : 'bg-blue-50'} rounded-2xl p-4 flex-row items-start`}>
                        <MaterialIcons name="help-outline" size={24} color={isDark ? '#60A5FA' : '#2563EB'} />
                        <View className="flex-1 ml-3">
                            <Text className={`font-medium ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
                                Need help?
                            </Text>
                            <Text className={`text-sm mt-1 ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                                Browse frequently asked questions below or contact support for further assistance.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* FAQ Content */}
                <View className="px-6 pt-6" style={{ gap: 20 }}>
                    {categories.map((category) => (
                        <View key={category}>
                            <Text className={`text-sm font-semibold mb-3 uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                                {category}
                            </Text>
                            <View className={`${cardBg} rounded-2xl overflow-hidden`}>
                                {faqData
                                    .filter(item => item.category === category)
                                    .map((item, index) => {
                                        const globalIndex = faqData.indexOf(item);
                                        const isExpanded = expandedIndex === globalIndex;

                                        return (
                                            <Pressable
                                                key={index}
                                                onPress={() => setExpandedIndex(isExpanded ? null : globalIndex)}
                                                className={`p-4 ${index < faqData.filter(i => i.category === category).length - 1 ? 'border-b border-gray-100' : ''}`}
                                            >
                                                <View className="flex-row items-center">
                                                    <Text className={`flex-1 font-medium ${textColor}`}>{item.question}</Text>
                                                    <MaterialIcons
                                                        name={isExpanded ? 'expand-less' : 'expand-more'}
                                                        size={24}
                                                        color={isDark ? '#9CA3AF' : '#64748B'}
                                                    />
                                                </View>
                                                {isExpanded && (
                                                    <Text className={`mt-3 ${secondaryTextColor} leading-5`}>
                                                        {item.answer}
                                                    </Text>
                                                )}
                                            </Pressable>
                                        );
                                    })}
                            </View>
                        </View>
                    ))}
                </View>

                {/* Contact Support */}
                <View className="px-6 pt-6">
                    <Pressable
                        className={`${cardBg} rounded-2xl p-4 flex-row items-center`}
                        onPress={() => router.back()}
                    >
                        <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mr-3">
                            <MaterialIcons name="support-agent" size={20} color="#2563EB" />
                        </View>
                        <View className="flex-1">
                            <Text className={`font-medium ${textColor}`}>Still need help?</Text>
                            <Text className={`text-xs ${secondaryTextColor}`}>Contact our support team</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={20} color={isDark ? '#6B7280' : '#94A3B8'} />
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
