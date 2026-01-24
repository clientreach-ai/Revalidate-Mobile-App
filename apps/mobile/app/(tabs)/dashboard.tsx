import { View, Text, SafeAreaView } from 'react-native';

export default function DashboardScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-6">
        <Text className="text-4xl font-bold text-blue-600 mb-4">
          Dashboard
        </Text>
        <Text className="text-lg text-gray-700 text-center">
          Revalidation Tracker
        </Text>
        <View className="mt-8 p-4 bg-green-100 rounded-lg">
          <Text className="text-green-800 font-medium text-center">
            ✅ NativeWind is working here too!
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
