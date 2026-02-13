/**
 * Email Service - Resend integration for sending verification emails
 */

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const REQUIRE_EMAIL_VERIFICATION =
  process.env.REQUIRE_EMAIL_VERIFICATION !== "false"; // Default: true
const SENDER_EMAIL = process.env.SENDER_EMAIL || "noreply@momo-analytics.app";
const SENDER_NAME = process.env.SENDER_NAME || "MoMo Analytics";

// Lazy initialization of Resend client - only create if API key is available
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Get environment status for logging
 */
export function getEmailVerificationStatus(): {
  requireVerification: boolean;
  senderEmail: string;
  resendConfigured: boolean;
} {
  return {
    requireVerification: REQUIRE_EMAIL_VERIFICATION,
    senderEmail: SENDER_EMAIL,
    resendConfigured: !!RESEND_API_KEY,
  };
}

/**
 * Generate HTML email template for OTP verification
 */
function generateEmailTemplate(
  fullName: string,
  otpCode: string,
  expirationMinutes: number = 5
): string {
  const expirationTime = new Date(Date.now() + expirationMinutes * 60 * 1000);
  const formattedTime = expirationTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - MoMo Analytics</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f9fafb;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .content {
            padding: 40px 20px;
            color: #374151;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #1f2937;
        }
        .otp-section {
            background-color: #f3f4f6;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
        }
        .otp-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        .otp-code {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
            letter-spacing: 4px;
            font-family: 'Courier New', monospace;
            text-align: center;
            padding: 15px 0;
        }
        .otp-info {
            font-size: 13px;
            color: #6b7280;
            margin-top: 15px;
            line-height: 1.6;
        }
        .expiration {
            background-color: #fef3c7;
            border: 1px solid #fde68a;
            color: #92400e;
            padding: 12px 15px;
            border-radius: 4px;
            margin-top: 15px;
            font-size: 13px;
            text-align: center;
        }
        .instructions {
            margin: 30px 0;
            font-size: 14px;
            line-height: 1.8;
            color: #4b5563;
        }
        .instructions li {
            margin-bottom: 10px;
        }
        .security-note {
            background-color: #dbeafe;
            border-left: 4px solid #0284c7;
            padding: 15px;
            border-radius: 4px;
            font-size: 13px;
            color: #0c4a6e;
            margin: 20px 0;
        }
        .footer {
            background-color: #f9fafb;
            border-top: 1px solid #e5e7eb;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
        }
        .divider {
            height: 1px;
            background-color: #e5e7eb;
            margin: 30px 0;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            .header {
                padding: 30px 15px;
            }
            .content {
                padding: 30px 15px;
            }
            .otp-code {
                font-size: 24px;
                letter-spacing: 2px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Verify Your Email</h1>
        </div>

        <div class="content">
            <div class="greeting">
                Hi ${fullName},
            </div>

            <p>Thank you for signing up with MoMo Analytics. To complete your registration and secure your account, please verify your email address using the code below:</p>

            <div class="otp-section">
                <div class="otp-label">Your Verification Code</div>
                <div class="otp-code">${otpCode}</div>
                <div class="otp-info">
                    Enter this code in the verification form to confirm your email address.
                </div>
                <div class="expiration">
                    ⏰ This code expires at <strong>${formattedTime}</strong> (in ${expirationMinutes} minutes)
                </div>
            </div>

            <ol class="instructions">
                <li>Copy the verification code above</li>
                <li>Return to the MoMo Analytics verification page</li>
                <li>Paste the code in the verification field</li>
                <li>Click "Verify Email" to complete registration</li>
            </ol>

            <div class="security-note">
                🛡️ <strong>Security Tip:</strong> Never share this code with anyone. MoMo Analytics team will never ask for this code via email or message.
            </div>

            <p style="margin: 20px 0; font-size: 14px; color: #6b7280;">
                If you didn't create this account, you can safely ignore this email. The code will expire in ${expirationMinutes} minutes.
            </p>

            <div class="divider"></div>

            <p style="margin: 0; font-size: 13px; color: #9ca3af;">
                <strong>Questions?</strong> If you need help, visit our <a href="https://momo-analytics.app/help" style="color: #667eea; text-decoration: none;">support page</a> or reply to this email.
            </p>
        </div>

        <div class="footer">
            <p style="margin: 0 0 10px 0;">© 2024 MoMo Analytics. All rights reserved.</p>
            <p style="margin: 0;">
                <a href="https://momo-analytics.app/privacy" style="color: #667eea; text-decoration: none; margin: 0 10px;">Privacy Policy</a> •
                <a href="https://momo-analytics.app/terms" style="color: #667eea; text-decoration: none; margin: 0 10px;">Terms of Service</a>
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

/**
 * Send verification email with OTP code
 */
export async function sendVerificationEmail(
  email: string,
  fullName: string,
  otpCode: string,
  logger?: any
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const resend = getResendClient();

    if (!resend) {
      const errorMsg =
        "RESEND_API_KEY not configured. Email sending disabled.";
      logger?.warn(errorMsg);
      return { success: false, error: errorMsg };
    }

    const htmlContent = generateEmailTemplate(fullName, otpCode, 5);

    logger?.info(
      { email, fullName },
      "Sending verification email via Resend"
    );

    const response = await resend.emails.send({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: email,
      subject: "Verify your email for MoMo Analytics",
      html: htmlContent,
    });

    if (response.error) {
      logger?.error(
        { err: response.error, email },
        "Failed to send verification email"
      );
      return {
        success: false,
        error: `Email service error: ${response.error.message}`,
      };
    }

    logger?.info(
      { email, messageId: response.data?.id },
      "Verification email sent successfully"
    );

    return {
      success: true,
      messageId: response.data?.id,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error";
    logger?.error(
      { err: error, email },
      "Error sending verification email"
    );
    return {
      success: false,
      error: `Failed to send email: ${errorMsg}`,
    };
  }
}

/**
 * Check if email verification is required
 */
export function isEmailVerificationRequired(): boolean {
  return REQUIRE_EMAIL_VERIFICATION;
}

/**
 * Get email verification status message for logging
 */
export function getVerificationStatusMessage(): string {
  if (!REQUIRE_EMAIL_VERIFICATION) {
    return "⚠️ Email verification DISABLED - auto-approving email without OTP verification";
  }
  return "✅ Email verification ENABLED - OTP verification required";
}

/**
 * Log configuration on startup
 */
export function logEmailConfiguration(logger?: any): void {
  const status = getEmailVerificationStatus();
  const message = getVerificationStatusMessage();

  logger?.info(
    {
      requireVerification: status.requireVerification,
      senderEmail: status.senderEmail,
      resendConfigured: status.resendConfigured,
    },
    message
  );
}
