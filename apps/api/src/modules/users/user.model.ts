/**
 * User model types and database operations
 */

export interface User {
  id: number;
  firebase_uid: string;
  email: string;
  registration_number: string;
  revalidation_date: string;
  professional_role: 'doctor' | 'nurse' | 'pharmacist' | 'other' | 'other_healthcare';
  work_setting?: string;
  scope_of_practice?: string;
  subscription_tier: 'free' | 'premium';
  subscription_status: 'active' | 'trial' | 'expired' | 'cancelled';
  trial_ends_at?: string;
  hourly_rate?: number;
  discovery_source?: string;
  onboarding_status: number; // 0: Incomplete, 1: Completed
  created_at: string;
  updated_at: string;
}

export interface UpdateUserProfile {
  registration_number?: string;
  revalidation_date?: string;
  professional_role?: 'doctor' | 'nurse' | 'pharmacist' | 'other' | 'other_healthcare';
  work_setting?: string;
  scope_of_practice?: string;
  hourly_rate?: number;
  professional_registrations?: string;
  registration_reference_pin?: string;
  work_hours_completed_already?: number;
  training_hours_completed_already?: number;
  earned_current_financial_year?: number;
  brief_description_of_work?: string;
  notepad?: string;
  device_token?: string; // Expo push token for push notifications
  discovery_source?: string; // How user heard about the app
}


/**
 * Onboarding step data types
 */
export interface OnboardingStep1Role {
  professional_role: 'doctor' | 'nurse' | 'pharmacist' | 'other_healthcare';
}

export interface OnboardingStep2Personal {
  name: string;
  email: string;
  phone_number: string;
}

export interface OnboardingStep3Professional {
  gmc_registration_number: string;
  revalidation_date: string;
  work_setting?: string;
  scope_of_practice?: string;
  professional_registrations?: string; // Can be comma-separated or JSON
  registration_reference_pin?: string; // Optional
  hourly_rate?: number;
  work_hours_completed_already?: number;
  training_hours_completed_already?: number;
  earned_current_financial_year?: number;
  brief_description_of_work?: string;
  notepad?: string; // Optional
}

export interface OnboardingStep4Plan {
  subscription_tier: 'free' | 'premium';
}

export interface RegistrationProgress {
  step1_role: boolean;
  step2_personal: boolean;
  step3_professional: boolean;
  step4_plan: boolean;
  completed: boolean;
  currentStep: number; // 1-4, or 0 if all done
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
  other_healthcare: {
    practiceHours: null,
    cpdHours: null,
  },
  // Keep 'other' for backward compatibility
  other: {
    practiceHours: null,
    cpdHours: null,
  },
};
