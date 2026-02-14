import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq, and, gte, lte, desc, count as countFn, sum } from "drizzle-orm";
import * as schema from "../db/schema.js";
import type { App } from "../index.js";
import { parseMoMoSMS } from "../utils/sms-parser.js";
import {
  calculateFraudRisk,
  isGlobalBlacklistMerchant,
  calculateAverageTransactionAmount,
  getFCMNotificationPriority,
} from "../utils/fraud-detection.js";
import { transactionsToCSV } from "../utils/csv-export.js";

export function registerTransactionRoutes(app: App, fastify: FastifyInstance) {
  const requireAuth = app.requireAuth();

  // POST /api/register-device - Register device for push notifications
  fastify.post("/api/register-device", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const body = request.body as {
      deviceId: string;
      fcmToken?: string;
    };

    app.logger.info(
      { userId: session.user.id, deviceId: body.deviceId },
      "Registering device"
    );

    try {
      // Check if device already exists
      const existingDevice = await app.db
        .select()
        .from(schema.deviceRegistrations)
        .where(eq(schema.deviceRegistrations.deviceId, body.deviceId));

      let result;
      if (existingDevice.length > 0) {
        // Update existing device
        const [updated] = await app.db
          .update(schema.deviceRegistrations)
          .set({
            fcmToken: body.fcmToken || existingDevice[0].fcmToken,
          })
          .where(eq(schema.deviceRegistrations.deviceId, body.deviceId))
          .returning();
        result = updated;
      } else {
        // Create new device registration
        const [created] = await app.db
          .insert(schema.deviceRegistrations)
          .values({
            userId: session.user.id,
            deviceId: body.deviceId,
            fcmToken: body.fcmToken,
          })
          .returning();
        result = created;
      }

      app.logger.info(
        { userId: session.user.id, deviceId: body.deviceId },
        "Device registered successfully"
      );

      return {
        success: true,
        userId: session.user.id,
      };
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id, deviceId: body.deviceId },
        "Failed to register device"
      );
      throw error;
    }
  });

  // POST /api/analyze-transaction - Analyze MoMo transaction for fraud
  fastify.post("/api/analyze-transaction", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const body = request.body as {
      smsText: string;
      deviceId: string;
    };

    app.logger.info(
      { userId: session.user.id, deviceId: body.deviceId },
      "Analyzing transaction"
    );

    try {
      // Parse SMS
      const parsed = parseMoMoSMS(body.smsText);
      app.logger.info(
        {
          userId: session.user.id,
          provider: parsed.provider,
          amount: parsed.amount,
        },
        "SMS parsed successfully"
      );

      // Get user settings
      let userSettings = await app.db
        .select()
        .from(schema.userSettings)
        .where(eq(schema.userSettings.userId, session.user.id));

      let settings = userSettings[0];
      if (!settings) {
        // Create default settings if doesn't exist
        const [created] = await app.db
          .insert(schema.userSettings)
          .values({
            userId: session.user.id,
            dailyLimit: "2000",
            blockedMerchants: [],
            trustedMerchants: [],
          })
          .returning();
        settings = created;
      }

      // Get transaction statistics for fraud detection
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get transactions in various time windows
      const transactionsIn24h = await app.db
        .select().from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.userId, session.user.id),
            gte(schema.transactions.createdAt, oneDayAgo)
          )
        );

      const transactionsIn3h = transactionsIn24h.filter(
        (t) => t.createdAt.getTime() > threeHoursAgo.getTime()
      );

      const transactionsIn1h = transactionsIn24h.filter(
        (t) => t.createdAt.getTime() > oneHourAgo.getTime()
      );

      // Calculate daily spending (for "sent" transactions)
      const dailySpentResult = await app.db
        .select({
          total: sum(schema.transactions.amount),
        })
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.userId, session.user.id),
            eq(schema.transactions.transactionType, "sent" as any),
            gte(schema.transactions.createdAt, oneDayAgo)
          )
        );

      const dailySpent = dailySpentResult[0]?.total
        ? parseFloat(dailySpentResult[0].total as any)
        : 0;

      // Get user's average transaction amount for "sent" transactions
      const sentTransactions = transactionsIn24h
        .filter((t) => t.transactionType === "sent" as any)
        .map((t) => parseFloat(t.amount as any));

      const userAverageAmount =
        calculateAverageTransactionAmount(sentTransactions);

      // Run fraud detection
      const fraudAnalysis = calculateFraudRisk({
        amount: parsed.amount,
        recipient: parsed.recipient,
        balance: parsed.balance ? parseFloat(parsed.balance.toString()) : undefined,
        transactionType: parsed.transactionType,
        transactionDate: parsed.transactionDate,
        userAverageSentAmount: userAverageAmount,
        dailySpentAmount: dailySpent,
        dailyLimit: parseFloat(settings.dailyLimit as any),
        transactionsInLast1Hour: transactionsIn1h.length,
        transactionsInLast3Hours: transactionsIn3h.length,
        transactionsInLast24Hours: transactionsIn24h.length,
        blockedMerchants: settings.blockedMerchants || [],
        trustedMerchants: settings.trustedMerchants || [],
        isGlobalBlacklistMerchant: isGlobalBlacklistMerchant(parsed.recipient),
      });

      app.logger.info(
        {
          userId: session.user.id,
          riskScore: fraudAnalysis.riskScore,
          riskLevel: fraudAnalysis.riskLevel,
        },
        "Fraud analysis completed"
      );

      // Store transaction
      const [transaction] = await app.db
        .insert(schema.transactions)
        .values({
          userId: session.user.id,
          rawSms: body.smsText,
          provider: parsed.provider as any,
          transactionType: parsed.transactionType as any,
          amount: String(parsed.amount),
          recipient: parsed.recipient,
          balance: parsed.balance ? String(parsed.balance) : null,
          transactionDate: parsed.transactionDate,
          riskScore: fraudAnalysis.riskScore,
          riskLevel: fraudAnalysis.riskLevel as any,
          riskReasons: fraudAnalysis.riskReasons,
          isBlocked: fraudAnalysis.riskLevel === "CRITICAL",
        })
        .returning();

      app.logger.info(
        { userId: session.user.id, transactionId: transaction.id },
        "Transaction stored successfully"
      );

      // Get device FCM token for notification
      const device = await app.db
        .select()
        .from(schema.deviceRegistrations)
        .where(eq(schema.deviceRegistrations.deviceId, body.deviceId));

      if (device.length > 0 && device[0].fcmToken) {
        // Send FCM notification (in production)
        const notificationConfig = getFCMNotificationPriority(
          fraudAnalysis.riskLevel
        );
        app.logger.info(
          {
            userId: session.user.id,
            deviceId: body.deviceId,
            priority: notificationConfig.priority,
          },
          "FCM notification prepared"
        );
        // TODO: Integrate with actual FCM service
      }

      return {
        transactionId: transaction.id,
        riskScore: fraudAnalysis.riskScore,
        riskLevel: fraudAnalysis.riskLevel,
        riskReasons: fraudAnalysis.riskReasons,
        amount: parsed.amount,
        recipient: parsed.recipient,
        balance: parsed.balance,
      };
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id },
        "Failed to analyze transaction"
      );
      throw error;
    }
  });

  // GET /api/transactions - Get paginated transaction history
  fastify.get("/api/transactions", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const query = request.query as {
      page?: string;
      limit?: string;
      riskLevel?: string;
      provider?: string;
      startDate?: string;
      endDate?: string;
    };

    const page = Math.max(1, parseInt(query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10)));
    const offset = (page - 1) * limit;

    app.logger.info(
      {
        userId: session.user.id,
        page,
        limit,
        riskLevel: query.riskLevel,
      },
      "Fetching transactions"
    );

    try {
      // Build where clause
      const conditions = [eq(schema.transactions.userId, session.user.id)];

      if (query.riskLevel) {
        conditions.push(eq(schema.transactions.riskLevel, query.riskLevel as any));
      }

      if (query.provider) {
        conditions.push(eq(schema.transactions.provider, query.provider as any));
      }

      if (query.startDate) {
        const startDate = new Date(query.startDate);
        conditions.push(gte(schema.transactions.createdAt, startDate));
      }

      if (query.endDate) {
        const endDate = new Date(query.endDate);
        conditions.push(lte(schema.transactions.createdAt, endDate));
      }

      // Get total count
      const [countResult] = await app.db
        .select({
          count: countFn(schema.transactions.id),
        })
        .from(schema.transactions)
        .where(and(...conditions));

      const total = countResult.count;
      const totalPages = Math.ceil(total / limit);

      // Get paginated transactions
      const transactions = await app.db
        .select()
        .from(schema.transactions)
        .where(and(...conditions))
        .orderBy(desc(schema.transactions.createdAt))
        .limit(limit)
        .offset(offset);

      app.logger.info(
        { userId: session.user.id, count: transactions.length, total },
        "Transactions fetched successfully"
      );

      return {
        transactions: transactions.map((t) => ({
          id: t.id,
          provider: t.provider,
          type: t.transactionType,
          amount: parseFloat(t.amount as any),
          recipient: t.recipient,
          balance: t.balance ? parseFloat(t.balance as any) : null,
          date: t.transactionDate,
          riskScore: t.riskScore,
          riskLevel: t.riskLevel,
          riskReasons: t.riskReasons,
          isBlocked: t.isBlocked,
          isFraudReported: t.isFraudReported,
        })),
        total,
        page,
        totalPages,
      };
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id },
        "Failed to fetch transactions"
      );
      throw error;
    }
  });

  // POST /api/transactions/:id/block - Block merchant from transaction
  fastify.post(
    "/api/transactions/:id/block",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };

      app.logger.info(
        { userId: session.user.id, transactionId: id },
        "Blocking merchant from transaction"
      );

      try {
        // Get transaction
        const [transaction] = await app.db
          .select()
          .from(schema.transactions)
          .where(eq(schema.transactions.id, id));

        if (!transaction) {
          return { success: false, error: "Transaction not found" };
        }

        // Check ownership
        if (transaction.userId !== session.user.id) {
          app.logger.warn(
            { userId: session.user.id, transactionId: id },
            "Unauthorized access attempt"
          );
          return { success: false, error: "Unauthorized" };
        }

        // Add merchant to blocked list if not already there
        if (transaction.recipient) {
          const settings = await app.db
            .select()
            .from(schema.userSettings)
            .where(eq(schema.userSettings.userId, session.user.id));

          const userSettings =
            settings[0] ||
            (
              await app.db
                .insert(schema.userSettings)
                .values({
                  userId: session.user.id,
                  dailyLimit: "2000",
                  blockedMerchants: [],
                  trustedMerchants: [],
                })
                .returning()
            )[0];

          const blockedMerchants = userSettings.blockedMerchants || [];
          if (!blockedMerchants.includes(transaction.recipient)) {
            blockedMerchants.push(transaction.recipient);
            await app.db
              .update(schema.userSettings)
              .set({ blockedMerchants })
              .where(eq(schema.userSettings.userId, session.user.id));
          }
        }

        // Update transaction as blocked
        await app.db
          .update(schema.transactions)
          .set({ isBlocked: true })
          .where(eq(schema.transactions.id, id));

        app.logger.info(
          { userId: session.user.id, transactionId: id },
          "Merchant blocked successfully"
        );

        return { success: true };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, transactionId: id },
          "Failed to block merchant"
        );
        throw error;
      }
    }
  );

  // POST /api/transactions/:id/report-fraud - Report transaction as fraud
  fastify.post(
    "/api/transactions/:id/report-fraud",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireAuth(request, reply);
      if (!session) return;

      const { id } = request.params as { id: string };

      app.logger.info(
        { userId: session.user.id, transactionId: id },
        "Reporting transaction as fraud"
      );

      try {
        // Get transaction
        const [transaction] = await app.db
          .select()
          .from(schema.transactions)
          .where(eq(schema.transactions.id, id));

        if (!transaction) {
          return { success: false, error: "Transaction not found" };
        }

        // Check ownership
        if (transaction.userId !== session.user.id) {
          app.logger.warn(
            { userId: session.user.id, transactionId: id },
            "Unauthorized fraud report attempt"
          );
          return { success: false, error: "Unauthorized" };
        }

        // Mark as fraud reported
        await app.db
          .update(schema.transactions)
          .set({ isFraudReported: true })
          .where(eq(schema.transactions.id, id));

        // Get user and update fraud count
        const [user] = await app.db
          .select()
          .from(schema.userExtended)
          .where(eq(schema.userExtended.userId, session.user.id));

        if (user) {
          // Increment fraud count and increase sensitivity
          const newFraudCount = user.reportedFraudCount + 1;
          let newSensitivity = parseFloat(user.alertSensitivity as any);
          newSensitivity = Math.min(1.5, newSensitivity + 0.1); // Max 1.5

          await app.db
            .update(schema.userExtended)
            .set({
              reportedFraudCount: newFraudCount,
              alertSensitivity: String(newSensitivity),
            })
            .where(eq(schema.userExtended.userId, session.user.id));

          app.logger.info(
            { userId: session.user.id, newSensitivity, fraudCount: newFraudCount },
            "Fraud reported and sensitivity updated"
          );

          return { success: true, newSensitivity };
        }

        app.logger.info(
          { userId: session.user.id, transactionId: id },
          "Fraud reported successfully"
        );

        return { success: true };
      } catch (error) {
        app.logger.error(
          { err: error, userId: session.user.id, transactionId: id },
          "Failed to report fraud"
        );
        throw error;
      }
    }
  );

  // GET /api/transactions/export/csv - Export transactions as CSV
  fastify.get("/api/transactions/export/csv", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const query = request.query as {
      riskLevel?: string;
      provider?: string;
      startDate?: string;
      endDate?: string;
    };

    app.logger.info(
      { userId: session.user.id },
      "Exporting transactions as CSV"
    );

    try {
      // Build where clause
      const conditions = [eq(schema.transactions.userId, session.user.id)];

      if (query.riskLevel) {
        conditions.push(eq(schema.transactions.riskLevel, query.riskLevel as any));
      }

      if (query.provider) {
        conditions.push(eq(schema.transactions.provider, query.provider as any));
      }

      if (query.startDate) {
        const startDate = new Date(query.startDate);
        conditions.push(gte(schema.transactions.createdAt, startDate));
      }

      if (query.endDate) {
        const endDate = new Date(query.endDate);
        conditions.push(lte(schema.transactions.createdAt, endDate));
      }

      // Get all transactions (no pagination for export)
      const transactions = await app.db
        .select()
        .from(schema.transactions)
        .where(and(...conditions))
        .orderBy(desc(schema.transactions.createdAt));

      // Convert to CSV
      const csv = transactionsToCSV(
        transactions.map((t) => ({
          id: t.id,
          provider: t.provider,
          type: t.transactionType,
          amount: parseFloat(t.amount as any),
          recipient: t.recipient,
          balance: t.balance ? parseFloat(t.balance as any) : undefined,
          date: t.transactionDate,
          riskScore: t.riskScore,
          riskLevel: t.riskLevel,
          riskReasons: t.riskReasons || undefined,
          isBlocked: t.isBlocked || false,
          isFraudReported: t.isFraudReported || false,
        }))
      );

      app.logger.info(
        { userId: session.user.id, count: transactions.length },
        "Transactions exported as CSV"
      );

      // Set response headers for CSV download
      reply.type("text/csv");
      reply.header(
        "Content-Disposition",
        `attachment; filename="momo-transactions-${new Date().toISOString().split("T")[0]}.csv"`
      );
      return csv;
    } catch (error) {
      app.logger.error(
        { err: error, userId: session.user.id },
        "Failed to export transactions as CSV"
      );
      throw error;
    }
  });
}
