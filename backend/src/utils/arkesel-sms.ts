/**
 * Arkesel SMS Service - Sends OTP via Arkesel SMS gateway
 */

const ARKESEL_API_URL = "https://sms.arkesel.com/api/v2/sms/send";
const ARKESEL_API_KEY = "TkpKcE5QQ09PREN1dFBOWUV1eGQ";
const ARKESEL_SENDER_ID = "SMSAlert";

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
      sender: ARKESEL_SENDER_ID,
      recipients: [options.phoneNumber],
      message: options.message,
    };

    const response = await fetch(ARKESEL_API_URL, {
      method: "POST",
      headers: {
        "api-key": ARKESEL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as Record<string, any>;

    // Check for successful response
    // Arkesel returns code: "ok" or status: "success"
    if ((data.code === "ok" || data.status === "success") && response.ok) {
      return {
        success: true,
        messageId: data.message_id || data.data?.message_id || data.id,
      };
    }

    // Handle various error codes from Arkesel
    let errorMessage = data.message || data.error || "Failed to send SMS";

    if (!response.ok) {
      errorMessage = `SMS API Error (${response.status}): ${errorMessage}`;
    }

    // Map specific Arkesel error codes
    if (data.code === "invalid_phone" || data.error === "Invalid phone number") {
      errorMessage = "Invalid phone number format";
    } else if (data.code === "insufficient_credit") {
      errorMessage = "SMS service insufficient credit";
    } else if (data.code === "authentication_failed") {
      errorMessage = "SMS service authentication failed - check API key";
    } else if (data.code === "api_error") {
      errorMessage = "SMS service API error";
    }

    // Log full response for debugging
    console.error("[Arkesel SMS Error] Response:", {
      status: response.status,
      statusText: response.statusText,
      data,
      payload,
    });

    return {
      success: false,
      error: errorMessage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Arkesel SMS Error] Exception:", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : "No stack trace",
    });
    return {
      success: false,
      error: `SMS service error: ${errorMessage}`,
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
