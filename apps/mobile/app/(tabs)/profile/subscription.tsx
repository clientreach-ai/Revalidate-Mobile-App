import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/features/theme/theme.store';
import '../../global.css';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { isDark } = useThemeStore();
  const isPremium = false; // Change this based on actual subscription status

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
            Subscription
          </Text>
          <View className="w-10" />
        </View>

        {/* Current Plan Card */}
        <View className="px-6 mb-6">
          <View className={`rounded-2xl p-6 shadow-sm border-2 ${
            isDark ? "bg-slate-800" : "bg-white"
          } ${isPremium ? 'border-[#2563EB]' : (isDark ? 'border-slate-700' : 'border-slate-200')}`}>
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className={`text-sm mb-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                  Current Plan
                </Text>
                <Text className={`text-2xl font-bold ${
                  isPremium ? 'text-[#2563EB]' : (isDark ? 'text-white' : 'text-slate-800')
                }`}>
                  {isPremium ? 'Premium' : 'Free'}
                </Text>
              </View>
              <View className={`w-16 h-16 rounded-xl items-center justify-center ${
                isPremium ? 'bg-[#2563EB]' : (isDark ? 'bg-slate-700' : 'bg-slate-100')
              }`}>
                <MaterialIcons 
                  name="workspace-premium" 
                  size={32} 
                  color={isPremium ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#64748B')} 
                />
              </View>
            </View>
            {isPremium && (
              <View className={`rounded-xl p-3 ${
                isDark ? "bg-blue-900/30" : "bg-blue-50"
              }`}>
                <Text className="text-sm text-[#2563EB] font-medium">
                  Renews on: 15 March 2025
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Plan Options */}
        <View className="px-6" style={{ gap: 16 }}>
          {/* Free Plan */}
          {!isPremium && (
            <View className={`rounded-2xl p-6 shadow-sm ${
              isDark ? "bg-slate-800" : "bg-white"
            }`}>
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1">
                  <Text className={`text-xl font-bold mb-1 ${isDark ? "text-white" : "text-slate-800"}`}>
                    Free Plan
                  </Text>
                  <Text className={`text-3xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                    £0<Text className={`text-lg font-normal ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                      /month
                    </Text>
                  </Text>
                </View>
                <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                  isDark ? "border-slate-600 bg-slate-700" : "border-slate-300 bg-white"
                }`}>
                  <MaterialIcons name="check" size={16} color="#2563EB" />
                </View>
              </View>
              <View className="gap-2 mb-4">
                {[
                  'Practice Hours Tracking',
                  'CPD Hours Logging',
                  'Basic Statistics',
                  'Document Gallery',
                ].map((feature, index) => (
                  <View key={index} className="flex-row items-center gap-2">
                    <MaterialIcons name="check-circle" size={20} color="#10B981" />
                    <Text className={`text-sm ${isDark ? "text-gray-300" : "text-slate-600"}`}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Premium Plan */}
          <View className={`rounded-2xl p-6 shadow-sm border-2 ${
            isDark ? "bg-slate-800" : "bg-white"
          } ${isPremium ? 'border-[#2563EB]' : (isDark ? 'border-amber-600' : 'border-amber-200')}`}>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-1">
                  <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                    Premium Plan
                  </Text>
                  {!isPremium && (
                    <View className="bg-amber-100 px-2 py-0.5 rounded-full">
                      <Text className="text-xs font-semibold text-amber-700">POPULAR</Text>
                    </View>
                  )}
                </View>
                <Text className={`text-3xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                  £9.99<Text className={`text-lg font-normal ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                    /month
                  </Text>
                </Text>
              </View>
              <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                isPremium 
                  ? 'bg-[#2563EB] border-[#2563EB]' 
                  : (isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white')
              }`}>
                {isPremium && (
                  <MaterialIcons name="check" size={16} color="#FFFFFF" />
                )}
              </View>
            </View>
            <View className="gap-2 mb-4">
              {[
                'Everything in Free',
                'Advanced Analytics',
                'PDF Export',
                'Push Notifications',
                'Offline Mode',
                'Premium Support',
              ].map((feature, index) => (
                <View key={index} className="flex-row items-center gap-2">
                  <MaterialIcons name="check-circle" size={20} color="#2563EB" />
                  <Text className={`text-sm ${isDark ? "text-gray-300" : "text-slate-600"}`}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
            {!isPremium && (
              <Pressable className="bg-[#2563EB] rounded-xl p-4 items-center mt-2">
                <Text className="text-white font-semibold text-base">Upgrade to Premium</Text>
              </Pressable>
            )}
          </View>

          {/* Manage Subscription */}
          {isPremium && (
            <View className={`rounded-2xl p-6 shadow-sm ${
              isDark ? "bg-slate-800" : "bg-white"
            }`}>
              <Text className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-800"}`}>
                Manage Subscription
              </Text>
              <View className="gap-3">
                <Pressable className={`flex-row items-center justify-between p-4 rounded-xl ${
                  isDark ? "bg-slate-700" : "bg-slate-50"
                }`}>
                  <View className="flex-row items-center gap-3">
                    <MaterialIcons name="credit-card" size={24} color={isDark ? "#9CA3AF" : "#64748B"} />
                    <Text className={`font-medium ${isDark ? "text-white" : "text-slate-800"}`}>
                      Payment Method
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={isDark ? "#64748B" : "#94A3B8"} />
                </Pressable>
                <Pressable className={`flex-row items-center justify-between p-4 rounded-xl ${
                  isDark ? "bg-slate-700" : "bg-slate-50"
                }`}>
                  <View className="flex-row items-center gap-3">
                    <MaterialIcons name="receipt" size={24} color={isDark ? "#9CA3AF" : "#64748B"} />
                    <Text className={`font-medium ${isDark ? "text-white" : "text-slate-800"}`}>
                      Billing History
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={isDark ? "#64748B" : "#94A3B8"} />
                </Pressable>
                <Pressable className="flex-row items-center justify-between p-4 bg-red-50 rounded-xl">
                  <View className="flex-row items-center gap-3">
                    <MaterialIcons name="cancel" size={24} color="#DC2626" />
                    <Text className="text-red-600 font-medium">Cancel Subscription</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#DC2626" />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
