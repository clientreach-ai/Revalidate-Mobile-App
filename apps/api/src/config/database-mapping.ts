/**
 * Database Column Mapping
 * 
 * Maps between the existing database schema and the expected schema.
 * The existing database uses different column names than expected.
 */

/**
 * Maps expected column names to actual database column names
 */
export const USER_COLUMN_MAPPING = {
  // Expected -> Actual
  id: 'id',
  firebase_uid: 'firebase_uid',
  email: 'email',
  registration_number: 'registration', // Existing DB uses 'registration'
  revalidation_date: 'due_date', // Existing DB uses 'due_date'
  professional_role: 'reg_type', // Existing DB uses 'reg_type'
  work_setting: 'work_settings', // Existing DB uses 'work_settings' (might be INT, needs conversion)
  scope_of_practice: 'scope_practice', // Existing DB uses 'scope_practice' (might be INT, needs conversion)
  subscription_tier: 'subscription_tier',
  subscription_status: 'subscription_status',
  trial_ends_at: 'trial_ends_at',
  hourly_rate: 'hourly_rate',
  discovery_source: 'discovery_source',
  onboarding_status: 'onboarding_status',
  created_at: 'created_at',
  updated_at: 'updated_at',
} as const;

/**
 * Get the actual column name from the expected name
 */
export function getActualColumnName(expectedName: keyof typeof USER_COLUMN_MAPPING): string {
  return USER_COLUMN_MAPPING[expectedName] || expectedName;
}

/**
 * Convert database row to expected format
 */
export function mapUserRow(dbRow: any): any {
  // Try to extract professionalRole from description (stored as JSON)
  let professionalRole = dbRow.reg_type; // Fallback to reg_type
  if (dbRow.description) {
    try {
      const desc = typeof dbRow.description === 'string' ? JSON.parse(dbRow.description) : dbRow.description;
      if (desc.professionalRole) {
        professionalRole = desc.professionalRole;
      }
    } catch (e) {
      // If description is not JSON, use reg_type as fallback
    }
  }

  return {
    id: typeof dbRow.id === 'bigint' ? dbRow.id.toString() : dbRow.id,
    firebase_uid: dbRow.firebase_uid,
    email: dbRow.email,
    registration_number: dbRow.registration,
    revalidation_date: dbRow.due_date,
    professional_role: professionalRole,
    work_setting: dbRow.work_settings ? String(dbRow.work_settings) : null,
    scope_of_practice: dbRow.scope_practice ? String(dbRow.scope_practice) : null,
    subscription_tier: dbRow.subscription_tier || 'free',
    subscription_status: dbRow.subscription_status || 'active',
    trial_ends_at: dbRow.trial_ends_at,
    hourly_rate: dbRow.hourly_rate || 0,
    discovery_source: dbRow.discovery_source,
    onboarding_status: dbRow.onboarding_status || 0,
    created_at: dbRow.created_at,
    updated_at: dbRow.updated_at,
  };
}

/**
 * Convert expected format to database format for INSERT/UPDATE
 */
export function mapUserToDb(userData: any): any {
  const mapped: any = {};

  if (userData.registration_number !== undefined) {
    mapped.registration = userData.registration_number;
  }
  if (userData.revalidation_date !== undefined) {
    mapped.due_date = userData.revalidation_date;
  }
  if (userData.professional_role !== undefined) {
    mapped.reg_type = userData.professional_role;
  }
  if (userData.work_setting !== undefined) {
    mapped.work_settings = userData.work_setting;
  }
  if (userData.scope_of_practice !== undefined) {
    mapped.scope_practice = userData.scope_of_practice;
  }
  if (userData.subscription_tier !== undefined) {
    mapped.subscription_tier = userData.subscription_tier;
  }
  if (userData.subscription_status !== undefined) {
    mapped.subscription_status = userData.subscription_status;
  }
  if (userData.trial_ends_at !== undefined) {
    mapped.trial_ends_at = userData.trial_ends_at;
  }
  if (userData.hourly_rate !== undefined) {
    mapped.hourly_rate = userData.hourly_rate;
  }

  return mapped;
}
