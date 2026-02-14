/**
 * Arkesel SMS Service - Sends OTP via Arkesel SMS gateway
 */

const ARKESEL_API_URL = "https://sms.arkesel.com/api/v2/sms/send";
const ARKESEL_API_KEY = "TkpKcE5QQ09JREN1dFBOWUV1eGQ";

export interface SendSMSOptions {
  phoneNumber: string;
  message: string;
}

/**
 * Send SMS via Arkesel API
 */
export async function sendSMS(
  options: SendSMSOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const payload = {
      api_key: ARKESEL_API_KEY,
      to: options.phoneNumber,
      sms: options.message,
    };

    const response = await fetch(ARKESEL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as Record<string, any>;

    if (response.ok && data.code === "ok") {
      return {
        success: true,
        messageId: data.message_id,
      };
    }

    return {
      success: false,
      error: data.message || "Failed to send SMS",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send OTP via SMS
 */
export async function sendOTPViaSMS(
  phoneNumber: string,
  otpCode: string
): Promise<{ success: boolean; error?: string }> {
  const message = `Your MoMo Analytics verification code is: ${otpCode}. Valid for 10 minutes. Do not share this code.`;

  return sendSMS({
    phoneNumber,
    message,
  });
}
