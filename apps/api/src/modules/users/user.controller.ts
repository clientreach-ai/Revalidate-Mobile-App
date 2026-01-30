import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { ApiError } from '../../common/middleware/error-handler';
import {
  getUserById,
  updateUserProfile,
  deleteUser,
  getRoleRequirements,
  registerUser,
  updateOnboardingStep1,
  updateOnboardingStep2,
  updateOnboardingStep3,
  updateOnboardingStep4,
  getRegistrationProgress,
  getOnboardingData,
} from './user.service';
import {
  UpdateUserProfile,
  OnboardingStep1Role,
  OnboardingStep2Personal,
  OnboardingStep3Professional,
  OnboardingStep4Plan,
} from './user.model';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { generateOTP, storeOTP } from '../auth/otp.service';
import { sendOTPEmail } from '../auth/email.service';

const updateProfileSchema = z.object({
  registration_number: z.string().optional(),
  revalidation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  professional_role: z.enum(['doctor', 'nurse', 'pharmacist', 'other', 'other_healthcare']).optional(),
  work_setting: z.string().optional(),
  scope_of_practice: z.string().optional(),
  hourly_rate: z.number().min(0).optional(),
  professional_registrations: z.string().optional(),
  registration_reference_pin: z.string().optional(),
  work_hours_completed_already: z.number().int().min(0).optional(),
  training_hours_completed_already: z.number().int().min(0).optional(),
  earned_current_financial_year: z.number().min(0).optional(),
  brief_description_of_work: z.string().optional(),
  notepad: z.string().optional(),
});

function formatUserResponse(user: any, name?: string | null, requirements?: any) {
  return {
    id: user.id,
    name: name || null,
    email: user.email,
    registrationNumber: user.registration_number,
    revalidationDate: user.revalidation_date,
    professionalRole: user.professional_role,
    workSetting: user.work_setting,
    scopeOfPractice: user.scope_of_practice,
    image: user.image,
    subscriptionTier: user.subscription_tier,
    subscriptionStatus: user.subscription_status,
    trialEndsAt: user.trial_ends_at,
    requirements: requirements || getRoleRequirements(user.professional_role),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}


export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const user = await getUserById(req.user.userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Get name directly from database
  const { prisma } = await import('../../lib/prisma');
  const userData = await prisma.users.findUnique({
    where: { id: parseInt(req.user.userId) },
    select: { name: true },
  });

  res.json({
    success: true,
    data: formatUserResponse(user, userData?.name || null),
  });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = updateProfileSchema.parse(req.body) as UpdateUserProfile;
  const updated = await updateUserProfile(req.user.userId, validated);

  // Get name directly from database
  const { prisma } = await import('../../lib/prisma');
  const userData = await prisma.users.findUnique({
    where: { id: parseInt(req.user.userId) },
    select: { name: true },
  });

  res.json({
    success: true,
    data: formatUserResponse(updated, userData?.name || null),
  });
});


export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  await deleteUser(req.user.userId);

  res.json({
    success: true,
    message: 'Account deleted successfully',
  });
});


const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});


export const register = asyncHandler(async (req: Request, res: Response) => {
  const validated = registerSchema.parse(req.body);

  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(validated.password, saltRounds);

  // Create user (unverified)
  const user = await registerUser(validated.email, passwordHash);

  // Generate and store OTP
  const otp = generateOTP();
  await storeOTP(validated.email, otp);

  // Send OTP email (non-blocking - user can request OTP again if this fails)
  const emailResult = await sendOTPEmail(validated.email, otp);

  // Prepare response
  const response: any = {
    success: true,
    data: {
      userId: user.id,
      email: user.email,
    },
  };

  if (emailResult.success) {
    response.message = 'Registration successful. Please check your email for the verification code.';
  } else {
    // Email failed but user is created - they can request OTP again
    response.message = 'Registration successful, but we could not send the verification email. Please use the resend OTP endpoint to receive your code.';
    response.warning = emailResult.error;
  }

  // In development, include OTP in response
  if (process.env.NODE_ENV === 'development') {
    response.data.otp = otp;
    if (emailResult.otp) {
      response.data.devOtp = emailResult.otp;
    }
  }

  res.status(201).json(response);
});


const step1Schema = z.object({
  professional_role: z.string(),
});

