import { z } from 'zod';

const emailSchema = z
  .string()
  .min(1, 'Work email is required')
  .email('Please enter a valid work email address');

const passwordSchema = z.string().min(1, 'Password is required');

const passwordCreateSchema = passwordSchema.min(
  8,
  'Password must be at least 8 characters'
);

export const roleEnum = z.enum([
  'doctor',
  'nurse',
  'pharmacist',
  'dentist',
  'other',
]);
export type Role = z.infer<typeof roleEnum>;

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordCreateSchema,
    role: roleEnum,
    termsAccepted: z.boolean(),
    marketingOptIn: z.boolean().default(false),
  })
  .refine((data) => data.termsAccepted === true, {
    message: 'You must agree to the Terms of Service and Privacy Policy',
    path: ['termsAccepted'],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const onboardingRoleSchema = z.object({
  role: roleEnum,
});
export type OnboardingRoleInput = z.infer<typeof onboardingRoleSchema>;

// Personal details schema
export const onboardingPersonalDetailsSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: emailSchema,
  phone: z.string().optional(),
});
export type OnboardingPersonalDetailsInput = z.infer<typeof onboardingPersonalDetailsSchema>;

const workSettingEnum = z.enum([
  'nhs-hospital',
  'nhs-community',
  'private-practice',
  'gp-surgery',
  'pharmacy',
  'dental-practice',
  'other',
]);

const scopeOfPracticeEnum = z.enum([
  'full-time',
  'part-time',
  'locum',
  'consultant',
  'specialist',
  'gp',
  'bank',
  'agency',
  'superintendent',
  'general',
]);

const registrationNumberSchema = z
  .string()
  .min(1, 'Registration number is required')
  .max(20, 'Registration number is too long')
  .regex(
    /^[A-Za-z0-9]+$/,
    'Registration number can only contain letters and numbers'
  );

// Professional registration enum
export const professionalRegistrationEnum = z.enum([
  'gmc',
  'nmc',
  'gphc',
  'gdc',
  'hcpcc',
  'other',
]);

export const onboardingProfessionalDetailsSchema = z.object({
  registrationNumber: registrationNumberSchema,
  professionalRegistrations: z.array(professionalRegistrationEnum).min(1, 'At least one professional registration is required'),
  registrationPin: z.string().optional(),
  revalidationDate: z.date({
    required_error: 'Revalidation date is required',
    invalid_type_error: 'Please select a valid date',
  }),
  workSetting: workSettingEnum,
  scope: scopeOfPracticeEnum,
  hourlyRate: z.number().min(0, 'Hourly rate must be 0 or greater').default(0),
  workHoursCompleted: z.number().min(0, 'Work hours must be 0 or greater').default(0),
  trainingHoursCompleted: z.number().min(0, 'Training hours must be 0 or greater').default(0),
  earningsCurrentYear: z.number().min(0, 'Earnings must be 0 or greater').default(0),
  workDescription: z.string().min(1, 'Work description is required').max(1000, 'Work description is too long'),
  notepad: z.string().optional(),
});
export type OnboardingProfessionalDetailsInput = z.infer<
  typeof onboardingProfessionalDetailsSchema
>;

export const onboardingPlanSchema = z.object({
  selectedPlan: z.enum(['free', 'premium']),
  trialSelected: z.boolean().default(false),
});
export type OnboardingPlanInput = z.infer<typeof onboardingPlanSchema>;

export { workSettingEnum, scopeOfPracticeEnum };
