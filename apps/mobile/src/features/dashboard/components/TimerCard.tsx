import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Platform, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TimerService } from '@/features/timer/timer.service';
import { ActiveSession } from '../dashboard.types';
import { formatTime } from '../dashboard.utils';

const PulsingDot = () => {
    const pulse = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 0.3,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [pulse]);
    return (
        <Animated.View
            style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#EF4444',
                opacity: pulse,
            }}
        />
    );
};

interface TimerCardProps {
    activeSession: ActiveSession | null;
    timer: { hours: number; minutes: number; seconds: number };
    isPaused: boolean;
    isDark: boolean;
    handleRestartSession: () => void;
    handlePauseSession: () => void;
    handleResumeSession: () => void;
    handleStopSession: () => void;
}

export const TimerCard: React.FC<TimerCardProps> = ({
    activeSession,
    timer,
    isPaused,
    isDark,
    handleRestartSession,
    handlePauseSession,
    handleResumeSession,
    handleStopSession,
}) => {
    if (!activeSession?.isActive) return null;

    return (
        <View
            className={`p-6 rounded-[32px] shadow-2xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'
                }`}
        >
            <View className="items-center mb-6">
                <View className="flex-row items-center gap-2 mb-2">
                    {!isPaused ? (
                        <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100">
                            <PulsingDot />
                            <Text className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                                Live
                            </Text>
                        </View>
                    ) : (
                        <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100">
                            <View className="w-2 h-2 rounded-full bg-amber-500" />
                            <Text className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                                Paused
                            </Text>
                        </View>
                    )}
                </View>

                <Text
                    className={`text-6xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'
                        }`}
                    style={{
                        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                    }}
                >
                    {formatTime(timer.hours)}:{formatTime(timer.minutes)}:
                    {formatTime(timer.seconds)}
                </Text>

                <Text className="text-sm text-slate-400 mt-2 font-medium">
                    {activeSession.workDescription || 'Clinical Session Tracking'}
                </Text>
            </View>

            <View className="flex-row items-center justify-center gap-4">
                <Pressable
                    onPress={handleRestartSession}
                    className={`w-14 h-14 rounded-full items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'
                        }`}
                >
                    <MaterialIcons
                        name="refresh"
                        size={26}
                        color={isDark ? '#94A3B8' : '#64748B'}
                    />
                </Pressable>

                <Pressable
                    onPress={isPaused ? handleResumeSession : handlePauseSession}
                    className={`w-20 h-20 rounded-full items-center justify-center shadow-lg ${isPaused ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                >
                    <MaterialIcons
                        name={isPaused ? 'play-arrow' : 'pause'}
                        color="white"
                        size={40}
                    />
                </Pressable>

                <Pressable
                    onPress={handleStopSession}
                    className="w-14 h-14 rounded-full bg-red-50 items-center justify-center border border-red-100"
                >
                    <MaterialIcons name="stop" color="#EF4444" size={26} />
                </Pressable>
            </View>

            <Pressable
                onPress={() => TimerService.requestPermissions()}
                className="mt-6 self-center border-b border-slate-200 pb-0.5"
            >
                <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Optimize Background Tracking
                </Text>
            </Pressable>
        </View>
    );
};
