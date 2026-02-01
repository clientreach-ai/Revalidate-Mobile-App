import React from 'react';
import { View, Text, Image, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { UserData } from '../dashboard.types';
import { getGreeting, formatUserName } from '../dashboard.utils';

interface DashboardHeaderProps {
    userData: UserData | null;
    unreadNotifications: number;
    isPremium: boolean;
    localProfileImage: string | null;
    isUserLoading: boolean;
    revalidationDays: number | null;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    userData,
    unreadNotifications,
    isPremium,
    localProfileImage,
    isUserLoading,
    revalidationDays,
}) => {
    const router = useRouter();

    return (
        <View
            className="px-6 pt-6 pb-16 rounded-b-[36px]"
            style={{ backgroundColor: isPremium ? '#D4AF37' : '#2B5F9E' }}
        >
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                    <Pressable
                        onPress={() => router.push('/(tabs)/profile')}
                        className="w-12 h-12 rounded-full border-2 border-white/30 items-center justify-center bg-white/20 relative"
                    >
                        {localProfileImage || userData?.image ? (
                            <Image
                                source={{ uri: localProfileImage || userData?.image || '' }}
                                className="w-full h-full rounded-full"
                            />
                        ) : (
                            <MaterialIcons name="person" size={24} color="#FFFFFF" />
                        )}
                        <View className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
                    </Pressable>
                    <View>
                        <Text className="text-white/80 text-xs font-semibold uppercase tracking-wide">
                            {getGreeting()}
                        </Text>
                        {isUserLoading && !userData ? (
                            <ActivityIndicator
                                size="small"
                                color="#FFFFFF"
                                style={{ alignSelf: 'flex-start', marginTop: 4 }}
                            />
                        ) : (
                            <Text className="text-white text-xl font-bold">
                                {formatUserName(userData)}
                            </Text>
                        )}
                    </View>
                </View>
                <Pressable
                    onPress={() => router.push('/(tabs)/notifications')}
                    className="w-10 h-10 rounded-full bg-white/15 items-center justify-center border border-white/25"
                >
                    <MaterialIcons name="notifications" size={22} color="#FFFFFF" />
                    {unreadNotifications > 0 && (
                        <View className="absolute -top-1 -right-1 bg-red-500 w-5 h-5 rounded-full items-center justify-center border border-white">
                            <Text className="text-white text-[10px] font-bold">
                                {Math.min(unreadNotifications, 99)}
                            </Text>
                        </View>
                    )}
                </Pressable>
            </View>
            {revalidationDays !== null && (
                <View className="mt-5 w-full px-4 py-3 rounded-2xl border bg-white/15 border-white/25 flex-row items-center justify-between">
                    <View>
                        <Text className="text-[10px] font-semibold text-white/80 uppercase">
                            Revalidation
                        </Text>
                        <Text className="text-white/80 text-xs">Status</Text>
                    </View>
                    <View className="px-3 py-1.5 rounded-xl bg-white/15 border border-white/25">
                        <Text className="font-bold text-white">
                            {revalidationDays > 0
                                ? `${revalidationDays} Days`
                                : revalidationDays === 0
                                    ? 'Due Today'
                                    : 'Overdue'}
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
};
