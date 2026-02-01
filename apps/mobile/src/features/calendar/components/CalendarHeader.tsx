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
            
        </View>
    );
};
