import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';

// Import route registration functions
import { registerTransactionRoutes } from './routes/transactions.js';
import { registerSettingsRoutes } from './routes/settings.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerUserRoutes } from './routes/user.js';
import { registerSubscriptionRoutes } from './routes/subscriptions.js';
import { registerAlertRoutes } from './routes/alerts.js';
import { registerLegalRoutes } from './routes/legal.js';
import { registerSecurityRoutes } from './routes/security.js';
import { registerDeviceTrustRoutes } from './routes/device-trust.js';
import { registerEmailAuthRoutes } from './routes/email-auth.js';
import { registerEmailVerificationRoutes } from './routes/email-verification.js';
import { registerEmailLinkVerificationRoutes } from './routes/email-link-verification.js';
import { registerSmsAutoReplyRoutes } from './routes/sms-auto-reply.js';
import { registerSmsAnalyzeReplyRoutes } from './routes/sms-analyze-reply.js';
import { registerFinancialReportsRoutes } from './routes/financial-reports.js';
import { registerSmsWebhookRoutes } from './routes/sms-webhook.js';
import { registerSecurityLayersRoutes } from './routes/security-layers.js';
import { registerInAppAlertsRoutes } from './routes/in-app-alerts.js';
import { registerRiskPatternsRoutes } from './routes/risk-patterns.js';
import { registerUserSecurityProfileRoutes } from './routes/user-security-profile.js';
import { registerSecurityDashboardRoutes } from './routes/security-dashboard.js';
import { registerChatbotAnalyzeRoutes } from './routes/chatbot-analyze.js';
import { registerChatbotSmsAnalyzeRoutes } from './routes/chatbot-sms-analyze.js';
import { registerChatbotStatsRoutes } from './routes/chatbot-stats.js';
import { registerFraudAnalysisRoutes } from './routes/fraud-analysis.js';

// Combine schemas
const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Setup authentication with Better Auth
app.withAuth();

// Register all routes
registerHealthRoutes(app, app.fastify);
registerAuthRoutes(app, app.fastify);
registerUserRoutes(app, app.fastify);
registerSubscriptionRoutes(app, app.fastify);
registerTransactionRoutes(app, app.fastify);
registerSettingsRoutes(app, app.fastify);
registerAnalyticsRoutes(app, app.fastify);
registerAdminRoutes(app, app.fastify);
registerAlertRoutes(app, app.fastify);
registerLegalRoutes(app, app.fastify);
registerSecurityRoutes(app, app.fastify);
registerDeviceTrustRoutes(app, app.fastify);
registerEmailAuthRoutes(app, app.fastify);
registerEmailVerificationRoutes(app, app.fastify);
registerEmailLinkVerificationRoutes(app, app.fastify);
registerSmsAutoReplyRoutes(app, app.fastify);
registerSmsAnalyzeReplyRoutes(app, app.fastify);
registerFinancialReportsRoutes(app, app.fastify);
registerSmsWebhookRoutes(app, app.fastify);
registerSecurityLayersRoutes(app, app.fastify);
registerInAppAlertsRoutes(app, app.fastify);
registerRiskPatternsRoutes(app, app.fastify);
registerUserSecurityProfileRoutes(app, app.fastify);
registerSecurityDashboardRoutes(app, app.fastify);
registerChatbotAnalyzeRoutes(app, app.fastify);
registerChatbotSmsAnalyzeRoutes(app, app.fastify);
registerChatbotStatsRoutes(app, app.fastify);
registerFraudAnalysisRoutes(app, app.fastify);

await app.run();
app.logger.info('MoMo Analytics application running');
