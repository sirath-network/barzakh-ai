import nodemailer from "nodemailer";
import { google } from "googleapis";

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.EMAIL_REDIRECT_URI
);

oAuth2Client.setCredentials({
  refresh_token: process.env.EMAIL_REFRESH_TOKEN,
});

// Enhanced OTP Email Template
const getOTPEmailTemplate = (otp: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
    <table width="100%" cellpadding="0" cellspacing="0" style="min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header with gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #EA580C 0%, #F97316 100%); padding: 40px 40px 60px; text-align: center; position: relative;">
                            <div style="background: rgba(255,255,255,0.1); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z" stroke="white" stroke-width="2" fill="white" fill-opacity="0.2"/>
                                    <path d="M9 12L11 14L16 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Verification Code</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Secure your account with this verification code</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 50px 40px;">
                            <div style="text-align: center;">
                                <h2 style="color: #1F2937; margin: 0 0 20px; font-size: 24px; font-weight: 600;">Your Verification Code</h2>
                                <p style="color: #6B7280; margin: 0 0 30px; font-size: 16px; line-height: 1.6;">Here is your One-Time Password (OTP) for account verification:</p>
                                
                                <!-- OTP Display -->
                                <div style="background: linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%); border: 2px dashed #EA580C; border-radius: 16px; padding: 30px; margin: 30px 0; display: inline-block;">
                                    <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #EA580C; font-family: 'Courier New', monospace; text-shadow: 0 2px 4px rgba(234, 88, 12, 0.1);">
                                        ${otp}
                                    </div>
                                </div>
                                
                                <!-- Info Box -->
                                <div style="background: linear-gradient(135deg, #FEF3E2 0%, #FED7A3 100%); border-left: 4px solid #F59E0B; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: left;">
                                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                                        <div style="background: #F59E0B; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <p style="margin: 0 0 8px; font-weight: 600; color: #92400E; font-size: 14px;">Security Notice</p>
                                            <p style="margin: 0; color: #A16207; font-size: 14px; line-height: 1.4;">This code will expire in <strong>10 minutes</strong>. Keep it secure and don't share it with anyone.</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <p style="color: #6B7280; margin: 30px 0 0; font-size: 14px; line-height: 1.6;">If you didn't request this verification code, please ignore this email or contact our support team if you have concerns.</p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #F9FAFB; padding: 30px 40px; border-top: 1px solid #E5E7EB;">
                            <div style="text-align: center;">
                                <p style="margin: 0 0 10px; color: #6B7280; font-size: 14px;">Best regards,</p>
                                <p style="margin: 0; color: #EA580C; font-weight: 600; font-size: 16px;">Sirath Team Support</p>
                                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                                    <p style="margin: 0; color: #9CA3AF; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
                                </div>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

// Enhanced Password Reset Email Template
const getResetEmailTemplate = (resetUrl: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
    <table width="100%" cellpadding="0" cellspacing="0" style="min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header with gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #EA580C 0%, #F97316 100%); padding: 40px 40px 60px; text-align: center; position: relative;">
                            <div style="background: rgba(255,255,255,0.1); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 8H20C21.1046 8 22 8.89543 22 10V20C22 21.1046 21.1046 22 20 22H4C2.89543 22 2 21.1046 2 20V10C2 8.89543 2.89543 8 4 8H6" stroke="white" stroke-width="2"/>
                                    <path d="M7 8V6C7 3.79086 8.79086 2 11 2H13C15.2091 2 17 3.79086 17 6V8" stroke="white" stroke-width="2"/>
                                </svg>
                            </div>
                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Password Reset</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Secure your account with a new password</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 50px 40px;">
                            <div style="text-align: center;">
                                <h2 style="color: #1F2937; margin: 0 0 20px; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
                                <p style="color: #6B7280; margin: 0 0 30px; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password for your account:</p>
                                
                                <!-- Reset Button -->
                                <div style="margin: 40px 0;">
                                    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #EA580C 0%, #F97316 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 8px 25px rgba(234, 88, 12, 0.3); transition: all 0.3s ease; border: none;">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="display: inline-block; margin-right: 8px; vertical-align: middle;">
                                            <path d="M18 8H20C21.1046 8 22 8.89543 22 10V20C22 21.1046 21.1046 22 20 22H4C2.89543 22 2 21.1046 2 20V10C2 8.89543 2.89543 8 4 8H6" stroke="currentColor" stroke-width="2"/>
                                            <path d="M7 8V6C7 3.79086 8.79086 2 11 2H13C15.2091 2 17 3.79086 17 6V8" stroke="currentColor" stroke-width="2"/>
                                        </svg>
                                        Reset Password
                                    </a>
                                </div>
                                
                                <!-- Alternative Link -->
                                <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; margin: 30px 0;">
                                    <p style="color: #6B7280; margin: 0 0 10px; font-size: 14px; font-weight: 600;">Can't click the button?</p>
                                    <p style="color: #9CA3AF; margin: 0 0 10px; font-size: 13px;">Copy and paste this link into your browser:</p>
                                    <div style="background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; word-break: break-all;">
                                        <a href="${resetUrl}" style="color: #EA580C; text-decoration: none; font-size: 13px; font-family: 'Courier New', monospace;">${resetUrl}</a>
                                    </div>
                                </div>
                                
                                <!-- Security Info -->
                                <div style="background: linear-gradient(135deg, #FEF3E2 0%, #FED7A3 100%); border-left: 4px solid #F59E0B; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: left;">
                                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                                        <div style="background: #F59E0B; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                                                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <p style="margin: 0 0 8px; font-weight: 600; color: #92400E; font-size: 14px;">Security Notice</p>
                                            <p style="margin: 0; color: #A16207; font-size: 14px; line-height: 1.4;">This password reset link will expire in 1 hour for your security. If you didn't request this reset, please ignore this email.</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <p style="color: #6B7280; margin: 30px 0 0; font-size: 14px; line-height: 1.6;">If you continue to have problems or didn't request this password reset, please contact our support team.</p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #F9FAFB; padding: 30px 40px; border-top: 1px solid #E5E7EB;">
                            <div style="text-align: center;">
                                <p style="margin: 0 0 10px; color: #6B7280; font-size: 14px;">Best regards,</p>
                                <p style="margin: 0; color: #EA580C; font-weight: 600; font-size: 16px;">Sirath Team Support</p>
                                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                                    <p style="margin: 0; color: #9CA3AF; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
                                </div>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

export async function sendOTPEmail(email: string, otp: string) {
  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.EMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token || "",
      },
    });

    const mailOptions = {
      from: `"Sirath Team Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔐 Your Verification Code - Sirath",
      html: getOTPEmailTemplate(otp),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending OTP email:", error);
    throw new Error("OTP email sending failed");
  }
}

export async function sendResetEmail(email: string, resetUrl: string) {
  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.EMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token || "",
      },
    });

    const mailOptions = {
      from: `"Sirath Team Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔑 Reset Your Password - Sirath",
      html: getResetEmailTemplate(resetUrl),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Reset email sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending reset email:", error);
    throw new Error("Email sending failed");
  }
}