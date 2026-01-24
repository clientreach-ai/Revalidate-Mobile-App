/**
 * Authentication types and interfaces
 * 
 * Authentication Flow:
 * 1. Client authenticates with Firebase (email/password or social login)
 * 2. Client receives Firebase ID token
 * 3. Client sends Firebase ID token to backend
 * 4. Backend verifies Firebase ID token and links to MySQL user
 * 5. Backend issues JWT token for subsequent API requests
 */

export interface RegisterRequest {
  firebaseIdToken: string; // Firebase ID token from client
  professionalDetails: {
    registrationNumber: string;
    revalidationDate: string; // ISO date string
    professionalRole: 'doctor' | 'nurse' | 'pharmacist' | 'other';
    workSetting?: string;
    scopeOfPractice?: string;
  };
}

export interface LoginRequest {
  firebaseIdToken: string; // Firebase ID token from client
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    professionalRole: string;
    revalidationDate: string;
  };
  token: string; // Our JWT token for API requests
  refreshToken?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  firebaseUid: string;
  iat?: number;
  exp?: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface ChangePasswordRequest {
  newPassword: string;
}
