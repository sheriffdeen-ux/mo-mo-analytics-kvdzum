import type { FastifyInstance } from "fastify";
import type { App } from "../index.js";

export function registerLegalRoutes(app: App, fastify: FastifyInstance) {
  // GET /api/legal/privacy-policy - Get privacy policy
  fastify.get("/api/legal/privacy-policy", async () => {
    app.logger.info("Fetching privacy policy");

    return {
      version: "1.0.0",
      lastUpdated: "2024-01-15T00:00:00Z",
      content: `
# Privacy Policy - MoMo Analytics

## Introduction
MoMo Analytics is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile money fraud detection and analytics service.

## 1. Information We Collect

### 1.1 SMS Messages
**Important: SMS messages themselves are NOT stored in our systems.** Only extracted transaction data from SMS messages is processed and stored:
- Transaction amount (in Ghana Cedis)
- Transaction type (sent, received, withdrawal, deposit)
- Merchant/recipient name (extracted from SMS)
- Account balance (extracted from SMS)
- Transaction date/time
- Mobile Money provider (MTN, Vodafone, AirtelTigo)

The original SMS text is temporarily processed for analysis but is not permanently stored.

### 1.2 User Information
- Full name
- Phone number (Ghana format)
- Email address (optional)
- Subscription status and plan
- Device information (device ID, FCM token for notifications)
- User preferences and settings

### 1.3 Transaction Analysis Data
- Fraud risk scores and assessments
- User confirmations of safe/fraudulent transactions
- Blocked merchants list
- Trusted merchants list
- Daily spending limits
- Alert sensitivity preferences

### 1.4 Payment Information
- Payment transactions via Paystack
- Subscription plan selection and history
- Payment reference numbers
- Transaction status and metadata

## 2. How We Use Your Information

We use collected information to:
- **Detect and prevent fraud** using 7-layer fraud detection analysis
- **Provide analytics** on your mobile money transactions
- **Send notifications** about suspicious activity
- **Process payments** for subscriptions via Paystack
- **Improve services** through statistical analysis
- **Comply with legal obligations**
- **Provide customer support**

## 3. Data Security & Encryption

### 3.1 Security Measures
- OTP codes are hashed using SHA-256 before storage
- All passwords and sensitive data are encrypted
- HTTPS/TLS encryption for all data in transit
- Database encryption at rest
- Rate limiting to prevent unauthorized access
- Webhook signature verification for Paystack transactions

### 3.2 Access Control
- User data is only accessible to the authenticated user
- Payment information is processed securely via Paystack
- Admin access is role-based and logged

## 4. Payment Processing

- **Payment Provider:** Paystack (https://paystack.com)
- **Payment Information:** Your payment transactions are processed by Paystack, not stored directly in our systems
- **Subscription Data:** We store subscription plans, status, and payment references only
- **Refund Policy:** Handled through Paystack according to their policies

## 5. Data Retention

- **SMS Messages:** Not stored permanently, only extracted data retained
- **Transaction Records:** Retained for user's subscription period + 30 days after cancellation
- **OTP Codes:** Automatically deleted after 10 minutes of creation
- **Payment Records:** Retained for 7 years (compliance requirement)
- **User Account:** Retained until user deletion request

## 6. User Rights

You have the right to:
- **Access:** Request all your personal data
- **Rectification:** Correct inaccurate data
- **Deletion:** Request deletion of your account and data
- **Export:** Download your transaction history as CSV
- **Opt-out:** Disable notifications and data collection
- **Data Portability:** Get your data in machine-readable format

## 7. Third-Party Services

### 7.1 Arkesel SMS Gateway
- Used for sending OTP codes to verify your Ghana phone number
- No SMS content is stored by Arkesel beyond delivery

### 7.2 Paystack
- Processes all subscription payments
- Does not store full card details (PCI DSS compliant)
- Handles payment authorization and security

### 7.3 FCM (Firebase Cloud Messaging)
- Used for push notifications
- Device tokens may be shared with FCM for notification delivery

## 8. International Data Transfers

While user data is processed in Ghana, some data may be processed by international services (Paystack, Firebase). These services comply with international data protection standards.

## 9. Changes to This Policy

We may update this Privacy Policy periodically. Continued use of MoMo Analytics constitutes acceptance of the updated policy.

## 10. Contact Us

For privacy concerns or data requests:
- Email: privacy@momoanalytics.com
- Phone: +233 XXX XXX XXXX

## 11. GDPR & Data Protection

If you are in the European Union, you have additional rights under GDPR. Please contact us for GDPR-specific requests.

---

Last Updated: 2024-01-15
Version: 1.0.0
`,
    };
  });

  // GET /api/legal/terms-of-service - Get terms of service
  fastify.get("/api/legal/terms-of-service", async () => {
    app.logger.info("Fetching terms of service");

    return {
      version: "1.0.0",
      lastUpdated: "2024-01-15T00:00:00Z",
      content: `
# Terms of Service - MoMo Analytics

## 1. Acceptance of Terms
By accessing and using MoMo Analytics, you accept and agree to be bound by the terms and provision of this agreement.

## 2. Use License
Permission is granted to temporarily download one copy of the materials (information or software) on MoMo Analytics for personal, non-commercial transitory viewing only.

## 3. Disclaimer
The materials on MoMo Analytics are provided on an 'as is' basis. MoMo Analytics makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.

## 4. Limitations
In no event shall MoMo Analytics or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on MoMo Analytics.

## 5. Accuracy of Materials
The materials appearing on MoMo Analytics could include technical, typographical, or photographic errors. MoMo Analytics does not warrant that any of the materials on our website are accurate, complete, or current.

## 6. User Conduct
Users agree not to:
- Use the service for illegal purposes
- Attempt to gain unauthorized access
- Interfere with service operations
- Harass other users

## 7. Limitation of Liability
MoMo Analytics shall not be liable for fraud detection inaccuracies. While we employ 7-layer fraud detection, no system is 100% accurate. Users should exercise caution with their financial data.

## 8. Subscription Terms
- Trial period: 14 days free access
- Cancellation: Can be cancelled anytime before billing
- Refunds: Subject to Paystack refund policy
- Recurring billing: Automatic on subscription renewal

## 9. Modifications
MoMo Analytics may revise these terms of service at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.

## 10. Governing Law
These terms and conditions are governed by and construed in accordance with the laws of Ghana.

---

Last Updated: 2024-01-15
Version: 1.0.0
`,
    };
  });
}
