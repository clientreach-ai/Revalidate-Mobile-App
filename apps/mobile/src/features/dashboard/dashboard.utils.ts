export const formatTimeAgo = (iso?: string) => {
    if (!iso) return '';
    const diffS = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diffS < 60) return `${diffS}s`;
    if (diffS < 3600) return `${Math.floor(diffS / 60)}m`;
    if (diffS < 86400) return `${Math.floor(diffS / 3600)}h`;
    return `${Math.floor(diffS / 86400)}d`;
};

export const buildActivityRoute = (activity: any) => {
    const type = String(activity?.type || '');
    const [kind, id] = type.split(':');
    if ((kind === 'calendar_invite' || kind === 'calendar_response') && id) {
        return `/(tabs)/calendar/event/${id}`;
    }
    if (kind === 'document') {
        return `/(tabs)/gallery`;
    }
    if (kind === 'reflection' && id) {
        return `/(tabs)/reflections/${id}`;
    }
    if (kind === 'appraisal' && id) {
        return `/(tabs)/appraisal/${id}`;
    }
    if (kind === 'work_hours' || kind === 'work_hour') {
        return `/(tabs)/home`;
    }
    return '/(tabs)/home';
};

export const getRolePrefix = (role: string | null): string => {
    if (!role) return '';
    const map: any = {
        doctor: 'Dr.',
        nurse: 'Nurse',
        pharmacist: 'Pharmacist',
        dentist: 'Dr.',
    };
    return map[role] || '';
};

export const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
};

export const formatDateShort = (date: Date): string => {
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

export const formatUserName = (userData: any): string => {
    if (!userData) return 'User';
    const prefix = getRolePrefix(userData.professionalRole);
    const name = userData.name || (userData.email.split('@')[0] ?? '');
    return prefix ? `${prefix} ${name}` : name;
};

export const formatTime = (v: number) => v.toString().padStart(2, '0');

export const formatCurrency = (value: number) => {
    try {
        return `£${new Intl.NumberFormat('en-GB').format(Math.round(value))}`;
    } catch {
        return `£${Math.round(value)}`;
    }
};
