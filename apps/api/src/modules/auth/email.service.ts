/**
 * Email service for sending emails
 * Uses nodemailer for email delivery
 */

import nodemailer from 'nodemailer';

// Gmail SMTP configuration
// For Gmail, you need to use an App Password (not your regular password)
// Get it from: https://myaccount.google.com/apppasswords
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false, // Gmail uses TLS on port 587
  auth: {
    user: process.env.SMTP_USER || process.env.GMAIL_USER || '',
    pass: process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || '',
  },
};

/**
 * Create email transporter
 */
function createTransporter() {
  // If no Gmail credentials, use a test account (for development)
  if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
    console.warn('⚠️  Gmail SMTP credentials not configured. Email sending will be disabled.');
    console.warn('   Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
    return null;
  }

  // Log email configuration (without password)
  console.log(`📧 Email service configured for: ${EMAIL_CONFIG.auth.user}`);
  console.log(`📧 SMTP Host: ${EMAIL_CONFIG.host}:${EMAIL_CONFIG.port}`);
  
  // Validate app password format (should be 16 characters, no spaces)
  const passwordLength = EMAIL_CONFIG.auth.pass.length;
  const hasSpaces = EMAIL_CONFIG.auth.pass.includes(' ');
  const hasDashes = EMAIL_CONFIG.auth.pass.includes('-');
  
  if (passwordLength !== 16 || hasSpaces || hasDashes) {
    console.warn('⚠️  Warning: Gmail App Password format issue detected:');
    console.warn(`   - Password length: ${passwordLength} characters (should be 16)`);
    console.warn(`   - Contains spaces: ${hasSpaces ? 'YES' : 'NO'}`);
    console.warn(`   - Contains dashes: ${hasDashes ? 'YES (remove them!)' : 'NO'}`);
    console.warn('   - Make sure you copied the entire app password correctly.');
    console.warn('   - Remove any spaces AND dashes from the password.');
    console.warn('   - Get a new app password from: https://myaccount.google.com/apppasswords');
  } else {
    console.log('✅ App password format looks correct (16 characters, no spaces, no dashes)');
  }

  // Gmail SMTP configuration
  return nodemailer.createTransport({
    host: EMAIL_CONFIG.host,
    port: EMAIL_CONFIG.port,
    secure: EMAIL_CONFIG.secure,
    auth: EMAIL_CONFIG.auth,
    tls: {
      // Gmail requires TLS
      rejectUnauthorized: false,
    },
  });
}

/**
 * Result of sending OTP email
 */
export interface SendOTPResult {
  success: boolean;
  error?: string;
  otp?: string; // Only in development mode when email is not sent
}

/**
 * Send OTP email to user
 * Returns result object instead of throwing errors
 */
export async function sendOTPEmail(email: string, otp: string): Promise<SendOTPResult> {
  const transporter = createTransporter();
  
  if (!transporter) {
    // In development, log the OTP instead of sending email
    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 [DEV] OTP for ${email}: ${otp}`);
      return { success: true, otp };
    }
    return { 
      success: false, 
      error: 'Email service not configured' 
    };
  }

  const mailOptions = {
    from: `"Revalidation Tracker" <${EMAIL_CONFIG.auth.user}>`,
    to: email,
    subject: 'Your Verification Code - Revalidation Tracker',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Email Verification</h2>
        <p>Thank you for registering with Revalidation Tracker!</p>
        <p>Your verification code is:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Revalidation Tracker - Professional Compliance Tracking</p>
      </div>
    `,
    text: `
      Email Verification

      Thank you for registering with Revalidation Tracker!

      Your verification code is: ${otp}

      This code will expire in 10 minutes.

      If you didn't request this code, please ignore this email.

      Revalidation Tracker - Professional Compliance Tracking
    `,
  };

  try {
    // Verify connection before sending
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    
    console.log(`📤 Sending OTP email to ${email}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${email}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error sending OTP email:', error);
    console.error('❌ Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to send verification email';
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check your Gmail app password.\n' +
        'Common issues:\n' +
        '1. Make sure 2-Step Verification is enabled on your Google account\n' +
        '2. Generate a new App Password from: https://myaccount.google.com/apppasswords\n' +
        '3. Copy the entire 16-character password (no spaces)\n' +
        '4. Ensure the email address matches the one used to create the app password\n' +
        '5. Check that the app password hasn\'t been revoked';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Could not connect to email server. Please check your SMTP settings.';
    } else if (error.response) {
      errorMessage = `Email server error: ${error.response}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}
