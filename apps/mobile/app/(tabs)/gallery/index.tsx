import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useThemeStore } from '@/features/theme/theme.store';
import { useGalleryData } from '@/features/gallery/hooks/useGalleryData';
import { CategoryCard } from '@/features/gallery/components/CategoryCard';
import { AddDocumentModal } from '@/features/gallery/components/AddDocumentModal';
import '../../global.css';

export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
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
            tintColor={isDark ? '#D4AF37' : '#2B5F9E'}
            colors={['#D4AF37', '#2B5F9E']}
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
            <Pressable
              onPress={() => setShowAddModal(true)}
              className="w-10 h-10 rounded-full bg-[#2B5F9E]/10 items-center justify-center"
            >
              <MaterialIcons name="cloud-upload" size={20} color="#2B5F9E" />
            </Pressable>
          </View>
        </View>

        {loading && !refreshing && (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
            <Text className={`mt-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              Loading documents...
            </Text>
          </View>
        )}

        {!loading && (
          <View className="px-6 mt-2">
            <View className="flex-row flex-wrap" style={{ gap: 16 }}>
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  isDark={isDark}
                  onPress={() => category.route && router.push(category.route as any)}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View
        className="absolute left-0 right-0 items-center"
        style={{ bottom: 80 + insets.bottom }}
      >
        <Pressable
          onPress={() => setShowAddModal(true)}
          className="w-14 h-14 bg-[#2B5F9E] rounded-full shadow-lg items-center justify-center active:opacity-80"
        >
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      </View>

      <AddDocumentModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        categories={categories}
        isDark={isDark}
        onSuccess={loadDocuments}
      />
    </SafeAreaView>
  );
}