export const onboardingStep1 = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  // Fetch allowed roles from database (only active roles)
  const { prisma } = await import('../../lib/prisma');
  const roles = await prisma.role_masters.findMany({
    where: { status: 'one' },
    select: { name: true, status: true, type: true },
  });

  const deriveRoleKey = (name: string) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('doctor')) return 'doctor';
    if (lower.includes('nurse')) return 'nurse';
    if (lower.includes('pharmacist')) return 'pharmacist';
    return 'other_healthcare';
  };

  const rolesWithKeys = roles.map(r => ({ ...r, key: deriveRoleKey(r.name) }));
  const availableRoleKeys = Array.from(new Set(rolesWithKeys.map(r => r.key)));
  const availableRoles = rolesWithKeys.map(r => ({ name: r.name, status: r.status, type: r.type, key: r.key }));

  const validated = step1Schema.parse(req.body) as OnboardingStep1Role;

  if (!availableRoleKeys.includes(validated.professional_role)) {
    throw new ApiError(400, 'Invalid professional role');
  }

  // Store the frontend canonical key (e.g. 'doctor' or 'other_healthcare')
  await updateOnboardingStep1(req.user.userId, { professional_role: validated.professional_role });
  const requirements = getRoleRequirements(validated.professional_role);

  res.json({
    success: true,
    message: 'Role selected successfully',
    data: {
      professionalRole: validated.professional_role,
      requirements,
      availableRoles,
    },
  });
});

