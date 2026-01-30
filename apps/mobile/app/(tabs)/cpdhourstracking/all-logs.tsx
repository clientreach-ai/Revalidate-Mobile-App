import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '@/services/api';
import { useThemeStore } from '@/features/theme/theme.store';
import '../../global.css';

interface CPDActivity {
    id: string;
    title: string;
    date: string;
    hours: number;
    type: 'participatory' | 'non-participatory';
    icon: keyof typeof MaterialIcons.glyphMap;
    iconBgColor: string;
    iconColor: string;
    hasCertificate?: boolean;
}

export default function AllCPDLogsScreen() {
    const router = useRouter();
    const { isDark } = useThemeStore();
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<CPDActivity[]>([]);
    const [filteredActivities, setFilteredActivities] = useState<CPDActivity[]>([]);
    const [filterType, setFilterType] = useState<'all' | 'participatory' | 'non-participatory'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadActivities();
    }, []);

    useEffect(() => {
        filterActivities();
    }, [activities, filterType, searchQuery]);

    const loadActivities = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;

            const resp = await apiService.get<{ success?: boolean; data: Array<any> }>(`/api/v1/cpd-hours?limit=100`, token);
            const items = Array.isArray(resp?.data) ? resp.data : [];

            const mapped: CPDActivity[] = items.map((it: any) => ({
                id: String(it.id),
                title: it.trainingName || it.training_name || it.training || 'CPD Activity',
                date: it.activityDate || it.activity_date || it.createdAt || it.created_at || '',
                hours: (it.durationMinutes || it.duration_minutes || 0) / 60,
                type: (it.activityType || it.activity_type) as 'participatory' | 'non-participatory',
                icon: (it.activityType || it.activity_type) === 'participatory' ? 'school' : 'menu-book',
                iconBgColor: (it.activityType || it.activity_type) === 'participatory' ? 'bg-blue-100' : 'bg-amber-100',
                iconColor: (it.activityType || it.activity_type) === 'participatory' ? '#2563EB' : '#F59E0B',
                hasCertificate: (it.documentIds && it.documentIds.length > 0) || (it.document_ids && it.document_ids.length > 0),
            }));

            // Sort by date desc
            mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setActivities(mapped);
        } catch (error) {
            console.warn('Error loading CPD activities:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterActivities = () => {
        let result = activities;

        if (filterType !== 'all') {
            result = result.filter(a => a.type === filterType);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(a => a.title.toLowerCase().includes(q));
        }

        setFilteredActivities(result);
    };

    return (
        <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
            <View className={`border-b ${isDark ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-gray-100"}`}>
                <View className="flex-row items-center px-4 py-2">
                    <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
                        <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? "#E5E7EB" : "#121417"} />
                    </Pressable>
                    <Text className={`text-lg font-bold ml-2 ${isDark ? "text-white" : "text-[#121417]"}`}>All CPD Activities</Text>
                </View>

                {/* Search and Filter */}
                <View className="px-4 pb-4 gap-3">
                    <View className={`flex-row items-center border rounded-xl px-3 py-2 ${isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                        <MaterialIcons name="search" size={20} color={isDark ? "#9CA3AF" : "#64748B"} />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search activities..."
                            placeholderTextColor={isDark ? "#9CA3AF" : "#94A3B8"}
                            className={`flex-1 ml-2 text-base ${isDark ? "text-white" : "text-slate-800"}`}
                        />
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {(['all', 'participatory', 'non-participatory'] as const).map((type) => (
                            <Pressable
                                key={type}
                                onPress={() => setFilterType(type)}
                                className={`px-4 py-2 rounded-full border ${filterType === type
                                        ? 'bg-[#2563EB] border-[#2563EB]'
                                        : isDark
                                            ? 'bg-slate-800 border-slate-600'
                                            : 'bg-white border-slate-200'
                                    }`}
                            >
                                <Text className={`text-xs font-semibold capitalize ${filterType === type ? 'text-white' : isDark ? 'text-gray-300' : 'text-slate-600'
                                    }`}>
                                    {type === 'non-participatory' ? 'Non-Participatory' : type}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12 }}>
                    {filteredActivities.length > 0 ? (
                        filteredActivities.map((activity) => (
                            <Pressable
                                key={activity.id}
                                onPress={() => router.push(`/(tabs)/cpdhourstracking/${activity.id}`)}
                                className={`p-4 rounded-2xl border shadow-sm flex-row items-center ${isDark
                                        ? "bg-slate-800 border-slate-700 active:bg-slate-700"
                                        : "bg-white border-slate-100 active:bg-slate-50"
                                    }`}
                                style={{ gap: 16 }}
                            >
                                <View className={`w-12 h-12 rounded-xl ${activity.iconBgColor} items-center justify-center flex-shrink-0`}>
                                    <MaterialIcons name={activity.icon} size={24} color={activity.iconColor} />
                                </View>
                                <View className="flex-1 min-w-0">
                                    <Text className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-800"}`} numberOfLines={1}>
                                        {activity.title}
                                    </Text>
                                    <Text className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                                        {activity.date} • {activity.hours} Hours
                                    </Text>
                                    <View className="flex-row mt-2" style={{ gap: 8 }}>
                                        <View className={`px-2 py-0.5 rounded-md ${isDark ? "bg-slate-700" : "bg-slate-100"}`}>
                                            <Text className={`text-[10px] font-semibold ${isDark ? "text-gray-300" : "text-slate-600"}`}>
                                                {activity.type === 'participatory' ? 'Participatory' : 'Non-Participatory'}
                                            </Text>
                                        </View>
                                        {activity.hasCertificate && (
                                            <View className="flex-row items-center px-2 py-0.5 rounded-md bg-blue-50" style={{ gap: 4 }}>
                                                <MaterialIcons name="description" size={14} color="#2563EB" />
                                                <Text className="text-[10px] font-semibold text-[#2563EB]">
                                                    Certificate
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color={isDark ? "#4B5563" : "#CBD5E1"} />
                            </Pressable>
                        ))
                    ) : (
                        <View className="flex-1 items-center justify-center py-10">
                            <MaterialIcons name="search-off" size={48} color={isDark ? "#4B5563" : "#CBD5E1"} />
                            <Text className={`mt-4 text-center ${isDark ? "text-gray-400" : "text-slate-400"}`}>
                                No activities found matching your criteria.
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
