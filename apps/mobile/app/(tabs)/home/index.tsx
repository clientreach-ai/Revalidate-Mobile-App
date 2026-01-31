import React, { useEffect, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { useThemeStore } from '@/features/theme/theme.store';
import { usePremium } from '@/hooks/usePremium';
import { DiscoveryModal, useDiscoveryModal } from '@/features/auth/DiscoveryModal';
import { TimerService } from '@/features/timer/timer.service';
import { useTimerStore } from '@/features/timer/timer.store';
import { useAuthStore } from '@/features/auth/auth.store';

// Modular Imports
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';
import { useActiveSession } from '@/features/dashboard/hooks/useActiveSession';
import { useWorkSessionForm } from '@/features/dashboard/hooks/useWorkSessionForm';
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader';
import { TimerCard } from '@/features/dashboard/components/TimerCard';
import { StatsGrid } from '@/features/dashboard/components/StatsGrid';
import { ActivitySection } from '@/features/dashboard/components/ActivitySection';
import { WorkSessionModal } from '@/features/dashboard/components/WorkSessionModal';

import '../../global.css';

export default function DashboardScreen() {
  const { isDark } = useThemeStore();
  const { isPremium } = usePremium();
  const { showModal, showDiscoveryModal, hideModal } = useDiscoveryModal();

  // Data Hook
  const {
    userData,
    stats,
    unreadNotifications,
    recentActivities,
    revalidationDays,
    localProfileImage,
    isUserLoading,
    isStatsLoading,
    isActivitiesLoading,
    refreshing,
    onRefresh,
    loadUserData,
    loadDashboardStats,
    loadNotificationsCount,
    loadRecentActivities,
  } = useDashboardData();

  // Session Hook
  const {
    activeSession,
    timer,
    isPaused,
    loadActiveSession,
    handleStartSession,
    handlePauseSession,
    handleResumeSession,
    handleRestartSession,
    handleStopSession,
  } = useActiveSession(() => {
    // onSessionEnded
    loadDashboardStats();
    loadRecentActivities();
  });

  // Form Hook
  const workForm = useWorkSessionForm(activeSession, () => {
    // onSuccess
    loadActiveSession();
    loadDashboardStats();
    loadRecentActivities();
  });

  // Effects
  useEffect(() => {
    showDiscoveryModal();
  }, [showDiscoveryModal]);

  useEffect(() => {
    TimerService.registerBackgroundTask();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserData(true);
      loadActiveSession();
      loadDashboardStats(true);
      loadNotificationsCount(true);
      loadRecentActivities(true);
    }, [loadUserData, loadActiveSession, loadDashboardStats, loadNotificationsCount, loadRecentActivities])
  );

  useEffect(() => {
    workForm.loadFormOptions();
  }, [workForm.loadFormOptions]);

  return (
    <SafeAreaView
      className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background-light'}`}
      edges={['top']}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isPremium ? '#D4AF37' : '#2B5F9E'}
          />
        }
      >
        <DashboardHeader
          userData={userData}
          unreadNotifications={unreadNotifications}
          isPremium={isPremium}
          localProfileImage={localProfileImage}
          isUserLoading={isUserLoading}
          revalidationDays={revalidationDays}
        />

        <View className="flex-1 -mt-10 px-6" style={{ gap: 20 }}>
          {activeSession?.isActive ? (
            <TimerCard
              activeSession={activeSession}
              timer={timer}
              isPaused={isPaused}
              isDark={isDark}
              handleRestartSession={handleRestartSession}
              handlePauseSession={handlePauseSession}
              handleResumeSession={handleResumeSession}
              handleStopSession={() => handleStopSession(() => workForm.openFormWithDefaults(`${timer.hours}:${timer.minutes}`))}
            />
          ) : (
            <View
              className={`p-6 rounded-[32px] shadow-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-50'
                }`}
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text
                    className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'
                      }`}
                  >
                    Ready to track?
                  </Text>
                  <Text className="text-sm text-slate-500 mt-0.5">
                    Start your session for today
                  </Text>
                </View>
                <Pressable
                  onPress={handleStartSession}
                  className="bg-emerald-500 w-16 h-16 rounded-full items-center justify-center shadow-emerald-200 shadow-md"
                >
                  <MaterialIcons name="play-arrow" color="white" size={32} />
                </Pressable>
              </View>
            </View>
          )}

          <StatsGrid
            stats={stats}
            isPremium={isPremium}
            isDark={isDark}
            isStatsLoading={isStatsLoading}
          />

          <ActivitySection
            activities={recentActivities}
            isDark={isDark}
            isActivitiesLoading={isActivitiesLoading}
          />
        </View>
      </ScrollView>

      <WorkSessionModal
        visible={workForm.showWorkForm}
        onClose={() => workForm.setShowWorkForm(false)}
        isDark={isDark}
        {...workForm}
      />

      <DiscoveryModal visible={showModal} onClose={hideModal} />
    </SafeAreaView>
  );
}
