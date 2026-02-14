
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import { GlassView } from "expo-glass-effect";
import { colors } from "@/styles/commonStyles";
import { useAuth } from "@/contexts/AuthContext";
import Constants from "expo-constants";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval?: string;
  features: string[];
}

interface SubscriptionStatus {
  subscriptionStatus: string;
  currentPlan: string;
  trialEndDate?: string;
  daysRemaining?: number;
}

export default function UpgradeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { user } = useAuth();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const bgColor = isDark ? colors.background : "#fff";
  const textColor = isDark ? colors.text : "#000";
  const textSecondaryColor = isDark ? colors.textSecondary : "#666";
  const cardColor = isDark ? colors.cardBackground : "#f5f5f5";

  useEffect(() => {
    loadPlans();
    loadSubscriptionStatus();
  }, []);

  const loadPlans = async () => {
    try {
      console.log("[Upgrade] Loading subscription plans");
      const { apiGet } = await import("@/utils/api");
      const response = await apiGet<{ plans: SubscriptionPlan[] }>("/api/subscriptions/plans");
      console.log("[Upgrade] Plans loaded:", response.plans);
      
      // Filter out yearly plans (pro-yearly, business-yearly)
      const filteredPlans = response.plans.filter(plan => !plan.id.includes('yearly'));
      console.log("[Upgrade] Filtered plans (no yearly):", filteredPlans);
      
      setPlans(filteredPlans);
    } catch (error) {
      console.error("[Upgrade] Failed to load plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionStatus = async () => {
    try {
      const { authenticatedGet } = await import("@/utils/api");
      const response = await authenticatedGet<SubscriptionStatus>("/api/subscriptions/status");
      console.log("[Upgrade] Subscription status loaded:", response);
      setSubscriptionStatus(response);
    } catch (error) {
      console.error("[Upgrade] Failed to load subscription status:", error);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      console.log("[Upgrade] User not authenticated");
      router.push("/auth");
      return;
    }

    setProcessing(true);
    setSelectedPlan(planId);
    console.log("[Upgrade] Initiating payment for plan:", planId);

    try {
      const { authenticatedPost } = await import("@/utils/api");
      const response = await authenticatedPost<{ authorizationUrl: string; reference: string }>(
        "/api/subscriptions/initiate-payment",
        { planId }
      );

      console.log("[Upgrade] Payment initiated:", response);

      // Open Paystack payment page
      if (response.authorizationUrl) {
        const supported = await Linking.canOpenURL(response.authorizationUrl);
        if (supported) {
          await Linking.openURL(response.authorizationUrl);
          console.log("[Upgrade] Opened payment URL");
        } else {
          console.error("[Upgrade] Cannot open payment URL");
        }
      }
    } catch (error) {
      console.error("[Upgrade] Payment initiation failed:", error);
    } finally {
      setProcessing(false);
      setSelectedPlan(null);
    }
  };

  const getPlanIcon = (planId: string) => {
    if (planId === "free") return "shield";
    if (planId.startsWith("pro")) return "star";
    if (planId.startsWith("business")) return "business";
    return "check-circle";
  };

  const getPlanColor = (planId: string) => {
    if (planId === "free") return colors.textSecondary;
    if (planId.startsWith("pro")) return colors.warning;
    if (planId.startsWith("business")) return colors.primary;
    return colors.success;
  };

  const formatPrice = (price: number, interval?: string) => {
    if (price === 0) return "Free";
    const intervalText = interval ? `/${interval}` : "";
    return `GHS ${price}${intervalText}`;
  };

  const isCurrentPlan = (planId: string) => {
    if (!subscriptionStatus) return false;
    return subscriptionStatus.currentPlan === planId;
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const planColor = getPlanColor(plan.id);
    const isCurrent = isCurrentPlan(plan.id);
    const isProcessingThis = processing && selectedPlan === plan.id;

    return (
      <GlassView
        key={plan.id}
        style={[
          styles.planCard,
          Platform.OS !== "ios" && {
            backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
          },
          isCurrent && styles.currentPlanCard,
        ]}
        glassEffectStyle="regular"
      >
        <View style={styles.planHeader}>
          <IconSymbol
            ios_icon_name={`${getPlanIcon(plan.id)}.fill`}
            android_material_icon_name={getPlanIcon(plan.id)}
            size={40}
            color={planColor}
          />
          <View style={styles.planTitleContainer}>
            <Text style={[styles.planName, { color: textColor }]}>{plan.name}</Text>
            <Text style={[styles.planPrice, { color: planColor }]}>
              {formatPrice(plan.price, plan.interval)}
            </Text>
          </View>
        </View>

        <Text style={[styles.planDescription, { color: textSecondaryColor }]}>
          {plan.description}
        </Text>

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check-circle"
                size={20}
                color={colors.success}
              />
              <Text style={[styles.featureText, { color: textColor }]}>{feature}</Text>
            </View>
          ))}
        </View>

        {isCurrent ? (
          <View style={[styles.currentBadge, { backgroundColor: colors.success }]}>
            <Text style={styles.currentBadgeText}>Current Plan</Text>
          </View>
        ) : plan.price > 0 ? (
          <TouchableOpacity
            style={[
              styles.subscribeButton,
              { backgroundColor: planColor },
              isProcessingThis && styles.buttonDisabled,
            ]}
            onPress={() => handleSubscribe(plan.id)}
            disabled={processing}
          >
            {isProcessingThis ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.subscribeButtonText}>Subscribe</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </GlassView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]} edges={["top"]}>
        <Stack.Screen
          options={{
            title: "Upgrade",
            headerShown: true,
            headerBackTitle: "Back",
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
            Loading plans...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const freePlan = plans.find((p) => p.id === "free");
  const proPlans = plans.filter((p) => p.id.startsWith("pro"));
  const businessPlans = plans.filter((p) => p.id.startsWith("business"));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]} edges={["top"]}>
      <Stack.Screen
        options={{
          title: "Upgrade",
          headerShown: true,
          headerBackTitle: "Back",
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Choose Your Plan</Text>
          <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
            Protect your Mobile Money transactions with advanced fraud detection
          </Text>
        </View>

        {subscriptionStatus?.subscriptionStatus === "trial" && (
          <GlassView
            style={[
              styles.trialBanner,
              Platform.OS !== "ios" && {
                backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
              },
            ]}
            glassEffectStyle="regular"
          >
            <IconSymbol
              ios_icon_name="clock.fill"
              android_material_icon_name="schedule"
              size={24}
              color={colors.warning}
            />
            <View style={styles.trialText}>
              <Text style={[styles.trialTitle, { color: textColor }]}>
                Trial Active
              </Text>
              <Text style={[styles.trialSubtitle, { color: textSecondaryColor }]}>
                {subscriptionStatus.daysRemaining} days remaining
              </Text>
            </View>
          </GlassView>
        )}

        {freePlan && (
          <React.Fragment>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Free</Text>
            <Text style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>
              Basic fraud alerts & transaction tracking
            </Text>
            {renderPlanCard(freePlan)}
          </React.Fragment>
        )}

        {proPlans.length > 0 && (
          <React.Fragment>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Pro</Text>
            <Text style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>
              Advanced protection + financial analytics (Monthly billing only)
            </Text>
            {proPlans.map((plan) => renderPlanCard(plan))}
          </React.Fragment>
        )}

        {businessPlans.length > 0 && (
          <React.Fragment>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Business</Text>
            <Text style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>
              Complete MoMo monitoring for your business
            </Text>
            {businessPlans.map((plan) => renderPlanCard(plan))}
          </React.Fragment>
        )}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: textSecondaryColor }]}>
            All plans include secure payment processing via Paystack. Cancel anytime.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  trialBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  trialText: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  trialSubtitle: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  planCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  currentPlanCard: {
    borderWidth: 2,
    borderColor: colors.success,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: "600",
  },
  planDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  featuresContainer: {
    gap: 12,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  subscribeButton: {
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  subscribeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  currentBadge: {
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  currentBadgeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});
