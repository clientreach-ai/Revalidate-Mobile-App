import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useThemeStore } from '@/features/theme/theme.store';
import { usePremium } from '@/hooks/usePremium';
import { useGalleryData } from '@/features/gallery/hooks/useGalleryData';
import { CategoryCard } from '@/features/gallery/components/CategoryCard';
import { AddDocumentModal } from '@/features/gallery/components/AddDocumentModal';
import { Category } from '@/features/gallery/gallery.types';
import '../../global.css';

export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { isPremium } = usePremium();
  const accentColor = isPremium ? '#D4AF37' : '#2B5F9E';
  const [showAddModal, setShowAddModal] = useState(false);

  const {
    loading,
    refreshing,
    categories,
    loadDocuments,
    onRefresh,
  } = useGalleryData();

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [loadDocuments])
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? accentColor : '#2B5F9E'}
            colors={[accentColor, '#2B5F9E']}
          />
        }
      >
        <View className="px-6 py-4">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
                Evidence Gallery
              </Text>
              <Text className={`text-sm mt-0.5 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                UK Revalidation Portfolio
              </Text>
            </View>
        
          </View>
        </View>

        {loading && !refreshing && (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={isDark ? accentColor : '#2B5F9E'} />
            <Text className={`mt-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              Loading documents...
            </Text>
          </View>
        )}

        {!loading && (
          <View className="px-6 mt-2">
            <View className="flex-row flex-wrap" style={{ gap: 16 }}>
              {(isPremium
                ? ([
                    {
                      id: 'premium-earnings-finance',
                      title: 'Earnings & Finance',
                      documentCount: '0',
                      updated: '',
                      icon: 'payments',
                      iconBgColor: 'bg-amber-100',
                      iconColor: '#D4AF37',
                      dotColor: '#D4AF37',
                      route: '/(tabs)/earings',
                    },
                  ] as Category[]).concat(categories)
                : categories
              ).map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  isDark={isDark}
                  fullWidth={isPremium && category.title === 'General Gallery'}
                  onPress={() => category.route && router.push(category.route as any)}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>



    </SafeAreaView>
  );
}
