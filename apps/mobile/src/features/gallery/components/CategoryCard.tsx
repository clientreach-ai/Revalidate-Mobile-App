import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Category } from '../gallery.types';

interface CategoryCardProps {
    category: Category;
    isDark: boolean;
    onPress: () => void;
    fullWidth?: boolean;
}

export const CategoryCard = ({ category, isDark, onPress, fullWidth = false }: CategoryCardProps) => {
    const isGeneralFullWidth = fullWidth && category.title === 'General Gallery';
    return (
        <Pressable
            onPress={onPress}
            className={`p-5 rounded-[24px] shadow-sm border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                }`}
            style={{ width: fullWidth ? '100%' : '47%' }}
        >
            {isGeneralFullWidth ? (
                <View className="flex-row justify-start items-center">
                    <View className={`w-12 h-12 rounded-2xl ${category.iconBgColor} items-center justify-center`}>
                        <MaterialIcons
                            name={category.icon}
                            size={24}
                            color={category.iconColor}
                        />
                    </View>
                    <Text className={`ml-4 font-bold text-base leading-tight ${isDark ? "text-white" : "text-slate-800"}`}>
                        {category.title}
                    </Text>
                </View>
            ) : (
                <>
                    <View className={`w-12 h-12 rounded-2xl ${category.iconBgColor} items-center justify-center mb-4`}>
                        <MaterialIcons
                            name={category.icon}
                            size={24}
                            color={category.iconColor}
                        />
                    </View>
                    <Text className={`font-bold text-base leading-tight ${isDark ? "text-white" : "text-slate-800"}`}>
                        {category.title}
                    </Text>
                </>
            )}
        </Pressable>
    );
};
