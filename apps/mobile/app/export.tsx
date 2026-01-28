import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { usePremium } from '@/hooks/usePremium';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import { documentDirectory, cacheDirectory, writeAsStringAsync, StorageAccessFramework, EncodingType } from 'expo-file-system/legacy';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import './global.css';

interface ExportPreview {
  workHours: { count: number; totalHours: number };
  cpd: { count: number; totalHours: number };
  reflections: { count: number };
  feedback: { count: number };
  appraisals: { count: number };
}

interface ExportSection {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  count: number;
  enabled: boolean;
}

export default function ExportScreen() {
  const router = useRouter();
  const { isDark } = useThemeStore();
  const { isPremium } = usePremium();

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [sections, setSections] = useState<ExportSection[]>([]);

  const textColor = isDark ? 'text-white' : 'text-slate-800';
  const secondaryTextColor = isDark ? 'text-gray-400' : 'text-slate-600';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      const response = await apiService.get<{ success: boolean; data: ExportPreview }>(
        API_ENDPOINTS.EXPORT.PREVIEW,
        token
      );

      if (response.success && response.data) {
        setSections([
          {
            id: 'workHours',
            title: 'Practice Hours',
            subtitle: `${response.data.workHours.totalHours} hours logged`,
            icon: 'work',
            count: response.data.workHours.count,
            enabled: true,
          },
          {
            id: 'cpd',
            title: 'CPD Activities',
            subtitle: `${response.data.cpd.totalHours} CPD hours`,
            icon: 'school',
            count: response.data.cpd.count,
            enabled: true,
          },
          {
            id: 'reflections',
            title: 'Reflections',
            subtitle: `${response.data.reflections.count} reflective accounts`,
            icon: 'psychology',
            count: response.data.reflections.count,
            enabled: true,
          },
          {
            id: 'feedback',
            title: 'Feedback',
            subtitle: `${response.data.feedback.count} entries`,
            icon: 'feedback',
            count: response.data.feedback.count,
            enabled: true,
          },
          {
            id: 'appraisals',
            title: 'Appraisals',
            subtitle: `${response.data.appraisals.count} discussions`,
            icon: 'rate-review',
            count: response.data.appraisals.count,
            enabled: true,
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading export preview:', error);
      // Set default sections even on error so UI still works
      setSections([
        { id: 'workHours', title: 'Practice Hours', subtitle: '0 hours logged', icon: 'work', count: 0, enabled: true },
        { id: 'cpd', title: 'CPD Activities', subtitle: '0 CPD hours', icon: 'school', count: 0, enabled: true },
        { id: 'reflections', title: 'Reflections', subtitle: '0 reflective accounts', icon: 'psychology', count: 0, enabled: true },
        { id: 'feedback', title: 'Feedback', subtitle: '0 entries', icon: 'feedback', count: 0, enabled: true },
        { id: 'appraisals', title: 'Appraisals', subtitle: '0 discussions', icon: 'rate-review', count: 0, enabled: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (id: string) => {
    setSections(prev =>
      prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleExport = async () => {
    if (!isPremium) {
      Alert.alert(
        'Premium Feature',
        'Export to PDF is a Premium feature. Would you like to upgrade?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/(tabs)/profile/subscription') },
        ]
      );
      return;
    }

    const enabledSections = sections.filter(s => s.enabled).map(s => s.id);
    if (enabledSections.length === 0) {
      showToast.error('Please select at least one section to export', 'Error');
      return;
    }

    try {
      setIsExporting(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      // Use postBlob to handle binary PDF response
      const blob = await apiService.postBlob(
        API_ENDPOINTS.EXPORT.PORTFOLIO,
        { sections: enabledSections },
        token
      );

      // Convert blob to base64 and save to file system
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        try {
          const base64data = (reader.result as string).replace(/^data:.+;base64,/, '');
          const filename = `revalidate-portfolio-${new Date().toISOString().split('T')[0]}.pdf`;
          let fileUri: string;
          const folder = documentDirectory || cacheDirectory;

          if (folder) {
            fileUri = folder + filename;
            await writeAsStringAsync(fileUri, base64data, {
              encoding: EncodingType.Base64,
            });
          } else {
            // Fallback: Request Storage Access (Android 10+)
            try {
              const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
              if (!permissions.granted) {
                throw new Error('Storage permission denied');
              }
              fileUri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, filename, 'application/pdf');
              await writeAsStringAsync(fileUri, base64data, {
                encoding: EncodingType.Base64,
              });
            } catch (safError) {
              console.error('SAF Error:', safError);
              throw new Error('Device storage not available and permission denied');
            }
          }

          // Share the file
          if (await isAvailableAsync()) {
            await shareAsync(fileUri);
            showToast.success('Portfolio exported successfully', 'Success');
          } else {
            showToast.success(`Saved to ${fileUri}`, 'Success (Sharing not available)');
          }
        } catch (saveError) {
          console.error('Error saving PDF:', saveError);
          showToast.error('Failed to save PDF file', 'Error');
        }
      };
    } catch (error: any) {
      console.error('Error exporting portfolio:', error);
      showToast.error(error.message || 'Failed to export portfolio', 'Error');
    } finally {
      setIsExporting(false);
    }
  };

  const totalSections = sections.filter(s => s.enabled).length;

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background-light'}`} edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className={`border-b ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-gray-100'}`}>
          <View className="flex-row items-center justify-between px-4 py-2">
            <Pressable onPress={() => router.back()} className="w-12 h-12 shrink-0 items-center justify-center">
              <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? '#E5E7EB' : '#121417'} />
            </Pressable>
            <Text className={`text-lg font-bold flex-1 text-center ${textColor}`}>
              Export Portfolio
            </Text>
            <View className="w-12" />
          </View>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
            <Text className={`mt-4 ${secondaryTextColor}`}>Loading export data...</Text>
          </View>
        ) : (
          <>
            {/* Premium Notice */}
            {!isPremium && (
              <View className="px-6 pt-6">
                <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row items-start">
                  <MaterialIcons name="workspace-premium" size={24} color="#D97706" />
                  <View className="flex-1 ml-3">
                    <Text className="font-semibold text-amber-800">Premium Feature</Text>
                    <Text className="text-sm text-amber-700 mt-1">
                      Upgrade to Premium to export your portfolio as a PDF.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Info Banner */}
            <View className="px-6 pt-6">
              <View className={`${isDark ? 'bg-blue-900/30' : 'bg-blue-50'} rounded-2xl p-4 flex-row items-start`}>
                <MaterialIcons name="picture-as-pdf" size={24} color={isDark ? '#60A5FA' : '#2563EB'} />
                <View className="flex-1 ml-3">
                  <Text className={`font-medium ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
                    Export to PDF
                  </Text>
                  <Text className={`text-sm mt-1 ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                    Generate a professional PDF document of your revalidation portfolio. Select the sections you want to include below.
                  </Text>
                </View>
              </View>
            </View>

            {/* Section Selection */}
            <View className="px-6 pt-6">
              <Text className={`text-sm font-semibold mb-3 uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                Select Sections to Export
              </Text>
              <View className={`${cardBg} rounded-2xl overflow-hidden`}>
                {sections.map((section, index) => (
                  <View
                    key={section.id}
                    className={`flex-row items-center p-4 ${index < sections.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      <MaterialIcons name={section.icon} size={20} color={isDark ? '#9CA3AF' : '#64748B'} />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className={`font-medium ${textColor}`}>{section.title}</Text>
                        <View className={`ml-2 px-2 py-0.5 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                          <Text className={`text-xs ${secondaryTextColor}`}>{section.count}</Text>
                        </View>
                      </View>
                      <Text className={`text-xs mt-0.5 ${secondaryTextColor}`}>{section.subtitle}</Text>
                    </View>
                    <Switch
                      value={section.enabled}
                      onValueChange={() => toggleSection(section.id)}
                      trackColor={{ false: '#E5E7EB', true: isPremium ? '#D4AF37' : '#2563EB' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Export Summary */}
            <View className="px-6 pt-6">
              <View className={`${cardBg} rounded-2xl p-4`}>
                <Text className={`font-medium ${textColor}`}>Export Summary</Text>
                <Text className={`text-sm mt-1 ${secondaryTextColor}`}>
                  {totalSections} section{totalSections !== 1 ? 's' : ''} selected for export
                </Text>
              </View>
            </View>

            {/* Export Button */}
            <View className="px-6 pt-6">
              <Pressable
                onPress={handleExport}
                disabled={isExporting || totalSections === 0}
                className={`rounded-2xl p-4 items-center flex-row justify-center ${isExporting || totalSections === 0
                  ? 'bg-gray-400'
                  : isPremium
                    ? 'bg-[#D4AF37]'
                    : 'bg-[#2B5E9C]'
                  }`}
              >
                {isExporting ? (
                  <>
                    <ActivityIndicator color="white" size="small" />
                    <Text className="text-white font-semibold text-base ml-2">Generating PDF...</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="picture-as-pdf" size={20} color="white" />
                    <Text className="text-white font-semibold text-base ml-2">
                      {isPremium ? 'Export as PDF' : 'Upgrade to Export'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
