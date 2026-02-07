export interface UserData {
  name: string | null;
  email: string;
  professionalRole: string | null;
  registrationNumber: string | null;
  revalidationDate: string | null;
  image: string | null;
}

export interface ActiveSession {
  id: number;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  workDescription: string | null;
  isActive: boolean;
  isPaused?: boolean;
  pausedAt?: string | null;
  totalPausedMs?: number;
}

export interface DashboardStats {
  totalHours: number;
  totalEarnings: number;
  workSessionsCount: number;
  cpdHours: number;
  reflectionsCount: number;
  appraisalsCount: number;
}

export interface RecentActivity {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  time: string;
  icon: string;
  iconColor: string;
  bgColor: string;
}

export interface Hospital {
  id?: number | string;
  name: string;
  town?: string;
  postcode?: string;
}

export interface SelectionOption {
  id?: number | string;
  value?: string;
  label?: string;
  name?: string;
  status?: string | number;
}

export interface StartSessionDetails {
  shiftHours: number;
  shiftMinutes: number;
  shiftType: 'Full time' | 'Part time';
  location?: string;
  notes?: string;
}
