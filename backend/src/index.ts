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

await app.run();
app.logger.info('MoMo Analytics application running');
