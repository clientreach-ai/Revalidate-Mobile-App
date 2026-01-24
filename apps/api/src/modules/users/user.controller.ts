import { Request, Response } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { ApiError } from '../../common/middleware/error-handler';
import {
  getUserById,
  updateUserProfile,
  deleteUser,
  getRoleRequirements,
} from './user.service';
import { UpdateUserProfile } from './user.model';
import { z } from 'zod';

const updateProfileSchema = z.object({
  registration_number: z.string().optional(),
  revalidation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  professional_role: z.enum(['doctor', 'nurse', 'pharmacist', 'other']).optional(),
  work_setting: z.string().optional(),
  scope_of_practice: z.string().optional(),
});

/**
 * Get user profile
 * GET /api/v1/users/profile
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const user = await getUserById(req.user.userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const requirements = getRoleRequirements(user.professional_role);

  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      registrationNumber: user.registration_number,
      revalidationDate: user.revalidation_date,
      professionalRole: user.professional_role,
      workSetting: user.work_setting,
      scopeOfPractice: user.scope_of_practice,
      subscriptionTier: user.subscription_tier,
      subscriptionStatus: user.subscription_status,
      trialEndsAt: user.trial_ends_at,
      requirements,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
  });
});

/**
 * Update user profile
 * PUT /api/v1/users/profile
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const validated = updateProfileSchema.parse(req.body) as UpdateUserProfile;
  const updated = await updateUserProfile(req.user.userId, validated);

  const requirements = getRoleRequirements(updated.professional_role);

  res.json({
    success: true,
    data: {
      id: updated.id,
      email: updated.email,
      registrationNumber: updated.registration_number,
      revalidationDate: updated.revalidation_date,
      professionalRole: updated.professional_role,
      workSetting: updated.work_setting,
      scopeOfPractice: updated.scope_of_practice,
      subscriptionTier: updated.subscription_tier,
      subscriptionStatus: updated.subscription_status,
      requirements,
      updatedAt: updated.updated_at,
    },
  });
});

/**
 * Delete user account
 * DELETE /api/v1/users/profile
 */
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
