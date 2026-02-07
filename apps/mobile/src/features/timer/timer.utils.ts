export const TIMER_BACKGROUND_TASK = 'TIMER_BACKGROUND_TASK';

export const TimerUtils = {
    parseSafeDate(dateStr: string | null | undefined): number {
        if (!dateStr) return Date.now();
        // Normalize date string: replace space with T and ensure it ends with Z if no offset is present
        const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
        const hasOffset = normalized.includes('Z') || normalized.includes('+') || (normalized.split('-').length > 3);
        const safeStr = hasOffset ? normalized : `${normalized}Z`;
        const timestamp = new Date(safeStr).getTime();
        return isNaN(timestamp) ? Date.now() : timestamp;
    },

    calculateElapsedBetween(startTime: string | null, endTime: string | number | null, accumulatedMs: number): number {
        if (!startTime) return Number.isFinite(accumulatedMs) ? accumulatedMs : 0;
        const start = this.parseSafeDate(startTime);
        const end = typeof endTime === 'number' ? endTime : this.parseSafeDate(endTime);
        const safeAccum = Number.isFinite(accumulatedMs) ? accumulatedMs : 0;
        return Math.max(0, end - start - safeAccum);
    },

    calculateElapsed(startTime: string | null, accumulatedMs: number): number {
        return this.calculateElapsedBetween(startTime, Date.now(), accumulatedMs);
    },
};
