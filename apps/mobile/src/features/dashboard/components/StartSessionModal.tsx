import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StartSessionDetails } from '../dashboard.types';

interface StartSessionModalProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
  onStart: (details: StartSessionDetails) => void;
}

export const StartSessionModal: React.FC<StartSessionModalProps> = ({
  visible,
  onClose,
  isDark,
  onStart,
}) => {
  const [shiftType, setShiftType] = useState<'Full time' | 'Part time'>(
    'Full time'
  );
  const [shiftHours, setShiftHours] = useState('');
  const [shiftMinutes, setShiftMinutes] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSubmitAttempted(false);
  }, [visible]);

  const parseNumber = (value: string) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const totalMinutes =
    Math.max(0, parseNumber(shiftHours)) * 60 +
    Math.max(0, parseNumber(shiftMinutes));
  const showDurationError = submitAttempted && totalMinutes <= 0;

  const handleStart = () => {
    setSubmitAttempted(true);
    if (totalMinutes <= 0) return;

    onStart({
      shiftHours: Math.max(0, Math.floor(parseNumber(shiftHours))),
      shiftMinutes: Math.max(0, Math.floor(parseNumber(shiftMinutes))),
      shiftType,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View
          className={`rounded-t-[32px] p-6 ${isDark ? 'bg-slate-900' : 'bg-white'}`}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text
              className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}
            >
              Start Session
            </Text>
            <Pressable onPress={onClose} className="p-2">
              <MaterialIcons
                name="close"
                size={24}
                color={isDark ? 'white' : 'black'}
              />
            </Pressable>
          </View>

          <Text
            className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
          >
            Tell us about this shift so we can notify you when the time is up.
          </Text>

          {/* Shift Type */}
          <View className="mb-5">
            <Text
              className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              SHIFT TYPE
            </Text>
            <View className="flex-row gap-3">
              {(['Full time', 'Part time'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setShiftType(mode)}
                  className={`flex-1 py-3 items-center rounded-2xl border ${
                    shiftType === mode
                      ? 'bg-emerald-500 border-emerald-500'
                      : isDark
                        ? 'bg-slate-800 border-slate-700'
                        : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Text
                    className={`font-bold ${shiftType === mode ? 'text-white' : isDark ? 'text-slate-300' : 'text-slate-600'}`}
                  >
                    {mode}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Shift Length */}
          <View className="mb-5">
            <Text
              className={`text-xs font-semibold mb-2 ${
                showDurationError
                  ? 'text-red-500'
                  : isDark
                    ? 'text-slate-400'
                    : 'text-slate-500'
              }`}
            >
              SHIFT LENGTH (REQUIRED)
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextInput
                  value={shiftHours}
                  onChangeText={setShiftHours}
                  keyboardType="numeric"
                  placeholder="Hours"
                  placeholderTextColor="gray"
                  className={`p-4 rounded-2xl border ${
                    showDurationError
                      ? 'border-red-500'
                      : isDark
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </View>
              <View className="flex-1">
                <TextInput
                  value={shiftMinutes}
                  onChangeText={setShiftMinutes}
                  keyboardType="numeric"
                  placeholder="Minutes"
                  placeholderTextColor="gray"
                  className={`p-4 rounded-2xl border ${
                    showDurationError
                      ? 'border-red-500'
                      : isDark
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </View>
            </View>
            {showDurationError && (
              <Text className="text-xs text-red-500 mt-2">
                Please enter a shift length.
              </Text>
            )}
          </View>

          {/* Location */}
          <View className="mb-5">
            <Text
              className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              LOCATION (OPTIONAL)
            </Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="e.g., St. Mary Hospital"
              placeholderTextColor="gray"
              className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
            />
          </View>

          {/* Notes */}
          <View className="mb-6">
            <Text
              className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              NOTES (OPTIONAL)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about this shift"
              placeholderTextColor="gray"
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
              className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
            />
          </View>

          <Pressable
            onPress={handleStart}
            className="py-4 rounded-2xl items-center bg-emerald-500"
          >
            <Text className="text-white text-lg font-bold">Start Session</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};
