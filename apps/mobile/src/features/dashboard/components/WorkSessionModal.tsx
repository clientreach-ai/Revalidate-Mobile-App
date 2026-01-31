import React, { useState } from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    Modal,
    TextInput,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { formatDateShort } from '../dashboard.utils';
import { HospitalSelectorModal } from './HospitalSelectorModal';
import { OptionSelectorModal } from './generic/OptionSelectorModal';
import { CalendarDatePickerModal } from './CalendarDatePickerModal';
import { SelectionOption, Hospital } from '../dashboard.types';

interface WorkSessionModalProps {
    visible: boolean;
    onClose: () => void;
    isDark: boolean;

    // Form State
    workingMode: 'Full time' | 'Part time';
    setWorkingMode: (m: 'Full time' | 'Part time') => void;
    selectedDate: Date;
    setSelectedDate: (d: Date) => void;
    selectedHospital: Hospital | null;
    setSelectedHospital: (h: Hospital | null) => void;
    hours: string;
    setHours: (h: string) => void;
    rate: string;
    setRate: (r: string) => void;
    workSetting: string;
    setWorkSetting: (s: string) => void;
    scope: string;
    setScope: (s: string) => void;
    description: string;
    setDescription: (d: string) => void;
    documents: any[];
    setDocuments: React.Dispatch<React.SetStateAction<any[]>>;
    isUploading: boolean;
    isSavingWork: boolean;

    // Options
    hospitals: Hospital[];
    workSettingsOptions: SelectionOption[];
    scopeOptions: SelectionOption[];
    hospitalSearch: string;
    setHospitalSearch: (s: string) => void;

    // Handlers
    handleCopySchedule: () => void;
    handleDocumentPick: (source: 'gallery' | 'camera') => void;
    handleSaveWorkSession: () => void;
}

