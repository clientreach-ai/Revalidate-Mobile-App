/**
 * User model types and database operations
 */

export interface User {
  id: number;
  firebase_uid: string;
  email: string;
  registration_number: string;
  revalidation_date: string;
  professional_role: 'doctor' | 'nurse' | 'pharmacist' | 'other';
  work_setting?: string;
  scope_of_practice?: string;
  subscription_tier: 'free' | 'premium';
  subscription_status: 'active' | 'trial' | 'expired' | 'cancelled';
  trial_ends_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateUserProfile {
  registration_number?: string;
  revalidation_date?: string;
  professional_role?: 'doctor' | 'nurse' | 'pharmacist' | 'other';
  work_setting?: string;
  scope_of_practice?: string;
}

/**
 * Role-specific revalidation requirements
 */
export const ROLE_REQUIREMENTS = {
  doctor: {
    practiceHours: null, // Varies by specialty
    cpdHours: 50, // Per year
  },
  nurse: {
    practiceHours: 450, // Per 3 years
    cpdHours: 35, // Per 3 years
  },
  pharmacist: {
    practiceHours: null,
    cpdHours: 9, // Per year
  },
  other: {
    practiceHours: null,
    cpdHours: null,
  },
};
