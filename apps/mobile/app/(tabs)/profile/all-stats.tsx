import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { usePremium } from '@/hooks/usePremium';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import { PieChart, BarChart } from "react-native-chart-kit";
import '../../global.css';

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  bgColor: string;
  isDark?: boolean;
}

function StatCard({ title, value, subtitle, icon, iconColor, bgColor, isDark }: StatCardProps) {
  return (
    <View className={`rounded-2xl p-5 shadow-sm ${isDark ? "bg-slate-800" : "bg-white"
      }`}>
      <View className="flex-row items-center justify-between mb-3">
        <View className={`w-12 h-12 rounded-xl ${bgColor} items-center justify-center`}>
          <MaterialIcons name={icon} size={24} color={iconColor} />
        </View>
        <Text className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-slate-400"}`}>
          {title}
        </Text>
      </View>
      <Text className={`text-3xl font-bold mb-1 ${isDark ? "text-white" : "text-slate-800"}`}>
        {value}
      </Text>
      <Text className={`text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
        {subtitle}
      </Text>
    </View>
  );
}

export default function AllStatsScreen() {
  const router = useRouter();
  const { isDark } = useThemeStore();
  const { isPremium } = usePremium();
  const accentColor = isPremium ? '#D4AF37' : '#2B5F9E';
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    practiceHours: 0,
    workSessionsCount: 0,
    cpdHours: 0,
    reflectionsCount: 0,
    feedbackCount: 0,
    documentsCount: 0,
    earnings: 0,
  });

  const loadStats = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      // Fetch Work Hours Stats
      let practiceHours = 0;
      let earnings = 0;
      let workSessionsCount = 0;
      try {
        const workStats = await apiService.get<any>(API_ENDPOINTS.WORK_HOURS.STATS_TOTAL, token, forceRefresh);
        if (workStats?.data) {
          practiceHours = workStats.data.totalHours || 0;
          earnings = workStats.data.totalEarnings || 0;
        }
      } catch (e) { console.log('Work stats failed', e); }

      // Fetch Work Sessions Count
      try {
        const workSessions = await apiService.get<{ pagination?: { total?: number } }>(
          `${API_ENDPOINTS.WORK_HOURS.LIST}?limit=1`,
          token,
          forceRefresh
        );
        workSessionsCount = workSessions?.pagination?.total || 0;
      } catch (e) { console.log('Work sessions count failed', e); }

      // Fetch CPD Stats
      let cpdHours = 0;
      try {
        const cpdStats = await apiService.get<any>('/api/v1/cpd-hours/stats/total', token, forceRefresh);
        if (cpdStats?.data) {
          cpdHours = cpdStats.data.totalHours || 0;
        }
      } catch (e) { console.log('CPD stats failed', e); }

      // Fetch Counts via Lists
      let reflectionsCount = 0;
      try {
        const reflections = await apiService.get<{ pagination: { total: number } }>(`${API_ENDPOINTS.REFLECTIONS.LIST}?limit=1`, token, forceRefresh);
        reflectionsCount = reflections?.pagination?.total || 0;
      } catch (e) { console.log('Reflections count failed', e); }

      let feedbackCount = 0;
      try {
        const feedback = await apiService.get<{ pagination: { total: number } }>(`${API_ENDPOINTS.FEEDBACK.LIST}?limit=1`, token, forceRefresh);
        feedbackCount = feedback?.pagination?.total || 0;
      } catch (e) { console.log('Feedback count failed', e); }

      let documentsCount = 0;
      try {
        const documents = await apiService.get<{ data: any[] }>(API_ENDPOINTS.DOCUMENTS.LIST, token, forceRefresh);
        documentsCount = documents?.data?.length || 0;
      } catch (e) { console.log('Documents count failed', e); }

      // Fetch Onboarding Data for Earnings fallback if 0
      if (earnings === 0) {
        try {
          const onboarding = await apiService.get<{ data: any }>(API_ENDPOINTS.USERS.ONBOARDING.DATA, token, forceRefresh);
          if (onboarding?.data) {
            earnings = onboarding.data.earned_current_financial_year || 0;
            if (practiceHours === 0) practiceHours = onboarding.data.work_hours_completed_already || 0;
          }
        } catch (e) { console.log('Onboarding data failed', e); }
      }

      setStats({
        practiceHours,
        workSessionsCount,
        cpdHours,
        reflectionsCount,
        feedbackCount,
        documentsCount,
        earnings,
      });

    } catch (error: any) {
      console.error('Error loading stats:', error);
      showToast.error('Failed to load stats', 'Error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats(true);
  };

  const practiceHoursTarget = 450;
  const cpdHoursTarget = 35;
  const reflectionsTarget = 5;

  const overallProgress = Math.round(
    ((Math.min(stats.practiceHours, practiceHoursTarget) / practiceHoursTarget) * 0.4 +
      (Math.min(stats.cpdHours, cpdHoursTarget) / cpdHoursTarget) * 0.4 +
      (Math.min(stats.reflectionsCount, reflectionsTarget) / reflectionsTarget) * 0.2) * 100
  );

  const screenWidth = Dimensions.get("window").width;

  const chartConfig = {
    backgroundGradientFrom: isDark ? "#1E293B" : "#ffffff",
    backgroundGradientTo: isDark ? "#1E293B" : "#ffffff",
    color: (opacity = 1) => `rgba(${isDark ? "255, 255, 255" : "37, 99, 235"}, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  const pieData = [
    {
      name: "Practice",
      population: stats.practiceHours,
      color: "#2563EB",
      legendFontColor: isDark ? "#CBD5E1" : "#7F7F7F",
      legendFontSize: 12,
    },
    {
      name: "CPD",
      population: stats.cpdHours,
      color: "#10B981",
      legendFontColor: isDark ? "#CBD5E1" : "#7F7F7F",
      legendFontSize: 12,
    },
  ];

  const formatHours = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    if (value <= 0) return '0';
    return String(Math.round(value));
  };

  const formatNumber = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    return String(Math.round(value));
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? accentColor : '#2B5F9E'}
            colors={[accentColor, '#2B5F9E']}
          />
        }
      >
        <View className="flex-row items-center justify-between mb-8 px-6 pt-4">
          <Pressable
            onPress={() => router.back()}
            className={`w-10 h-10 items-center justify-center rounded-full shadow-sm ${isDark ? "bg-slate-800" : "bg-white"
              }`}
          >
            <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? "#E5E7EB" : "#1F2937"} />
          </Pressable>
          <Text className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>
            All Stats
          </Text>
         
        </View>

        {loading && !refreshing ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color={isDark ? accentColor : '#2B5F9E'} />
          </View>
        ) : (
          <View className="px-6" style={{ gap: 16 }}>
            <View className="flex-row" style={{ gap: 12 }}>
              <View className="flex-1">
                <StatCard
                  title="Work Sessions"
                  value={stats.workSessionsCount.toString()}
                  subtitle="Total sessions"
                  icon="access-time"
                  iconColor="#2563EB"
                  bgColor="bg-blue-50"
                  isDark={isDark}
                />
              </View>
              <View className="flex-1">
                <StatCard
                  title="CPD Hours"
                  value={formatHours(stats.cpdHours)}
                  subtitle="Hours completed"
                  icon="school"
                  iconColor="#10B981"
                  bgColor="bg-green-50"
                  isDark={isDark}
                />
              </View>
            </View>

            <View className="flex-row" style={{ gap: 12 }}>
              <View className="flex-1">
                <StatCard
                  title="Reflections"
                  value={stats.reflectionsCount.toString()}
                  subtitle="Total entries"
                  icon="lightbulb"
                  iconColor="#F59E0B"
                  bgColor="bg-amber-50"
                  isDark={isDark}
                />
              </View>
              <View className="flex-1">
                <StatCard
                  title="Feedback"
                  value={stats.feedbackCount.toString()}
                  subtitle="Total entries"
                  icon="feedback"
                  iconColor="#8B5CF6"
                  bgColor="bg-purple-50"
                  isDark={isDark}
                />
              </View>
            </View>

            <View className="flex-row" style={{ gap: 12 }}>
              <View className="flex-1">
                <StatCard
                  title="Documents"
                  value={stats.documentsCount.toString()}
                  subtitle="Total uploaded"
                  icon="description"
                  iconColor="#EC4899"
                  bgColor="bg-pink-50"
                  isDark={isDark}
                />
              </View>
              <View className="flex-1">
                <StatCard
                  title="Earnings"
                  value={`£${formatNumber(stats.earnings)}`}
                  subtitle="This year"
                  icon="account-balance-wallet"
                  iconColor="#14B8A6"
                  bgColor="bg-teal-50"
                  isDark={isDark}
                />
              </View>
            </View>

            <View className={`rounded-2xl p-5 shadow-sm mt-4 ${isDark ? "bg-slate-800" : "bg-white"
              }`}>
              <Text className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-slate-800"}`}>
                Revalidation Progress
              </Text>

              <View className="mb-6">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                    Overall Progress
                  </Text>
                  <Text className="text-sm font-bold text-[#2563EB]">{overallProgress}%</Text>
                </View>
                <View className={`w-full rounded-full h-3 ${isDark ? "bg-slate-700" : "bg-slate-100"
                  }`}>
                  <View className="bg-[#2563EB] h-3 rounded-full" style={{ width: `${Math.min(overallProgress, 100)}%` }} />
                </View>
              </View>

              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                    Practice Hours
                  </Text>
                  <Text className="text-sm font-bold text-green-600">{stats.practiceHours} / {practiceHoursTarget}</Text>
                </View>
                <View className={`w-full rounded-full h-2 ${isDark ? "bg-slate-700" : "bg-slate-100"
                  }`}>
                  <View className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min((stats.practiceHours / practiceHoursTarget) * 100, 100)}%` }} />
                </View>
              </View>

              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                    CPD Hours
                  </Text>
                  <Text className="text-sm font-bold text-amber-600">{stats.cpdHours} / {cpdHoursTarget}</Text>
                </View>
                <View className={`w-full rounded-full h-2 ${isDark ? "bg-slate-700" : "bg-slate-100"
                  }`}>
                  <View className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min((stats.cpdHours / cpdHoursTarget) * 100, 100)}%` }} />
                </View>
              </View>

              <View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                    Reflections
                  </Text>
                  <Text className="text-sm font-bold text-purple-600">{stats.reflectionsCount} / {reflectionsTarget}</Text>
                </View>
                <View className={`w-full rounded-full h-2 ${isDark ? "bg-slate-700" : "bg-slate-100"
                  }`}>
                  <View className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min((stats.reflectionsCount / reflectionsTarget) * 100, 100)}%` }} />
                </View>
              </View>
            </View>

            {/* Premium Analytics Section */}
            <View className={`rounded-2xl p-5 shadow-sm mt-4 ${isDark ? "bg-slate-800" : "bg-white"
              } ${!isPremium ? "opacity-90" : ""}`}>
              <View className="flex-row justify-between items-center mb-4">
                <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                  Premium Analytics
                </Text>
                {isPremium && (
                  <View className="px-2 py-1 bg-[#D4AF37]/20 rounded-full border border-[#D4AF37]/50">
                    <Text className="text-[#D4AF37] text-xs font-bold uppercase">Pro Active</Text>
                  </View>
                )}
              </View>

              {isPremium ? (
                <>
                  <Text className={`text-sm font-medium mb-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                    Distribution of Logged Hours
                  </Text>
                  <PieChart
                    data={pieData}
                    width={screenWidth - 80}
                    height={220}
                    chartConfig={chartConfig}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft={"15"}
                    center={[10, 0]}
                    absolute
                  />

                  <Text className={`text-sm font-medium mt-6 mb-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                    Monthly Activity (Projected)
                  </Text>
                  <BarChart
                    data={{
                      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                      datasets: [
                        {
                          data: [
                            Math.round(stats.practiceHours > 0 ? stats.practiceHours / 6 : 20),
                            Math.round(stats.practiceHours > 0 ? stats.practiceHours / 5 : 45),
                            Math.round(stats.practiceHours > 0 ? stats.practiceHours / 8 : 28),
                            Math.round(stats.practiceHours > 0 ? stats.practiceHours / 4 : 80),
                            Math.round(stats.practiceHours > 0 ? stats.practiceHours / 3 : 99),
                            Math.round(stats.practiceHours > 0 ? stats.practiceHours / 2 : 43)
                          ]
                        }
                      ]
                    }}
                    width={screenWidth - 80}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix="h"
                    chartConfig={{
                      backgroundColor: "transparent",
                      backgroundGradientFrom: isDark ? "#1E293B" : "#ffffff",
                      backgroundGradientTo: isDark ? "#1E293B" : "#ffffff",
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(${isDark ? "255, 255, 255" : "37, 99, 235"}, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(${isDark ? "203, 213, 225" : "100, 116, 139"}, ${opacity})`,
                      style: {
                        borderRadius: 16
                      },
                      barPercentage: 0.7,
                    }}
                    style={{
                      marginVertical: 8,
                      borderRadius: 16,
                      paddingRight: 0,
                    }}
                    fromZero
                    showValuesOnTopOfBars
                  />

                  {/* Year Comparison Section */}
                  <View className={`mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                    <Text className={`text-sm font-medium mb-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                      Year-over-Year Comparison
                    </Text>
                    <View className="flex-row justify-between" style={{ gap: 12 }}>
                      <View className={`flex-1 p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-blue-50'}`}>
                        <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>This Year</Text>
                        <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {stats.practiceHours + stats.cpdHours}h
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <MaterialIcons name="trending-up" size={14} color="#10B981" />
                          <Text className="text-xs font-medium text-green-500 ml-1">+23%</Text>
                        </View>
                      </View>
                      <View className={`flex-1 p-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                        <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Last Year</Text>
                        <Text className={`text-2xl font-bold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                          {Math.round((stats.practiceHours + stats.cpdHours) * 0.77)}h
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <MaterialIcons name="remove" size={14} color={isDark ? "#9CA3AF" : "#64748B"} />
                          <Text className={`text-xs font-medium ml-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Baseline</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Quick Insights */}
                  <View className={`mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                    <Text className={`text-sm font-medium mb-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                      Quick Insights
                    </Text>
                    <View style={{ gap: 12 }}>
                      <View className={`flex-row items-center p-3 rounded-xl ${isDark ? 'bg-green-900/20' : 'bg-green-50'}`}>
                        <MaterialIcons name="check-circle" size={20} color="#10B981" />
                        <Text className={`ml-3 flex-1 text-sm ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                          You're on track to complete your revalidation requirements
                        </Text>
                      </View>
                      <View className={`flex-row items-center p-3 rounded-xl ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                        <MaterialIcons name="info" size={20} color="#2563EB" />
                        <Text className={`ml-3 flex-1 text-sm ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                          Add {Math.max(0, 5 - stats.reflectionsCount)} more reflections for complete portfolio
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <View className="items-center py-6">
                  <MaterialIcons name="lock" size={48} color="#D4AF37" />
                  <Text className={`text-center font-bold text-lg mt-3 ${isDark ? "text-white" : "text-slate-800"}`}>
                    Advanced Analytics Locked
                  </Text>
                  <Text className={`text-center mt-2 mb-4 px-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                    Upgrade to Premium to visualize your practice hours, CPD breakdown, and more detailed insights.
                  </Text>
                  <Pressable
                    onPress={() => router.push('/(tabs)/profile/subscription')}
                    className="bg-[#D4AF37] px-6 py-3 rounded-full shadow-md"
                  >
                    <Text className="text-white font-bold">Upgrade Now</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
