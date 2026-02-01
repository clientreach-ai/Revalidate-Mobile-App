import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';

interface MonthViewProps {
    currentDate: Date;
    selectedDate: Date;
    calendarDays: Array<{ date: Date; isCurrentMonth: boolean }>;
    eventDateKeys?: Set<string>;
    isDark: boolean;
    isPremium: boolean;
    onDateSelect: (date: Date) => void;
    onPrevMonth: () => void;
    onNextMonth: () => void;
}

const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const toDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const isSameDay = (date1: Date, date2: Date) => {
    return (
        date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
    );
};

export const MonthView: React.FC<MonthViewProps> = ({
    currentDate,
    selectedDate,
    calendarDays,
    eventDateKeys,
    isDark,
    isPremium,
    onDateSelect,
    onPrevMonth,
    onNextMonth,
}) => {
    return (
        <View className="px-4 mb-4">
            <View className={`rounded-3xl p-5 shadow-sm border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                }`}>
                {/* Month Navigation */}
                <View className="flex-row justify-between items-center mb-6 px-2">
                    <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </Text>
                    <View className="flex-row gap-1">
                        <Pressable
                            onPress={onPrevMonth}
                            className="p-1 rounded-lg"
                        >
                            <MaterialIcons name="chevron-left" size={24} color="#64748B" />
                        </Pressable>
                        <Pressable
                            onPress={onNextMonth}
                            className="p-1 rounded-lg"
                        >
                            <MaterialIcons name="chevron-right" size={24} color="#64748B" />
                        </Pressable>
                    </View>
                </View>

                {/* Day Headers */}
                <View className="flex-row justify-between mb-4">
                    {dayNames.map((day) => (
                        <View key={day} className="flex-1 items-center">
                            <Text className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-gray-400" : "text-slate-400"
                                }`}>
                                {day}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Calendar Grid */}
                <View className="flex-row flex-wrap">
                    {calendarDays.map((day, index) => {
                        const isSelected = isSameDay(day.date, selectedDate);
                        const isCurrentMonth = day.isCurrentMonth;
                        const hasEvent = eventDateKeys ? eventDateKeys.has(toDateKey(day.date)) : false;
                        const isToday = isSameDay(day.date, new Date());
                        const selectedAccent = isPremium ? '#D4AF37' : '#2B5F9E';

                        return (
                            <Pressable
                                key={index}
                                onPress={() => onDateSelect(day.date)}
                                className="w-[14.28%] py-2 items-center justify-center"
                            >
                                <View className="relative items-center justify-center">
                                    {isSelected ? (
                                        <>
                                            <View className="w-8 h-8 rounded-full border-2 items-center justify-center" style={{ borderColor: selectedAccent }}>
                                                <Text className="font-bold text-sm" style={{ color: selectedAccent }}>
                                                    {day.date.getDate()}
                                                </Text>
                                            </View>
                                            <View className="absolute -bottom-1 w-1 h-1 rounded-full" style={{ backgroundColor: selectedAccent }} />
                                        </>
                                    ) : (
                                        <>
                                            <Text
                                                className={`text-sm font-medium ${isCurrentMonth
                                                    ? (isDark ? 'text-white' : 'text-slate-800')
                                                    : (isDark ? 'text-gray-500' : 'text-slate-300')
                                                    }`}
                                                style={isPremium && isToday ? { color: '#D4AF37' } : undefined}
                                            >
                                                {day.date.getDate()}
                                            </Text>
                                            {isPremium && isToday && (
                                                <View className="absolute -bottom-1 w-6 h-6 rounded-full border" style={{ borderColor: '#D4AF37' }} />
                                            )}
                                            {hasEvent && (
                                                <View
                                                    className={`absolute -bottom-1 w-1 h-1 rounded-full ${isPremium ? 'bg-[#D4AF37]' : (isDark ? 'bg-slate-400' : 'bg-[#2B5F9E]')}`}
                                                />
                                            )}
                                        </>
                                    )}
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        </View>
    );
};
