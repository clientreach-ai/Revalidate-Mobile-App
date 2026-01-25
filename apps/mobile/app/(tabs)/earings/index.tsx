import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '@/features/theme/theme.store';
import '../../global.css';

interface EarningsEntry {
  id: string;
  date: string;
  location: string;
  hours: number;
  rate: number;
  amount: string;
  status: 'paid' | 'pending';
  icon: keyof typeof MaterialIcons.glyphMap;
}

interface MonthGroup {
  month: string;
  year: number;
  entries: EarningsEntry[];
}

export default function EarningsScreen() {
  const router = useRouter();
  const { isDark } = useThemeStore();

  const totalEarnings = '£14,250.00';
  const percentageChange = '12%';

  const earnings: EarningsEntry[] = [
    {
      id: '1',
      date: '22 Sep',
      location: "St Mary's Hospital",
      hours: 8.5,
      rate: 75,
      amount: '£637.50',
      status: 'paid',
      icon: 'healing',
    },
    {
      id: '2',
      date: '18 Sep',
      location: 'Night Shift (A&E)',
      hours: 12.0,
      rate: 95,
      amount: '£1,140.00',
      status: 'pending',
      icon: 'local-hospital',
    },
    {
      id: '3',
      date: '12 Sep',
      location: 'GP Locum',
      hours: 6.0,
      rate: 65,
      amount: '£390.00',
      status: 'paid',
      icon: 'local-hospital',
    },
    {
      id: '4',
      date: '28 Aug',
      location: 'Health Checkup',
      hours: 4.5,
      rate: 70,
      amount: '£315.00',
      status: 'paid',
      icon: 'verified-user',
    },
  ];

  // Group earnings by month
  const groupedEarnings: MonthGroup[] = earnings.reduce((acc: MonthGroup[], entry) => {
    const month = entry.date.includes('Sep') ? 'September' : 'August';
    const year = 2023;
    
    const existingGroup = acc.find(g => g.month === month && g.year === year);
    if (existingGroup) {
      existingGroup.entries.push(entry);
    } else {
      acc.push({ month, year, entries: [entry] });
    }
    
    return acc;
  }, []);

  // Sort groups by date (newest first)
  groupedEarnings.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months.indexOf(b.month) - months.indexOf(a.month);
  });

  // Monthly performance data for bar chart
  const monthlyData = [
    { month: 'Apr', height: 45 },
    { month: 'May', height: 65 },
    { month: 'Jun', height: 55 },
    { month: 'Jul', height: 95, isCurrent: true },
    { month: 'Aug', height: 75 },
    { month: 'Sep', height: 40 },
  ];

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      {/* Header */}
      <View className={`border-b ${isDark ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-zinc-100"}`}>
        <View className="flex-row items-center px-4 py-2 justify-between">
          <Pressable onPress={() => router.back()} className="w-12 h-12 shrink-0 items-center justify-center">
            <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? "#E5E7EB" : "#121417"} />
          </Pressable>
          <Text className={`text-lg font-bold flex-1 text-center ${isDark ? "text-white" : "text-[#121417]"}`}>
            Earnings & Financials
          </Text>
          <Pressable className="w-12 h-12 items-center justify-center">
            <MaterialIcons name="settings" size={20} color={isDark ? "#E5E7EB" : "#121417"} />
          </Pressable>
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Total Earnings Card */}
        <View className="p-4">
          <View className={`flex-col gap-2 rounded-xl p-6 shadow-sm border ${
            isDark ? "bg-slate-800 border-slate-700" : "bg-white border-zinc-100"
          }`}>
            <Text className={`text-sm font-medium uppercase tracking-wider ${
              isDark ? "text-gray-400" : "text-[#687482]"
            }`}>
              Total Earnings
            </Text>
            <View className="flex-row items-baseline" style={{ gap: 8 }}>
              <Text className="text-[#00C853] tracking-tight text-3xl font-bold">
                {totalEarnings}
              </Text>
              <View className="flex-row items-center bg-[#00C853]/10 px-2 py-0.5 rounded-full">
                <MaterialIcons name="trending-up" size={14} color="#00C853" />
                <Text className="text-[#00C853] text-xs font-bold ml-1">
                  {percentageChange}
                </Text>
              </View>
            </View>
            <Text className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-[#687482]"}`}>
              Updated 2 mins ago
            </Text>
          </View>
        </View>

        {/* Monthly Performance Card */}
        <View className="px-4 py-2">
          <View className={`flex-col gap-4 rounded-xl p-6 shadow-sm border ${
            isDark ? "bg-slate-800 border-slate-700" : "bg-white border-zinc-100"
          }`}>
            <View className="flex-row justify-between items-center">
              <View>
                <Text className={`text-base font-bold ${isDark ? "text-white" : "text-[#121417]"}`}>
                  Monthly Performance
                </Text>
                <Text className={`text-sm font-normal mt-0.5 ${isDark ? "text-gray-400" : "text-[#687482]"}`}>
                  Last 6 Months
                </Text>
              </View>
              <MaterialIcons name="info" size={20} color={isDark ? "#9CA3AF" : "#687482"} />
            </View>
            
            {/* Bar Chart */}
            <View className="h-40 flex-row items-end justify-center" style={{ gap: 12 }}>
              {monthlyData.map((data, index) => (
                <View key={index} className="flex-1 flex-col justify-end items-center" style={{ gap: 4 }}>
                  <View 
                    className={`w-full rounded-t-sm ${
                      data.isCurrent ? 'bg-[#2B5E9C]' : 'bg-[#2B5E9C]/20'
                    }`}
                    style={{ height: `${data.height}%` }}
                  />
                  <Text className={`text-[11px] font-bold text-center ${
                    data.isCurrent ? 'text-[#2B5E9C]' : (isDark ? 'text-gray-400' : 'text-[#687482]')
                  }`}>
                    {data.month}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3 px-4 pt-6 pb-2">
          <Pressable className="flex-1 flex-row items-center justify-center gap-2 px-4 h-11 bg-[#2B5E9C]/10 rounded-lg">
            <MaterialIcons name="payments" size={20} color="#2B5E9C" />
            <Text className="text-[#2B5E9C] font-semibold text-sm">
              Set Rate
            </Text>
          </Pressable>
          <Pressable 
            onPress={() => {
              router.push('/(tabs)/gallery');
            }}
            className="flex-[2] flex-row items-center justify-center gap-2 px-4 h-11 bg-[#2B5E9C] rounded-lg shadow-sm"
          >
            <MaterialIcons name="ios-share" size={20} color="#FFFFFF" />
            <Text className="text-white font-semibold text-sm">
              Export Report
            </Text>
          </Pressable>
        </View>

        {/* Earnings List */}
        <View className="px-4" style={{ gap: 24 }}>
          {groupedEarnings.map((group) => (
            <View key={`${group.month}-${group.year}`}>
              <View className="flex-row justify-between items-center pb-2 pt-6">
                <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-[#121417]"}`}>
                  {group.month} {group.year}
                </Text>
                <Pressable onPress={() => router.push('/(tabs)/gallery')}>
                  <Text className="text-[#2B5E9C] text-sm font-semibold">See all</Text>
                </Pressable>
              </View>
              
              <View className={`flex-col ${isDark ? "divide-y divide-slate-700" : "divide-y divide-zinc-100"}`}>
                {group.entries.map((entry) => (
                  <Pressable
                    key={entry.id}
                    onPress={() => {
                      router.push('/(tabs)/gallery');
                    }}
                    className={`flex-row gap-4 px-4 py-4 justify-between items-center ${
                      isDark ? "bg-slate-800" : "bg-white"
                    }`}
                  >
                    <View className="flex-row items-start flex-1 min-w-0" style={{ gap: 16 }}>
                      <View className="text-[#2B5E9C] items-center justify-center rounded-lg bg-[#2B5E9C]/10 shrink-0 w-12 h-12">
                        <MaterialIcons name={entry.icon} size={24} color="#2B5E9C" />
                      </View>
                      <View className="flex-1 flex-col justify-center min-w-0">
                        <Text className={`text-base font-semibold mb-1 ${isDark ? "text-white" : "text-[#121417]"}`} numberOfLines={1}>
                          {entry.date} - {entry.location}
                        </Text>
                        <Text className={`text-xs font-normal ${isDark ? "text-gray-400" : "text-[#687482]"}`}>
                          {entry.hours} hrs @ £{entry.rate}/hr
                        </Text>
                      </View>
                    </View>
                    <View className="shrink-0 text-right ml-2">
                      <Text className={`text-base font-bold ${
                        entry.status === 'paid' ? 'text-[#00C853]' : (isDark ? 'text-white' : 'text-[#121417]')
                      }`}>
                        {entry.amount}
                      </Text>
                      <Text className={`text-[10px] uppercase ${
                        entry.status === 'paid' ? 'text-[#00C853]' : (isDark ? 'text-gray-400' : 'text-[#687482]')
                      }`}>
                        {entry.status === 'paid' ? 'Paid' : 'Pending'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
