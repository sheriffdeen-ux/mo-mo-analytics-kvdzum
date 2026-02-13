import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, Platform, View, ActivityIndicator } from "react-native";
import { useNetworkState } from "expo-network";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
// Note: Error logging is auto-initialized via index.ts import

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)", // Ensure any route can link back to `/`
};

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (
      !networkState.isConnected &&
      networkState.isInternetReachable === false
    ) {
      console.log("🔌 You are offline - Changes will be saved locally and synced when you are back online.");
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  // Auth guard: redirect to auth screen if not logged in
  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        console.log("[Auth Guard] No user found, redirecting to auth");
        router.replace("/auth");
      } else {
        console.log("[Auth Guard] User authenticated:", user.phoneNumber || user.email);
      }
    }
  }, [user, loading, router]);

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: "rgb(0, 122, 255)", // System Blue
      background: "rgb(242, 242, 247)", // Light mode background
      card: "rgb(255, 255, 255)", // White cards/surfaces
      text: "rgb(0, 0, 0)", // Black text for light mode
      border: "rgb(216, 216, 220)", // Light gray for separators/borders
      notification: "rgb(255, 59, 48)", // System Red
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: "rgb(10, 132, 255)", // System Blue (Dark Mode)
      background: "rgb(1, 1, 1)", // True black background for OLED displays
      card: "rgb(28, 28, 30)", // Dark card/surface color
      text: "rgb(255, 255, 255)", // White text for dark mode
      border: "rgb(44, 44, 46)", // Dark gray for separators/borders
      notification: "rgb(255, 69, 58)", // System Red (Dark Mode)
    },
  };

  // Show loading screen while checking auth status
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? 'rgb(1, 1, 1)' : 'rgb(242, 242, 247)' }}>
        <ActivityIndicator size="large" color="rgb(10, 132, 255)" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" animated />
      <ThemeProvider
        value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}
      >
        <GestureHandlerRootView>
          <Stack>
            {/* Auth screens */}
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
            <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
            {/* Main app with tabs */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <SystemBars style={"auto"} />
        </GestureHandlerRootView>
      </ThemeProvider>
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      registerDevice();
    }
  }, [loaded]);

  const registerDevice = async () => {
    try {
      // Get device ID
      const deviceId = Device.modelId || Device.osInternalBuildId || 'unknown-device';
      
      // Get FCM token for push notifications (optional)
      let fcmToken = '';
      if (Platform.OS !== 'web') {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus === 'granted') {
          const token = await Notifications.getExpoPushTokenAsync();
          fcmToken = token.data;
        }
      }
      
      // Register device with backend (will be called after user logs in)
      console.log('[Device] Device ID:', deviceId);
      console.log('[Device] FCM Token:', fcmToken);
      
      // Store device info for later registration
      if (Platform.OS === 'web') {
        localStorage.setItem('deviceId', deviceId);
        if (fcmToken) localStorage.setItem('fcmToken', fcmToken);
      }
    } catch (error) {
      console.error('[Device] Failed to register device:', error);
    }
  };

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <WidgetProvider>
        <RootLayoutContent />
      </WidgetProvider>
    </AuthProvider>
  );
}
