import { View, Text, Modal, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { useRouter } from 'expo-router';
import { CalendarEvent } from '../calendar.types';

interface InvitesModalProps {
    visible: boolean;
    isDark: boolean;
    onClose: () => void;
    invites: Array<{ event: CalendarEvent; attendee: any }>;
    onRespond: (eventId: string, attendeeId: string, status: 'accepted' | 'declined') => void;
}

export const InvitesModal: React.FC<InvitesModalProps> = ({
    visible,
    isDark,
    onClose,
    invites,
    onRespond,
}) => {
    const router = useRouter();

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className={`rounded-t-3xl max-h-[70%] ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <SafeAreaView edges={['bottom']} className="px-6 py-4">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Invites</Text>
                            <Pressable onPress={onClose}>
                                <MaterialIcons name="close" size={22} color={isDark ? '#9CA3AF' : '#64748B'} />
                            </Pressable>
                        </View>

                        <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled>
                            {invites.length > 0 ? (
                                invites.map(({ event: ev, attendee }: any) => (
                                    <View key={ev.id} className={`p-4 rounded-xl mb-2 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                                        <View>
                                            <Text className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{ev.title}</Text>
                                            <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                                                {new Date(ev.date).toLocaleDateString()} {ev.startTime ? `• ${ev.startTime}` : ''}
                                            </Text>
                                        </View>
                                        <View className="flex-row mt-3" style={{ gap: 8 }}>
                                            <Pressable
                                                onPress={() => onRespond(String(ev.id), String(attendee.id), 'accepted')}
                                                className="px-4 py-2 rounded-lg bg-[#2B5F9E]"
                                            >
                                                <Text className="text-white">Accept</Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={() => onRespond(String(ev.id), String(attendee.id), 'declined')}
                                                className="px-4 py-2 rounded-lg bg-gray-200"
                                            >
                                                <Text className="text-slate-800">Decline</Text>
                                            </Pressable>
                                            <Pressable
                                                onPress={() => {
                                                    onClose();
                                                    router.push({ pathname: '/calendar/[id]', params: { id: String(ev.id), from: '/calendar' } });
                                                }}
                                                className="px-4 py-2 rounded-lg border"
                                            >
                                                <Text className={`${isDark ? 'text-white' : 'text-slate-800'}`}>View</Text>
                                            </Pressable>
                                            {attendee && attendee.status && (
                                                <View className="ml-auto justify-center">
                                                    <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Status: {attendee.status}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <View className="p-4">
                                    <Text className={`${isDark ? 'text-gray-300' : 'text-slate-700'}`}>No invites at the moment</Text>
                                </View>
                            )}
                        </ScrollView>
                    </SafeAreaView>
                </View>
            </View>
        </Modal>
    );
};
