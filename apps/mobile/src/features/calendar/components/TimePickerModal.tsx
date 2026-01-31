import { View, Text, Modal, ScrollView, Pressable } from 'react-native';
import React from 'react';

interface TimePickerModalProps {
    visible: boolean;
    title: string;
    time: string; // HH:MM
    isDark: boolean;
    onClose: () => void;
    onTimeSelect: (time: string, type?: string) => void;
}

const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
    visible,
    title,
    time,
    isDark,
    onClose,
    onTimeSelect,
}) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable
                className="flex-1 bg-black/50 justify-center items-center"
                onPress={onClose}
            >
                <Pressable
                    onPress={(e) => e.stopPropagation()}
                    className={`rounded-3xl p-6 w-[90%] max-w-sm ${isDark ? "bg-slate-800" : "bg-white"
                        }`}
                >
                    <Text className={`text-xl font-bold mb-4 ${isDark ? "text-white" : "text-slate-800"}`}>
                        {title}
                    </Text>
                    <View className="flex-row justify-center mb-4" style={{ gap: 8 }}>
                        <View className="flex-1">
                            <Text className={`text-xs text-center mb-2 ${isDark ? "text-gray-400" : "text-slate-500"
                                }`}>
                                Hour
                            </Text>
                            <ScrollView className="max-h-32">
                                {Array.from({ length: 24 }, (_, hour) => {
                                    const isSelected = (() => {
                                        if (!time) return false;
                                        const parts = time.split(':');
                                        return parts[0] ? parseInt(parts[0]) === hour : false;
                                    })();
                                    return (
                                        <Pressable
                                            key={hour}
                                            onPress={() => {
                                                const currentMin = time ? parseInt(time.split(':')[1] || '0') : 0;
                                                onTimeSelect(formatTime(hour, currentMin));
                                            }}
                                            className={`py-2 rounded-lg mb-1 ${isSelected
                                                ? 'bg-[#2B5F9E]'
                                                : (isDark ? 'bg-slate-700' : 'bg-slate-50')
                                                }`}
                                        >
                                            <Text className={`text-center text-sm ${isSelected
                                                ? 'text-white font-bold'
                                                : (isDark ? 'text-gray-300' : 'text-slate-700')
                                                }`}>
                                                {hour.toString().padStart(2, '0')}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>
                        <View className="flex-1">
                            <Text className={`text-xs text-center mb-2 ${isDark ? "text-gray-400" : "text-slate-500"
                                }`}>
                                Minute
                            </Text>
                            <ScrollView className="max-h-32">
                                {[0, 15, 30, 45].map((minute) => {
                                    const isSelected = (() => {
                                        if (!time) return false;
                                        const parts = time.split(':');
                                        return parts[1] ? parseInt(parts[1]) === minute : false;
                                    })();
                                    return (
                                        <Pressable
                                            key={minute}
                                            onPress={() => {
                                                const currentHour = time ? parseInt(time.split(':')[0] || '0') : 9;
                                                onTimeSelect(formatTime(currentHour, minute));
                                            }}
                                            className={`py-2 rounded-lg mb-1 ${isSelected
                                                ? 'bg-[#2B5F9E]'
                                                : (isDark ? 'bg-slate-700' : 'bg-slate-50')
                                                }`}
                                        >
                                            <Text className={`text-center text-sm ${isSelected
                                                ? 'text-white font-bold'
                                                : (isDark ? 'text-gray-300' : 'text-slate-700')
                                                }`}>
                                                {minute.toString().padStart(2, '0')}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </View>
                    <View className="flex-row" style={{ gap: 12 }}>
                        <Pressable
                            onPress={onClose}
                            className={`flex-1 py-3 rounded-xl ${isDark ? "bg-slate-700" : "bg-slate-100"
                                }`}
                        >
                            <Text className={`text-center font-semibold ${isDark ? "text-gray-300" : "text-slate-700"
                                }`}>
                                Cancel
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={onClose}
                            className="flex-1 py-3 rounded-xl bg-[#2B5F9E]"
                        >
                            <Text className="text-center font-semibold text-white">Done</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};
