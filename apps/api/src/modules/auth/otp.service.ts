/**
 * OTP service for generating and managing one-time passwords
 */

import { prisma } from '../../lib/prisma';

/**
 * Generate a random 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store OTP in database
 * OTP expires in 10 minutes
 */
export async function storeOTP(email: string, otp: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  // Invalidate any existing OTPs for this email
  await prisma.email_otps.updateMany({
    where: {
      email,
      used: false,
    },
    data: {
      used: true,
    },
  });

  // Store new OTP
  await prisma.email_otps.create({
    data: {
      email,
      otp,
      expires_at: expiresAt,
      used: false,
    },
  });
}

/**
 * Verify OTP
 */
export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  const otpRecord = await prisma.email_otps.findFirst({
    where: {
      email,
      otp,
      used: false,
      expires_at: {
        gt: new Date(),
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  if (!otpRecord) {
    return false;
  }

  // Mark OTP as used
  await prisma.email_otps.update({
    where: { id: otpRecord.id },
    data: { used: true },
  });

  return true;
}

/**
 * Clean up expired OTPs (can be called periodically)
 */
export async function cleanupExpiredOTPs(): Promise<void> {
  await prisma.email_otps.deleteMany({
    where: {
      OR: [
        { expires_at: { lt: new Date() } },
        { used: true },
      ],
    },
  });
}
