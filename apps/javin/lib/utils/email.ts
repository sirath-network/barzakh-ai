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
      subject: "Your Verification Code",
      html: `
        <div style="font-family: Geist, sans-serif; color: #000;">
          <h2 style="color:#EA580C;">Your Verification Code</h2>
          <p>Here is your OTP for account verification:</p>
          <div style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; color: #EA580C;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p style="margin-top: 30px;">– Sirath Team Support</p>
        </div>
      `,
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
      subject: "Reset Your Password",
      html: `
        <div style="font-family: Geist, sans-serif; color: #000;">
          <h2 style="color:#EA580C;">Password Reset Request</h2>
          <p>We received a request to reset your password. Click the button below:</p>
          <a href="${resetUrl}" style="display:inline-block; padding:12px 20px; background-color:#EA580C; color:white; text-decoration:none; border-radius:6px;">Reset Password</a>
          <p>If you didn’t request this, you can safely ignore it.</p>
          <p style="margin-top: 30px;">– Sirath Team Support</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Reset email sent to ${email}`);
  } catch (error) {
    console.error("❌ Error sending reset email:", error);
    throw new Error("Email sending failed");
  }
}