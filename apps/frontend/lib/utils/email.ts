// Email service using Resend API
// Configure with RESEND_API_KEY, RESEND_FROM_EMAIL, and RESEND_FROM_NAME environment variables

// --- Refactored Universal Email Template Generator ---

const getBannerUrl = (): string => {
  const publicUrl = process.env.PUBLIC_BASE_URL || process.env.FRONTEND_URL;
  if (publicUrl && !publicUrl.includes("localhost")) {
    return `${publicUrl.replace(/\/$/, "")}/images/barzakh/banner/sirath-banner.png`;
  }
  return "https://app.sirath.network/images/barzakh/banner/sirath-banner.png";
};

/**
 * Generates a branded HTML email template.
 * @param {string} title - The main title in the header.
 * @param {string} subtitle - The subtitle text in the header.
 * @param {string} contentHtml - The main HTML content for the email body.
 * @returns {string} - The complete HTML email template.
 */
const generateEmailTemplate = (title: string, subtitle: string, contentHtml: string): string => {
  const bannerUrl = getBannerUrl();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <style>
        /* Reset & Base */
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; -webkit-font-smoothing: antialiased; }
        .email-wrapper { width: 100%; background-color: #09090b; padding: 40px 0; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 12px; overflow: hidden; border: 1px solid #27272a; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.16); }
        
        /* Typography */
        h1 { font-size: 24px; font-weight: 700; color: #ffffff; margin: 0 0 8px; letter-spacing: -0.025em; }
        p { font-size: 16px; line-height: 1.6; color: #a1a1aa; margin: 0 0 24px; }
        .text-sm { font-size: 14px; }
        .text-xs { font-size: 12px; }
        .text-muted { color: #71717a; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        
        /* Components */
        .header { padding: 36px 40px 28px; text-align: center; border-bottom: 1px solid #27272a; }
        .content { padding: 40px; }
        .footer { padding: 32px 40px; background-color: #141416; border-top: 1px solid #27272a; text-align: center; }
        
        .button { display: inline-block; background-color: #ffffff; color: #09090b !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; transition: background-color 0.2s; }
        .button:hover { background-color: #e4e4e7; }
        
        .otp-container { background-color: #27272a; border-radius: 8px; padding: 24px; text-align: center; margin: 32px 0; border: 1px solid #3f3f46; }
        .otp-code { font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #ffffff; }
        
        .link-box { background-color: #27272a; border: 1px solid #3f3f46; border-radius: 8px; padding: 16px; margin: 24px 0; }
        .link-text { color: #38bdf8 !important; text-decoration: underline; word-break: break-all; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; display: block; line-height: 1.5; }
        
        .alert { padding: 16px; border-radius: 6px; margin-top: 32px; font-size: 14px; text-align: left; }
        .alert-warning { background-color: #2a1b0a; border: 1px solid #5c3510; color: #fed7aa; }
        
        /* Dark Mode overrides */
        @media (prefers-color-scheme: dark) {
            body, .email-wrapper { background-color: #09090b !important; }
            .email-container { background-color: #18181b !important; border: 1px solid #27272a !important; }
            h1, .otp-code { color: #ffffff !important; }
            p { color: #a1a1aa !important; }
            .header, .footer { border-color: #27272a !important; }
            .footer { background-color: #141416 !important; }
            .otp-container { background-color: #27272a !important; border-color: #3f3f46 !important; }
            .alert-warning { background-color: #2a1b0a !important; border-color: #5c3510 !important; color: #fed7aa !important; }
        }
    </style>
</head>
<body>
    <div class="email-wrapper" style="width: 100%; background-color: #09090b; padding: 40px 0;">
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 12px; overflow: hidden; border: 1px solid #27272a;">
            <!-- Header -->
            <div class="header" style="padding: 36px 40px 28px; text-align: center; border-bottom: 1px solid #27272a;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 32px auto; text-align: center;">
                    <tr>
                        <td align="center" style="text-align: center; padding: 0 0 22px 0;">
                            <a href="https://app.sirath.network" target="_blank" style="text-decoration: none; display: block;">
                                <img 
                                    src="${bannerUrl}" 
                                    alt="Sirath Network" 
                                    width="160" 
                                    style="display: block; margin: 0 auto; width: 160px; max-width: 160px; height: auto; border: 0;"
                                />
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="text-align: center; padding: 0;">
                            <div style="font-size: 19px; font-weight: 700; color: #ffffff; letter-spacing: -0.01em; margin: 0; text-align: center; line-height: 1.2;">
                                Barzakh AI
                            </div>
                        </td>
                    </tr>
                </table>
                <h1 style="font-size: 24px; font-weight: 700; color: #ffffff; margin: 0 0 8px; letter-spacing: -0.025em; text-align: center;">${title}</h1>
                <p style="margin: 0; font-size: 16px; color: #a1a1aa; text-align: center;">${subtitle}</p>
            </div>
            
            <!-- Content -->
            <div class="content" style="padding: 40px;">
                ${contentHtml}
            </div>
            
            <!-- Footer -->
            <div class="footer" style="padding: 32px 40px; background-color: #141416; border-top: 1px solid #27272a; text-align: center;">
                <p class="text-xs text-muted" style="margin-bottom: 12px; font-size: 12px; color: #71717a;">
                    Secure, Intelligent, Limitless.
                </p>
                <p class="text-xs text-muted" style="margin: 0; font-size: 12px; color: #71717a;">
                    &copy; ${new Date().getFullYear()} Barzakh AI. All rights reserved.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
`;
};

// --- Template Specific Content Generators ---

const getOTPContent = (otp: string) => `
    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">Hello,</p>
    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">We received a request to authenticate your account. Please use the following One-Time Password (OTP) to complete the verification process.</p>
    
    <div class="otp-container" style="background-color: #27272a; border-radius: 8px; padding: 24px; text-align: center; margin: 32px 0; border: 1px solid #3f3f46;">
        <div class="otp-code font-mono" style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #ffffff; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${otp}</div>
    </div>
    
    <div class="alert alert-warning" style="background-color: #2a1b0a; border: 1px solid #5c3510; color: #fed7aa; padding: 16px; border-radius: 6px; margin-top: 32px; font-size: 14px; text-align: left;">
        <strong style="color: #fdba74;">Security Notice:</strong> This code will expire in 10 minutes. Do not share this code with anyone, including Barzakh support staff.
    </div>
    
    <p style="margin-top: 24px; font-size: 14px; color: #71717a;">If you did not request this code, you can safely ignore this email.</p>
`;

const getResetContent = (resetUrl: string) => `
    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">Hello,</p>
    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">We received a request to reset the password for your Barzakh AI account. If you made this request, please click the button below to proceed.</p>
    
    <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" class="button" target="_blank" style="display: inline-block; background-color: #ffffff; color: #09090b !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Reset Password</a>
    </div>
    
    <p style="font-size: 14px; margin-bottom: 16px; color: #a1a1aa;">Or copy and paste this URL into your browser:</p>
    
    <div class="link-box" style="background-color: #27272a; border: 1px solid #3f3f46; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <a href="${resetUrl}" class="link-text" target="_blank" style="color: #38bdf8 !important; text-decoration: underline; word-break: break-all; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; display: block; line-height: 1.5;">${resetUrl}</a>
    </div>
    
    <div class="alert alert-warning" style="background-color: #2a1b0a; border: 1px solid #5c3510; color: #fed7aa; padding: 16px; border-radius: 6px; margin-top: 32px; font-size: 14px; text-align: left;">
        <strong style="color: #fdba74;">Security Notice:</strong> This link expires in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
    </div>
`;

// --- Resend Email Implementation ---

/**
 * Send email using Resend API
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const fromName = process.env.RESEND_FROM_NAME || "Barzakh";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    console.error("Resend API error:", error);
    throw new Error(`Resend API error: ${error.message || "Failed to send email"}`);
  }
}

// --- Main Email Sending Functions ---

export async function sendOTPEmail(email: string, otp: string) {
  try {
    const html = generateEmailTemplate(
      "Your Verification Code",
      "Use this code to secure your account.",
      getOTPContent(otp)
    );

    await sendEmail(email, "🔐 Your OTP - Barzakh AI", html);
  } catch (error) {
    console.error("❌ Error sending OTP email:", error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("authentication") || error.message.includes("unauthorized")) {
        throw new Error("Email authentication failed. Please check your API key.");
      } else if (error.message.includes("rate limit") || error.message.includes("quota")) {
        throw new Error("Email sending rate limit exceeded. Please try again later.");
      } else if (error.message.includes("domain") || error.message.includes("verification")) {
        throw new Error("Email domain not verified. Please verify your domain in Resend.");
      }
    }

    throw new Error("OTP email sending failed");
  }
}

export async function sendResetEmail(email: string, resetUrl: string) {
  try {
    const html = generateEmailTemplate(
      "Reset Password Request",
      "One more step to secure your account.",
      getResetContent(resetUrl)
    );

    await sendEmail(email, "🔑 Reset Your Password - Barzakh", html);
  } catch (error) {
    console.error("❌ Error sending reset email:", error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("authentication") || error.message.includes("unauthorized")) {
        throw new Error("Email authentication failed. Please check your API key.");
      } else if (error.message.includes("rate limit") || error.message.includes("quota")) {
        throw new Error("Email sending rate limit exceeded. Please try again later.");
      } else if (error.message.includes("domain") || error.message.includes("verification")) {
        throw new Error("Email domain not verified. Please verify your domain in Resend.");
      }
    }

    throw new Error("Email sending failed");
  }
}
