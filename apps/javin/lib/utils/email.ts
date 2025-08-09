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

// --- Refactored Universal Email Template Generator ---

/**
 * Generates a branded HTML email template.
 * @param {string} title - The main title in the header.
 * @param {string} subtitle - The subtitle text in the header.
 * @param {string} contentHtml - The main HTML content for the email body.
 * @returns {string} - The complete HTML email template.
 */
const generateEmailTemplate = (title: string, subtitle: string, contentHtml: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <style>
        /* --- Base Styles --- */
        :root {
            color-scheme: light dark;
            supported-color-schemes: light dark;
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f3f4f6;
        }

        .email-container {
            background-color: #f3f4f6;
        }

        /* --- Brand Colors (Red Palette) --- */
        .brand-gradient {
            background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);
        }
        .brand-text { color: #DC2626; }
        .brand-button a {
            background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);
            box-shadow: 0 8px 15px rgba(220, 38, 38, 0.2);
        }
        .brand-otp-box { border: 2px dashed #DC2626; }
        
        .info-box {
            background-color: #FEE2E2;
            border-left: 4px solid #F87171;
        }
        .info-text-title { color: #B91C1C; }
        .info-text-body { color: #991B1B; }

        /* --- Dark Mode Styles --- */
        @media (prefers-color-scheme: dark) {
            body, .email-container { background-color: #111827 !important; }
            .main-table { background-color: #1F2937 !important; }
            h1, h2, h3, p, span, div, a { color: #F9FAFB !important; }
            .subtitle, .footer-text, .alt-link-text { color: #9CA3AF !important; }
            
            .brand-text, .otp-code { color: #F87171 !important; }
            a.brand-text { color: #F87171 !important; } /* Specificity for links */
            
            .info-box {
                background-color: #374151 !important;
                border-left-color: #EF4444 !important;
            }
            .info-text-title { color: #F87171 !important; }
            .info-text-body { color: #D1D5DB !important; }
            
            .alt-link-box { background-color: #374151 !important; }
            .alt-link-url {
                background-color: #4B5563 !important;
                border-color: #6B7280 !important;
            }
            .footer {
                background-color: #111827 !important;
                border-top-color: #374151 !important;
            }
        }
        
        /* --- Responsive Styles --- */
        @media screen and (max-width: 600px) {
            .content-cell { padding: 20px !important; }
            h1 { font-size: 24px !important; }
            h2 { font-size: 20px !important; }
            .otp-box { padding: 20px !important; }
            .otp-code { font-size: 28px !important; letter-spacing: 6px !important; }
            .brand-button a { display: block !important; padding: 16px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
    <table class="email-container" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table class="main-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden;">
                    <tr>
                        <td class="brand-gradient" style="padding: 40px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">${title}</h1>
                            <p class="subtitle" style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">${subtitle}</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td class="content-cell" style="padding: 50px 40px;">
                            <div style="text-align: center;">
                                ${contentHtml}
                            </div>
                        </td>
                    </tr>
                    
                    <tr>
                        <td class="footer" style="background-color: #F9FAFB; padding: 30px 40px; border-top: 1px solid #E5E7EB; text-align: center;">
                            <p class="footer-text" style="margin: 0; color: #6B7280; font-size: 14px;">Best Regards,</p>
                            <p class="brand-text" style="margin: 5px 0 0; font-weight: 600; font-size: 16px;">Barzakh Support Team</p>
                            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                                <p class="footer-text" style="margin: 0; color: #9CA3AF; font-size: 12px;">This is an automated email, please do not reply.</p>
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

// --- Template Specific Content Generators ---

const getOTPContent = (otp: string) => `
    <h2 style="color: #1F2937; margin: 0 0 20px; font-size: 24px; font-weight: 600;">One-Time Password (OTP)</h2>
    <p style="color: #6B7280; margin: 0 0 30px; font-size: 16px; line-height: 1.6;">Here is the verification code for your account:</p>
    
    <div class="otp-box brand-otp-box" style="background-color: #F9FAFB; border-radius: 12px; padding: 25px; margin: 30px auto; display: inline-block;">
        <div class="otp-code brand-text" style="font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace;">
            ${otp}
        </div>
    </div>
    
    <div class="info-box" style="border-radius: 8px; padding: 20px; margin: 30px 0; text-align: left;">
        <p class="info-text-title" style="margin: 0 0 5px; font-weight: 600; font-size: 14px;">Security Notification</p>
        <p class="info-text-body" style="margin: 0; font-size: 14px; line-height: 1.5;">This code will expire in <strong>10 minutes</strong>. Never share this code with anyone.</p>
    </div>
    
    <p style="color: #6B7280; margin: 30px 0 0; font-size: 14px; line-height: 1.6;">If you did not request this code, please ignore this email.</p>
`;

const getResetContent = (resetUrl: string) => `
    <h2 style="color: #1F2937; margin: 0 0 20px; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
    <p style="color: #6B7280; margin: 0 0 30px; font-size: 16px; line-height: 1.6;">We have received a request to reset your account password. Click the button below to continue.</p>
    
    <div class="brand-button" style="margin: 40px 0;">
        <a href="${resetUrl}" style="color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block;">
            Reset Password
        </a>
    </div>
    
    <div class="alt-link-box" style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; margin: 30px 0;">
        <p class="alt-link-text" style="color: #6B7280; margin: 0 0 10px; font-size: 14px;">If the button does not work, copy and paste this link into your browser:</p>
        <div class="alt-link-url" style="background-color: #ffffff; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; word-break: break-all;">
            <a href="${resetUrl}" class="brand-text" style="text-decoration: none; font-size: 13px; font-family: 'Courier New', monospace;">${resetUrl}</a>
        </div>
    </div>
    
    <div class="info-box" style="border-radius: 8px; padding: 20px; margin: 30px 0; text-align: left;">
        <p class="info-text-title" style="margin: 0 0 5px; font-weight: 600; font-size: 14px;">Security Notification</p>
        <p class="info-text-body" style="margin: 0; font-size: 14px; line-height: 1.5;">This link will expire in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email.</p>
    </div>
`;

// --- Main Email Sending Functions (Unchanged Logic, Now Cleaner) ---

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
      from: `"Barzakh Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔐 Your OTP Registration Code - Barzakh",
      // Use the new template generator
      html: generateEmailTemplate(
          "Your Verification Code",
          "Use this code to secure your account.",
          getOTPContent(otp)
      ),
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
      from: `"Barzakh Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔑 Reset Your Password - Barzakh",
      // Use the new template generator
      html: generateEmailTemplate(
          "Reset Password Request",
          "One more step to secure your account.",
          getResetContent(resetUrl)
      ),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Reset email sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending reset email:", error);
    throw new Error("Email sending failed");
  }
}