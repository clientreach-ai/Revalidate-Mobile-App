export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  registrationNumber: string | null;
  revalidationDate: string | null;
  professionalRole: string | null;
  workSetting: string | null;
  scopeOfPractice: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileResponse {
  success: boolean;
  data: UserProfile;
}
