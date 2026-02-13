
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
  smsConsentGiven?: boolean;
  smsAutoDetectionEnabled?: boolean;
  deviceFingerprint?: string;
  requiresPinOnNewDevice?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
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

    const subscription = Linking.addEventListener("url", (event) => {
      console.log("Deep link received, refreshing user session");
      setTimeout(() => fetchUser(), 500);
    });

    const intervalId = setInterval(() => {
      console.log("Auto-refreshing user session to sync token...");
      fetchUser();
    }, 5 * 60 * 1000);

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      
      const token = await getBearerToken();
      if (token) {
        console.log("[Auth] Found bearer token, attempting to fetch user");
        try {
          const { authenticatedGet } = await import('@/utils/api');
          const userData = await authenticatedGet('/api/user/me');
          if (userData) {
            setUser(userData as User);
            console.log("[Auth] User fetched successfully via bearer token:", userData);
            try {
              await registerDeviceWithBackend();
            } catch (deviceError) {
              console.warn("[Auth] Device registration failed (non-critical):", deviceError);
            }
            return;
          }
        } catch (error: any) {
          console.error("[Auth] Failed to fetch user with bearer token:", error);
          if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
            console.log("[Auth] Token is invalid (401), clearing auth tokens");
            await clearAuthTokens();
          } else {
            console.log("[Auth] Network or other error, keeping token for retry");
          }
        }
      }
      
      try {
        const session = await authClient.getSession();
        if (session?.data?.user) {
          setUser(session.data.user as User);
          if (session.data.session?.token) {
            await setBearerToken(session.data.session.token);
            try {
              await registerDeviceWithBackend();
            } catch (deviceError) {
              console.warn("[Auth] Device registration failed (non-critical):", deviceError);
            }
          }
          console.log("[Auth] User fetched successfully via Better Auth session");
          return;
        }
      } catch (error) {
        console.log("[Auth] No Better Auth session found (this is normal for new users)");
      }
      
      console.log("[Auth] No valid session found, user is not authenticated");
      setUser(null);
    } catch (error) {
      console.error("[Auth] Failed to fetch user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const registerDeviceWithBackend = async () => {
    try {
      let deviceId = 'unknown-device';
      let fcmToken = '';
      
      if (Platform.OS === 'web') {
        deviceId = localStorage.getItem('deviceId') || 'web-device';
        fcmToken = localStorage.getItem('fcmToken') || '';
      } else {
        deviceId = 'native-device';
      }
      
      const { authenticatedPost } = await import('@/utils/api');
      
      const response = await authenticatedPost('/api/register-device', {
        deviceId,
        fcmToken: fcmToken || undefined,
      });
      
      console.log('[Device] Device registered with backend:', response);
    } catch (error) {
      console.error('[Device] Failed to register device with backend:', error);
    }
  };



  const signInWithSocial = async (provider: "google" | "apple" | "github") => {
    try {
      if (Platform.OS === "web") {
        const token = await openOAuthPopup(provider);
        await setBearerToken(token);
        await fetchUser();
      } else {
        const callbackURL = Linking.createURL("/");
        await authClient.signIn.social({
          provider,
          callbackURL,
        });
        await fetchUser();
      }
    } catch (error) {
      console.error(`${provider} sign in failed:`, error);
      throw error;
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
       setUser(null);
       await clearAuthTokens();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
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
