import { View, Text, Modal, ScrollView, Pressable, TextInput, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { TimePickerModal } from './TimePickerModal';
// Reuse existing date picker from dashboard
import { CalendarDatePickerModal } from '@/features/dashboard/components/CalendarDatePickerModal';
import { searchUsers } from '@/features/users/users.api';

interface AddEventModalProps {
    visible: boolean;
    isDark: boolean;
    onClose: () => void;
    onSave: (eventData: any, selectedUsers: any[]) => Promise<void>;
    initialDate: Date;
    editingEventId: string | null;
    existingEventData?: any;
}

export const AddEventModal: React.FC<AddEventModalProps> = ({
    visible,
    isDark,
    onClose,
    onSave,
    initialDate,
    editingEventId,
    existingEventData,
}) => {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);

    const [eventForm, setEventForm] = useState({
        title: '',
        description: '',
        location: '',
        date: initialDate,
        startTime: '',
        endTime: '',
        type: 'official' as 'official' | 'personal',
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Array<any>>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<Array<{ id: string; name?: string; email?: string }>>([]);

    // Reset or initialize form when opening
    useEffect(() => {
        if (visible) {
            if (editingEventId && existingEventData) {
                setEventForm({
                    title: existingEventData.title || '',
                    description: existingEventData.description || '',
                    location: existingEventData.location || '',
                    date: existingEventData.date ? new Date(existingEventData.date) : new Date(),
                    startTime: existingEventData.startTime || '',
                    endTime: existingEventData.endTime || '',
                    type: existingEventData.type || 'official',
                });
            } else {
                setEventForm({
                    title: '',
                    description: '',
                    location: '',
                    date: initialDate,
                    startTime: '',
                    endTime: '',
                    type: 'official',
                });
                setSelectedUsers([]);
            }
            setFormErrors({});
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [visible, editingEventId, existingEventData, initialDate]);

    // Debounced live search
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        let cancelled = false;
        setIsSearching(true);
        const timer = setTimeout(async () => {
            try {
                const res = await searchUsers(searchQuery, 10, 0);
                if (!cancelled) setSearchResults(res.data || []);
            } catch (e) {
                console.error('User search failed', e);
                if (!cancelled) setSearchResults([]);
            } finally {
                if (!cancelled) setIsSearching(false);
            }
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [searchQuery]);

    const validateForm = () => {
        const errors: Record<string, string> = {};

        if (!eventForm.title.trim()) {
            errors.title = 'Event title is required';
        }

        if (!eventForm.startTime.trim()) {
            errors.startTime = 'Start time is required';
        } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(eventForm.startTime)) {
            errors.startTime = 'Please enter time in HH:MM format';
        }

        if (!eventForm.endTime.trim()) {
            errors.endTime = 'End time is required';
        } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(eventForm.endTime)) {
            errors.endTime = 'Please enter time in HH:MM format';
        }

        if (eventForm.startTime && eventForm.endTime) {
            const startParts = eventForm.startTime.split(':');
            const endParts = eventForm.endTime.split(':');
            if (startParts.length === 2 && endParts.length === 2) {
                const startHour = parseInt(startParts[0] || '0');
                const startMin = parseInt(startParts[1] || '0');
                const endHour = parseInt(endParts[0] || '0');
                const endMin = parseInt(endParts[1] || '0');
                const startMinutes = startHour * 60 + startMin;
                const endMinutes = endHour * 60 + endMin;

                if (endMinutes <= startMinutes) {
                    errors.endTime = 'End time must be after start time';
                }
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (validateForm()) {
            setIsSubmitting(true);
            try {
                await onSave(eventForm, selectedUsers);
                // Form reset handled by useEffect on visible change or parent
            } catch (error) {
                // Error handling should be done by parent or here
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className={`rounded-t-3xl max-h-[90%] flex-1 ${isDark ? "bg-slate-800" : "bg-white"
                    }`}>
                    <SafeAreaView className="flex-1">
                        {/* Header */}
                        <View className={`flex-row items-center justify-between px-6 pt-4 pb-4 border-b ${isDark ? "border-slate-700" : "border-slate-100"
                            }`}>
                            <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                                {editingEventId ? 'Edit Event' : 'Add New Event'}
                            </Text>
                            <Pressable onPress={onClose}>
                                <MaterialIcons name="close" size={24} color={isDark ? "#9CA3AF" : "#64748B"} />
                            </Pressable>
                        </View>

                        <ScrollView
                            className="flex-1"
                            contentContainerStyle={{ paddingBottom: 20 }}
                            showsVerticalScrollIndicator={false}
                        >
                            <View className="px-6 pt-6" style={{ gap: 20 }}>
                                {/* Event Title */}
                                <View>
                                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"
                                        }`}>
                                        Event Title *
                                    </Text>
                                    <TextInput
                                        value={eventForm.title}
                                        onChangeText={(text) => {
                                            setEventForm({ ...eventForm, title: text });
                                            if (formErrors.title) {
                                                setFormErrors({ ...formErrors, title: '' });
                                            }
                                        }}
                                        placeholder="Enter event title"
                                        placeholderTextColor={isDark ? "#6B7280" : "#94A3B8"}
                                        className={`border rounded-2xl px-4 py-4 text-base ${isDark
                                            ? "bg-slate-700 text-white border-slate-600"
                                            : "bg-white text-slate-800 border-slate-200"
                                            } ${formErrors.title ? 'border-red-500' : ''}`}
                                    />
                                    {formErrors.title && (
                                        <Text className="text-red-500 text-xs mt-1">{formErrors.title}</Text>
                                    )}
                                </View>

                                {/* Description */}
                                <View>
                                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"
                                        }`}>
                                        Description
                                    </Text>
                                    <TextInput
                                        value={eventForm.description}
                                        onChangeText={(text) => setEventForm({ ...eventForm, description: text })}
                                        placeholder="Enter event description"
                                        placeholderTextColor={isDark ? "#6B7280" : "#94A3B8"}
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                        className={`border rounded-2xl px-4 py-4 text-base min-h-[100px] ${isDark
                                            ? "bg-slate-700 text-white border-slate-600"
                                            : "bg-white text-slate-800 border-slate-200"
                                            }`}
                                    />
                                </View>

                                {/* Location */}
                                <View>
                                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"
                                        }`}>
                                        Location
                                    </Text>
                                    <View className="relative">
                                        <View className="absolute inset-y-0 left-0 pl-4 items-center justify-center z-10">
                                            <MaterialIcons name="location-on" size={20} color={isDark ? "#6B7280" : "#94A3B8"} />
                                        </View>
                                        <TextInput
                                            value={eventForm.location}
                                            onChangeText={(text) => setEventForm({ ...eventForm, location: text })}
                                            placeholder="Enter location"
                                            placeholderTextColor={isDark ? "#6B7280" : "#94A3B8"}
                                            className={`border rounded-2xl pl-12 pr-4 py-4 text-base ${isDark
                                                ? "bg-slate-700 text-white border-slate-600"
                                                : "bg-white text-slate-800 border-slate-200"
                                                }`}
                                        />
                                    </View>
                                </View>

                                {/* Date Selection */}
                                <View>
                                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"
                                        }`}>
                                        Date
                                    </Text>
                                    <Pressable
                                        onPress={() => setShowDatePicker(true)}
                                        className={`border rounded-2xl px-4 py-4 flex-row items-center justify-between ${isDark
                                            ? "bg-slate-700 border-slate-600 active:bg-slate-600"
                                            : "bg-white border-slate-200 active:bg-slate-50"
                                            }`}
                                    >
                                        <Text className={`text-base ${isDark ? "text-white" : "text-slate-800"}`}>
                                            {eventForm.date.toLocaleDateString('en-GB', {
                                                weekday: 'long',
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </Text>
                                        <MaterialIcons name="calendar-today" size={20} color={isDark ? "#6B7280" : "#94A3B8"} />
                                    </Pressable>
                                </View>

                                {/* Time Selection */}
                                <View className="flex-row" style={{ gap: 12 }}>
                                    <View className="flex-1">
                                        <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"
                                            }`}>
                                            Start Time *
                                        </Text>
                                        <Pressable
                                            onPress={() => setShowStartTimePicker(true)}
                                            className={`border rounded-2xl pl-12 pr-4 py-4 flex-row items-center ${isDark
                                                ? "bg-slate-700 border-slate-600"
                                                : "bg-white border-slate-200"
                                                } ${formErrors.startTime ? 'border-red-500' : ''}`}
                                        >
                                            <View className="absolute inset-y-0 left-0 pl-4 items-center justify-center z-10">
                                                <MaterialIcons name="access-time" size={20} color={isDark ? "#6B7280" : "#94A3B8"} />
                                            </View>
                                            <Text className={`text-base ${eventForm.startTime
                                                ? (isDark ? 'text-white' : 'text-slate-800')
                                                : (isDark ? 'text-gray-500' : 'text-slate-400')
                                                }`}>
                                                {eventForm.startTime || '09:00'}
                                            </Text>
                                        </Pressable>
                                        {formErrors.startTime && (
                                            <Text className="text-red-500 text-xs mt-1">{formErrors.startTime}</Text>
                                        )}
                                    </View>
                                    <View className="flex-1">
                                        <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"
                                            }`}>
                                            End Time *
                                        </Text>
                                        <Pressable
                                            onPress={() => setShowEndTimePicker(true)}
                                            className={`border rounded-2xl pl-12 pr-4 py-4 flex-row items-center ${isDark
                                                ? "bg-slate-700 border-slate-600"
                                                : "bg-white border-slate-200"
                                                } ${formErrors.endTime ? 'border-red-500' : ''}`}
                                        >
                                            <View className="absolute inset-y-0 left-0 pl-4 items-center justify-center z-10">
                                                <MaterialIcons name="access-time" size={20} color={isDark ? "#6B7280" : "#94A3B8"} />
                                            </View>
                                            <Text className={`text-base ${eventForm.endTime
                                                ? (isDark ? 'text-white' : 'text-slate-800')
                                                : (isDark ? 'text-gray-500' : 'text-slate-400')
                                                }`}>
                                                {eventForm.endTime || '10:30'}
                                            </Text>
                                        </Pressable>
                                        {formErrors.endTime && (
                                            <Text className="text-red-500 text-xs mt-1">{formErrors.endTime}</Text>
                                        )}
                                    </View>
                                </View>

                                {/* Event Type */}
                                <View>
                                    <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"
                                        }`}>
                                        Event Type *
                                    </Text>
                                    <View className="flex-row" style={{ gap: 12 }}>
                                        <Pressable
                                            onPress={() => setEventForm({ ...eventForm, type: 'official' })}
                                            className={`flex-1 py-4 rounded-2xl border-2 items-center ${eventForm.type === 'official'
                                                ? 'bg-blue-50 border-[#2B5F9E]'
                                                : isDark
                                                    ? 'bg-slate-700 border-slate-600'
                                                    : 'bg-white border-slate-200'
                                                }`}
                                        >
                                            <MaterialIcons
                                                name="business"
                                                size={24}
                                                color={eventForm.type === 'official' ? '#2B5F9E' : (isDark ? '#6B7280' : '#94A3B8')}
                                            />
                                            <Text className={`text-sm font-semibold mt-2 ${eventForm.type === 'official'
                                                ? 'text-[#2B5F9E]'
                                                : (isDark ? 'text-gray-300' : 'text-slate-600')
                                                }`}>
                                                Official CPD
                                            </Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={() => setEventForm({ ...eventForm, type: 'personal' })}
                                            className={`flex-1 py-4 rounded-2xl border-2 items-center ${eventForm.type === 'personal'
                                                ? 'bg-amber-50 border-amber-400'
                                                : isDark
                                                    ? 'bg-slate-700 border-slate-600'
                                                    : 'bg-white border-slate-200'
                                                }`}
                                        >
                                            <MaterialIcons
                                                name="person"
                                                size={24}
                                                color={eventForm.type === 'personal' ? '#F59E0B' : (isDark ? '#6B7280' : '#94A3B8')}
                                            />
                                            <Text className={`text-sm font-semibold mt-2 ${eventForm.type === 'personal'
                                                ? 'text-amber-600'
                                                : (isDark ? 'text-gray-300' : 'text-slate-600')
                                                }`}>
                                                Personal
                                            </Text>
                                        </Pressable>
                                    </View>

                                    {/* Invite users */}
                                    {!editingEventId && (
                                        <View className="mt-5">
                                            <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-gray-300" : "text-slate-700"}`}>Invite Users (optional)</Text>
                                            <TextInput
                                                value={searchQuery}
                                                onChangeText={setSearchQuery}
                                                placeholder="Search users by name or email"
                                                placeholderTextColor={isDark ? "#6B7280" : "#94A3B8"}
                                                className={`border rounded-2xl px-4 py-3 text-base ${isDark ? "bg-slate-700 text-white border-slate-600" : "bg-white text-slate-800 border-slate-200"}`}
                                            />

                                            {selectedUsers.length > 0 && (
                                                <View className="flex-row flex-wrap mt-3" style={{ gap: 8 }}>
                                                    {selectedUsers.map((u) => (
                                                        <Pressable key={u.id} onPress={() => setSelectedUsers(prev => prev.filter(x => x.id !== u.id))} className="px-3 py-1 rounded-full bg-slate-200">
                                                            <Text className="text-sm">{u.name || u.email}</Text>
                                                        </Pressable>
                                                    ))}
                                                </View>
                                            )}

                                            {searchQuery.length >= 2 && (
                                                <View className="mt-2 max-h-40">
                                                    {isSearching ? (
                                                        <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Searching...</Text>
                                                    ) : (
                                                        searchResults.slice(0, 6).map((u) => (
                                                            <Pressable key={u.id} onPress={() => {
                                                                console.log('Selected user raw:', u);
                                                                const exists = selectedUsers.some(s => s.id === String(u.id));
                                                                if (exists) setSelectedUsers(prev => prev.filter(s => s.id !== String(u.id)));
                                                                else setSelectedUsers(prev => [...prev, { id: String(u.id), name: u.name, email: u.email || u.user_email || u.username }]); // Fallback for email
                                                                setSearchQuery('');
                                                                setSearchResults([]);
                                                            }} className={`p-3 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-white'} mb-1 border`}>
                                                                <Text className={isDark ? 'text-white' : 'text-slate-800'}>{u.name} {u.email ? `· ${u.email}` : ''}</Text>
                                                            </Pressable>
                                                        ))
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            </View>
                        </ScrollView>

                        {/* Footer Actions */}
                        <View className={`px-6 pt-4 pb-6 border-t flex-row ${isDark ? "border-slate-700" : "border-slate-100"
                            }`} style={{ gap: 12 }}>
                            <Pressable
                                onPress={onClose}
                                className={`flex-1 py-4 rounded-2xl items-center ${isDark ? "bg-slate-700" : "bg-slate-100"
                                    }`}
                            >
                                <Text className={`font-semibold text-base ${isDark ? "text-gray-300" : "text-slate-700"
                                    }`}>
                                    Cancel
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={handleSave}
                                disabled={isSubmitting}
                                className={`flex-1 py-4 rounded-2xl items-center ${isSubmitting ? 'bg-[#2B5F9E]/50' : 'bg-[#2B5F9E]'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <Text className="text-white font-semibold text-base">Saving...</Text>
                                ) : (
                                    <Text className="text-white font-semibold text-base">Save Event</Text>
                                )}
                            </Pressable>
                        </View>
                    </SafeAreaView>
                </View>
            </View>

            <CalendarDatePickerModal
                visible={showDatePicker}
                isDark={isDark}
                onClose={() => setShowDatePicker(false)}
                selectedDate={eventForm.date}
                onSelect={(date) => setEventForm({ ...eventForm, date })}
            />

            <TimePickerModal
                visible={showStartTimePicker}
                title="Select Start Time"
                time={eventForm.startTime}
                isDark={isDark}
                onClose={() => setShowStartTimePicker(false)}
                onTimeSelect={(time) => {
                    setEventForm({ ...eventForm, startTime: time });
                    if (formErrors.startTime) setFormErrors({ ...formErrors, startTime: '' });
                }}
            />

            <TimePickerModal
                visible={showEndTimePicker}
                title="Select End Time"
                time={eventForm.endTime}
                isDark={isDark}
                onClose={() => setShowEndTimePicker(false)}
                onTimeSelect={(time) => {
                    setEventForm({ ...eventForm, endTime: time });
                    if (formErrors.endTime) setFormErrors({ ...formErrors, endTime: '' });
                }}
            />
        </Modal>
    );
};
