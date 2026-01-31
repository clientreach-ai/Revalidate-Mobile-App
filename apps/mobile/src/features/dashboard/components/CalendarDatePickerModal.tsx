import React, { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface CalendarDatePickerModalProps {
    visible: boolean;
    onClose: () => void;
    selectedDate: Date;
    onSelect: (date: Date) => void;
    isDark: boolean;
}

const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarDatePickerModal: React.FC<CalendarDatePickerModalProps> = ({
    visible,
    onClose,
    selectedDate,
    onSelect,
    isDark,
}) => {
    const [calMonth, setCalMonth] = useState(new Date().getMonth());
    const [calYear, setCalYear] = useState(new Date().getFullYear());

    const getDaysInMonth = (m: number, y: number) =>
        new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (m: number, y: number) =>
        new Date(y, m, 1).getDay();

    const navigateCalMonth = (dir: 'prev' | 'next') => {
        if (dir === 'prev') {
            if (calMonth === 0) {
                setCalMonth(11);
                setCalYear(calYear - 1);
            } else setCalMonth(calMonth - 1);
        } else {
            if (calMonth === 11) {
                setCalMonth(0);
                setCalYear(calYear + 1);
            } else setCalMonth(calMonth + 1);
        }
    };

    const renderCalendarDays = () => {
        const daysInMonth = getDaysInMonth(calMonth, calYear);
        const firstDay = getFirstDayOfMonth(calMonth, calYear);
        const nodes: any[] = [];

        for (let i = 0; i < firstDay; i++)
            nodes.push(<View key={`empty-${i}`} className="w-10 h-10" />);

        for (let day = 1; day <= daysInMonth; day++) {
            const isSelected =
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === calMonth &&
                selectedDate.getFullYear() === calYear;

            nodes.push(
                <Pressable
                    key={day}
                    onPress={() => {
                        onSelect(new Date(calYear, calMonth, day));
                        onClose();
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-blue-600' : ''
                        }`}
                >
                    <Text
                        className={`text-sm font-medium ${isSelected ? 'text-white' : isDark ? 'text-white' : 'text-slate-800'
                            }`}
                    >
                        {day}
                    </Text>
                </Pressable>
            );
        }
        return nodes;
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
                <Pressable
                    onPress={(e) => e.stopPropagation()}
                    className={`${isDark ? 'bg-slate-900' : 'bg-white'} rounded-t-3xl p-6`}
                >
                    <View className="flex-row items-center justify-between mb-4">
                        <Pressable onPress={() => navigateCalMonth('prev')} className="p-2">
                            <MaterialIcons
                                name="chevron-left"
                                size={24}
                                color={isDark ? 'white' : 'black'}
                            />
                        </Pressable>
                        <Text
                            className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'
                                }`}
                        >
                            {monthNames[calMonth]} {calYear}
                        </Text>
                        <Pressable onPress={() => navigateCalMonth('next')} className="p-2">
                            <MaterialIcons
                                name="chevron-right"
                                size={24}
                                color={isDark ? 'white' : 'black'}
                            />
                        </Pressable>
                    </View>
                    <View className="flex-row justify-between mb-3">
                        {dayNames.map((d) => (
                            <View key={d} className="w-10 items-center">
                                <Text
                                    className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'
                                        }`}
                                >
                                    {d}
                                </Text>
                            </View>
                        ))}
                    </View>
                    <View className="flex-row flex-wrap justify-between mb-6">
                        {renderCalendarDays()}
                    </View>
                    <Pressable
                        onPress={onClose}
                        className={`py-4 rounded-2xl items-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'
                            }`}
                    >
                        <Text
                            className={`font-semibold ${isDark ? 'text-white' : 'text-slate-700'
                                }`}
                        >
                            Cancel
                        </Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
};
