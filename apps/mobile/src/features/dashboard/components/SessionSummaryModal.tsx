import React from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Hospital } from '../dashboard.types';
import { formatDateShort } from '../dashboard.utils';

interface SessionSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  isDark: boolean;
  isSaving: boolean;
  workingMode: 'Full time' | 'Part time';
  selectedDate: Date;
  selectedHospital: Hospital | null;
  hours: string;
  rate: string;
  workSetting: string;
  scope: string;
  description: string;
  documents: any[];
  setDocuments: React.Dispatch<React.SetStateAction<any[]>>;
  handleDocumentPick: (source: 'gallery' | 'camera') => void;
  isUploading: boolean;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  visible,
  onClose,
  onSave,
  isDark,
  isSaving,
  workingMode,
  selectedDate,
  selectedHospital,
  hours,
  rate,
  workSetting,
  scope,
  description,
  documents,
  setDocuments,
  handleDocumentPick,
  isUploading,
}) => {
  const summaryRow = (label: string, value?: string | null) => (
    <View className="mb-3">
      <Text
        className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
      >
        {label}
      </Text>
      <Text
        className={`text-base mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}
      >
        {value && value.trim().length > 0 ? value : '—'}
      </Text>
    </View>
  );

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
              Session Summary
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
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {summaryRow('Working Mode', workingMode)}
            {summaryRow('Date', formatDateShort(selectedDate))}
            {summaryRow('Hospital', selectedHospital?.name || '')}
            {summaryRow('Hours', hours)}
            {summaryRow('Rate (£/hr)', rate)}
            {summaryRow('Work Setting', workSetting)}
            {summaryRow('Scope of Practice', scope)}
            {summaryRow('Description', description)}
            <View className="mt-2 mb-4">
              <Text
                className={`text-xs font-semibold mb-2 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
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
                    <Image
                      source={{ uri: doc.url }}
                      className="w-full h-full"
                    />
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
                  className={`w-20 h-20 rounded-xl items-center justify-center border-2 border-dashed ${
                    isDark ? 'border-slate-700' : 'border-slate-200'
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
          </ScrollView>

          <View className="flex-row gap-3">
            <Pressable
              onPress={onClose}
              className={`flex-1 py-4 rounded-2xl items-center border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
            >
              <Text
                className={`${isDark ? 'text-slate-200' : 'text-slate-700'} text-lg font-bold`}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              disabled={isSaving}
              className={`flex-1 py-4 rounded-2xl items-center ${isSaving ? 'bg-slate-400' : 'bg-blue-600'}`}
            >
              <Text className="text-white text-lg font-bold">
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