export const getOnboardingRoles = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const { prisma } = await import('../../lib/prisma');
  const roles = await prisma.role_masters.findMany({
    where: { status: 'one' },
    select: { name: true, status: true, type: true },
  });
  const deriveRoleKey = (name: string) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('doctor')) return 'doctor';
    if (lower.includes('nurse')) return 'nurse';
    if (lower.includes('pharmacist')) return 'pharmacist';
    return 'other_healthcare';
  };

  const availableRoles = roles.map(r => ({ name: r.name, status: r.status, type: r.type, key: deriveRoleKey(r.name) }));

  // Try to fetch work setting options from the database master table(s).
  // The legacy DB sometimes stores work settings as integers referencing another table.
  let workSettings: { id: string; name: string; status?: string }[] = [];

  // Try the `categories` table where work settings are stored
  try {
    // Try to find a parent category named like work_settings, then fetch its children
    const parent: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM categories WHERE LOWER(name) LIKE '%work setting%' OR LOWER(name) = 'work_settings' LIMIT 1`);
    if (parent && parent.length > 0 && parent[0].id) {
      const children: any[] = await prisma.$queryRawUnsafe(`SELECT id, name FROM categories WHERE parent_id = ${parent[0].id} ORDER BY id ASC`);
      if (children && children.length > 0) {
        workSettings = children.map((r: any) => ({ id: String(r.id), name: r.name }));
      }
    }

    // If still empty, try to fetch common work-setting-like categories directly by name
    if (workSettings.length === 0) {
      const candidates = [
        'Community setting (including district nursing and community psychiatric nursing)',
        'Care home sector',
        'Ambulance service',
        'Consultancy',
        'Cosmetic or aesthetic sector',
        'Governing body or other leadership',
        'GP practice or other primary care',
        'Hospital or other secondary care',
        'Inspectorate or regulator',
        'Insurance or legal',
        'Maternity unit or birth centre',
        'Military',
        'Occupational health',
        'Police',
        'Policy organisation',
        'Prison',
        'Private domestic setting',
        'Public health organisation',
        'School',
        'Specialist or other tertiary care including hospice',
        'Telephone or e-health advice',
        'Trade union or professional body',
        'University or other research facility',
        'Voluntary or charity sector',
        'Other',
      ];
      const placeholders = candidates.map(() => '?').join(',');
      const rows3: any[] = await prisma.$queryRawUnsafe(`SELECT id, name FROM categories WHERE name IN (${placeholders}) ORDER BY id ASC`, ...candidates);
      if (rows3 && rows3.length > 0) {
        workSettings = rows3.map(r => ({ id: String(r.id), name: r.name }));
      }
    }
  } catch (catErr) {
    workSettings = [];
  }

  // If client requested only workSettings, return that to reduce payload
  const only = (req.query.only || '') as string;
  if (only === 'workSettings') {
    return res.json({
      success: true,
      data: { workSettings },
    });
  }

  res.json({
    success: true,
    data: {
      roles: availableRoles,
      workSettings,
    },
  });
});

/**
 * Onboarding Step 2: Personal Details
 * POST /api/v1/users/onboarding/step-2
 */
const step2Schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone_number: z.string().min(1, 'Phone number is required'),
});

export const onboardingStep2 = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = step2Schema.parse(req.body) as OnboardingStep2Personal;
  await updateOnboardingStep2(req.user.userId, validated);

  res.json({
    success: true,
    message: 'Personal details saved successfully',
    data: {
      name: validated.name,
      email: validated.email,
      phone_number: validated.phone_number,
    },
  });
});

/**
 * Onboarding Step 3: Professional Details
 * POST /api/v1/users/onboarding/step-3
 */
const step3Schema = z.object({
  gmc_registration_number: z.string().min(1, 'GMC registration number is required'),
  revalidation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
  work_setting: z.string().optional(),
  scope_of_practice: z.string().optional(),
  professional_registrations: z.string().optional(),
  registration_reference_pin: z.string().optional(),
  hourly_rate: z.number().min(0).optional(),
  work_hours_completed_already: z.number().int().min(0).optional(),
  training_hours_completed_already: z.number().int().min(0).optional(),
  earned_current_financial_year: z.number().min(0).optional(),
  brief_description_of_work: z.string().optional(),
  notepad: z.string().optional(),
});

export const onboardingStep3 = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = step3Schema.parse(req.body) as OnboardingStep3Professional;
  await updateOnboardingStep3(req.user.userId, validated);

  res.json({
    success: true,
    message: 'Professional details saved successfully',
    data: {
      gmc_registration_number: validated.gmc_registration_number,
      revalidation_date: validated.revalidation_date,
      work_setting: validated.work_setting,
      scope_of_practice: validated.scope_of_practice,
      professional_registrations: validated.professional_registrations,
      registration_reference_pin: validated.registration_reference_pin,
      hourly_rate: validated.hourly_rate,
      work_hours_completed_already: validated.work_hours_completed_already,
      training_hours_completed_already: validated.training_hours_completed_already,
      earned_current_financial_year: validated.earned_current_financial_year,
      brief_description_of_work: validated.brief_description_of_work,
      notepad: validated.notepad,
    },
  });
});

/**
 * Onboarding Step 4: Choose Subscription Plan
 * POST /api/v1/users/onboarding/step-4
 */
const step4Schema = z.object({
  subscription_tier: z.enum(['free', 'premium']),
});

export const onboardingStep4 = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = step4Schema.parse(req.body) as OnboardingStep4Plan;
  const updated = await updateOnboardingStep4(req.user.userId, validated);

  res.json({
    success: true,
    message: 'Subscription plan selected successfully',
    data: {
      subscriptionTier: updated.subscription_tier,
      subscriptionStatus: updated.subscription_status,
      trialEndsAt: updated.trial_ends_at,
    },
  });
});

/**
 * Get Registration Progress
 * GET /api/v1/users/onboarding/progress
 */
export const getOnboardingProgress = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const progress = await getRegistrationProgress(req.user.userId);

  res.json({
    success: true,
    data: progress,
  });
});

/**
 * Get all saved onboarding data
 * GET /api/v1/users/onboarding/data
 */
export const getOnboardingDataEndpoint = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const data = await getOnboardingData(req.user.userId);

  // Also include work settings master list so onboarding step 3 can render options
  const { prisma } = await import('../../lib/prisma');
  let workSettings: { id: string; name: string }[] = [];

  try {
    // Look in categories table for a parent category matching work setting, then fetch children
    const parent: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM categories WHERE LOWER(name) LIKE '%work setting%' OR LOWER(name) = 'work_settings' LIMIT 1`);
    if (parent && parent.length > 0 && parent[0].id) {
      const children: any[] = await prisma.$queryRawUnsafe(`SELECT id, name FROM categories WHERE parent_id = ${parent[0].id} ORDER BY id ASC`);
      if (children && children.length > 0) {
        workSettings = children.map((r: any) => ({ id: String(r.id), name: r.name }));
      }
    }

    if (workSettings.length === 0) {
      const candidates = [
        'Community setting (including district nursing and community psychiatric nursing)',
        'Care home sector',
        'Ambulance service',
        'Consultancy',
        'Cosmetic or aesthetic sector',
        'Governing body or other leadership',
        'GP practice or other primary care',
        'Hospital or other secondary care',
        'Inspectorate or regulator',
        'Insurance or legal',
        'Maternity unit or birth centre',
        'Military',
        'Occupational health',
        'Police',
        'Policy organisation',
        'Prison',
        'Private domestic setting',
        'Public health organisation',
        'School',
        'Specialist or other tertiary care including hospice',
        'Telephone or e-health advice',
        'Trade union or professional body',
        'University or other research facility',
        'Voluntary or charity sector',
        'Other',
      ];
      const placeholders = candidates.map(() => '?').join(',');
      const rows3: any[] = await prisma.$queryRawUnsafe(`SELECT id, name FROM categories WHERE name IN (${placeholders}) ORDER BY id ASC`, ...candidates);
      if (rows3 && rows3.length > 0) {
        workSettings = rows3.map(r => ({ id: String(r.id), name: r.name }));
      }
    }
  } catch (catErr) {
    workSettings = [];
  }

  // Attach workSettings to the response under step3 metadata
  (data as any).workSettings = workSettings;

  res.json({
    success: true,
    data,
  });
});

