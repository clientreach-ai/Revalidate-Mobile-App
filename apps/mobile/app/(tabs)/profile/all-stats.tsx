import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import '../../global.css';

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  bgColor: string;
}

function StatCard({ title, value, subtitle, icon, iconColor, bgColor }: StatCardProps) {
  return (
    <View className="bg-white rounded-2xl p-5 shadow-sm">
      <View className="flex-row items-center justify-between mb-3">
        <View className={`w-12 h-12 rounded-xl ${bgColor} items-center justify-center`}>
          <MaterialIcons name={icon} size={24} color={iconColor} />
        </View>
        <Text className="text-xs text-slate-400 font-medium">{title}</Text>
      </View>
      <Text className="text-3xl font-bold text-slate-800 mb-1">{value}</Text>
      <Text className="text-sm text-slate-500">{subtitle}</Text>
    </View>
  );
}

export default function AllStatsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8 px-6 pt-4">
          <Pressable 
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <MaterialIcons name="arrow-back-ios" size={20} color="#1F2937" />
          </Pressable>
          <Text className="text-lg font-semibold text-slate-800">All Stats</Text>
          <View className="w-10" />
        </View>

        {/* Stats Grid */}
        <View className="px-6" style={{ gap: 16 }}>
          {/* Row 1 */}
          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <StatCard
                title="Practice Hours"
                value="1,240"
                subtitle="Hours completed"
                icon="access-time"
                iconColor="#2563EB"
                bgColor="bg-blue-50"
              />
            </View>
            <View className="flex-1">
              <StatCard
                title="CPD Hours"
                value="85"
                subtitle="Hours completed"
                icon="school"
                iconColor="#10B981"
                bgColor="bg-green-50"
              />
            </View>
          </View>

          {/* Row 2 */}
          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <StatCard
                title="Reflections"
                value="12"
                subtitle="Total entries"
                icon="lightbulb"
                iconColor="#F59E0B"
                bgColor="bg-amber-50"
              />
            </View>
            <View className="flex-1">
              <StatCard
                title="Feedback"
                value="8"
                subtitle="Total entries"
                icon="feedback"
                iconColor="#8B5CF6"
                bgColor="bg-purple-50"
              />
            </View>
          </View>

          {/* Row 3 */}
          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <StatCard
                title="Documents"
                value="24"
                subtitle="Total uploaded"
                icon="description"
                iconColor="#EC4899"
                bgColor="bg-pink-50"
              />
            </View>
            <View className="flex-1">
              <StatCard
                title="Earnings"
                value="£12.5K"
                subtitle="This year"
                icon="account-balance-wallet"
                iconColor="#14B8A6"
                bgColor="bg-teal-50"
              />
            </View>
          </View>

          {/* Progress Section */}
          <View className="bg-white rounded-2xl p-5 shadow-sm mt-4">
            <Text className="text-lg font-bold text-slate-800 mb-4">Revalidation Progress</Text>
            
            {/* Overall Progress */}
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm font-medium text-slate-600">Overall Progress</Text>
                <Text className="text-sm font-bold text-[#2563EB]">65%</Text>
              </View>
              <View className="w-full bg-slate-100 rounded-full h-3">
                <View className="bg-[#2563EB] h-3 rounded-full" style={{ width: '65%' }} />
              </View>
            </View>

            {/* Practice Hours Progress */}
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm font-medium text-slate-600">Practice Hours</Text>
                <Text className="text-sm font-bold text-green-600">1,240 / 450</Text>
              </View>
              <View className="w-full bg-slate-100 rounded-full h-2">
                <View className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }} />
              </View>
            </View>

            {/* CPD Hours Progress */}
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm font-medium text-slate-600">CPD Hours</Text>
                <Text className="text-sm font-bold text-amber-600">85 / 35</Text>
              </View>
              <View className="w-full bg-slate-100 rounded-full h-2">
                <View className="bg-amber-500 h-2 rounded-full" style={{ width: '100%' }} />
              </View>
            </View>

            {/* Reflections Progress */}
            <View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm font-medium text-slate-600">Reflections</Text>
                <Text className="text-sm font-bold text-purple-600">12 / 5</Text>
              </View>
              <View className="w-full bg-slate-100 rounded-full h-2">
                <View className="bg-purple-500 h-2 rounded-full" style={{ width: '100%' }} />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
