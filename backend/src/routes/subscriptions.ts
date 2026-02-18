import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, and, gte } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";
import crypto from "crypto";

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  free: {
    id: "free",
    name: "Free",
    description: "Basic fraud alerts & transaction tracking",
    price: 0,
    currency: "GHS",
    features: [
      "SMS detection",
      "Basic fraud scoring",
      "Risk alerts",
      "Last 30 transactions",
      "Basic daily summary",
    ],
  },
  pro_weekly: {
    id: "pro_weekly",
    name: "Pro (Weekly)",
    description: "Advanced protection + financial analytics",
    price: 7,
    currency: "GHS",
    interval: "weekly",
    features: [
      "Full 7-layer fraud engine",
      "Unlimited transaction history",
      "Daily/Weekly/Monthly analytics",
      "Money sent vs received charts",
      "Custom daily spending limits",
      "Advanced alerts (real-time high priority)",
      "Export to CSV",
      "Merchant insights",
    ],
  },
  pro_monthly: {
    id: "pro_monthly",
    name: "Pro (Monthly)",
    price: 30,
    currency: "GHS",
    interval: "monthly",
    features: [
      "Full 7-layer fraud engine",
      "Unlimited transaction history",
      "Daily/Weekly/Monthly analytics",
      "Money sent vs received charts",
      "Custom daily spending limits",
      "Advanced alerts (real-time high priority)",
      "Export to CSV",
      "Merchant insights",
    ],
  },
  pro_yearly: {
    id: "pro_yearly",
    name: "Pro (Yearly)",
    price: 240,
    currency: "GHS",
    interval: "yearly",
    features: [
      "Full 7-layer fraud engine",
      "Unlimited transaction history",
      "Daily/Weekly/Monthly analytics",
      "Money sent vs received charts",
      "Custom daily spending limits",
      "Advanced alerts (real-time high priority)",
      "Export to CSV",
      "Merchant insights",
    ],
  },
  business_weekly: {
    id: "business_weekly",
    name: "Business (Weekly)",
    description: "Complete MoMo monitoring for your business",
    price: 40,
    currency: "GHS",
    interval: "weekly",
    features: [
      "All Pro features",
      "Multi-device support",
      "Central dashboard",
      "Staff monitoring",
      "Real-time fraud alerts",
      "Transaction reconciliation reports",
      "Monthly revenue breakdown",
      "Exportable financial reports",
    ],
  },
  business_monthly: {
    id: "business_monthly",
    name: "Business (Monthly)",
    price: 99,
    currency: "GHS",
    interval: "monthly",
    features: [
      "All Pro features",
      "Multi-device support",
      "Central dashboard",
      "Staff monitoring",
      "Real-time fraud alerts",
      "Transaction reconciliation reports",
      "Monthly revenue breakdown",
      "Exportable financial reports",
    ],
  },
};

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_API_URL = "https://api.paystack.co";

