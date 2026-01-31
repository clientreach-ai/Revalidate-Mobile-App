export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerSession {
    id: number;
    startTime: string; // ISO string
    endTime: string | null;
    status: TimerStatus;
    accumulatedMs: number;
    lastPausedAt: string | null;
}

export interface TimerState {
    status: TimerStatus;
    startTime: string | null;
    accumulatedMs: number;
    lastPausedAt: string | null;
    elapsedMs: number;
}
