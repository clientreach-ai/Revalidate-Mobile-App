import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';

interface CalendarHeaderProps {
    currentDate: Date;
    isDark: boolean;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onInvitesPress: () => void;
    invitesCount: number;
}

const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
    currentDate,
    isDark,
    onPrevMonth,
    onNextMonth,
    onInvitesPress,
    invitesCount,
}) => {
    return (
        <View className="px-6 py-4 flex-row justify-between items-center">
            <View>
                <Text className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
                    Professional Calendar
                </Text>
                <Text className={`text-xs font-medium uppercase tracking-wider mt-0.5 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                    UK Revalidation Tracker
                </Text>
            </View>
            <View className="flex-row items-center" style={{ gap: 12 }}>
                <Pressable
                    onPress={onInvitesPress}
                    className={`relative w-10 h-10 rounded-full shadow-sm items-center justify-center border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                        }`}
                >
                    <MaterialIcons name="mail" size={20} color="#2B5F9E" />
                    {invitesCount > 0 && (
                        <View className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white items-center justify-center">
                            <Text className="text-white text-[8px] font-bold" style={{ lineHeight: 10 }}>{invitesCount}</Text>
                        </View>
                    )}
                </Pressable>
            </View>
        </View>
    );
};