export function registerSubscriptionRoutes(app: App, fastify: FastifyInstance) {
  const requireAuth = app.requireAuth();

  // GET /api/subscriptions/plans - Get available subscription plans
  fastify.get("/api/subscriptions/plans", async () => {
    app.logger.info("Fetching subscription plans");

    return {
      plans: Object.values(SUBSCRIPTION_PLANS),
    };
  });

  // GET /api/subscriptions/status - Get user's subscription status
  fastify.get(
    "/api/subscriptions/status",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info(
        { userId: session.user.id },
        "Fetching subscription status"
      );

      try {
        // Get user extended data
        const [user] = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.userId, session.user.id));

        if (!user) {
          return { success: false, error: "User not found" };
        }

        // Check if trial expired
        let subscriptionStatus = user.subscriptionStatus;
        if (
          subscriptionStatus === "trial" &&
          user.trialEndDate &&
          new Date() > user.trialEndDate
        ) {
          // Downgrade to free
          await app.db
            .update(schema.userExtended)
            .set({ subscriptionStatus: "free" })
            .where(eq(schema.userExtended.userId, session.user.id));
          subscriptionStatus = "free";
        }

        // Get current subscription
        const [subscription] = await app.db
          .select()
          .from(schema.subscriptions)
          .where(
            and(
              eq(schema.subscriptions.userId, session.user.id),
              eq(schema.subscriptions.status, "active")
            )
          );

        // Calculate features access
        const canAccessFeature = {
          advancedFraudEngine:
            subscriptionStatus === "trial" ||
            subscriptionStatus === "pro" ||
            subscriptionStatus === "business",
          unlimitedHistory:
            subscriptionStatus === "trial" ||
            subscriptionStatus === "pro" ||
            subscriptionStatus === "business",
          analytics:
            subscriptionStatus === "trial" ||
            subscriptionStatus === "pro" ||
            subscriptionStatus === "business",
          csvExport:
            subscriptionStatus === "trial" ||
            subscriptionStatus === "pro" ||
            subscriptionStatus === "business",
          multiDevice: subscriptionStatus === "business",
        };

        const daysRemaining = user.trialEndDate
          ? Math.ceil(
              (user.trialEndDate.getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null;

        return {
          subscriptionStatus,
          currentPlan: subscription?.planId || (subscriptionStatus === "trial" ? "trial" : "free"),
          trialEndDate: user.trialEndDate,
          daysRemaining: Math.max(0, daysRemaining || 0),
          features: Object.keys(canAccessFeature),
          canAccessFeature,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          "Failed to fetch subscription status"
        );
        throw error;
      }
    }
  );

  // POST /api/subscriptions/initiate-payment - Initiate Paystack payment
  fastify.post(
    "/api/subscriptions/initiate-payment",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const body = request.body as { planId: string };

      app.logger.info(
        { userId: session.user.id, planId: body.planId },
        "Initiating payment"
      );

      try {
        // Validate plan exists
        const plan = SUBSCRIPTION_PLANS[body.planId as keyof typeof SUBSCRIPTION_PLANS];
        if (!plan) {
          return { success: false, error: "Invalid plan ID" };
        }

        // Get user data
        const [user] = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.userId, session.user.id));

        if (!user) {
          return { success: false, error: "User not found" };
        }

        // Initialize Paystack transaction
        const paystackPayload = {
          email: user.phoneNumber, // Use phone as identifier
          amount: Math.round(plan.price * 100), // Paystack uses cents
          metadata: {
            userId: session.user.id,
            planId: body.planId,
            phoneNumber: user.phoneNumber,
          },
          callback_url: `${process.env.BACKEND_URL || "http://localhost:3000"}/api/subscriptions/paystack-callback`,
        };

        const paystackResponse = await fetch(
          `${PAYSTACK_API_URL}/transaction/initialize`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(paystackPayload),
          }
        );

        if (!paystackResponse.ok) {
          app.logger.error(
            { userId: session.user.id },
            "Paystack initialization failed"
          );
          return {
            success: false,
            error: "Failed to initialize payment",
          };
        }

        const paystackData = (await paystackResponse.json()) as any;

        if (!paystackData.status) {
          return {
            success: false,
            error: "Paystack payment initialization failed",
          };
        }

        const reference = paystackData.data.reference;

        // Create pending payment transaction
        await app.db
          .insert(schema.paymentTransactions)
          .values({
            userId: session.user.id,
            amount: String(plan.price),
            currency: "GHS",
            paystackReference: reference,
            status: "pending",
            metadata: {
              planId: body.planId,
            },
          });

        app.logger.info(
          { userId: session.user.id, reference },
          "Payment initiated"
        );

        return {
          authorizationUrl: paystackData.data.authorization_url,
          reference,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          "Failed to initiate payment"
        );
        throw error;
      }
    }
  );

  // POST /api/subscriptions/paystack-webhook - Handle Paystack webhooks
  fastify.post("/api/subscriptions/paystack-webhook", async (request: FastifyRequest) => {
    app.logger.info("Received Paystack webhook");

    try {
      // Verify signature
      const signature = request.headers["x-paystack-signature"] as string;
      const body = JSON.stringify(request.body);
      const hash = crypto
        .createHmac("sha512", PAYSTACK_SECRET_KEY)
        .update(body)
        .digest("hex");

      if (hash !== signature) {
        app.logger.warn("Invalid Paystack webhook signature");
        return { success: false };
      }

      const payload = request.body as any;

      if (payload.event === "charge.success") {
        const reference = payload.data.reference;
        const amount = payload.data.amount / 100; // Convert from cents

        // Get payment transaction
        const [paymentTx] = await app.db
          .select()
          .from(schema.paymentTransactions)
          .where(
            eq(schema.paymentTransactions.paystackReference, reference)
          );

        if (!paymentTx) {
          app.logger.warn({ reference }, "Payment transaction not found");
          return { success: true };
        }

        // Update payment status
        await app.db
          .update(schema.paymentTransactions)
          .set({ status: "success" })
          .where(eq(schema.paymentTransactions.id, paymentTx.id));

        // Extract plan ID from metadata
        const planId = paymentTx.metadata?.planId;
        const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];

        if (!plan) {
          app.logger.error({ planId }, "Invalid plan in payment");
          return { success: true };
        }

        // Calculate subscription dates
        const startDate = new Date();
        const endDate = new Date();

        const interval = (plan as any).interval;
        if (interval === "weekly") {
          endDate.setDate(endDate.getDate() + 7);
        } else if (interval === "monthly") {
          endDate.setMonth(endDate.getMonth() + 1);
        } else if (interval === "yearly") {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }

        // Create or update subscription
        const [subscription] = await app.db
          .insert(schema.subscriptions)
          .values({
            userId: paymentTx.userId,
            planId: planId as any,
            status: "active",
            startDate,
            endDate,
            amount: String(plan.price),
            currency: "GHS",
            paystackReference: reference,
          })
          .returning();

        // Update payment transaction with subscription ID
        await app.db
          .update(schema.paymentTransactions)
          .set({ subscriptionId: subscription.id })
          .where(eq(schema.paymentTransactions.id, paymentTx.id));

        // Update user subscription status
        await app.db
          .update(schema.userExtended)
          .set({
            subscriptionStatus: planId === "free" ? "free" : "pro",
            currentPlanId: planId as any,
          })
          .where(eq(schema.userExtended.userId, paymentTx.userId));

        app.logger.info(
          { userId: paymentTx.userId, planId },
          "Subscription created successfully"
        );
      } else if (payload.event === "charge.failed") {
        const reference = payload.data.reference;

        // Update payment status
        const [paymentTx] = await app.db
          .select()
          .from(schema.paymentTransactions)
          .where(
            eq(schema.paymentTransactions.paystackReference, reference)
          );

        if (paymentTx) {
          await app.db
            .update(schema.paymentTransactions)
            .set({ status: "failed" })
            .where(eq(schema.paymentTransactions.id, paymentTx.id));
        }

        app.logger.warn({ reference }, "Payment failed");
      }

      return { success: true };
    } catch (error) {
      app.logger.error({ err: error }, "Failed to process webhook");
      return { success: false };
    }
  });

  // GET /api/subscriptions/verify-payment/:reference - Verify payment status
  fastify.get(
    "/api/subscriptions/verify-payment/:reference",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { reference } = request.params as { reference: string };

      app.logger.info(
        { userId: session.user.id, reference },
        "Verifying payment"
      );

      try {
        // Verify with Paystack
        const paystackResponse = await fetch(
          `${PAYSTACK_API_URL}/transaction/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            },
          }
        );

        const data = (await paystackResponse.json()) as any;

        if (!data.status) {
          return { status: "failed", subscription: null };
        }

        // Get subscription
        const [subscription] = await app.db
          .select()
          .from(schema.subscriptions)
          .where(
            eq(schema.subscriptions.paystackReference, reference)
          );

        return {
          status: data.data.status === "success" ? "success" : "failed",
          subscription: subscription || null,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          "Failed to verify payment"
        );
        throw error;
      }
    }
  );

  // POST /api/subscriptions/cancel - Cancel subscription
  fastify.post(
    "/api/subscriptions/cancel",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      app.logger.info({ userId: session.user.id }, "Cancelling subscription");

      try {
        // Get active subscription
        const [subscription] = await app.db
          .select()
          .from(schema.subscriptions)
          .where(
            and(
              eq(schema.subscriptions.userId, session.user.id),
              eq(schema.subscriptions.status, "active")
            )
          );

        if (!subscription) {
          return {
            success: false,
            error: "No active subscription found",
          };
        }

        // Cancel subscription
        const [updated] = await app.db
          .update(schema.subscriptions)
          .set({ status: "cancelled" })
          .where(eq(schema.subscriptions.id, subscription.id))
          .returning();

        app.logger.info(
          { userId: session.user.id, subscriptionId: subscription.id },
          "Subscription cancelled"
        );

        return {
          success: true,
          endsAt: updated.endDate,
        };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id },
          "Failed to cancel subscription"
        );
        throw error;
      }
    }
  );
}
