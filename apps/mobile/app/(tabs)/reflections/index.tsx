import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useThemeStore } from '@/features/theme/theme.store';
import '../../global.css';

interface Reflection {
  id: string;
  title: string;
  date: string;
  description: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconFilled?: boolean;
}

export default function ReflectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'category' | 'evidence'>('all');

  const reflections: Reflection[] = [
    {
      id: '1',
      title: 'Post-Op Complications Management',
      date: '12 OCT 2023',
      description: "Today I encountered a situation where a patient's blood pressure dropped significantly during post-operative recovery. I followed the standard protocol for hypotension management, including fluid resuscitation and immediate coordination with the surgical registrar...",
      icon: 'attachment',
    },
    {
      id: '2',
      title: 'Patient Interaction Feedback',
      date: '05 OCT 2023',
      description: "Received positive feedback regarding communication clarity from a family member in the outpatient clinic. I focused on using non-technical language to explain the long-term management of their chronic condition, ensuring they felt heard and understood...",
      icon: 'description',
      iconFilled: true,
    },
    {
      id: '3',
      title: 'Multidisciplinary Team Meeting',
      date: '28 SEP 2023',
      description: "Participated in a challenging MDT meeting regarding a complex discharge plan. I advocated for additional home support for the patient, which led to a more comprehensive social care assessment. This experience highlighted the importance of...",
    },
    {
      id: '4',
      title: 'Annual Mandatory Training',
      date: '15 SEP 2023',
      description: "Completed the advanced life support refresher course today. While the technical skills are routine, the session on leadership during a cardiac arrest was particularly insightful and prompted me to reflect on my own communication style...",
      icon: 'verified',
    },
  ];

  const filteredReflections = reflections.filter((reflection) => {
    if (searchQuery) {
      return (
        reflection.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reflection.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      {/* Header */}
      <View className={`border-b ${
        isDark ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-gray-100"
      }`}>
        <View className="flex-row items-center justify-between px-4 py-2">
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Pressable onPress={() => router.back()}>
              <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? "#E5E7EB" : "#121417"} />
            </Pressable>
            <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-[#121417]"}`}>
              Reflections
            </Text>
          </View>
          <Pressable 
            onPress={() => router.push('/(tabs)/gallery')}
            className="px-3 py-1 bg-[#2B5E9C]/10 rounded-full"
          >
            <Text className="text-[#2B5E9C] text-xs font-bold">
              {reflections.length} total
            </Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="px-4 py-3 flex-row" style={{ gap: 8 }}>
          <View className={`flex-1 flex-row items-center rounded-lg h-10 ${
            isDark ? "bg-slate-700" : "bg-gray-100"
          }`}>
            <View className="pl-3 items-center justify-center">
              <MaterialIcons name="search" size={20} color={isDark ? "#9CA3AF" : "#687482"} />
            </View>
            <TextInput
              className={`flex-1 px-2 text-sm ${isDark ? "text-white" : "text-[#121417]"}`}
              placeholder="Search reflections..."
              placeholderTextColor={isDark ? "#6B7280" : "#687482"}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable className={`w-10 h-10 shrink-0 items-center justify-center rounded-lg ${
            isDark ? "bg-slate-700" : "bg-gray-100"
          }`}>
            <MaterialIcons name="tune" size={20} color={isDark ? "#E5E7EB" : "#121417"} />
          </Pressable>
        </View>

        {/* Filter Buttons */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}
        >
          <Pressable
            onPress={() => setActiveFilter('all')}
            className={`flex-row items-center justify-center rounded-full px-4 h-8 ${
              activeFilter === 'all' 
                ? 'bg-[#2B5E9C]' 
                : (isDark ? 'bg-slate-700' : 'bg-gray-100')
            }`}
            style={{ gap: 4 }}
          >
            <Text className={`text-xs font-medium ${
              activeFilter === 'all' 
                ? 'text-white' 
                : (isDark ? 'text-gray-300' : 'text-[#121417]')
            }`}>
              All Time
            </Text>
            <MaterialIcons 
              name="expand-more" 
              size={16} 
              color={activeFilter === 'all' ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#121417')} 
            />
          </Pressable>
          <Pressable
            onPress={() => setActiveFilter('category')}
            className={`flex-row items-center justify-center rounded-full px-4 h-8 ${
              activeFilter === 'category' 
                ? 'bg-[#2B5E9C]' 
                : (isDark ? 'bg-slate-700' : 'bg-gray-100')
            }`}
            style={{ gap: 4 }}
          >
            <Text className={`text-xs font-medium ${
              activeFilter === 'category' 
                ? 'text-white' 
                : (isDark ? 'text-gray-300' : 'text-[#121417]')
            }`}>
              Category
            </Text>
            <MaterialIcons 
              name="expand-more" 
              size={16} 
              color={activeFilter === 'category' ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#121417')} 
            />
          </Pressable>
          <Pressable
            onPress={() => setActiveFilter('evidence')}
            className={`flex-row items-center justify-center rounded-full px-4 h-8 ${
              activeFilter === 'evidence' 
                ? 'bg-[#2B5E9C]' 
                : (isDark ? 'bg-slate-700' : 'bg-gray-100')
            }`}
            style={{ gap: 4 }}
          >
            <Text className={`text-xs font-medium ${
              activeFilter === 'evidence' 
                ? 'text-white' 
                : (isDark ? 'text-gray-300' : 'text-[#121417]')
            }`}>
              Evidence
            </Text>
            <MaterialIcons 
              name="expand-more" 
              size={16} 
              color={activeFilter === 'evidence' ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#121417')} 
            />
          </Pressable>
        </ScrollView>
      </View>

      {/* Reflections List */}
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 16 }}>
          {filteredReflections.map((reflection) => (
            <View
              key={reflection.id}
              className={`rounded-xl shadow-sm border overflow-hidden ${
                isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"
              }`}
            >
              <View className="p-4">
                <View className="flex-row justify-between items-start mb-1">
                  <Text className={`text-lg font-bold flex-1 ${
                    isDark ? "text-white" : "text-[#121417]"
                  }`}>
                    {reflection.title}
                  </Text>
                  {reflection.icon && (
                    <MaterialIcons 
                      name={reflection.icon} 
                      size={24} 
                      color="#2B5E9C"
                    />
                  )}
                </View>
                <Text className={`text-xs font-medium mb-2 uppercase tracking-wider ${
                  isDark ? "text-gray-400" : "text-[#687482]"
                }`}>
                  {reflection.date}
                </Text>
                <Text 
                  className={`text-sm font-normal leading-relaxed mb-3 ${
                    isDark ? "text-gray-300" : "text-[#121417]"
                  }`}
                  numberOfLines={3}
                >
                  {reflection.description}
                </Text>
                <View className={`mt-3 pt-3 border-t flex-row justify-end ${
                  isDark ? "border-slate-700" : "border-gray-50"
                }`}>
                  <Pressable className="flex-row items-center" style={{ gap: 4 }}>
                    <Text className="text-[#2B5E9C] text-xs font-bold">
                      VIEW FULL ACCOUNT
                    </Text>
                    <MaterialIcons name="chevron-right" size={16} color="#2B5E9C" />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View 
        className="absolute right-6 items-center"
        style={{ bottom: 80 + insets.bottom }}
      >
        <Pressable 
          onPress={() => router.push('/(tabs)/gallery')}
          className="w-14 h-14 bg-[#2B5E9C] rounded-full shadow-lg items-center justify-center"
        >
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
