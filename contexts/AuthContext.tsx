
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { authClient, setBearerToken, clearAuthTokens } from "@/lib/auth";
import { getBearerToken } from "@/utils/api";

interface User {
  id: string;
  email?: string;
  name?: string;
  fullName?: string;
  phoneNumber?: string;
  image?: string;
  subscriptionStatus?: string;
  trialEndDate?: string;
  currentPlanId?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithPhone: (phoneNumber: string) => Promise<void>;
  verifyOTP: (phoneNumber: string, otpCode: string, fullName?: string, deviceId?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function openOAuthPopup(provider: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const popupUrl = `${window.location.origin}/auth-popup?provider=${provider}`;
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      popupUrl,
      "oauth-popup",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    if (!popup) {
      reject(new Error("Failed to open popup. Please allow popups."));
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "oauth-success" && event.data?.token) {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        resolve(event.data.token);
      } else if (event.data?.type === "oauth-error") {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        reject(new Error(event.data.error || "OAuth failed"));
      }
    };

    window.addEventListener("message", handleMessage);

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener("message", handleMessage);
        reject(new Error("Authentication cancelled"));
      }
    }, 500);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();

    // Listen for deep links (e.g. from social auth redirects)
    const subscription = Linking.addEventListener("url", (event) => {
      console.log("Deep link received, refreshing user session");
      // Allow time for the client to process the token if needed
      setTimeout(() => fetchUser(), 500);
    });

    // POLLING: Refresh session every 5 minutes to keep SecureStore token in sync
    // This prevents 401 errors when the session token rotates
    const intervalId = setInterval(() => {
      console.log("Auto-refreshing user session to sync token...");
      fetchUser();
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      
      // Check if we have a bearer token first (for phone auth)
      const token = await getBearerToken();
      if (token) {
        console.log("[Auth] Found bearer token, attempting to fetch user");
        // We have a token, try to get user info from backend
        try {
          const { authenticatedGet } = await import('@/utils/api');
          const userData = await authenticatedGet('/api/user/me');
          if (userData) {
            setUser(userData as User);
            console.log("[Auth] User fetched successfully via bearer token");
            // Register device after successful authentication
            await registerDeviceWithBackend();
            return;
          }
        } catch (error) {
          console.error("[Auth] Failed to fetch user with bearer token:", error);
          // Token might be invalid, clear it
          await clearAuthTokens();
        }
      }
      
      // Try Better Auth session (for OAuth)
      try {
        const session = await authClient.getSession();
        if (session?.data?.user) {
          setUser(session.data.user as User);
          // Sync token to SecureStore for utils/api.ts
          if (session.data.session?.token) {
            await setBearerToken(session.data.session.token);
            // Register device after successful authentication
            await registerDeviceWithBackend();
          }
          console.log("[Auth] User fetched successfully via Better Auth session");
          return;
        }
      } catch (error) {
        // Session fetch failed, but this is expected if user is not logged in
        console.log("[Auth] No Better Auth session found (this is normal for new users)");
      }
      
      // No valid session found
      setUser(null);
      await clearAuthTokens();
    } catch (error) {
      console.error("[Auth] Failed to fetch user:", error);
      setUser(null);
      await clearAuthTokens();
    } finally {
      setLoading(false);
    }
  };

  const registerDeviceWithBackend = async () => {
    try {
      // Get device info from storage
      let deviceId = 'unknown-device';
      let fcmToken = '';
      
      if (Platform.OS === 'web') {
        deviceId = localStorage.getItem('deviceId') || 'web-device';
        fcmToken = localStorage.getItem('fcmToken') || '';
      } else {
        // For native, we'd need to import Device and get the ID
        // For now, use a placeholder
        deviceId = 'native-device';
      }
      
      // Import API utilities dynamically to avoid circular dependencies
      const { authenticatedPost } = await import('@/utils/api');
      
      const response = await authenticatedPost('/api/register-device', {
        deviceId,
        fcmToken: fcmToken || undefined,
      });
      
      console.log('[Device] Device registered with backend:', response);
    } catch (error) {
      console.error('[Device] Failed to register device with backend:', error);
      // Don't throw - device registration is not critical
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await authClient.signIn.email({ email, password });
      await fetchUser();
    } catch (error) {
      console.error("Email sign in failed:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      await authClient.signUp.email({
        email,
        password,
        name,
        // Ensure name is passed in header or logic if required, usually passed in body
      });
      await fetchUser();
    } catch (error) {
      console.error("Email sign up failed:", error);
      throw error;
    }
  };

  const signInWithSocial = async (provider: "google" | "apple" | "github") => {
    try {
      if (Platform.OS === "web") {
        const token = await openOAuthPopup(provider);
        await setBearerToken(token);
        await fetchUser();
      } else {
        // Native: Use expo-linking to generate a proper deep link
        const callbackURL = Linking.createURL("/");
        await authClient.signIn.social({
          provider,
          callbackURL,
        });
        // Note: The redirect will reload the app or be handled by deep linking.
        // fetchUser will be called on mount or via event listener if needed.
        // For simple flow, we might need to listen to URL events.
        // But better-auth expo client handles the redirect and session storage?
        // We typically need to wait or rely on fetchUser on next app load.
        // For now, call fetchUser just in case.
        await fetchUser();
      }
    } catch (error) {
      console.error(`${provider} sign in failed:`, error);
      throw error;
    }
  };

  const signInWithPhone = async (phoneNumber: string) => {
    try {
      console.log("[Auth] Sending OTP to phone:", phoneNumber);
      const { apiPost } = await import('@/utils/api');
      const response = await apiPost('/api/phone/send-otp', { phoneNumber });
      
      // Check if the backend returned an error
      if (response.success === false) {
        // Provide user-friendly error messages
        let errorMessage = response.error || "Failed to send OTP";
        
        if (errorMessage.includes("Too many OTP requests")) {
          errorMessage = "Too many OTP requests. Please wait 1 hour before trying again.";
        } else if (errorMessage.includes("Invalid Ghana phone number")) {
          errorMessage = "Please enter a valid Ghana phone number (e.g., 0241234567)";
        } else if (errorMessage.includes("SMS service") || errorMessage.includes("SMS API")) {
          errorMessage = "SMS service temporarily unavailable. Please try again in a few minutes.";
        } else if (errorMessage.includes("401") || errorMessage.includes("Missing key")) {
          errorMessage = "SMS service configuration error. Please contact support.";
        }
        
        throw new Error(errorMessage);
      }
      
      console.log("[Auth] OTP sent successfully");
    } catch (error: any) {
      console.error("[Auth] Failed to send OTP:", error);
      // Re-throw with the error message
      throw new Error(error.message || "Failed to send OTP. Please try again.");
    }
  };

  const verifyOTP = async (phoneNumber: string, otpCode: string, fullName?: string, deviceId?: string) => {
    try {
      console.log("[Auth] Verifying OTP for phone:", phoneNumber);
      const { apiPost } = await import('@/utils/api');
      const response = await apiPost('/api/phone/verify-otp', {
        phoneNumber,
        otpCode,
        fullName,
        deviceId: deviceId || 'unknown-device',
      });
      
      // Check if the backend returned an error
      if (response.success === false) {
        // Provide user-friendly error messages
        let errorMessage = response.error || "Invalid OTP code";
        
        if (errorMessage.includes("OTP not found") || errorMessage.includes("expired")) {
          errorMessage = "OTP has expired. Please request a new one.";
        } else if (errorMessage.includes("Maximum OTP attempts")) {
          errorMessage = "Too many incorrect attempts. Please request a new OTP.";
        } else if (errorMessage.includes("Invalid OTP")) {
          errorMessage = "Incorrect OTP code. Please check and try again.";
        } else if (errorMessage.includes("Full name required")) {
          errorMessage = "Please enter your full name to continue.";
        }
        
        throw new Error(errorMessage);
      }
      
      // Store the access token (JWT)
      if (response.accessToken) {
        await setBearerToken(response.accessToken);
        console.log("[Auth] JWT access token stored successfully");
      } else {
        console.warn("[Auth] No access token received from backend");
        throw new Error("Authentication failed: No access token received");
      }
      
      // Set user from response
      if (response.user) {
        setUser(response.user);
        console.log("[Auth] User data set:", response.user);
      } else {
        console.warn("[Auth] No user data received from backend");
      }
      
      // Register device with backend
      await registerDeviceWithBackend();
      
      console.log("[Auth] OTP verified successfully, user logged in");
    } catch (error: any) {
      console.error("[Auth] OTP verification failed:", error);
      // Re-throw with the error message
      throw new Error(error.message || "Failed to verify OTP. Please try again.");
    }
  };

  const signInWithGoogle = () => signInWithSocial("google");
  const signInWithApple = () => signInWithSocial("apple");
  const signInWithGitHub = () => signInWithSocial("github");

  const signOut = async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("Sign out failed (API):", error);
    } finally {
       // Always clear local state
       setUser(null);
       await clearAuthTokens();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithPhone,
        verifyOTP,
        signInWithGoogle,
        signInWithApple,
        signInWithGitHub,
        signOut,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
