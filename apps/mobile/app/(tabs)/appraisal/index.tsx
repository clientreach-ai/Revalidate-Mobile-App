import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useThemeStore } from '@/features/theme/theme.store';
import { useAppraisalData } from '@/features/appraisal/hooks/useAppraisalData';
import { AppraisalCard } from '@/features/appraisal/components/AppraisalCard';
import { AddAppraisalModal } from '@/features/appraisal/components/AddAppraisalModal';
import '../../global.css';

export default function AppraisalScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDark } = useThemeStore();
    const [showAddModal, setShowAddModal] = useState(false);

    const {
        loading,
        refreshing,
        appraisals,
        loadAppraisals,
        loadHospitals,
        onRefresh,
        hospitals,
        searchHospitals,
        setHospitals,
    } = useAppraisalData();

    useFocusEffect(
        useCallback(() => {
            loadAppraisals();
            loadHospitals();
        }, [loadAppraisals, loadHospitals])
    );



    return (
        <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
            <View className="px-6 py-4">
                <View className="flex-row justify-between items-center mb-6">
                    <View>
                        <Text className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
                            Appraisals
                        </Text>
                        <Text className={`text-sm mt-0.5 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                            Manage your hospital appraisals
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => setShowAddModal(true)}
                        className="w-10 h-10 rounded-full bg-[#2B5F9E]/10 items-center justify-center"
                    >
                        <MaterialIcons name="add-task" size={20} color="#2B5F9E" />
                    </Pressable>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 24 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={isDark ? '#D4AF37' : '#2B5F9E'}
                        colors={['#D4AF37', '#2B5F9E']}
                    />
                }
            >
                {loading && !refreshing ? (
                    <View className="flex-1 items-center justify-center py-20">
                        <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
                        <Text className={`mt-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                            Loading appraisals...
                        </Text>
                    </View>
                ) : (
                    <View>
                        {appraisals.length > 0 ? (
                            [...appraisals]
                                .sort((a, b) => {
                                    const dateSort = new Date(b.appraisal_date).getTime() - new Date(a.appraisal_date).getTime();
                                    if (dateSort !== 0) return dateSort;
                                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                                })
                                .map((appraisal) => (
                                    <AppraisalCard
                                        key={appraisal.id}
                                        appraisal={appraisal}
                                        isDark={isDark}
                                        onPress={() => router.push(`/(tabs)/appraisal/${appraisal.id}`)}
                                    />
                                ))
                        ) : (
                            <View className={`py-20 rounded-3xl border items-center ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-100"}`}>
                                <MaterialIcons name="assignment-late" size={48} color={isDark ? "#4B5563" : "#CBD5E1"} />
                                <Text className={`mt-4 text-center font-medium ${isDark ? "text-gray-400" : "text-slate-400"}`}>
                                    No appraisals logged yet
                                </Text>
                                <Pressable
                                    onPress={() => setShowAddModal(true)}
                                    className="mt-6 px-6 py-3 bg-[#2B5F9E] rounded-full shadow-sm"
                                >
                                    <Text className="text-white font-bold">Log Your First Appraisal</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            <View
                className="absolute left-0 right-0 items-center"
                style={{ bottom: 80 + insets.bottom }}
            >
                <Pressable
                    onPress={() => setShowAddModal(true)}
                    className="w-14 h-14 bg-[#2B5F9E] rounded-full shadow-lg items-center justify-center active:opacity-80"
                >
                    <MaterialIcons name="add" size={32} color="#FFFFFF" />
                </Pressable>
            </View>

            <AddAppraisalModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                isDark={isDark}
                onSuccess={loadAppraisals}
                hospitals={hospitals}
                onLoadHospitals={loadHospitals}
                onSearchHospitals={searchHospitals}
                setHospitals={setHospitals}
            />
        </SafeAreaView>
    );
}