export const WorkSessionModal: React.FC<WorkSessionModalProps> = (props) => {
    const {
        visible,
        onClose,
        isDark,
        workingMode,
        setWorkingMode,
        selectedDate,
        setSelectedDate,
        selectedHospital,
        setSelectedHospital,
        hours,
        setHours,
        rate,
        setRate,
        workSetting,
        setWorkSetting,
        scope,
        setScope,
        description,
        setDescription,
        documents,
        setDocuments,
        isUploading,
        isSavingWork,
        hospitals,
        workSettingsOptions,
        scopeOptions,
        hospitalSearch,
        setHospitalSearch,
        handleCopySchedule,
        handleDocumentPick,
        handleSaveWorkSession,
    } = props;

    const [showHospitalModal, setShowHospitalModal] = useState(false);
    const [showWorkSettingModal, setShowWorkSettingModal] = useState(false);
    const [showScopeModal, setShowScopeModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View className="flex-1 bg-black/50 justify-end">
                <View
                    className={`h-[90%] rounded-t-[40px] ${isDark ? 'bg-slate-900' : 'bg-white'
                        } p-6`}
                >
                    <View className="flex-row justify-between items-center mb-6">
                        <Text
                            className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'
                                }`}
                        >
                            Save Work Session
                        </Text>
                        <Pressable onPress={onClose} className="p-2">
                            <MaterialIcons
                                name="close"
                                size={24}
                                color={isDark ? 'white' : 'black'}
                            />
                        </Pressable>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    >
                        {/* Copy Schedule */}
                        <Pressable
                            onPress={handleCopySchedule}
                            className={`mb-6 p-4 rounded-2xl border flex-row items-center justify-center gap-2 ${isDark
                                ? 'bg-slate-800 border-slate-700'
                                : 'bg-blue-50 border-blue-100'
                                }`}
                        >
                            <MaterialIcons name="content-copy" size={20} color="#2B5F9E" />
                            <Text className="text-[#2B5F9E] font-bold">
                                Copy Details From Previous Session
                            </Text>
                        </Pressable>

                        {/* Working Mode */}
                        <View className="mb-6">
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'
                                    }`}
                            >
                                WORKING MODE (REQUIRED)
                            </Text>
                            <View className="flex-row gap-4">
                                {(['Full time', 'Part time'] as const).map((mode) => (
                                    <Pressable
                                        key={mode}
                                        onPress={() => setWorkingMode(mode)}
                                        className={`flex-1 py-3 items-center rounded-2xl border ${workingMode === mode
                                            ? 'bg-blue-500 border-blue-500'
                                            : isDark
                                                ? 'bg-slate-800 border-slate-700'
                                                : 'bg-slate-50 border-slate-200'
                                            }`}
                                    >
                                        <Text
                                            className={`font-bold ${workingMode === mode
                                                ? 'text-white'
                                                : isDark
                                                    ? 'text-slate-400'
                                                    : 'text-slate-600'
                                                }`}
                                        >
                                            {mode}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Date */}
                        <View className="mb-6">
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'
                                    }`}
                            >
                                DATE (REQUIRED)
                            </Text>
                            <Pressable
                                onPress={() => setShowDatePicker(true)}
                                className={`p-4 rounded-2xl border flex-row justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                                    }`}
                            >
                                <Text className={isDark ? 'text-white' : 'text-slate-800'}>
                                    {formatDateShort(selectedDate)}
                                </Text>
                                <MaterialIcons
                                    name="calendar-today"
                                    size={20}
                                    color={isDark ? 'white' : 'gray'}
                                />
                            </Pressable>
                        </View>

                        {/* Hospital */}
                        <View className="mb-6">
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'
                                    }`}
                            >
                                HOSPITAL (REQUIRED)
                            </Text>
                            <Pressable
                                onPress={() => setShowHospitalModal(true)}
                                className={`p-4 rounded-2xl border flex-row justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                                    }`}
                            >
                                <Text className={isDark ? 'text-white' : 'text-slate-800'}>
                                    {selectedHospital?.name || 'Select Hospital'}
                                </Text>
                                <MaterialIcons
                                    name="search"
                                    size={20}
                                    color={isDark ? 'white' : 'gray'}
                                />
                            </Pressable>
                        </View>

                        {/* Hours and Rate */}
                        <View className="flex-row gap-4 mb-6">
                            <View className="flex-1">
                                <Text
                                    className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'
                                        }`}
                                >
                                    HOURS (REQUIRED)
                                </Text>
                                <TextInput
                                    value={hours}
                                    onChangeText={setHours}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                    placeholderTextColor="gray"
                                    className={`p-4 rounded-2xl border ${isDark
                                        ? 'bg-slate-800 border-slate-700 text-white'
                                        : 'bg-slate-50 border-slate-200 text-slate-800'
                                        }`}
                                />
                            </View>
                            <View className="flex-1">
                                <Text
                                    className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'
                                        }`}
                                >
                                    RATE (£/HR) (REQUIRED)
                                </Text>
                                <TextInput
                                    value={rate}
                                    onChangeText={setRate}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                    placeholderTextColor="gray"
                                    className={`p-4 rounded-2xl border ${isDark
                                        ? 'bg-slate-800 border-slate-700 text-white'
                                        : 'bg-slate-50 border-slate-200 text-slate-800'
                                        }`}
                                />
                            </View>
                        </View>

                        {/* Work Setting */}
                        <View className="mb-6">
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'
                                    }`}
                            >
                                WORK SETTING (REQUIRED)
                            </Text>
                            <Pressable
                                onPress={() => setShowWorkSettingModal(true)}
                                className={`p-4 rounded-2xl border flex-row justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                                    }`}
                            >
                                <Text className={isDark ? 'text-white' : 'text-slate-800'}>
                                    {workSetting || 'Select Setting'}
                                </Text>
                                <MaterialIcons
                                    name="expand-more"
                                    size={20}
                                    color={isDark ? 'white' : 'gray'}
                                />
                            </Pressable>
                        </View>

                        {/* Scope of Practice */}
                        <View className="mb-6">
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'
                                    }`}
                            >
                                SCOPE OF PRACTICE (REQUIRED)
                            </Text>
                            <Pressable
                                onPress={() => setShowScopeModal(true)}
                                className={`p-4 rounded-2xl border flex-row justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                                    }`}
                            >
                                <Text className={isDark ? 'text-white' : 'text-slate-800'}>
                                    {scope || 'Select Scope'}
                                </Text>
                                <MaterialIcons
                                    name="expand-more"
                                    size={20}
                                    color={isDark ? 'white' : 'gray'}
                                />
                            </Pressable>
                        </View>

                        {/* Description */}
                        <View className="mb-6">
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'
                                    }`}
                            >
                                BRIEF DESCRIPTION
                            </Text>
                            <TextInput
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                                placeholder="Describe your work..."
                                placeholderTextColor="gray"
                                style={{ minHeight: 100, textAlignVertical: 'top' }}
                                className={`p-4 rounded-2xl border ${isDark
                                    ? 'bg-slate-800 border-slate-700 text-white'
                                    : 'bg-slate-50 border-slate-200 text-slate-800'
                                    }`}
                            />
                        </View>

                        {/* Evidence */}
                        <View className="mb-8">
                            <Text
                                className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'
                                    }`}
                            >
                                EVIDENCE (DOCUMENTS)
                            </Text>
                            <View className="flex-row flex-wrap gap-3">
                                {documents.map((doc, idx) => (
                                    <View
                                        key={doc.id || idx}
                                        className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200"
                                    >
                                        <Image source={{ uri: doc.url }} className="w-full h-full" />
                                        <Pressable
                                            onPress={() =>
                                                setDocuments((docs) => docs.filter((_, i) => i !== idx))
                                            }
                                            className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                                        >
                                            <MaterialIcons name="close" size={12} color="white" />
                                        </Pressable>
                                    </View>
                                ))}
                                <Pressable
                                    onPress={() => {
                                        Alert.alert('Upload Evidence', 'Choose source', [
                                            {
                                                text: 'Gallery',
                                                onPress: () => handleDocumentPick('gallery'),
                                            },
                                            {
                                                text: 'Camera',
                                                onPress: () => handleDocumentPick('camera'),
                                            },
                                            { text: 'Cancel', style: 'cancel' },
                                        ]);
                                    }}
                                    className={`w-20 h-20 rounded-xl items-center justify-center border-2 border-dashed ${isDark ? 'border-slate-700' : 'border-slate-200'
                                        }`}
                                >
                                    <MaterialIcons name="add-a-photo" size={24} color="gray" />
                                </Pressable>
                            </View>
                            {isUploading && (
                                <View className="mt-2 flex-row items-center gap-2">
                                    <ActivityIndicator size="small" color="#2B5F9E" />
                                    <Text className="text-xs text-slate-500">Uploading...</Text>
                                </View>
                            )}
                        </View>

                        <Pressable
                            onPress={handleSaveWorkSession}
                            disabled={isSavingWork}
                            className={`py-4 rounded-2xl items-center shadow-lg ${isSavingWork ? 'bg-slate-400' : 'bg-blue-600 shadow-blue-200'
                                }`}
                        >
                            <Text className="text-white text-lg font-bold">
                                {isSavingWork ? 'Saving...' : 'Save Work Session'}
                            </Text>
                        </Pressable>
                    </ScrollView>
                </View>

                {/* Sub Modals */}
                <HospitalSelectorModal
                    visible={showHospitalModal}
                    onClose={() => setShowHospitalModal(false)}
                    hospitals={hospitals}
                    hospitalSearch={hospitalSearch}
                    setHospitalSearch={setHospitalSearch}
                    onSelect={(h) => setSelectedHospital(h)}
                    isDark={isDark}
                />

                <OptionSelectorModal
                    visible={showWorkSettingModal}
                    onClose={() => setShowWorkSettingModal(false)}
                    title="Select Work Setting"
                    options={workSettingsOptions}
                    onSelect={(opt) => {
                        setWorkSetting(opt.name || opt.label || '');
                        setShowWorkSettingModal(false);
                    }}
                    isDark={isDark}
                />

                <OptionSelectorModal
                    visible={showScopeModal}
                    onClose={() => setShowScopeModal(false)}
                    title="Select Scope of Practice"
                    options={scopeOptions}
                    onSelect={(opt) => {
                        setScope(opt.name || opt.label || '');
                        setShowScopeModal(false);
                    }}
                    isDark={isDark}
                />

                <CalendarDatePickerModal
                    visible={showDatePicker}
                    onClose={() => setShowDatePicker(false)}
                    selectedDate={selectedDate}
                    onSelect={(date) => setSelectedDate(date)}
                    isDark={isDark}
                />
            </View>
        </Modal>
    );
};
