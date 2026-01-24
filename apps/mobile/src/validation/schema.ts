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

export const onboardingProfessionalDetailsSchema = z.object({
  registrationNumber: registrationNumberSchema,
  revalidationDate: z.date({
    required_error: 'Revalidation date is required',
    invalid_type_error: 'Please select a valid date',
  }),
  workSetting: workSettingEnum,
  scope: scopeOfPracticeEnum,
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
