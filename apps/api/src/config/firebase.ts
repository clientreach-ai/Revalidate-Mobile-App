import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let app: App | null = null;

/**
 * Initialize Firebase Admin SDK
 */
export function initializeFirebaseAdmin(): App {
  if (app) {
    return app;
  }

  // Check if Firebase Admin is already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
    return app;
  }

  // Initialize with service account credentials
  // These should be set as environment variables or from a service account file
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;

  if (!serviceAccount) {
    throw new Error('Firebase service account credentials not found. Set FIREBASE_SERVICE_ACCOUNT environment variable.');
  }

  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  console.log('✅ Firebase Admin initialized');
  return app;
}

/**
 * Get Firebase Auth instance
 * Throws error if Firebase is not initialized
 */
export function getFirebaseAuth() {
  if (!app) {
    try {
      initializeFirebaseAdmin();
    } catch (error) {
      throw new Error('Firebase Admin is not initialized. Please configure FIREBASE_SERVICE_ACCOUNT environment variable.');
    }
  }
  return getAuth(app!);
}

/**
 * Get Firestore instance
 * Throws error if Firebase is not initialized
 */
export function getFirestoreAdmin() {
  if (!app) {
    try {
      initializeFirebaseAdmin();
    } catch (error) {
      throw new Error('Firebase Admin is not initialized. Please configure FIREBASE_SERVICE_ACCOUNT environment variable.');
    }
  }
  return getFirestore(app!);
}

export { app };
