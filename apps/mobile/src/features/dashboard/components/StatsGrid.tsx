import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DashboardStats } from '../dashboard.types';
import { formatCurrency } from '../dashboard.utils';

interface StatsGridProps {
    stats: DashboardStats;
    isPremium: boolean;
    isDark: boolean;
    isStatsLoading: boolean;
}

export const StatsGrid: React.FC<StatsGridProps> = ({
    stats,
    isPremium,
    isDark,
    isStatsLoading,
}) => {
    const router = useRouter();

    const getStatsList = () => {
        const base = [
            {
                icon: 'schedule',
                value: stats.workSessionsCount,
                label: 'Work Sessions',
                route: '/(tabs)/workinghours',
                iconColor: '#2563EB',
                iconBg: '#E8F1FF',
            },
            {
                icon: 'payments',
                value: formatCurrency(stats.totalEarnings),
                label: 'Total Earnings',
                route: '/(tabs)/earings',
                premium: true,
                iconColor: '#16A34A',
                iconBg: '#E8F8EF',
            },
            {
                icon: 'school',
                value: stats.cpdHours,
                label: 'CPD Hours',
                route: '/(tabs)/cpdhourstracking',
                iconColor: '#7C3AED',
                iconBg: '#F2ECFF',
            },
            {
                icon: 'description',
                value: stats.reflectionsCount,
                label: 'Reflections',
                route: '/(tabs)/reflections',
                iconColor: '#D97706',
                iconBg: '#FFF3E0',
            },
            {
                icon: 'verified',
                value: stats.appraisalsCount,
                label: 'Appraisals',
                route: '/(tabs)/appraisal',
                iconColor: '#2563EB',
                iconBg: '#E8F1FF',
            },
        ];
        return base.filter((s) => !s.premium || isPremium);
    };

    const statsList = getStatsList();

    return (
        <View className="flex-row flex-wrap" style={{ gap: 16 }}>
            {statsList.map((s, i) => (
                <Pressable
                    key={i}
                    onPress={() => router.push(s.route as any)}
                    className={`p-4 rounded-3xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
                        }`}
                    style={{
                        width: isPremium && i === statsList.length - 1 ? '100%' : '47%',
                    }}
                >
                    {isPremium && s.label === 'Appraisals' ? (
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <View
                                    className="w-10 h-10 rounded-2xl items-center justify-center"
                                    style={{ backgroundColor: s.iconBg || '#EEF2FF' }}
                                >
                                    <MaterialIcons
                                        name={s.icon as any}
                                        size={22}
                                        color={s.iconColor || '#2B5F9E'}
                                    />
                                </View>
                                <Text className="text-sm text-slate-500 ml-3">{s.label}</Text>
                            </View>
                            <View className="justify-center">
                                {isStatsLoading && stats.totalHours === 0 ? (
                                    <ActivityIndicator size="small" color={s.iconColor || '#2B5F9E'} />
                                ) : (
                                    <Text
                                        className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-slate-800'
                                            }`}
                                    >
                                        {s.value}
                                    </Text>
                                )}
                            </View>
                        </View>
                    ) : (
                        <>
                            <View
                                className="w-10 h-10 rounded-2xl items-center justify-center mb-3"
                                style={{ backgroundColor: s.iconBg || '#EEF2FF' }}
                            >
                                <MaterialIcons
                                    name={s.icon as any}
                                    size={22}
                                    color={s.iconColor || '#2B5F9E'}
                                />
                            </View>
                            <View className="h-8 justify-center">
                                {isStatsLoading && stats.totalHours === 0 ? (
                                    <ActivityIndicator size="small" color={s.iconColor || '#2B5F9E'} />
                                ) : (
                                    <Text
                                        className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'
                                            }`}
                                    >
                                        {s.value}
                                    </Text>
                                )}
                            </View>
                            <Text className="text-sm text-slate-500">{s.label}</Text>
                        </>
                    )}
                </Pressable>
            ))}
        </View>
    );
};
