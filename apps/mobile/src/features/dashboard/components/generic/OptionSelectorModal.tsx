import React from 'react';
import { View, Text, Pressable, ScrollView, Modal } from 'react-native';
import { SelectionOption } from '../../dashboard.types';

interface OptionSelectorModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    options: SelectionOption[];
    onSelect: (option: SelectionOption) => void;
    isDark: boolean;
}

export const OptionSelectorModal: React.FC<OptionSelectorModalProps> = ({
    visible,
    onClose,
    title,
    options,
    onSelect,
    isDark,
}) => {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <Pressable
                className="flex-1 bg-black/50 justify-center px-6"
                onPress={onClose}
            >
                <View
                    className={`rounded-3xl ${isDark ? 'bg-slate-900' : 'bg-white'
                        } p-6 max-h-[70%]`}
                >
                    <Text
                        className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'
                            }`}
                    >
                        {title}
                    </Text>
                    <ScrollView>
                        {options.map((opt, i) => (
                            <Pressable
                                key={opt.id || opt.value || i}
                                onPress={() => {
                                    onSelect(opt);
                                }}
                                className={`py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'
                                    }`}
                            >
                                <Text
                                    className={`text-base ${isDark ? 'text-white' : 'text-slate-800'
                                        }`}
                                >
                                    {opt.name || opt.label}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            </Pressable>
        </Modal>
    );
};
