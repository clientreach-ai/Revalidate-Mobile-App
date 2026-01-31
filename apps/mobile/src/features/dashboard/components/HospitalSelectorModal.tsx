import React from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Hospital } from '../dashboard.types';

interface HospitalSelectorModalProps {
    visible: boolean;
    onClose: () => void;
    hospitals: Hospital[];
    hospitalSearch: string;
    setHospitalSearch: (s: string) => void;
    onSelect: (h: Hospital) => void;
    isDark: boolean;
}

export const HospitalSelectorModal: React.FC<HospitalSelectorModalProps> = ({
    visible,
    onClose,
    hospitals,
    hospitalSearch,
    setHospitalSearch,
    onSelect,
    isDark,
}) => {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View className="flex-1 bg-black/50 justify-center px-6">
                <View
                    className={`rounded-3xl ${isDark ? 'bg-slate-900' : 'bg-white'
                        } p-6 max-h-[70%]`}
                >
                    <View className="flex-row justify-between items-center mb-4">
                        <Text
                            className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'
                                }`}
                        >
                            Select Hospital
                        </Text>
                        <Pressable onPress={onClose} className="p-1">
                            <MaterialIcons
                                name="close"
                                size={22}
                                color={isDark ? 'white' : 'black'}
                            />
                        </Pressable>
                    </View>

                    <View
                        className={`flex-row items-center px-4 rounded-xl mb-4 border ${isDark
                                ? 'bg-slate-800 border-slate-700'
                                : 'bg-slate-100 border-slate-200'
                            }`}
                    >
                        <MaterialIcons name="search" size={20} color="gray" />
                        <TextInput
                            value={hospitalSearch}
                            onChangeText={setHospitalSearch}
                            placeholder="Search hospital..."
                            placeholderTextColor="gray"
                            className={`flex-1 p-3 ${isDark ? 'text-white' : 'text-slate-800'}`}
                        />
                    </View>

                    <ScrollView>
                        {hospitals
                            .filter((h) =>
                                h.name.toLowerCase().includes(hospitalSearch.toLowerCase())
                            )
                            .map((h, i) => (
                                <Pressable
                                    key={h.id || i}
                                    onPress={() => {
                                        onSelect(h);
                                        onClose();
                                    }}
                                    className={`py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'
                                        }`}
                                >
                                    <Text
                                        className={`text-base ${isDark ? 'text-white' : 'text-slate-800'
                                            }`}
                                    >
                                        {h.name}
                                    </Text>
                                    <Text className="text-xs text-slate-400">
                                        {h.town}, {h.postcode}
                                    </Text>
                                </Pressable>
                            ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};
