import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import '../../global.css';

type EventType = 'all' | 'official' | 'personal';

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  type: 'official' | 'personal';
  date: Date;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const [currentDate, setCurrentDate] = useState(new Date(2024, 2, 13)); // March 13, 2024
  const [selectedDate, setSelectedDate] = useState(new Date(2024, 2, 13));
  const [activeFilter, setActiveFilter] = useState<EventType>('all');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Adjust to start from Monday (0 = Monday)
    const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    const days = [];
    
    // Previous month's days
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = adjustedStartingDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }
    
    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    
    // Next month's days to fill the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const formatDateLabel = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayIndex = date.getDay();
    const monthIndex = date.getMonth();
    const dayName = days[dayIndex] ?? 'Monday';
    const day = date.getDate();
    const monthName = monthNames[monthIndex] ?? 'January';
    return `${dayName.toUpperCase()}, ${day} ${monthName.toUpperCase()}`;
  };

  // Sample events data
  const events: Event[] = [
    {
      id: '1',
      title: 'Patient Safety Audit',
      description: 'Reviewing quarterly surgical outcomes and complications.',
      location: 'Main Hospital, Room 4B',
      startTime: '09:00',
      endTime: '10:30',
      type: 'official',
      date: new Date(2024, 2, 13),
    },
    {
      id: '2',
      title: 'Reflective Journaling',
      description: 'Documenting learning from recent complex cases.',
      location: 'Revalidation Portfolio',
      startTime: '13:00',
      endTime: '14:00',
      type: 'personal',
      date: new Date(2024, 2, 13),
    },
  ];

  const filteredEvents = events.filter((event) => {
    if (!isSameDay(event.date, selectedDate)) return false;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'official') return event.type === 'official';
    if (activeFilter === 'personal') return event.type === 'personal';
    return true;
  });

  const calendarDays = getDaysInMonth(currentDate);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 py-4 flex-row justify-between items-center">
          <View>
            <Text className="text-2xl font-bold tracking-tight text-slate-800">
              Professional Calendar
            </Text>
            <Text className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-0.5">
              UK Revalidation Tracker
            </Text>
          </View>
          <Pressable className="w-10 h-10 rounded-full bg-white shadow-sm items-center justify-center border border-slate-100">
            <MaterialIcons name="notifications" size={20} color="#2B5F9E" />
          </Pressable>
        </View>

        {/* Calendar Widget */}
        <View className="px-4 mb-4">
          <View className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            {/* Month Navigation */}
            <View className="flex-row justify-between items-center mb-6 px-2">
              <Text className="text-lg font-bold text-slate-800">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Text>
              <View className="flex-row gap-1">
                <Pressable 
                  onPress={() => navigateMonth('prev')}
                  className="p-1 rounded-lg"
                >
                  <MaterialIcons name="chevron-left" size={24} color="#64748B" />
                </Pressable>
                <Pressable 
                  onPress={() => navigateMonth('next')}
                  className="p-1 rounded-lg"
                >
                  <MaterialIcons name="chevron-right" size={24} color="#64748B" />
                </Pressable>
              </View>
            </View>

            {/* Day Headers */}
            <View className="flex-row justify-between mb-4">
              {dayNames.map((day) => (
                <View key={day} className="flex-1 items-center">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View className="flex-row flex-wrap">
              {calendarDays.map((day, index) => {
                const isSelected = isSameDay(day.date, selectedDate);
                const isCurrentMonth = day.isCurrentMonth;
                
                return (
                  <Pressable
                    key={index}
                    onPress={() => setSelectedDate(day.date)}
                    className="w-[14.28%] py-2 items-center justify-center"
                  >
                    <View className="relative items-center justify-center">
                      {isSelected ? (
                        <>
                          <View className="w-8 h-8 rounded-full border-2 border-[#2B5F9E] items-center justify-center">
                            <Text className="text-[#2B5F9E] font-bold text-sm">
                              {day.date.getDate()}
                            </Text>
                          </View>
                          <View className="absolute -bottom-1 w-1 h-1 bg-[#2B5F9E] rounded-full" />
                        </>
                      ) : (
                        <Text 
                          className={`text-sm font-medium ${
                            isCurrentMonth ? 'text-slate-800' : 'text-slate-300'
                          }`}
                        >
                          {day.date.getDate()}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <View className="px-6 mb-4">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            <Pressable
              onPress={() => setActiveFilter('all')}
              className={`px-5 py-2.5 rounded-full ${
                activeFilter === 'all'
                  ? 'bg-[#2B5F9E]'
                  : 'bg-white border border-slate-100'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  activeFilter === 'all' ? 'text-white' : 'text-slate-600'
                }`}
              >
                All Events
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveFilter('official')}
              className={`px-5 py-2.5 rounded-full ${
                activeFilter === 'official'
                  ? 'bg-[#2B5F9E]'
                  : 'bg-white border border-slate-100'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  activeFilter === 'official' ? 'text-white' : 'text-slate-600'
                }`}
              >
                Official CPD
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveFilter('personal')}
              className={`px-5 py-2.5 rounded-full ${
                activeFilter === 'personal'
                  ? 'bg-[#2B5F9E]'
                  : 'bg-white border border-slate-100'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  activeFilter === 'personal' ? 'text-white' : 'text-slate-600'
                }`}
              >
                Personal Development
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Events List */}
        <View className="flex-1 px-6" style={{ gap: 16 }}>
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
            {formatDateLabel(selectedDate)}
          </Text>
          
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <View
                key={event.id}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex-row items-start"
                style={{ gap: 16 }}
              >
                {/* Time Line */}
                <View className="items-center">
                  <Text className="text-sm font-bold text-slate-800">{event.startTime}</Text>
                  <View className="w-px h-12 bg-slate-200 my-1" />
                  <Text className="text-xs text-slate-400">{event.endTime}</Text>
                </View>

                {/* Event Details */}
                <View className="flex-1">
                  <View className="flex-row justify-between items-start mb-1">
                    <Text className="font-bold text-slate-800 flex-1">{event.title}</Text>
                    <View
                      className={`px-2 py-0.5 rounded-full ${
                        event.type === 'official'
                          ? 'bg-blue-100'
                          : 'bg-amber-100'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold uppercase tracking-tighter ${
                          event.type === 'official'
                            ? 'text-blue-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {event.type === 'official' ? 'Official' : 'Personal'}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm text-slate-500 mt-1">{event.description}</Text>
                  <View className="flex-row items-center mt-3">
                    <MaterialIcons
                      name={event.type === 'official' ? 'location-on' : 'history-edu'}
                      size={16}
                      color="#94A3B8"
                    />
                    <Text className="text-xs text-slate-400 ml-1">{event.location}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View className="bg-white p-8 rounded-2xl border border-slate-100 items-center">
              <MaterialIcons name="event-busy" size={48} color="#CBD5E1" />
              <Text className="text-slate-400 mt-4 text-center">
                No events scheduled for this date
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable 
        className="absolute right-6 w-14 h-14 bg-[#2B5F9E] rounded-full shadow-lg items-center justify-center"
        style={{ bottom: 80 + insets.bottom }}
      >
        <MaterialIcons name="add" size={32} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}