/**
 * Search users for live autocomplete
 * GET /api/v1/users/search?q=&limit=&offset=
 */
export const searchUsers = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  try {
    const q = (req.query.q || '').toString().trim();
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    // Avoid expensive queries for very short queries
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [], pagination: { total: 0, limit, offset } });
    }

    const { prisma } = await import('../../lib/prisma');

    // Use raw SQL with LOWER(...) LIKE for case-insensitive matching to avoid
    // Prisma `mode` compatibility issues across client versions.
    const raw = await prisma.$queryRaw`
      SELECT id, name, email
      FROM users
      WHERE (LOWER(name) LIKE CONCAT('%', LOWER(${q}), '%') OR LOWER(email) LIKE CONCAT('%', LOWER(${q}), '%'))
      LIMIT ${limit} OFFSET ${offset}
    `;

    // $queryRaw returns any[]; normalize to expected shape
    const users = Array.isArray(raw) ? raw.map((r: any) => ({ id: String(r.id), name: r.name, email: r.email })) : [];

    res.json({ success: true, data: users, pagination: { total: users.length, limit, offset } });
  } catch (err) {
    console.error('Error in searchUsers:', err);
    // Provide helpful message in development, generic in production
    if (process.env.NODE_ENV === 'development') {
      throw err; // let global handler show stack in dev
    }
    throw new ApiError(500, 'Internal server error');
  }
});

/**
 * Save discovery source (how user heard about the app)
 * POST /api/v1/users/discovery-source
 */
const discoverySourceSchema = z.object({
  source: z.enum([
    'social_media',
    'search_engine',
    'word_of_mouth',
    'professional_conference',
    'nhs_colleagues',
    'app_store',
    'advertisement',
    'other'
  ]),
});

export const saveDiscoverySource = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = discoverySourceSchema.parse(req.body);
  const { prisma } = await import('../../lib/prisma');

  await prisma.$executeRaw`
    UPDATE users SET discovery_source = ${validated.source}, updated_at = ${new Date()} WHERE id = ${BigInt(req.user.userId)}
  `;

  res.json({
    success: true,
    message: 'Discovery source saved successfully',
    data: { source: validated.source },
  });
});

/**
 * Get discovery source status (for checking if modal should be shown)
 * GET /api/v1/users/discovery-source
 */
export const getDiscoverySource = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const { prisma } = await import('../../lib/prisma');
  const user = await prisma.$queryRaw<any[]>`
    SELECT discovery_source FROM users WHERE id = ${BigInt(req.user.userId)} LIMIT 1
  `;

  const source = user?.[0]?.discovery_source || null;

  res.json({
    success: true,
    data: {
      source,
      hasAnswered: !!source,
    },
  });
});

/**
 * Reset section data (Premium only)
 * POST /api/v1/users/reset-section
 */
const resetSectionSchema = z.object({
  section: z.enum(['work_hours', 'cpd_hours', 'reflections', 'feedback', 'documents']),
});

export const resetSection = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  // Check if user is premium
  const { prisma } = await import('../../lib/prisma');
  const user = await prisma.users.findUnique({
    where: { id: BigInt(req.user.userId) },
    select: { subscription_tier: true },
  });

  if (user?.subscription_tier !== 'premium') {
    throw new ApiError(403, 'This feature is only available for premium users');
  }

  const validated = resetSectionSchema.parse(req.body);
  const userId = BigInt(req.user.userId);

  // Delete data based on section
  switch (validated.section) {
    case 'work_hours':
      await prisma.work_hours.deleteMany({ where: { user_id: userId } });
      await prisma.working_hours.deleteMany({ where: { user_id: userId } });
      break;
    case 'cpd_hours':
      await prisma.cpd_hours.deleteMany({ where: { user_id: userId } });
      break;
    case 'reflections':
      await prisma.reflective_accounts.deleteMany({ where: { user_id: userId } });
      await prisma.reflective_account_forms.deleteMany({ where: { user_id: userId } });
      break;
    case 'feedback':
      await prisma.feedback_log.deleteMany({ where: { user_id: userId } });
      await prisma.user_feedback_logs.deleteMany({ where: { user_id: userId } });
      break;
    case 'documents':
      await prisma.personal_documents.deleteMany({ where: { user_id: userId } });
      break;
  }

  res.json({
    success: true,
    message: `${validated.section.replace('_', ' ')} data has been reset successfully`,
    data: { section: validated.section },
  });
});