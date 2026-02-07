import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { useTimerStore } from './timer.store';
import { TIMER_BACKGROUND_TASK, TimerUtils } from './timer.utils';

// Define the background task
// This MUST be called at the top level of the JS bundle for iOS compatibility
TaskManager.defineTask(TIMER_BACKGROUND_TASK, async () => {
    try {
        const state = useTimerStore.getState();
        if (state.status === 'running' && state.startTime) {
            const start = TimerUtils.parseSafeDate(state.startTime);
            const now = Date.now();
            // Session Model: Elapsed = Now - T0 - TotalPaused
            // accumulatedMs is now "Total Paused Time"
            const elapsed = Math.max(0, now - start - state.accumulatedMs);

            // Update store UI will reflect this when app foregrounds
            useTimerStore.getState().setElapsedMs(elapsed);
        }
        return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
        console.error('[Background] Timer task failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

console.log(`[Background] Task defined: ${TIMER_BACKGROUND_TASK}`);
