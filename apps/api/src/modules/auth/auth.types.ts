/**
 * Authentication types and interfaces
 * 
 * Authentication Flow:
 * 1. Client sends email/password to backend
 * 2. Backend verifies password against MySQL database
 * 3. Backend issues JWT token for subsequent API requests
 */

export interface RegisterRequest {
  email: string;
  password: string;
  professionalDetails: {
    registrationNumber: string;
    revalidationDate: string; // ISO date string
    professionalRole: 'doctor' | 'nurse' | 'pharmacist' | 'other';
    workSetting?: string;
    scopeOfPractice?: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
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
  iat?: number;
  exp?: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface ChangePasswordRequest {
  newPassword: string;
}
