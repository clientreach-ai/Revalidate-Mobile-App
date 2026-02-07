import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePremium } from '@/hooks/usePremium';
import { RecentActivity } from '../dashboard.types';
import { buildActivityRoute } from '../dashboard.utils';

interface ActivitySectionProps {
  activities: RecentActivity[];
  isDark: boolean;
  isActivitiesLoading: boolean;
}

export const ActivitySection: React.FC<ActivitySectionProps> = ({
  activities,
  isDark,
  isActivitiesLoading,
}) => {
  const router = useRouter();
  const { isPremium } = usePremium();
  const accentColor = isPremium ? '#D4AF37' : '#2563EB';
  const premiumSoft = isDark
    ? 'rgba(212, 175, 55, 0.18)'
    : 'rgba(212, 175, 55, 0.12)';
  const premiumBorder = isDark
    ? 'rgba(212, 175, 55, 0.45)'
    : 'rgba(212, 175, 55, 0.3)';
  const premiumTitle = isDark ? '#F8FAFC' : '#1F2937';
  const premiumSubtext = isDark ? '#CBD5E1' : '#64748B';
  const premiumMuted = isDark ? '#94A3B8' : '#94A3B8';

  return (
    <View className="mt-2">
      <View className="flex-row items-center justify-between mb-3">
        <Text
          className={`text-lg font-bold ${
            isDark ? 'text-white' : 'text-slate-800'
          }`}
          style={isPremium ? { color: premiumTitle } : undefined}
        >
          Recent Activity
        </Text>
        <Pressable onPress={() => router.push('/(tabs)/notifications')}>
          <Text
            className="text-sm font-semibold"
            style={{ color: accentColor }}
          >
            View All
          </Text>
        </Pressable>
      </View>

      {isActivitiesLoading && activities.length === 0 ? (
        <View className="py-8 items-center">
          <ActivityIndicator size="small" color={accentColor} />
        </View>
      ) : activities.length === 0 ? (
        <View
          className={`p-4 rounded-2xl border ${
            isDark
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-slate-100'
          }`}
          style={isPremium ? { borderColor: premiumBorder } : undefined}
        >
          <Text
            className="text-slate-400"
            style={isPremium ? { color: premiumMuted } : undefined}
          >
            No recent activity
          </Text>
        </View>
      ) : (
        activities.map((a, idx) => (
          <Pressable
            key={a.id ?? idx}
            onPress={() => router.push(buildActivityRoute(a) as any)}
            className={`p-4 rounded-2xl border mb-3 ${
              isDark
                ? 'bg-slate-800 border-slate-700'
                : 'bg-white border-slate-100'
            }`}
            style={isPremium ? { borderColor: premiumBorder } : undefined}
          >
            <View className="flex-row items-center">
              <View
                className="w-10 h-10 rounded-2xl items-center justify-center mr-3"
                style={{
                  backgroundColor: isPremium
                    ? premiumSoft
                    : a.bgColor || '#E9F2FF',
                }}
              >
                <MaterialIcons
                  name={a.icon as any}
                  size={20}
                  color={isPremium ? accentColor : a.iconColor || '#2B5F9E'}
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`font-semibold ${
                    isDark ? 'text-white' : 'text-slate-800'
                  }`}
                  style={isPremium ? { color: premiumTitle } : undefined}
                >
                  {a.title}
                </Text>
                <Text
                  className="text-xs text-slate-500"
                  style={isPremium ? { color: premiumSubtext } : undefined}
                  numberOfLines={2}
                >
                  {a.subtitle}
                </Text>
              </View>
              <Text
                className="text-xs text-slate-400 ml-2"
                style={isPremium ? { color: premiumMuted } : undefined}
              >
                {a.time}
              </Text>
            </View>
          </Pressable>
        ))
      )}
    </View>
  );
};
