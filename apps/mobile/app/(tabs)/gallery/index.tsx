import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import '../../global.css';

interface Category {
  id: string;
  title: string;
  documentCount: string;
  updated: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBgColor: string;
  iconColor: string;
  dotColor: string;
  route?: string;
}

interface RecentFile {
  id: string;
  name: string;
  category: string;
  size: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBgColor: string;
  iconColor: string;
}

export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const categories: Category[] = [
    {
      id: '1',
      title: 'Working Hours',
      documentCount: '12 Documents',
      updated: 'UPDATED 2D AGO',
      icon: 'schedule',
      iconBgColor: 'bg-blue-100',
      iconColor: '#2563EB',
      dotColor: '#3B82F6',
      route: '/(tabs)/workinghours',
    },
    {
      id: '2',
      title: 'CPD Hours',
      documentCount: '45 Documents',
      updated: 'UPDATED 4H AGO',
      icon: 'school',
      iconBgColor: 'bg-amber-100',
      iconColor: '#F59E0B',
      dotColor: '#F59E0B',
      route: '/(tabs)/cpdhourstracking',
    },
    {
      id: '3',
      title: 'Feedback Log',
      documentCount: '8 Documents',
      updated: 'UPDATED 1W AGO',
      icon: 'forum',
      iconBgColor: 'bg-emerald-100',
      iconColor: '#10B981',
      dotColor: '#10B981',
      route: '/(tabs)/feedback',
    },
    {
      id: '4',
      title: 'Reflective Accounts',
      documentCount: '5 Documents',
      updated: 'UPDATED 3D AGO',
      icon: 'edit-note',
      iconBgColor: 'bg-purple-100',
      iconColor: '#9333EA',
      dotColor: '#9333EA',
      route: '/(tabs)/reflections',
    },
    {
      id: '5',
      title: 'Appraisal',
      documentCount: '2 Documents',
      updated: 'UPDATED DEC 2023',
      icon: 'verified',
      iconBgColor: 'bg-rose-100',
      iconColor: '#E11D48',
      dotColor: '#E11D48',
    },
    {
      id: '6',
      title: 'General Gallery',
      documentCount: '32 Documents',
      updated: 'UPDATED YESTERDAY',
      icon: 'folder',
      iconBgColor: 'bg-slate-100',
      iconColor: '#64748B',
      dotColor: '#94A3B8',
    },
  ];

  const recentFiles: RecentFile[] = [
    {
      id: '1',
      name: 'Reflection_Patient_04.pdf',
      category: 'Reflective Accounts',
      size: '2.4 MB',
      icon: 'picture-as-pdf',
      iconBgColor: 'bg-red-100',
      iconColor: '#DC2626',
    },
    {
      id: '2',
      name: 'Seminar_Certificate.jpg',
      category: 'CPD Hours',
      size: '1.1 MB',
      icon: 'image',
      iconBgColor: 'bg-blue-100',
      iconColor: '#2563EB',
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 py-4">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-2xl font-bold tracking-tight text-slate-800">
                Evidence Gallery
              </Text>
              <Text className="text-sm text-slate-500 mt-0.5">
                UK Revalidation Portfolio
              </Text>
            </View>
            <Pressable className="w-10 h-10 rounded-full bg-[#2B5F9E]/10 items-center justify-center">
              <MaterialIcons name="cloud-upload" size={20} color="#2B5F9E" />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View className="relative">
            <View className="absolute inset-y-0 left-0 pl-4 items-center justify-center z-10">
              <MaterialIcons name="search" size={20} color="#94A3B8" />
            </View>
            <TextInput
              className="w-full pl-11 pr-12 py-3.5 bg-white border-none rounded-2xl shadow-sm text-sm"
              placeholder="Search documents, tags, or dates..."
              placeholderTextColor="#94A3B8"
            />
            <View className="absolute inset-y-0 right-0 pr-4 items-center justify-center z-10">
              <MaterialIcons name="tune" size={20} color="#94A3B8" />
            </View>
          </View>
        </View>

        {/* Category Grid */}
        <View className="px-6 mt-2">
          <View className="flex-row flex-wrap" style={{ gap: 16 }}>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => {
                  if (category.route) {
                    router.push(category.route as any);
                  }
                }}
                className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100"
                style={{ width: '47%' }}
              >
                <View className={`w-12 h-12 rounded-2xl ${category.iconBgColor} items-center justify-center mb-4`}>
                  <MaterialIcons 
                    name={category.icon} 
                    size={24} 
                    color={category.iconColor} 
                  />
                </View>
                <Text className="font-bold text-base leading-tight text-slate-800">
                  {category.title}
                </Text>
                <Text className="text-xs text-slate-500 mt-1">
                  {category.documentCount}
                </Text>
                <View className="mt-4 pt-4 border-t border-slate-50 flex-row items-center" style={{ gap: 6 }}>
                  <View 
                    className="w-1.5 h-1.5 rounded-full" 
                    style={{ backgroundColor: category.dotColor }}
                  />
                  <Text className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    {category.updated}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent Files Section */}
        <View className="px-6 mt-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-bold text-lg text-slate-800">Recent Files</Text>
            <Pressable>
              <Text className="text-[#2B5F9E] text-sm font-semibold">View All</Text>
            </Pressable>
          </View>
          <View style={{ gap: 12 }}>
            {recentFiles.map((file) => (
              <View
                key={file.id}
                className="bg-white p-3 rounded-2xl border border-slate-100 flex-row items-center"
                style={{ gap: 12 }}
              >
                <View className={`w-10 h-10 ${file.iconBgColor} rounded-xl items-center justify-center`}>
                  <MaterialIcons 
                    name={file.icon} 
                    size={20} 
                    color={file.iconColor} 
                  />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-semibold text-slate-800" numberOfLines={1}>
                    {file.name}
                  </Text>
                  <Text className="text-[11px] text-slate-500 mt-0.5">
                    {file.category} • {file.size}
                  </Text>
                </View>
                <Pressable>
                  <MaterialIcons name="more-vert" size={20} color="#94A3B8" />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View 
        className="absolute left-0 right-0 items-center"
        style={{ bottom: 80 + insets.bottom }}
      >
        <Pressable className="w-14 h-14 bg-[#2B5F9E] rounded-full shadow-lg items-center justify-center">
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
