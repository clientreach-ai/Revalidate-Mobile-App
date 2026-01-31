import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Appraisal } from '../appraisal.types';
import { format } from 'date-fns';

interface AppraisalCardProps {
    appraisal: Appraisal;
    isDark: boolean;
    onPress: () => void;
}

const formatDate = (dateString: string) => {
    if (!dateString) return 'No Date';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'No Date';
        }
        return format(date, 'MMMM d, yyyy');
    } catch (e) {
        return 'No Date';
    }
};

export const AppraisalCard = ({ appraisal, isDark, onPress }: AppraisalCardProps) => {
    return (
        <Pressable
            onPress={onPress}
            className={`p-5 rounded-[24px] mb-4 shadow-sm border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}
        >
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 mr-4">
                    <Text className={`font-bold text-lg mb-1 ${isDark ? "text-white" : "text-slate-800"}`} numberOfLines={1}>
                        {appraisal.hospital_name || 'Annual Appraisal'}
                    </Text>
                    <View className="flex-row items-center">
                        <MaterialIcons name="event" size={14} color={isDark ? "#94A3B8" : "#64748B"} className="mr-1" />
                        <Text className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            {formatDate(appraisal.appraisal_date)}
                        </Text>
                    </View>
                </View>
                <View className={`px-3 py-1.5 rounded-full ${isDark ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
                    <Text className="text-emerald-500 text-xs font-bold uppercase tracking-wider">Completed</Text>
                </View>
            </View>

            <View className="mb-4">
                <View className="flex-row items-center mb-1">
                    <MaterialIcons name="assignment" size={14} color={isDark ? "#94A3B8" : "#64748B"} className="mr-1" />
                    <Text className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {appraisal.appraisal_type || 'Annual Appraisal'}
                    </Text>
                </View>
                {appraisal.discussion_with && (
                    <View className="flex-row items-center">
                        <MaterialIcons name="people" size={14} color={isDark ? "#94A3B8" : "#64748B"} className="mr-1" />
                        <Text className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Discussed with: {appraisal.discussion_with}
                        </Text>
                    </View>
                )}
            </View>

            {appraisal.notes && (
                <Text className={`text-sm mb-4 leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`} numberOfLines={2}>
                    {appraisal.notes}
                </Text>
            )}

            {appraisal.documentIds && appraisal.documentIds.length > 0 && (
                <View className="flex-row items-center">
                    <MaterialIcons name="attachment" size={14} color="#2B5F9E" className="mr-1" />
                    <Text className="text-[#2B5F9E] text-xs font-medium">Evidence attached</Text>
                </View>
            )}
        </Pressable>
    );
};
