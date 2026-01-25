import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import '../../global.css';

interface FeedbackEntry {
  id: string;
  reviewerName: string;
  date: string;
  type: 'patient' | 'colleague' | 'manager';
  rating: number;
  feedback: string;
  hasAvatar?: boolean;
  avatarUrl?: string;
}

export default function FeedbackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<'all' | 'patient' | 'colleague' | 'manager'>('all');

  const allFeedback: FeedbackEntry[] = [
    {
      id: '1',
      reviewerName: 'Dr. Sarah Jenkins',
      date: '12 Oct 2023',
      type: 'colleague',
      rating: 4,
      feedback: "Great collaborator during the emergency shift last week. Sarah handled the multi-trauma case with exceptional clinical leadership and calm...",
      hasAvatar: true,
    },
    {
      id: '2',
      reviewerName: 'Anonymous Patient',
      date: '10 Oct 2023',
      type: 'patient',
      rating: 5,
      feedback: "Very empathetic and clear explanations regarding my treatment plan. I felt listened to for the first time in years. Highly recommend this clinic.",
    },
    {
      id: '3',
      reviewerName: 'Department Head',
      date: '01 Sep 2023',
      type: 'manager',
      rating: 5,
      feedback: "Met all clinical governance requirements for the current cycle. Demonstrated excellent commitment to professional development and audit participation.",
      hasAvatar: true,
    },
    {
      id: '4',
      reviewerName: 'Mark Thompson (Nurse)',
      date: '28 Aug 2023',
      type: 'colleague',
      rating: 3,
      feedback: "Always helpful with junior staff training. His sessions on patient safety are highly valued by the entire nursing team.",
      hasAvatar: true,
    },
  ];

  // Filter feedback based on active filter
  const getFilteredFeedback = () => {
    if (activeFilter === 'all') {
      return allFeedback;
    }
    return allFeedback.filter((entry) => entry.type === activeFilter);
  };

  const filteredFeedback = getFilteredFeedback();

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'patient':
        return { bg: 'bg-blue-100', text: 'text-blue-700' };
      case 'colleague':
        return { bg: 'bg-green-100', text: 'text-green-700' };
      case 'manager':
        return { bg: 'bg-purple-100', text: 'text-purple-700' };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-700' };
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <MaterialIcons
        key={i}
        name={i < rating ? 'star' : 'star-border'}
        size={16}
        color={i < rating ? '#FBBF24' : '#D1D5DB'}
      />
    ));
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F6F7F8]" edges={['top']}>
      {/* Header */}
      <View className="bg-[#F6F7F8]/80 border-b border-[#DDE0E4]/50">
        <View className="flex-row items-center px-4 py-2 justify-between">
          <Pressable onPress={() => router.back()} className="w-12 h-12 shrink-0 items-center justify-center">
            <MaterialIcons name="arrow-back-ios" size={20} color="#121417" />
          </Pressable>
          <Text className="text-lg font-bold text-[#121417] flex-1 text-center">
            Feedback Log ({allFeedback.length})
          </Text>
          <Pressable className="w-12 h-12 items-center justify-center">
            <MaterialIcons name="search" size={20} color="#121417" />
          </Pressable>
        </View>

        {/* Filter Tabs */}
        <View className="pb-1">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 24 }}
          >
            <Pressable
              onPress={() => setActiveFilter('all')}
              className="flex-col items-center justify-center pb-[13px] pt-4"
              style={{ borderBottomWidth: activeFilter === 'all' ? 3 : 0, borderBottomColor: activeFilter === 'all' ? '#2B5E9C' : 'transparent' }}
            >
              <Text className={`text-sm font-bold ${
                activeFilter === 'all' ? 'text-[#2B5E9C]' : 'text-[#687482]'
              }`}>
                All
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveFilter('patient')}
              className="flex-col items-center justify-center pb-[13px] pt-4"
              style={{ borderBottomWidth: activeFilter === 'patient' ? 3 : 0, borderBottomColor: activeFilter === 'patient' ? '#2B5E9C' : 'transparent' }}
            >
              <Text className={`text-sm font-bold ${
                activeFilter === 'patient' ? 'text-[#2B5E9C]' : 'text-[#687482]'
              }`}>
                Patient
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveFilter('colleague')}
              className="flex-col items-center justify-center pb-[13px] pt-4"
              style={{ borderBottomWidth: activeFilter === 'colleague' ? 3 : 0, borderBottomColor: activeFilter === 'colleague' ? '#2B5E9C' : 'transparent' }}
            >
              <Text className={`text-sm font-bold ${
                activeFilter === 'colleague' ? 'text-[#2B5E9C]' : 'text-[#687482]'
              }`}>
                Colleague
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveFilter('manager')}
              className="flex-col items-center justify-center pb-[13px] pt-4"
              style={{ borderBottomWidth: activeFilter === 'manager' ? 3 : 0, borderBottomColor: activeFilter === 'manager' ? '#2B5E9C' : 'transparent' }}
            >
              <Text className={`text-sm font-bold ${
                activeFilter === 'manager' ? 'text-[#2B5E9C]' : 'text-[#687482]'
              }`}>
                Manager
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>

      {/* Feedback List */}
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 16 }}>
          {filteredFeedback.length > 0 ? (
            filteredFeedback.map((entry) => {
              const typeColor = getTypeColor(entry.type);
              const typeLabel = entry.type.charAt(0).toUpperCase() + entry.type.slice(1);
              
              return (
                <Pressable
                  key={entry.id}
                  onPress={() => {
                    // Navigate to gallery to view feedback details
                    router.push('/(tabs)/gallery');
                  }}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 p-4"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-row flex-1 min-w-0" style={{ gap: 12 }}>
                      {entry.hasAvatar ? (
                        <View className="w-12 h-12 rounded-full bg-[#2B5E9C]/10 items-center justify-center flex-shrink-0">
                          <MaterialIcons name="person" size={24} color="#2B5E9C" />
                        </View>
                      ) : (
                        <View className="w-12 h-12 rounded-full bg-[#2B5E9C]/10 items-center justify-center flex-shrink-0">
                          <MaterialIcons name="person" size={24} color="#2B5E9C" />
                        </View>
                      )}
                      <View className="flex-1 min-w-0">
                        <Text className="text-base font-bold text-[#121417]" numberOfLines={1}>
                          {entry.reviewerName}
                        </Text>
                        <View className="flex-row items-center mt-0.5 flex-wrap" style={{ gap: 8 }}>
                          <View className={`px-2 py-0.5 ${typeColor.bg} rounded`}>
                            <Text className={`text-[10px] font-bold uppercase tracking-wider ${typeColor.text}`}>
                              {typeLabel}
                            </Text>
                          </View>
                          {entry.rating > 0 && (
                            <View className="flex-row" style={{ gap: 2 }}>
                              {renderStars(entry.rating)}
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                    <Text className="text-[#687482] text-xs font-medium ml-2 flex-shrink-0">
                      {entry.date}
                    </Text>
                  </View>
                  <Text className="text-[#687482] text-sm font-normal leading-relaxed" numberOfLines={2}>
                    {entry.feedback}
                  </Text>
                </Pressable>
              );
            })
          ) : (
            <View className="bg-white p-8 rounded-lg border border-gray-100 items-center">
              <MaterialIcons name="inbox" size={48} color="#CBD5E1" />
              <Text className="text-slate-400 mt-4 text-center">
                No {activeFilter === 'all' ? '' : activeFilter} feedback found
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View 
        className="absolute right-6 items-center"
        style={{ bottom: 80 + insets.bottom }}
      >
        <Pressable
          onPress={() => {
            router.push('/(tabs)/gallery');
          }}
          className="w-14 h-14 bg-[#2B5E9C] rounded-full shadow-lg items-center justify-center"
        >
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
