// server.js - corrected, hardened, secure OTP + Paystack flow
// Keep this file at project root. Configure .env with:
//  MONGO_URI, PAYSTACK_SECRET_KEY, EMAIL_USER, EMAIL_PASS, ADMIN_PASS_HASH (or ADMIN_PASS), JWT_SECRET, FRONTEND_ORIGIN (optional)

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs-extra");
const path = require("node:path");
const axios = require("axios");
const mongoose = require("mongoose");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const dns = require('dns');
const rateLimit = require("express-rate-limit");
const Joi = require("joi");

const app = express();

/* ================== CONFIG ================== */
const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/luxe_jewelry";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const EMAIL_USER = (process.env.EMAIL_USER || "").trim();
const EMAIL_PASS = (process.env.EMAIL_PASS || "").replace(/\s+/g, "");
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587;
const SMTP_USER = (process.env.SMTP_USER || "").trim();
const SMTP_PASS = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
const ADMIN_USER = process.env.ADMIN_USER || "manager";
let ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH || "";

// hashed admin password preferred
const ADMIN_PASS_PLAIN = process.env.ADMIN_PASS || ""; // optional plain admin pass (dev only)
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || ""; // optional restrict CORS in production

/* ================== SECURITY VALIDATION ================== */
// CRITICAL: Validate JWT_SECRET is configured
if (!JWT_SECRET || JWT_SECRET === "CHANGE_THIS_SECRET") {
  console.error("[FATAL] JWT_SECRET not configured properly in .env");
  console.error(
    "[FATAL] Set JWT_SECRET environment variable with at least 32 random characters"
  );
  process.exit(1);
}

// CRITICAL: Warn if ADMIN_PASS_HASH not set
if (!ADMIN_PASS_HASH) {
  console.warn(
    "[WARNING] ADMIN_PASS_HASH not configured - admin login will be disabled"
  );
  if (process.env.NODE_ENV === "production") {
    console.error("[FATAL] ADMIN_PASS_HASH required in production environment");
    process.exit(1);
  }
}

console.log("[SECURITY] ✅ JWT_SECRET configured");
console.log("[SECURITY] ✅ Admin password hash configured");

/* ================== MIDDLEWARE & CORS ================== */
// tighten CORS for production if FRONTEND_ORIGIN provided
const corsOptions = FRONTEND_ORIGIN
  ? { origin: FRONTEND_ORIGIN, credentials: true }
  : { origin: true, credentials: true };

/* ================== SECURITY MIDDLEWARE ================== */
const compression = require("compression");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const csurf = require("csurf");

// Enable compression for all responses
app.use(compression());

// Security headers with CSP allowing inline scripts for frontend
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://js.paystack.co",
          "https://www.googletagmanager.com",
          "https://connect.facebook.net",
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://paystack.com",
        ],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          "https://api.paystack.co",
          "https://www.google-analytics.com",
          "https://www.facebook.com",
          "https://1mb0ksxv-5000.uks1.devtunnels.ms",
        ],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "data:"],
        frameSrc: ["https://checkout.paystack.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

// CORS
app.use(cors(corsOptions));

// Payload size limits - prevent DDoS attacks
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
// Cookie parser is required for cookie-based CSRF tokens
app.use(cookieParser());

// CSRF protection: use cookie-based tokens for SPA double-submit pattern
// Apply CSRF protection conditionally:
// - Skip CSRF for safe methods (GET/HEAD/OPTIONS)
// - Skip CSRF for API requests that present an Authorization Bearer token (JWT)
// - Enforce CSRF for browser form POSTs and unauthenticated state-changing requests
const csrfMiddleware = csurf({ cookie: { httpOnly: true, sameSite: "lax" } });

app.use((req, res, next) => {
  // Always skip for safe methods
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  // If an Authorization Bearer token is present, assume this is an API client using JWT
  // and skip CSRF verification (JWT in Authorization header is not vulnerable to CSRF).
  const auth = req.headers["authorization"] || req.headers["Authorization"];
  if (
    auth &&
    typeof auth === "string" &&
    auth.trim().toLowerCase().startsWith("bearer ")
  ) {
    return next();
  }

  // Exempt a small set of auth endpoints that accept credentials in the body and
  // do not rely on cookies (login/register). These endpoints are not vulnerable to CSRF
  // when they return a token rather than establishing a cookie-based session.
  const csrfExemptPaths = [
    "/api/login",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/verify-reset-token",
    "/api/staff/login",
    "/api/staff-login",
    "/api/init/admin",
    "/api/tickets",
  ];
  for (const p of csrfExemptPaths) {
    if (req.path === p || req.path.startsWith(p + "/")) return next();
  }

  // Otherwise apply CSRF middleware
  return csrfMiddleware(req, res, next);
});

// Expose a lightweight endpoint for clients to obtain CSRF token when needed
app.get("/api/csrf-token", csrfMiddleware, (req, res) => {
  try {
    const token = req.csrfToken();
    res.json({ success: true, csrfToken: token });
  } catch (error_) {
    console.error('[CSRF] Token generation failed:', error_.message);
    res
      .status(500)
      .json({ success: false, message: "Could not generate CSRF token" });
  }
});

console.log("[SECURITY] ✅ Compression enabled");
console.log("[SECURITY] ✅ Security headers (Helmet) enabled");
console.log("[SECURITY] ✅ Payload size limits set to 10MB");

/* ================== DEV MODE MIDDLEWARE ================== */
// Gate dev endpoints - only available in development, never in production
const isDevMode =
  process.env.NODE_ENV !== "production" &&
  process.env.ALLOW_DEV_ENDPOINTS === "true";
const devOnlyMiddleware = (req, res, next) => {
  if (isDevMode === false) {
    return res
      .status(403)
      .json({ success: false, message: "Dev endpoints disabled" });
  }
  next();
};

if (isDevMode === false) {
  console.log("[SECURITY] ✅ Dev endpoints GATED (production mode)");
} else {
  console.warn(
    "[SECURITY] ⚠️ Dev endpoints ENABLED (development only - disable before production!)"
  );
}

/* ================== VALIDATION SCHEMAS ================== */
// Joi validation schemas for input validation
const validationSchemas = {
  loginSchema: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Valid email required",
      "any.required": "Email is required",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Password must be at least 6 characters",
      "any.required": "Password is required",
    }),
  }),

  registerSchema: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().min(2).required(),
    phone: Joi.string().optional(),
  }),

  otpRequestSchema: Joi.object({
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().required(),
          productName: Joi.string().required(),
          price: Joi.number().positive().required(),
          quantity: Joi.number().positive().integer().required(),
        })
      )
      .required(),
    total: Joi.number().positive().required(),
  }),

  paymentSchema: Joi.object({
    reference: Joi.string().required(),
    otp: Joi.string().length(6).regex(/^\d+$/).required(),
  }),

  messageSchema: Joi.object({
    recipientId: Joi.string().hex().length(24).required(),
    subject: Joi.string().min(3).max(200).required(),
    body: Joi.string().min(5).max(5000).required(),
    priority: Joi.string().valid("low", "normal", "high").optional(),
    conversationId: Joi.string().optional(),
  }),

  newsletterSchema: Joi.object({
    email: Joi.string().email().required(),
  }),
};

// Validation middleware factory
const validateRequest = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((err) => err.message).join("; ");
    return res
      .status(400)
      .json({ success: false, message: `Validation error: ${messages}` });
  }

  req.validatedData = value;
  next();
};

console.log("[SECURITY] ✅ Input validation schemas loaded");

/* ================== DB CONNECT ================== */
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("[DB] MongoDB Connected Successfully"))
  .catch((error_) => console.error("[DB ERROR] MongoDB Connection Error:", error_.message));

/* ================== MODELS ================== */
// Import User model
const User = require("./model/user");
const Sale = require("./model/sales");

// Complaint model with replies
const Complaint = require("./model/complaint");

// Audit log model
const AuditLog = require("./model/auditLog");
const { processSaleRewards } = require("./services/referralRewards");

const xss = require("xss");

// Internal messaging system
const Message = require("./model/message");

// Wishlist and Reviews
const Wishlist = require("./model/wishlist");
const Review = require("./model/review");

/* ================== TICKETS (SUPPORT) ================== */
const TicketSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  email: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  status: {
    type: String,
    enum: ["open", "pending", "closed"],
    default: "open",
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
const Ticket = mongoose.model("Ticket", TicketSchema);

const Setting = require("./model/setting");

/* ================== SETTINGS */
// Product (include stock)
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, default: "General" },
  image: { type: String, default: "" },
  images: { type: [String], default: [] },
  description: { type: String, default: "" },
  sku: { type: String, default: null },
  materials: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  available: { type: Boolean, default: true },
  stock: { type: Number, default: 1 }, // if not used, keep as 1
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
});
const Product = mongoose.model("Product", ProductSchema);

// Category
const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});
const Category = mongoose.model("Category", CategorySchema);

// Newsletter Subscribers
const NewsletterSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, default: "" },
  subscribedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
});
const Newsletter = mongoose.model("Newsletter", NewsletterSchema);
const NewsletterSubscriber = Newsletter; // Alias for clarity

// Newsletter Campaigns
const NewsletterCampaignSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  message: { type: String, required: true },
  recipientCount: { type: Number, default: 0 },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  failedEmails: { type: [String], default: [] },
  status: { type: String, enum: ["draft", "sending", "sent", "failed"], default: "draft" },
  sentAt: { type: Date, default: Date.now },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});
const NewsletterCampaign = mongoose.model("NewsletterCampaign", NewsletterCampaignSchema);

// OTP Session (temporary)
const OtpSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  reference: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // Customer if logged in
  email: String,
  name: String,
  phone: String,
  address: String,
  amount: Number,
  items: [
    {
      productId: String,
      productName: String,
      price: Number,
      quantity: Number,
      subtotal: Number,
    },
  ],
  otpHash: String,
  otpExpiry: Date,
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
// TTL index to auto-delete when otpExpiry passes
OtpSessionSchema.index({ otpExpiry: 1 }, { expireAfterSeconds: 0 });
const OtpSession = mongoose.model("OtpSession", OtpSessionSchema);

/* ================== UPLOADS / MULTER ================== */
const uploadsDir = process.env.VERCEL
  ? path.join("/tmp", "luxe-jewelry-uploads")
  : path.join(__dirname, "uploads");
fs.ensureDirSync(uploadsDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

/* ================== EMAIL (Nodemailer) ================== */
if (!SMTP_USER || !SMTP_PASS) {
  console.warn(
    "[WARNING] SMTP_USER or SMTP_PASS not set. Emails will fail until configured."
  );
}

// Ensure stable DNS resolution for SMTP host (use public resolvers as fallback)
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  console.log('[DNS] Using public DNS resolvers:', dns.getServers());
} catch (e) {
  console.warn('[DNS] Could not set custom DNS servers, using system defaults');
}

const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_DEBUG = process.env.SMTP_DEBUG === 'true';
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  requireTLS: SMTP_SECURE,
  authMethod: process.env.SMTP_AUTH_METHOD || 'PLAIN',
  connectionTimeout: 30000,
  greetingTimeout: 20000,
  socketTimeout: 30000,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 14,
  debug: SMTP_DEBUG,
  logger: SMTP_DEBUG,
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
  },
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// Verify SMTP connectivity at startup and log detailed diagnostics
// NOTE: Commenting out verification as it may interfere with subsequent newsletter sends
console.log(`[SMTP] Configuration: host=${SMTP_HOST}, port=${SMTP_PORT}, user=${SMTP_USER || '(empty)'}`);
/* DISABLED: Startup verification
try {
  transporter.verify((err, success) => {
    if (err) {
      console.error('[SMTP] ❌ Connection failed');
      console.error('[SMTP] Error code:', err.code);
      console.error('[SMTP] Error message:', err.message);
      console.error('[SMTP] Troubleshoot: Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env');
      console.error('[SMTP] For Gmail: Ensure using app password (not regular password) if 2FA enabled');
      console.error('[SMTP] For Gmail: Visit https://myaccount.google.com/apppasswords to generate/verify');
    } else {
      console.log('[SMTP] ✅ Connected to SMTP server successfully');
    }
  });
} catch (verifyErr) {
  console.error('[SMTP] ❌ transporter.verify() threw exception:', verifyErr.message);
}
*/

async function sendOtpEmail(to, subject, text, html) {
  const msg = { from: SMTP_USER, to, subject, text, html };
  return sendMailWithRetry(msg);
}

// Wrapper to retry sendMail on transient DNS/resolution errors
async function sendMailWithRetry(mailOptions, maxRetries = 3) {
  let lastErr = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`[SMTP] Retry attempt ${attempt} for ${mailOptions.to}`);
        // re-apply public DNS resolvers before retrying
        try { dns.setServers(['8.8.8.8', '8.8.4.4']); } catch (e) {}
      }
      const info = await transporter.sendMail(mailOptions);
      return info;
    } catch (err) {
      lastErr = err;
      const isDnsErr = (err && (err.code === 'EDNS' || String(err.message).includes('queryA ETIMEOUT') || err.code === 'ENOTFOUND' || err.code === 'ETIMEOUT'));
      console.warn('[SMTP] sendMail error:', err && err.message);
      if (!isDnsErr || attempt === maxRetries) {
        // Non-retryable or out of attempts
        throw err;
      }
      // wait before retrying (backoff)
      const backoff = 1000 * attempt;
      await new Promise(r => setTimeout(r, backoff));
    }
  }
  throw lastErr;
}

async function sendOrderConfirmationEmail(to, orderData) {
  const { reference, items, amount, name, email: customerEmail } = orderData;

  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #ddd;">${
        item.name
      }</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${
        item.quantity || item.qty
      }</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₦${Number(
        item.price
      ).toLocaleString()}</td>
    </tr>
  `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Arial', sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #d4af37, #b6912e); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f9f6f1; padding: 30px; border-radius: 0 0 8px 8px; }
        .order-details { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .order-details h3 { margin-top: 0; color: #d4af37; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th { background: #d4af37; color: white; padding: 10px; text-align: left; }
        .total-row { background: #f0f0f0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .btn { display: inline-block; background: #d4af37; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💎 Luxe Jewelry</h1>
          <p>Order Confirmation</p>
        </div>
        <div class="content">
          <p>Dear <strong>${name}</strong>,</p>
          <p>Thank you for your order! We're excited to process it and get your beautiful jewelry to you soon.</p>
          
          <div class="order-details">
            <h3>Order Details</h3>
            <p><strong>Order Reference:</strong> ${reference}</p>
            <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Email:</strong> ${customerEmail}</p>
          </div>

          <h3>Items Ordered:</h3>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="2" style="padding: 10px; text-align: right;">Total Amount:</td>
                <td style="padding: 10px; text-align: right;">₦${Number(
                  amount
                ).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div class="order-details">
            <h3>What's Next?</h3>
            <p>✓ Your order has been confirmed and is being prepared</p>
            <p>✓ You will receive a shipping notification soon</p>
            <p>✓ Track your order in your customer dashboard</p>
          </div>

          <p style="text-align: center;">
            <a href="http://localhost:5000/customer-dashboard.html" class="btn">View Your Order</a>
          </p>

          <div class="footer">
            <p>If you have any questions, please contact us at ${SMTP_USER}</p>
            <p>© 2025 Luxe Jewelry. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const msg = {
    from: SMTP_USER,
    to,
    subject: `Order Confirmation - ${reference}`,
    html,
  };

  return transporter.sendMail(msg);
}

// Send order status update email
async function sendOrderStatusEmail(to, orderData, status) {
  const { reference, amount } = orderData;

  const statusMessages = {
    pending: {
      message: "Your order is being processed",
      icon: "⏳",
      color: "#ff9800",
    },
    processing: {
      message: "Your order is being prepared for shipment",
      icon: "📦",
      color: "#2196F3",
    },
    shipped: {
      message: "Your order has been shipped!",
      icon: "🚚",
      color: "#4CAF50",
    },
    delivered: {
      message: "Your order has been delivered",
      icon: "✅",
      color: "#4CAF50",
    },
    cancelled: {
      message: "Your order has been cancelled",
      icon: "❌",
      color: "#f44336",
    },
  };

  const statusInfo = statusMessages[status] || statusMessages.pending;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Arial', sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #d4af37, #b6912e); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f9f6f1; padding: 30px; border-radius: 0 0 8px 8px; }
        .status-box { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${
          statusInfo.color
        }; }
        .status-icon { font-size: 32px; margin-right: 10px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Status Update</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          
          <div class="status-box">
            <div style="display: flex; align-items: center;">
              <span class="status-icon">${statusInfo.icon}</span>
              <div>
                <h3 style="margin: 0; color: ${statusInfo.color};">${
    statusInfo.message
  }</h3>
                <p style="margin: 5px 0 0 0; color: #666;">Order #${reference}</p>
              </div>
            </div>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p><strong>Order Total:</strong> ₦${Number(
              amount
            ).toLocaleString()}</p>
            <p><strong>Status:</strong> <span style="color: ${
              statusInfo.color
            }; font-weight: bold;">${status.toUpperCase()}</span></p>
          </div>
          
          <p>Track your order in your customer dashboard for more details.</p>
          
          <div class="footer">
            <p>If you have any questions, please contact us at ${SMTP_USER}</p>
            <p>© 2025 Luxe Jewelry. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const msg = {
    from: SMTP_USER,
    to,
    subject: `Order Status Update - ${statusInfo.message} (#${reference})`,
    html,
  };

  return transporter.sendMail(msg);
}

/* ================== RATE LIMITING ================== */
const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  message: {
    success: false,
    message: "Too many OTP requests — try again later.",
  },
});
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6,
  message: { success: false, message: "Too many attempts — try again later." },
});
const payLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many payment attempts — try again later.",
  },
});

/* ================== HELPERS ================== */
function generateOTP(digits = 6) {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  return String(Math.floor(Math.random() * (max - min + 1) + min));
}
function generateReference() {
  return (
    "LUXE_" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 8).toUpperCase()
  );
}
function generateSessionId() {
  return crypto.randomBytes(12).toString("hex");
}

/* ================== AUTH MIDDLEWARE ================== */
function authenticateJWT(req, res, next) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!auth)
      return res
        .status(401)
        .json({ success: false, message: "Missing Authorization header" });
    const parts = String(auth).split(" ");
    const token = parts.length === 2 ? parts[1] : parts[0];
    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload.username || null;
    req.role = payload.role || null;
    next();
  } catch (error_) {
    console.warn('[AUTH] Token verification failed:', error_.message);
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
}

function verifyRole(required) {
  return (req, res, next) => {
    if (!req.role)
      return res
        .status(403)
        .json({ success: false, message: "No role on token" });
    if (Array.isArray(required)) {
      if (required.includes(req.role)) return next();
    } else if (req.role === required) {
      return next();
    }
    return res
      .status(403)
      .json({ success: false, message: "Insufficient privileges" });
  };
}

// Helper: resolve a user by token username/email. Do NOT create DB users here —
// Option A: messages can have no `senderId` and will be matched by email when necessary.
async function findOrCreateUserFromToken(tokenUser, role) {
  if (!tokenUser) return null;
  // try email then username
  let u = await User.findOne({ email: tokenUser });
  if (!u) u = await User.findOne({ username: tokenUser });
  // If tokenUser matches an env-provided username (e.g. ADMIN_USER), try map to a DB user by role
  if (!u) {
    try {
      const envCandidates = [
        ADMIN_USER,
        process.env.SITE_ADMIN_USER,
        process.env.ADMIN2_USER,
      ];
      if (envCandidates.includes(String(tokenUser))) {
        // Find a single user with the requested role. Only map when exactly one exists to avoid ambiguity.
        const users = await User.find({ role: role }).limit(2);
        if (users?.length === 1) return users[0];
      }
    } catch (error_) {
      console.warn(
        "Mapping error resolving envCandidates:",
        error_?.message || error_
      );
    }
  }

  return u || null;
}

/* ================== ADMIN PASSWORD BOOTSTRAP ================== */
async function bootstrapAdminPassword() {
  try {
    if (!ADMIN_PASS_HASH && ADMIN_PASS_PLAIN) {
      console.warn(
        "[WARNING] ADMIN_PASS_HASH missing — hashing ADMIN_PASS from .env (dev only)."
      );
      ADMIN_PASS_HASH = await bcrypt.hash(ADMIN_PASS_PLAIN, 10);
    }
  } catch (error_) {
    console.error("Error preparing admin password:", error_.message);
  }
}

bootstrapAdminPassword();

/* ================== SAFE STATIC SERVING ================== */
const publicDir = path.join(__dirname, "public");
const mobileDir = path.join(__dirname, "mobile");

// Serve mobile app
if (fs.existsSync(mobileDir)) {
  app.use("/mobile", express.static(mobileDir));
  console.log("[SERVER] Serving mobile app from ./mobile");
}

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.use("/uploads", express.static(uploadsDir));
  console.log("[SERVER] Serving static files from ./public");
} else {
  // fallback: serve uploads and warn
  app.use("/uploads", express.static(uploadsDir));
  console.warn(
    "[WARNING] ./public not found — falling back to root/static. Consider moving frontend files to ./public for safety."
  );
}

/* ================== ROUTES - PRODUCTS, CATEGORIES, COMPLAINTS, SALES (READ) ================== */

/* GET all products */
app.get("/api/products", async (req, res) => {
  try {
    const { page = 1, limit = 20, category, available } = req.query;
    console.log("[PRODUCTS] GET /api/products - query:", {
      page,
      limit,
      category,
      available,
    });

    const filter = {};
    if (category) filter.category = category;
    if (available !== undefined) filter.available = available === "true";

    console.log("[PRODUCTS] Using filter:", filter);

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

    const products = await Product.find(filter)
      .skip(skip)
      .limit(Number.parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(filter);

    console.log(
      "[PRODUCTS] Returning:",
      products.length,
      "products out of",
      total,
      "total"
    );

    res.json({
      success: true,
      products,
      pagination: {
        current: Number.parseInt(page),
        total: Math.ceil(total / Number.parseInt(limit)),
        limit: Number.parseInt(limit),
        count: products.length,
        totalItems: total,
      },
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching products" });
  }
});

/* GET single product by id */
app.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res.json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ success: false, message: "Error fetching product" });
  }
});

/* POST add product - protected below (admin) */

// Protect product creation - only admin
app.post(
  "/api/products",
  authenticateJWT,
  verifyRole("admin"),
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, price, category, available, stock } = req.body;
      if (!name || !price)
        return res
          .status(400)
          .json({ success: false, message: "Name and price required" });

      const imagePath = req.file
        ? `/uploads/${req.file.filename}`
        : req.body.image || "";
      const newProduct = new Product({
        name,
        price: Number.parseFloat(price),
        category: category || "General",
        image: imagePath,
        available: available !== "false",
        stock: stock === undefined ? 1 : Number(stock),
      });

      await newProduct.save();
      res.json({ success: true, product: newProduct });
    } catch (err) {
      console.error("Error saving product (admin):", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to save product" });
    }
  }
);

/* PATCH update product (admin protected version below) */

// Protect product update for admin
app.patch(
  "/api/products/:id",
  authenticateJWT,
  verifyRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const update = req.body;
      if (update.stock !== undefined) {
        update.stock = Number(update.stock);
        update.available = update.stock > 0;
      }
      const product = await Product.findByIdAndUpdate(id, update, {
        new: true,
      });
      if (!product)
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      res.json({ success: true, product });
    } catch (err) {
      console.error("Error updating product (admin):", err);
      res.status(500).json({ success: false });
    }
  }
);

/* DELETE product (admin protected version below) */

// Protect product delete for admin
app.delete(
  "/api/products/:id",
  authenticateJWT,
  verifyRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);
      if (!product)
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });

      if (product.image) {
        const filePath = path.join(__dirname, product.image);
        if (fs.existsSync(filePath)) {
          try {
            await fs.unlink(filePath);
          } catch (e) {
            console.warn("Failed to delete product image:", e.message);
          }
        }
      }

      await Product.findByIdAndDelete(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting product (admin):", err);
      res.status(500).json({ success: false });
    }
  }
);

/* CATEGORIES */
// Create category - admin only
app.post(
  "/api/categories",
  authenticateJWT,
  verifyRole("admin"),
  async (req, res) => {
    try {
      const { name } = req.body;
      if (!name)
        return res
          .status(400)
          .json({ success: false, message: "Category name required" });
      const exists = await Category.findOne({ name });
      if (exists)
        return res
          .status(400)
          .json({ success: false, message: "Category already exists" });
      const category = new Category({ name });
      await category.save();
      res.json({ success: true, category });
    } catch (err) {
      console.error("Error adding category:", err);
      res.status(500).json({ success: false });
    }
  }
);

// Public: list categories
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ success: false });
  }
});

// Delete category - admin only
app.delete(
  "/api/categories/:id",
  authenticateJWT,
  verifyRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      await Category.findByIdAndDelete(id);
      res.json({ success: true, message: "Category deleted successfully" });
    } catch (err) {
      console.error("Error deleting category:", err);
      res.status(500).json({ success: false });
    }
  }
);

/* ================== COMPLAINT MIDDLEWARE ================== */
// Local customer token verifier for complaints endpoint (before import)
const verifyCustomerTokenLocal = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      console.log("[COMPLAINT-AUTH] No token provided");
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    console.log("[COMPLAINT-AUTH] Token verified. userId:", req.userId);
    next();
  } catch (error) {
    console.error("[COMPLAINT-AUTH] Token verification failed:", error.message);
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};

/* COMPLAINTS */
app.post("/api/complaints", verifyCustomerTokenLocal, async (req, res) => {
  try {
    let { name, phone, email, product, message, subject } = req.body;
    // sanitize inputs
    name = xss(String(name || ""));
    phone = xss(String(phone || ""));
    email = xss(String(email || ""));
    product = xss(String(product || ""));
    message = xss(String(message || ""));
    subject = xss(String(subject || ""));
    const customerId = req.userId || null; // Get customerId if logged in via JWT

    console.log("[COMPLAINT-CREATE] Customer ID:", customerId);
    console.log("[COMPLAINT-CREATE] Email:", email);

    if (!email || !message) {
      console.log("[COMPLAINT-CREATE] Missing email or message");
      return res
        .status(400)
        .json({ success: false, message: "Email and message required." });
    }

    // Create complaint with both old and new fields for compatibility
    const newComplaint = new Complaint({
      customerId,
      subject: subject || product || "General Complaint",
      message,
      name: name || "Anonymous",
      phone: phone || "",
      email: email || "",
      product: product || "",
    });

    await newComplaint.save();
    console.log(
      "[COMPLAINT-CREATE] Complaint saved successfully with ID:",
      newComplaint._id
    );
    try {
      await AuditLog.create({
        userId: customerId,
        action: "order_placed",
        status: "success",
        details: { complaintId: newComplaint._id },
        ipAddress: req.ip,
      });
    } catch (e) {
      console.warn(
        "[COMPLAINT-CREATE] AuditLog create failed:",
        e?.message ? e?.message : e
      );
    }
    res
      .status(201)
      .json({
        success: true,
        message: "Complaint submitted successfully!",
        complaintId: newComplaint._id,
      });
  } catch (error) {
    console.error("[COMPLAINT-CREATE] Error saving complaint:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});
/* ================== TICKETS ROUTES ================== */
// Create ticket (public)
app.post("/api/tickets", async (req, res) => {
  try {
    const { title, description, email } = req.body;
    if (!title || !description)
      return res
        .status(400)
        .json({ success: false, message: "Title and description required" });
    const ticket = new Ticket({ title, description, email: email || "" });
    await ticket.save();
    res.status(201).json({ success: true, ticket });
  } catch (err) {
    console.error("Error creating ticket:", err);
    res.status(500).json({ success: false });
  }
});

// Admin: list tickets
app.get(
  "/api/tickets",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const tickets = await Ticket.find().sort({ createdAt: -1 });
      res.json(tickets);
    } catch (err) {
      console.error("Error fetching tickets:", err);
      res.status(500).json({ success: false });
    }
  }
);

// Admin: update ticket
app.patch(
  "/api/tickets/:id",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const update = req.body;
      update.updatedAt = new Date();
      const t = await Ticket.findByIdAndUpdate(id, update, { new: true });
      if (!t)
        return res
          .status(404)
          .json({ success: false, message: "Ticket not found" });
      res.json({ success: true, ticket: t });
    } catch (err) {
      console.error("Error updating ticket:", err);
      res.status(500).json({ success: false });
    }
  }
);

// Admin: delete ticket
app.delete(
  "/api/tickets/:id",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      await Ticket.findByIdAndDelete(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting ticket:", err);
      res.status(500).json({ success: false });
    }
  }
);

/* ================== SETTINGS ROUTES ================== */
// Get all settings
app.get("/api/settings-old-duplicate", authenticateJWT, async (req, res) => {
  try {
    const settings = await Setting.find();
    res.json(settings);
  } catch (err) {
    console.error("Error fetching settings:", err);
    res.status(500).json({ success: false });
  }
});

// Update or create setting (admin)
app.post(
  "/api/settings-old-duplicate",
  authenticateJWT,
  verifyRole("admin"),
  async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key)
        return res
          .status(400)
          .json({ success: false, message: "Key required" });
      const s = await Setting.findOneAndUpdate(
        { key },
        { value, updatedAt: new Date() },
        { upsert: true, new: true }
      );
      res.json({ success: true, setting: s });
    } catch (err) {
      console.error("Error saving setting:", err);
      res.status(500).json({ success: false });
    }
  }
);
// Complaints listing & deletion - manager only
// Get complaints for the logged-in customer
app.get(
  "/api/complaints/customer",
  verifyCustomerTokenLocal,
  async (req, res) => {
    try {
      const userId = req.userId;
      console.log("[COMPLAINT-FETCH] Fetching complaints for userId:", userId);

      if (!userId) {
        console.log("[COMPLAINT-FETCH] No userId found in token");
        return res
          .status(401)
          .json({
            success: false,
            message: "Unable to resolve user from token",
          });
      }

      // Get user to find email
      const user = await User.findById(userId);
      if (!user) {
        console.log("[COMPLAINT-FETCH] User not found for userId:", userId);
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      console.log("[COMPLAINT-FETCH] User email:", user.email);

      // Pagination
      const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
      const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(req.query.limit || "20", 10))
      );
      const skip = (page - 1) * limit;

      // Find complaints by customerId (preferred) or email
      const filter = { $or: [{ customerId: userId }, { email: user.email }] };
      const total = await Complaint.countDocuments(filter);
      const complaints = await Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "replies.managerId",
          select: "name email",
        });

      // Format complaints to include manager name in replies
      const formattedComplaints = complaints.map((complaint) => {
        const plainComplaint = complaint.toObject();
        plainComplaint.replies = plainComplaint.replies.map((reply) => ({
          ...reply,
          managerId: reply.managerId?._id || reply.managerId,
          managerName: reply.managerId?.name || "Manager",
        }));
        return plainComplaint;
      });

      console.log(
        "[COMPLAINT-FETCH] Found",
        formattedComplaints.length,
        "complaints"
      );
      try {
        await AuditLog.create({
          userId,
          action: "order_list",
          status: "success",
          details: { count: formattedComplaints.length, page, limit, total },
          ipAddress: req.ip,
        });
      } catch (auditError_) {
        console.warn('[AUDIT] Failed to log order list:', auditError_.message);
      }
      res.json({
        success: true,
        complaints: formattedComplaints,
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error(
        "[COMPLAINT-FETCH] Error fetching customer complaints:",
        error
      );
      res
        .status(500)
        .json({ success: false, message: "Error fetching complaints" });
    }
  }
);
app.get(
  "/api/complaints",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
      const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(req.query.limit || "50", 10))
      );
      const skip = (page - 1) * limit;

      const total = await Complaint.countDocuments({});
      const complaints = await Complaint.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "replies.managerId", select: "name email" });
      try {
        await AuditLog.create({
          userId: null,
          action: "admin_action",
          status: "success",
          details: { endpoint: "/api/complaints", page, limit, total },
          ipAddress: req.ip,
        });
      } catch (auditError_) {
        console.warn('[AUDIT] Failed to log admin action:', auditError_.message);
      }
      res.json({
        success: true,
        complaints,
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error("Error fetching complaints:", error);
      res
        .status(500)
        .json({ success: false, message: "Error fetching complaints" });
    }
  }
);
app.delete(
  "/api/complaints/:id",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      await Complaint.findByIdAndDelete(id);
      res.json({ success: true, message: "Complaint deleted successfully" });
    } catch (error) {
      console.error("Error deleting complaint:", error);
      res
        .status(500)
        .json({ success: false, message: "Error deleting complaint" });
    }
  }
);

// Manager reply to complaint
app.post(
  "/api/complaints/:id/reply",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const xss = require("xss");
      const { message } = req.body;
      const safeMessage = xss(String(message || "").trim());
      if (!message) {
        return res
          .status(400)
          .json({ success: false, message: "Reply message required" });
      }
      const complaint = await Complaint.findById(id);
      if (!complaint) {
        return res
          .status(404)
          .json({ success: false, message: "Complaint not found" });
      }
      // Get manager user object to get their ID
      const manager = await User.findOne({ email: req.user });
      const managerId = manager ? manager._id : null;

      complaint.replies.push({ managerId, message: safeMessage });
      await complaint.save();
      res.json({
        success: true,
        message: "Reply added",
        replies: complaint.replies,
      });
    } catch (error) {
      console.error("Error replying to complaint:", error);
      res
        .status(500)
        .json({ success: false, message: "Error replying to complaint" });
    }
  }
);

/* ================== INTERNAL MESSAGING (Manager-Admin Communication) ================== */

// Send message (manager or admin to the other)
app.post(
  "/api/messages",
  authenticateJWT,
  validateRequest(validationSchemas.messageSchema),
  async (req, res) => {
    try {
      const { recipientId, subject, body, priority, conversationId } =
        req.validatedData;

      // Resolve sender (try email/username). Under Option A we DO NOT create DB users.
      let sender = await findOrCreateUserFromToken(req.user, req.role);
      // sender may be null (env-authenticated identity without DB user)
      const senderRole = req.role || (sender ? sender.role : "admin");
      const senderIdVal = sender ? sender._id : undefined;
      const senderNameVal = sender
        ? sender.name || sender.username
        : req.user || "Unknown";
      // Always store the token identity so token-only senders can be matched in `sent`
      const senderEmailVal = sender ? sender.email || "" : req.user || "";

      // Validate recipient (recipient must exist in DB for now)
      const recipient = recipientId ? await User.findById(recipientId) : null;
      if (!recipient) {
        return res
          .status(404)
          .json({ success: false, message: "Recipient not found" });
      }

      // Ensure communication only between manager and admin
      if (
        !["manager", "admin"].includes(senderRole) ||
        !["manager", "admin"].includes(recipient.role)
      ) {
        return res
          .status(403)
          .json({ success: false, message: "Invalid communication" });
      }

      if (senderRole === recipient.role) {
        return res
          .status(403)
          .json({
            success: false,
            message: "Can only message between manager and admin roles",
          });
      }

      const newMessage = new Message({
        senderId: senderIdVal,
        senderRole,
        senderName: senderNameVal,
        senderEmail: senderEmailVal,
        recipientId: recipient._id,
        recipientRole: recipient.role,
        recipientName: recipient.name || recipient.username || "",
        recipientEmail: recipient.email || "",
        subject: subject || "No Subject",
        body,
        priority: priority || "normal",
        conversationId: conversationId || `conv_${Date.now()}`,
      });

      await newMessage.save();
      console.log("[MSG SAVED]", {
        id: newMessage._id,
        senderId: String(newMessage.senderId || ""),
        senderName: newMessage.senderName,
        senderEmail: newMessage.senderEmail,
        recipientId: String(newMessage.recipientId || ""),
        recipientName: newMessage.recipientName,
        recipientEmail: newMessage.recipientEmail,
        subject: newMessage.subject,
      });

      res.status(201).json({
        success: true,
        message: "Message sent successfully",
        messageId: newMessage._id,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      res
        .status(500)
        .json({ success: false, message: "Error sending message" });
    }
  }
);

// Get inbox (all messages for current user)
app.get("/api/messages/inbox", authenticateJWT, async (req, res) => {
  try {
    const tokenUser = req.user;
    // Try resolve tokenUser to a DB user by email, username, role mapping, or id
    let dbUser = null;
    if (tokenUser) {
      dbUser = await findOrCreateUserFromToken(tokenUser, req.role);
      if (!dbUser) {
        try {
          const maybeId = tokenUser;
          if (mongoose.Types.ObjectId.isValid(maybeId)) {
            const uu = await User.findById(maybeId);
            if (uu) dbUser = uu;
          }
        } catch (resolveError_) {
          console.warn(
            "Error resolving tokenUser to DB id:",
            resolveError_?.message || resolveError_
          );
        }
      }
    }

    // Build query to match recipient by DB id, email, or name (covers env tokens)
    const orClauses = [];
    if (dbUser) orClauses.push({ recipientId: dbUser._id });
    if (tokenUser) {
      const items = [
        { recipientEmail: tokenUser },
        { recipientName: tokenUser },
      ];
      try {
        const esc = String(tokenUser).replaceAll(
          /[.*+?^${}()|[\]\\]/g,
          String.raw`\\$&`
        );
        items.push(
          { recipientEmail: { $regex: esc, $options: "i" } },
          { recipientName: { $regex: esc, $options: "i" } }
        );
      } catch (regexError_) {
        console.warn(
          "Regex build failed for tokenUser (recipient):",
          regexError_?.message || regexError_
        );
      }
      if (mongoose.Types.ObjectId.isValid(tokenUser))
        items.push({ recipientId: tokenUser });
      orClauses.push(...items);
    }

    if (!orClauses.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const messages = await Message.find({ $or: orClauses, isArchived: false })
      .populate("senderId", "name email role")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, messages });
  } catch (error) {
    console.error("Error fetching inbox:", error);
    res.status(500).json({ success: false, message: "Error fetching inbox" });
  }
});

// Get sent messages
app.get("/api/messages/sent", authenticateJWT, async (req, res) => {
  try {
    const tokenUser = req.user;
    // Try resolve tokenUser to a DB user by email, username, role mapping, or id
    let dbUser = null;
    if (tokenUser) {
      dbUser = await findOrCreateUserFromToken(tokenUser, req.role);
      if (!dbUser) {
        try {
          const maybeId = tokenUser;
          if (mongoose.Types.ObjectId.isValid(maybeId)) {
            const uu = await User.findById(maybeId);
            if (uu) dbUser = uu;
          }
        } catch (resolveError_) {
          // ignore
          console.warn('Error resolving user ID:', resolveError_.message);
        }
      }
    }

    const orClauses = [];
    if (dbUser) orClauses.push({ senderId: dbUser._id });
    if (tokenUser) {
      const items = [{ senderEmail: tokenUser }, { senderName: tokenUser }];
      try {
        const esc = String(tokenUser).replaceAll(
          /[.*+?^${}()|[\]\\]/g,
          String.raw`\\$&`
        );
        items.push(
          { senderEmail: { $regex: esc, $options: "i" } },
          { senderName: { $regex: esc, $options: "i" } }
        );
      } catch (regexError_) {
        console.warn(
          "Regex build failed for tokenUser (sender):",
          regexError_?.message || regexError_
        );
      }
      if (mongoose.Types.ObjectId.isValid(tokenUser))
        items.push({ senderId: tokenUser });
      orClauses.push(...items);
    }

    if (!orClauses.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const messages = await Message.find({ $or: orClauses, isArchived: false })
      .populate("recipientId", "name email role")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, messages });
  } catch (error) {
    console.error("Error fetching sent messages:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching sent messages" });
  }
});

// Get conversation thread
app.get(
  "/api/messages/conversation/:conversationId",
  authenticateJWT,
  async (req, res) => {
    try {
      const { conversationId } = req.params;

      const messages = await Message.find({ conversationId })
        .populate("senderId", "name email role")
        .populate("recipientId", "name email role")
        .sort({ createdAt: 1 });

      res.json({ success: true, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res
        .status(500)
        .json({ success: false, message: "Error fetching conversation" });
    }
  }
);

// Get archived messages for current user (either as sender or recipient)
app.get("/api/messages/archived", authenticateJWT, async (req, res) => {
  try {
    const tokenUser = req.user;
    let dbUser = null;
    if (tokenUser) {
      dbUser = await findOrCreateUserFromToken(tokenUser, req.role);
      if (!dbUser) {
        try {
          if (mongoose.Types.ObjectId.isValid(tokenUser)) {
            const uu = await User.findById(tokenUser);
            if (uu) dbUser = uu;
          }
        } catch (e) {
          console.warn(
            "Error resolving tokenUser to DB id (archived):",
            e && e.message ? e.message : e
          );
        }
      }
    }

    const orClauses = [];
    if (dbUser) {
      orClauses.push({ recipientId: dbUser._id }, { senderId: dbUser._id });
    }
    if (tokenUser) {
      const items = [
        { recipientEmail: tokenUser },
        { senderEmail: tokenUser },
        { recipientName: tokenUser },
        { senderName: tokenUser },
      ];
      try {
        const esc = String(tokenUser).replace(
          /[.*+?^${}()|[\]\\]/g,
          String.raw`\\$&`
        );
        items.push(
          { recipientEmail: { $regex: esc, $options: "i" } },
          { senderEmail: { $regex: esc, $options: "i" } },
          { recipientName: { $regex: esc, $options: "i" } },
          { senderName: { $regex: esc, $options: "i" } }
        );
      } catch (e) {
        console.warn(
          "Regex build failed for tokenUser (archived):",
          e?.message ? e?.message : e
        );
      }
      if (mongoose.Types.ObjectId.isValid(tokenUser)) {
        items.push({ recipientId: tokenUser }, { senderId: tokenUser });
      }
      orClauses.push(...items);
    }

    if (!orClauses.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const messages = await Message.find({ $or: orClauses, isArchived: true })
      .populate("senderId", "name email role")
      .populate("recipientId", "name email role")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, messages });
  } catch (error) {
    console.error("Error fetching archived messages:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching archived messages" });
  }
});

// Mark message as read
app.put("/api/messages/:id/read", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findByIdAndUpdate(
      id,
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    res.json({ success: true, message });
  } catch (error) {
    console.error("Error marking message as read:", error);
    res.status(500).json({ success: false, message: "Error updating message" });
  }
});

// Archive message
app.put("/api/messages/:id/archive", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findByIdAndUpdate(
      id,
      { isArchived: true },
      { new: true }
    );

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    res.json({ success: true, message: "Message archived" });
  } catch (error) {
    console.error("Error archiving message:", error);
    res
      .status(500)
      .json({ success: false, message: "Error archiving message" });
  }
});

// Unarchive message (restore)
app.put("/api/messages/:id/unarchive", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findByIdAndUpdate(
      id,
      { isArchived: false },
      { new: true }
    );

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    res.json({
      success: true,
      message: "Message unarchived",
      messageDoc: message,
    });
  } catch (error) {
    console.error("Error unarchiving message:", error);
    res
      .status(500)
      .json({ success: false, message: "Error unarchiving message" });
  }
});

// Delete message
app.delete("/api/messages/:id", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findByIdAndDelete(id);

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    res.json({ success: true, message: "Message deleted" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ success: false, message: "Error deleting message" });
  }
});

// Get unread message count
app.get("/api/messages/unread/count", authenticateJWT, async (req, res) => {
  try {
    const tokenUser = req.user;
    let dbUser = null;
    if (tokenUser) {
      dbUser = await findOrCreateUserFromToken(tokenUser, req.role);
      if (!dbUser) {
        try {
          if (mongoose.Types.ObjectId.isValid(tokenUser)) {
            const uu = await User.findById(tokenUser);
            if (uu) dbUser = uu;
          }
        } catch (e) {
          // Ignore ObjectId validation errors
        }
      }
    }

    const orClauses = [];
    if (dbUser) orClauses.push({ recipientId: dbUser._id });
    if (tokenUser) {
      const items = [
        { recipientEmail: tokenUser },
        { recipientName: tokenUser },
      ];
      try {
        const esc = String(tokenUser).replace(
          /[.*+?^${}()|[\]\\]/g,
          String.raw`\\$&`
        );
        items.push(
          { recipientEmail: { $regex: esc, $options: "i" } },
          { recipientName: { $regex: esc, $options: "i" } }
        );
      } catch (e) {
        console.warn(
          "Regex build failed for tokenUser (unread):",
          e?.message ? e?.message : e
        );
      }
      if (mongoose.Types.ObjectId.isValid(tokenUser))
        items.push({ recipientId: tokenUser });
      orClauses.push(...items);
    }

    if (!orClauses.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const unreadCount = await Message.countDocuments({
      $or: orClauses,
      isRead: false,
      isArchived: false,
    });

    res.json({ success: true, unreadCount });
  } catch (error) {
    console.error("Error counting unread:", error);
    res.status(500).json({ success: false, message: "Error counting unread" });
  }
});

// Get inbox summary (total inbox count + unread count) - for dashboard widget
app.get("/api/messages/inbox/summary", authenticateJWT, async (req, res) => {
  try {
    const tokenUser = req.user;
    let dbUser = null;
    if (tokenUser) {
      dbUser = await findOrCreateUserFromToken(tokenUser, req.role);
      if (!dbUser) {
        try {
          if (mongoose.Types.ObjectId.isValid(tokenUser)) {
            const uu = await User.findById(tokenUser);
            if (uu) dbUser = uu;
          }
        } catch (e) {
          console.warn(
            "Error resolving tokenUser to DB id (summary):",
            e && e.message ? e.message : e
          );
        }
      }
    }

    const orClauses = [];
    if (dbUser) orClauses.push({ recipientId: dbUser._id });
    if (tokenUser) {
      const items = [
        { recipientEmail: tokenUser },
        { recipientName: tokenUser },
      ];
      try {
        const esc = String(tokenUser).replace(
          /[.*+?^${}()|[\]\\]/g,
          String.raw`\\$&`
        );
        items.push(
          { recipientEmail: { $regex: esc, $options: "i" } },
          { recipientName: { $regex: esc, $options: "i" } }
        );
      } catch (e) {
        console.warn(
          "Regex build failed for tokenUser (summary):",
          e && e.message ? e.message : e
        );
      }
      if (mongoose.Types.ObjectId.isValid(tokenUser))
        items.push({ recipientId: tokenUser });
      orClauses.push(...items);
    }

    if (!orClauses.length)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Get total inbox count (non-archived)
    const totalCount = await Message.countDocuments({
      $or: orClauses,
      isArchived: false,
    });

    // Get unread count
    const unreadCount = await Message.countDocuments({
      $or: orClauses,
      isRead: false,
      isArchived: false,
    });

    res.json({ success: true, totalCount, unreadCount });
  } catch (error) {
    console.error("Error getting inbox summary:", error);
    res
      .status(500)
      .json({ success: false, message: "Error getting inbox summary" });
  }
});

// Get all admins/managers for selecting recipients
app.get("/api/users/staff", authenticateJWT, async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit || "50", 10))
    );
    const skip = (page - 1) * limit;

    const filter = { role: { $in: ["admin", "manager"] } };
    const total = await User.countDocuments(filter);
    const staff = await User.find(filter)
      .select("_id name email role")
      .skip(skip)
      .limit(limit);

    try {
      const AuditLog = require("./model/auditLog");
      await AuditLog.create({
        userId: null,
        action: "admin_action",
        status: "success",
        details: { endpoint: "/api/users/staff", page, limit, total },
        ipAddress: req.ip,
      });
    } catch (e) {
      console.warn(
        "[STAFF-LIST] AuditLog create failed:",
        e?.message || e
      );
    }

    res.json({
      success: true,
      staff,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ success: false, message: "Error fetching staff" });
  }
});

// DEV: return last messages for debugging (temporary)
app.get("/api/dev/messages", devOnlyMiddleware, async (req, res) => {
  try {
    const msgs = await Message.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("senderId", "name email role")
      .populate("recipientId", "name email role");
    res.json({ success: true, count: msgs.length, messages: msgs });
  } catch (err) {
    console.error("Dev messages error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching messages" });
  }
});

// DEV: create/list users for testing (temporary - remove in production)
app.get("/api/dev/users", devOnlyMiddleware, async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    console.error("Dev users list error:", err);
    res.status(500).json({ success: false, message: "Error fetching users" });
  }
});

app.post("/api/dev/users", devOnlyMiddleware, async (req, res) => {
  try {
    const { email, name, password, role } = req.body;
    if (!email || !role || !password)
      return res
        .status(400)
        .json({ success: false, message: "email,role,password required" });
    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ success: false, message: "User exists" });
    const hashed = await bcrypt.hash(password, 12);
    const u = new User({
      email,
      username: email,
      name: name || email.split("@")[0],
      password: hashed,
      role,
    });
    await u.save();
    const out = u.toObject();
    delete out.password;
    res.status(201).json({ success: true, user: out });
  } catch (err) {
    console.error("Dev create user error:", err);
    res.status(500).json({ success: false, message: "Error creating user" });
  }
});

// DEV: mint JWT signed with server secret for testing (temporary)
app.post("/api/dev/token", devOnlyMiddleware, async (req, res) => {
  try {
    const { username, role } = req.body;
    if (!username || !role)
      return res
        .status(400)
        .json({ success: false, message: "username and role required" });
    const token = jwt.sign({ username, role }, JWT_SECRET, { expiresIn: "6h" });
    res.json({ success: true, token });
  } catch (err) {
    console.error("Dev token error:", err);
    res.status(500).json({ success: false, message: "Error creating token" });
  }
});

/* SALES (read) - sales created by webhook */
// Sales routes - admin and manager
app.get(
  "/api/sales",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const sales = await Sale.find().sort({ date: -1 });
      res.json(sales);
    } catch (err) {
      console.error("[ERROR] Error fetching sales:", err);
      res.status(500).json({ error: "Failed to load sales" });
    }
  }
);

// Create sales record (admin/manager only - for testing or manual entry)
app.post(
  "/api/sales",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const {
        reference,
        email,
        name,
        phone,
        address,
        amount,
        status,
        items,
        userId,
      } = req.body;

      if (!reference || !email || !amount) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Reference, email, and amount are required",
          });
      }

      // Check if sale already exists
      const existingSale = await Sale.findOne({ reference });
      if (existingSale) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Sale with this reference already exists",
          });
      }

      const newSale = new Sale({
        reference,
        userId: userId || null,
        email,
        name: name || "Customer",
        phone: phone || "",
        address: address || "",
        amount: Number(amount),
        status: status || "paid",
        paidAt: new Date(),
        items: items || [],
        date: new Date(),
      });

      await newSale.save();
      await processSaleRewards(newSale);

      res
        .status(201)
        .json({
          success: true,
          message: "Sale created successfully",
          sale: newSale,
        });
    } catch (err) {
      console.error("[ERROR] Error creating sale:", err);
      res
        .status(500)
        .json({
          success: false,
          error: "Failed to create sale",
          details: err.message,
        });
    }
  }
);

// Update order status
app.put(
  "/api/orders/:orderId/status",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res
          .status(400)
          .json({ success: false, message: "Status is required" });
      }

      // Valid statuses
      const validStatuses = ["pending", "processing", "shipped", "delivered", "archived"];
      if (!validStatuses.includes(status)) {
        return res
          .status(400)
          .json({ 
            success: false, 
            message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` 
          });
      }

      const updatedOrder = await Sale.findByIdAndUpdate(
        orderId,
        { $set: { status } },
        { new: true }
      );

      if (!updatedOrder) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      res.json({ 
        success: true, 
        message: `Order status updated to ${status}`,
        order: updatedOrder 
      });
    } catch (err) {
      console.error("[ERROR] Error updating order status:", err);
      res
        .status(500)
        .json({
          success: false,
          error: "Failed to update order status",
          details: err.message,
        });
    }
  }
);

app.get(
  "/api/total-sales",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const result = await Sale.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const totalRevenue = result[0]?.total || 0;
      res.json({ success: true, totalRevenue });
    } catch (err) {
      console.error("Error calculating total:", err);
      res.status(500).json({ success: false });
    }
  }
);

// Get top customers (public endpoint)
app.get("/api/top-customers", async (req, res) => {
  try {
    console.log("[TOP-CUSTOMERS] Fetching top customers");

    // Aggregate sales by email to get customer purchase data
    const customerData = await Sale.aggregate([
      {
        $group: {
          _id: "$email",
          customerName: { $first: "$name" },
          totalSpent: { $sum: "$amount" },
          purchases: { $sum: 1 },
          lastPurchase: { $max: "$date" },
        },
      },
      {
        $sort: { totalSpent: -1 },
      },
      {
        $limit: 20,
      },
    ]);

    console.log("[TOP-CUSTOMERS] Found", customerData.length, "top customers");
    res.json({ success: true, data: customerData });
  } catch (err) {
    console.error("[ERROR] Error fetching top customers:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to load top customers" });
  }
});

/* ================== SETTINGS ================== */
// Get settings (public endpoint - no auth required for reading)
app.get("/api/settings", async (req, res) => {
  try {
    const settings = await Setting.find();
    res.json(settings);
  } catch (err) {
    console.error("[SETTINGS] Error fetching settings:", err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching settings" });
  }
});

app.post(
  "/api/settings",
  authenticateJWT,
  verifyRole("admin"),
  async (req, res) => {
    try {
      const { key, value } = req.body;
      console.log("[SETTINGS-SAVE] Received:", {
        key,
        value,
        type: typeof value,
      });

      if (!key)
        return res
          .status(400)
          .json({ success: false, message: "Key required" });

      const setting = await Setting.findOneAndUpdate(
        { key },
        { key, value, updatedAt: new Date() },
        { upsert: true, new: true }
      );

      console.log("[SETTINGS-SAVE] Saved successfully:", {
        key,
        value: setting.value,
      });
      res.json({ success: true, setting });
    } catch (err) {
      console.error("[SETTINGS-SAVE] Error:", err.message);
      res
        .status(500)
        .json({
          success: false,
          message: "Error saving setting: " + err.message,
        });
    }
  }
);

/* ================== MANAGER/ADMIN LOGIN (DB-backed email authentication) ================== */
app.post("/api/staff-login", authLimiter, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    console.log("[STAFF-LOGIN] Request received:", {
      email,
      password: "***",
      role,
    });

    if (!email || !password || !role) {
      console.log(
        "[STAFF-LOGIN] Missing fields - email:",
        !!email,
        "password:",
        !!password,
        "role:",
        !!role
      );
      return res
        .status(400)
        .json({
          success: false,
          message: "Email, password, and role required",
        });
    }

    if (!["admin", "manager"].includes(role)) {
      console.log("[STAFF-LOGIN] Invalid role:", role);
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    // Find user by email with password field
    console.log("[STAFF-LOGIN] Looking up user with email:", email);
    const user = await User.findOne({ email }).select("+password");
    console.log(
      "[STAFF-LOGIN] User lookup result:",
      user ? `Found user ${user._id}` : "User not found"
    );

    if (!user) {
      console.log("[STAFF-LOGIN] REJECT - User not found for email:", email);
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    console.log(
      "[STAFF-LOGIN] User role:",
      user.role,
      "Requested role:",
      role,
      "Match:",
      user.role === role
    );

    // Check role matches
    if (user.role !== role) {
      console.log(
        "[STAFF-LOGIN] REJECT - Role mismatch. User role:",
        user.role,
        "Requested:",
        role
      );
      return res
        .status(401)
        .json({ success: false, message: "Invalid role for this account" });
    }

    // Compare password
    console.log(
      "[STAFF-LOGIN] Comparing passwords. Hash exists:",
      !!user.password,
      "Hash length:",
      user.password ? user.password.length : 0
    );
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("[STAFF-LOGIN] Password match result:", passwordMatch);

    if (!passwordMatch) {
      console.log("[STAFF-LOGIN] REJECT - Password mismatch");
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Generate token
    console.log("[STAFF-LOGIN] SUCCESS - Generating token");
    const token = jwt.sign(
      { username: user.email, role: user.role, userId: user._id.toString() },
      JWT_SECRET,
      { expiresIn: "6h" }
    );

    console.log("[STAFF-LOGIN] Token generated successfully");
    return res.json({ success: true, token, role: user.role, name: user.name });
  } catch (err) {
    console.error("[STAFF-LOGIN] Error:", err.message, err.stack);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ================== LEGACY MANAGER LOGIN (env-backed) ================== */
app.post("/api/manager/login", authLimiter, async (req, res) => {
  const { username, password } = req.body;
  try {
    if (username !== ADMIN_USER)
      return res.json({ success: false, message: "Invalid credentials" });
    if (!ADMIN_PASS_HASH) {
      console.error("ADMIN_PASS_HASH not configured in environment");
      return res
        .status(500)
        .json({ success: false, message: "Server misconfiguration" });
    }
    const match = await bcrypt.compare(password, ADMIN_PASS_HASH);
    if (!match)
      return res.json({ success: false, message: "Invalid credentials" });
    // Map env-based manager username to DB manager email when exactly one DB manager exists
    try {
      const mgrs = await User.find({ role: "manager" }).limit(2);
      const tokenUsername =
        mgrs?.length === 1 ? mgrs[0].email : username;
      const token = jwt.sign(
        { username: tokenUsername, role: "manager" },
        JWT_SECRET,
        { expiresIn: "4h" }
      );
      return res.json({ success: true, token });
    } catch (e) {
      const token = jwt.sign({ username, role: "manager" }, JWT_SECRET, {
        expiresIn: "4h",
      });
      return res.json({ success: true, token });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false });
  }
});

/* ================== STAFF EMAIL-BASED LOGIN ================== */

// Initialize first admin user (public endpoint for setup - use only once)
app.post("/api/init/admin", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if any admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ success: false, message: "Admin user already exists" });
    }

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "email and password required" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 8 characters",
        });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const adminUser = new User({
      email,
      username: name || email.split("@")[0],
      password: hashed,
      name: name || email,
      phone: "",
      role: "admin",
    });

    await adminUser.save();

    res.status(201).json({
      success: true,
      message:
        "Admin user created successfully. You can now login with these credentials.",
      user: { email, name: adminUser.name, role: "admin" },
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    res
      .status(500)
      .json({ success: false, message: "Error creating admin user" });
  }
});

// List staff users (manager) - only admin/manager
app.get(
  "/api/admin/users",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { role } = req.query;
      let query = { role: { $in: ["admin", "manager"] } };
      if (role) {
        // Support comma-separated roles: ?role=admin,manager
        const roles = role
          .split(",")
          .map((r) => r.trim())
          .filter((r) => ["admin", "manager"].includes(r));
        if (roles.length > 0) {
          query = { role: { $in: roles } };
        }
      }
      const users = await User.find(query, "-password").sort({ createdAt: -1 });
      res.json(users);
    } catch (err) {
      console.error("Error listing users:", err);
      res.status(500).json({ success: false });
    }
  }
);

// Create a staff user (manager can create manager or admin)
app.post(
  "/api/admin/users",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { email, password, name, phone, role } = req.body;
      if (!email || !password || !role)
        return res
          .status(400)
          .json({ success: false, message: "email,password,role required" });
      if (!["manager", "admin"].includes(role))
        return res
          .status(400)
          .json({
            success: false,
            message: "Invalid role - only manager/admin allowed",
          });
      const exists = await User.findOne({ email });
      if (exists)
        return res.status(400).json({ success: false, message: "User exists" });
      const hashed = await bcrypt.hash(password, 12);
      const u = new User({
        email,
        password: hashed,
        name: name || email,
        phone: phone || "",
        role,
      });
      await u.save();
      const out = u.toJSON();
      res.status(201).json({ success: true, user: out });
    } catch (err) {
      console.error("Error creating user:", err);
      res.status(500).json({ success: false });
    }
  }
);

// Get all customers (admin/manager can view)
app.get(
  "/api/customers",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const customers = await User.find({ role: "customer" }, "-password").sort(
        { createdAt: -1 }
      );
      res.json(customers);
    } catch (err) {
      console.error("Error listing customers:", err);
      res.status(500).json({ success: false });
    }
  }
);

// Admin/Manager: Referral analytics
app.get(
  "/api/admin/referrals",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const customers = await User.find({ role: "customer" })
        .select("name email referralCode referralCount referredBy referrals createdAt")
        .populate({ path: "referredBy", select: "name email referralCode" })
        .populate({ path: "referrals", select: "name email referralCode createdAt" });

      const totalReferralCount = customers.reduce(
        (sum, customer) => sum + (customer.referralCount || 0),
        0
      );
      const totalReferrers = customers.filter(
        (customer) => customer.referralCount && customer.referralCount > 0
      ).length;

      res.json({
        success: true,
        totalReferralCount,
        totalReferrers,
        customers,
      });
    } catch (err) {
      console.error("Error listing referral analytics:", err);
      res.status(500).json({ success: false, message: "Unable to load referral analytics" });
    }
  }
);

// Suspend/Unsuspend customer
app.patch(
  "/api/admin/customers/:id/suspend",
  authenticateJWT,
  verifyRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { suspended, reason } = req.body;

      const updateData = { suspended: suspended };
      if (suspended) {
        updateData.suspensionReason = reason || "Account suspended by administrator";
        updateData.suspendedAt = new Date();
      } else {
        updateData.suspensionReason = null;
        updateData.suspendedAt = null;
      }

      const user = await User.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ success: false, message: "Customer not found" });
      }

      console.log(`[ADMIN] Customer ${suspended ? 'suspended' : 'unsuspended'}: ${user.email}`);

      res.json({
        success: true,
        message: `Customer ${suspended ? 'suspended' : 'unsuspended'} successfully`,
        user
      });
    } catch (err) {
      console.error("Error updating customer suspension status:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// Admin/Manager: Subscribers listing (newsletter emails + registered users who opted-in)
app.get(
  "/api/admin/subscribers",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const page = Number.parseInt(req.query.page, 10) || 1;
      const limit = Math.min(Number.parseInt(req.query.limit, 10) || 25, 200);
      const q = (req.query.q || "").trim();
      const skip = (page - 1) * limit;

      const nQuery = q ? { email: { $regex: q, $options: "i" } } : {};
      const uQuery = q
        ? {
            email: { $regex: q, $options: "i" },
            "preferences.newsletter": true,
          }
        : { "preferences.newsletter": true };

      const NewsletterModel = mongoose.model("Newsletter");

      const [nItems, nTotal, uItems, uTotal] = await Promise.all([
        NewsletterModel.find(nQuery)
          .sort({ subscribedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        NewsletterModel.countDocuments(nQuery),
        User.find(uQuery, "-password")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(uQuery),
      ]);

      res.json({
        success: true,
        newsletter: { total: nTotal, items: nItems },
        users: { total: uTotal, items: uItems },
      });
    } catch (err) {
      console.error("Error listing subscribers:", err);
      res.status(500).json({ success: false });
    }
  }
);

// Admin/Manager: Toggle newsletter subscriber active state
app.patch(
  "/api/admin/subscribers/newsletter/:id/toggle",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const NewsletterModel = mongoose.model("Newsletter");
      const s = await NewsletterModel.findById(id);
      if (!s)
        return res
          .status(404)
          .json({ success: false, message: "Subscriber not found" });
      s.isActive = !s.isActive;
      await s.save();
      res.json({ success: true, subscriber: s });
    } catch (err) {
      console.error("Error toggling subscriber:", err);
      res.status(500).json({ success: false });
    }
  }
);

// Admin/Manager: Delete a newsletter subscriber
app.delete(
  "/api/admin/subscribers/newsletter/:id",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const NewsletterModel = mongoose.model("Newsletter");
      await NewsletterModel.findByIdAndDelete(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting subscriber:", err);
      res.status(500).json({ success: false });
    }
  }
);

// Update user (manager/admin)
app.patch(
  "/api/admin/users/:id",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const update = { ...req.body };
      if (update.password) {
        update.password = await bcrypt.hash(update.password, 12);
      }
      const u = await User.findByIdAndUpdate(id, update, { new: true }).select(
        "-password"
      );
      if (!u)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      res.json({ success: true, user: u });
    } catch (err) {
      console.error("Error updating user:", err);
      res.status(500).json({ success: false });
    }
  }
);

// Delete user (manager/admin)
app.delete(
  "/api/admin/users/:id",
  authenticateJWT,
  verifyRole(["admin", "manager"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      await User.findByIdAndDelete(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting user:", err);
      res.status(500).json({ success: false });
    }
  }
);

/* Unified login - supports manager and admin roles via env variables
   For manager: use ADMIN_USER + ADMIN_PASS_HASH / ADMIN_PASS
   For admin: set SITE_ADMIN_USER + SITE_ADMIN_PASS_HASH / SITE_ADMIN_PASS in .env
   Returns a JWT with `role` claim. */
app.post(
  "/api/login",
  authLimiter,
  validateRequest(validationSchemas.loginSchema),
  async (req, res) => {
    try {
      const { email, password } = req.validatedData;
      const username = email; // Use email as username for consistency

      // Add role parameter from query or body
      const role = req.body.role || "admin";
      console.log(`[LOGIN] Attempt - Email: ${email}, Role: ${role}`);
      if (!["admin", "manager", "customer"].includes(role)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid role" });
      }

      // Helper to validate against env credentials
      const validateEnvUser = async (envUser, envHash, envPlain) => {
        if (!envUser) return false;
        if (String(username) !== String(envUser)) return false;
        if (envHash) {
          const match = await bcrypt.compare(password, envHash);
          return !!match;
        }
        if (envPlain) return password === envPlain;
        return false;
      };

      if (role === "manager") {
        const ok = await validateEnvUser(
          ADMIN_USER,
          ADMIN_PASS_HASH,
          ADMIN_PASS_PLAIN
        );
        if (ok) {
          console.log("[LOGIN] Manager auth via ENV credentials");
          // Map env-based manager username to DB manager email when exactly one DB manager exists
          try {
            const mgrs = await User.find({ role: "manager" }).limit(2);
            const tokenUsername =
              mgrs?.length === 1 ? mgrs[0].email : ADMIN_USER;
            const token = jwt.sign(
              { username: tokenUsername, role: "manager" },
              JWT_SECRET,
              { expiresIn: "6h" }
            );
            return res.json({ success: true, token, role: "manager" });
          } catch (e) {
            const token = jwt.sign(
              { username: ADMIN_USER, role: "manager" },
              JWT_SECRET,
              { expiresIn: "6h" }
            );
            return res.json({ success: true, token, role: "manager" });
          }
        }

        // Fallback: check DB users for manager role
        try {
          console.log("[LOGIN] Checking database for manager...");
          const tryEmails = [];
          const uname = String(username || "").trim();
          if (!uname)
            return res.json({
              success: false,
              message: "Invalid manager credentials",
            });
          tryEmails.push(uname, uname.toLowerCase());
          if (!uname.includes("@")) tryEmails.push(`${uname}@example.com`);

          console.log("[LOGIN] Trying emails:", tryEmails);
          const dbUser = await User.findOne({
            email: { $in: tryEmails },
          }).select("+password");
          if (!dbUser) {
            console.log("[LOGIN] No DB user found");
            // no matching DB user
            return res.json({
              success: false,
              message: "Invalid manager credentials",
            });
          }
          console.log(
            "[LOGIN] Found user:",
            dbUser.email,
            "Role:",
            dbUser.role
          );
          if (dbUser.role !== "manager")
            return res.json({
              success: false,
              message: "Insufficient privileges",
            });
          if (!dbUser.password) {
            console.warn("Manager DB user has no password set:", dbUser.email);
            return res.json({
              success: false,
              message: "Manager credentials invalid",
            });
          }
          let matchDb = false;
          try {
            matchDb = await bcrypt.compare(password, dbUser.password);
            console.log("[LOGIN] Password match:", matchDb);
          } catch (err) {
            console.warn(
              "Manager DB bcrypt compare error:",
              err.message || err
            );
            return res.json({
              success: false,
              message: "Authentication error",
            });
          }
          if (!matchDb)
            return res.json({
              success: false,
              message: "Invalid manager credentials",
            });
          const token = jwt.sign(
            { username: dbUser.email, role: "manager" },
            JWT_SECRET,
            { expiresIn: "6h" }
          );
          console.log("[LOGIN] Manager auth successful");
          return res.json({ success: true, token, role: "manager" });
        } catch (e) {
          console.warn("Manager DB fallback check failed:", e.message || e);
          return res.json({ success: false, message: "Server error" });
        }
      }

      if (role === "admin") {
        const adminUser =
          process.env.SITE_ADMIN_USER || process.env.ADMIN2_USER || "";
        const adminHash =
          process.env.SITE_ADMIN_PASS_HASH ||
          process.env.ADMIN2_PASS_HASH ||
          "";
        const adminPlain =
          process.env.SITE_ADMIN_PASS || process.env.ADMIN2_PASS || "";
        const ok = await validateEnvUser(adminUser, adminHash, adminPlain);
        if (ok) {
          // Map env-based admin username to DB admin email when exactly one DB admin exists
          try {
            const admins = await User.find({ role: "admin" }).limit(2);
            const tokenUsername =
              admins && admins.length === 1 ? admins[0].email : adminUser;
            const token = jwt.sign(
              { username: tokenUsername, role: "admin" },
              JWT_SECRET,
              { expiresIn: "6h" }
            );
            return res.json({ success: true, token, role: "admin" });
          } catch (e) {
            const token = jwt.sign(
              { username: adminUser, role: "admin" },
              JWT_SECRET,
              { expiresIn: "6h" }
            );
            return res.json({ success: true, token, role: "admin" });
          }
        }

        // Fallback: check DB users for admin role
        try {
          const tryEmails = [];
          const uname = String(username || "").trim();
          if (!uname)
            return res.json({
              success: false,
              message: "Invalid admin credentials",
            });
          tryEmails.push(uname, uname.toLowerCase());
          if (!uname.includes("@")) tryEmails.push(`${uname}@example.com`);

          const dbUser = await User.findOne({
            email: { $in: tryEmails },
          }).select("+password");
          if (!dbUser)
            return res.json({
              success: false,
              message: "Invalid admin credentials or admin not configured",
            });
          if (dbUser.role !== "admin")
            return res.json({
              success: false,
              message: "Insufficient privileges",
            });
          if (!dbUser.password) {
            console.warn("Admin DB user has no password set:", dbUser.email);
            return res.json({
              success: false,
              message: "Admin credentials invalid",
            });
          }
          let matchDb = false;
          try {
            matchDb = await bcrypt.compare(password, dbUser.password);
          } catch (err) {
            console.warn("Admin DB bcrypt compare error:", err.message || err);
            return res.json({
              success: false,
              message: "Authentication error",
            });
          }
          if (!matchDb)
            return res.json({
              success: false,
              message: "Invalid admin credentials or admin not configured",
            });
          const token = jwt.sign(
            { username: dbUser.email, role: "admin" },
            JWT_SECRET,
            { expiresIn: "6h" }
          );
          return res.json({ success: true, token, role: "admin" });
        } catch (e) {
          console.warn("Admin DB fallback check failed:", e.message || e);
          return res.json({ success: false, message: "Server error" });
        }
      }

      return res.status(400).json({ success: false, message: "Invalid role" });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/* ================== PHASE 5 CACHE SERVICE INITIALIZATION ================== */
const cacheService = require("./services/cacheService");
const sessionCache = require("./middleware/sessionCache");

// Initialize cache service
console.log("[CACHE] Initializing Redis cache service...");

// Optional: Warm cache on startup
if (process.env.CACHE_WARM_ON_START === "true") {
  cacheService.warmCache({
    "cache:initialized": { timestamp: new Date(), version: "1.0.0" },
  });
}

/* ================== CUSTOMER AUTHENTICATION ROUTES & MIDDLEWARE ================== */
const {
  router: authRoutes,
  verifyCustomerToken,
  optionalVerifyCustomerToken,
} = require("./routes/auth");
const customerRoutes = require("./routes/customer");
const cachedProductsRoutes = require("./routes/cached-products");
const adminReferralsRoutes = require('./routes/admin-referrals');

// Health check endpoint for mobile app
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server is running", port: PORT, timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);

// Add logging middleware for customer routes
app.use("/api/customer", (req, res, next) => {
  console.log(`[ROUTE-HIT] ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// Add session cache middleware
app.use("/api/customer", sessionCache.middleware);

app.use("/api/customer", customerRoutes);

// Admin referrals management (protected)
app.use('/api/admin/referrals', adminReferralsRoutes);

/* ================== PHASE 5 CACHED PRODUCTS ROUTES ================== */
app.use("/api", cachedProductsRoutes);

/* ================== PHASE 5 WEEK 2+ ENHANCEMENTS ================== */
// HTTP Caching Headers Middleware
const {
  httpCacheMiddleware,
  conditionalRequestMiddleware,
  serviceWorkerCacheHeaders,
} = require("./middleware/httpCacheHeaders");
app.use(httpCacheMiddleware);
app.use(conditionalRequestMiddleware);
app.use(serviceWorkerCacheHeaders);
console.log("[HTTP-CACHE] HTTP caching headers middleware enabled");

// Service Worker Registration (Phase 6 PWA)
const { registerServiceWorker } = require("./services/serviceWorker");
registerServiceWorker(app);

// Cache Optimizer (Phase 5 Week 2)
const CacheOptimizer = require("./services/cacheOptimizer");
const cacheOptimizer = new CacheOptimizer(cacheService);
console.log("[CACHE-OPT] Cache optimizer initialized");

// Performance Monitor (Phase 7 Analytics)
const { monitor } = require("./services/performanceMonitor");
console.log("[MONITOR] Performance monitoring enabled");

// Performance Monitoring Routes
app.get("/api/monitoring/summary", (req, res) => {
  res.json(monitor.getSummary());
});

app.get("/api/monitoring/slow-routes", (req, res) => {
  res.json({ slowRoutes: monitor.getSlowRoutes(10) });
});

app.get("/api/monitoring/cache-report", (req, res) => {
  res.json(monitor.getCacheReport());
});

// Analytics Dashboard Endpoint
app.get("/api/analytics/dashboard", (req, res) => {
  res.json({
    summary: monitor.getSummary(),
    cacheReport: monitor.getCacheReport(),
    slowRoutes: monitor.getSlowRoutes(5),
    timestamp: new Date(),
  });
});

console.log(
  "[MONITORING] Analytics endpoints available at /api/monitoring/* and /api/analytics/dashboard"
);

/* ================== SECURE OTP FLOW (MongoDB sessions with TTL) ================== */
/*
Flow:
1) POST /api/otp/request  -> create OtpSession (no Sale), send OTP to user, return sessionId
2) POST /api/otp/verify   -> verify OTP for sessionId, mark session.verified = true
3) POST /api/pay          -> init Paystack using sessionId (must be verified)
4) Paystack webhook       -> on successful charge, create Sale in DB using session data & mark paid
*/

/* OTP request - supports both guest and logged-in customers */
app.post(
  "/api/otp/request",
  otpLimiter,
  optionalVerifyCustomerToken,
  validateRequest(validationSchemas.otpRequestSchema),
  async (req, res) => {
    try {
      const { email, phone, items, total: amount } = req.validatedData;
      const { name, address } = req.body; // Allow name and address in body as they're optional in some cases

      // Check if customer is suspended (if logged in)
      if (req.userId) {
        const user = await User.findById(req.userId);
        if (user && user.suspended) {
          console.log('[OTP] Order creation denied - customer account suspended for userId:', req.userId);
          return res.status(403).json({ 
            success: false, 
            message: 'Your account has been suspended. Please contact support.',
            suspended: true
          });
        }
      }

      if (!name) {
        return res
          .status(400)
          .json({ success: false, message: "Name is required" });
      }

      // Validate availability (batch check)
      const ids = items.map((i) => i._id || i.id).filter(Boolean);
      if (ids.length) {
        const dbProducts = await Product.find({ _id: { $in: ids } });
        const unavailable = [];
        for (const it of items) {
          const db = dbProducts.find(
            (p) => String(p._id) === String(it._id || it.id)
          );
          if (
            !db ||
            !db.available ||
            (typeof db.stock === "number" && db.stock <= 0)
          )
            unavailable.push(it.name || it.productName || it.name);
        }
        if (unavailable.length) {
          return res
            .status(400)
            .json({
              success: false,
              message: `Unavailable: ${unavailable.join(", ")}`,
            });
        }
      }

      // generate OTP, hash, expiry (5 minutes)
      const otp = generateOTP(6);
      const otpHash = await bcrypt.hash(otp, 10);
      const otpExpiry = new Date(Date.now() + 1000 * 60 * 5);

      const sessionId = generateSessionId();
      const formattedItems = items.map((i) => ({
        productId: i._id || i.id,
        productName: i.name || i.productName,
        price: i.price,
        quantity: i.qty || i.quantity || 1,
        subtotal: i.price * (i.qty || i.quantity || 1),
      }));

      const sessionDoc = new OtpSession({
        sessionId,
        userId: req.userId || null, // Save customer ID if logged in
        email,
        name,
        phone,
        address,
        amount,
        items: formattedItems,
        otpHash,
        otpExpiry,
        verified: false,
      });

      await sessionDoc.save();

      // send OTP via email
      const subject = "Your Luxe Jewelry OTP";
      const text = `Your verification code is ${otp}. It expires in 5 minutes.`;
      const html = `<p>Your Luxe Jewelry verification code is <strong>${otp}</strong>.</p>
                  <p>This code expires in 5 minutes. If you did not request this, ignore this email.</p>`;

      try {
        await sendOtpEmail(email, subject, text, html);
      } catch (e) {
        console.error("Failed to send OTP email:", e);
        try {
          await OtpSession.deleteOne({ sessionId });
        } catch (error_) {
          console.warn(
            "Failed to cleanup OtpSession after email failure:",
            error_?.message || error_
          );
        }
        return res
          .status(500)
          .json({ success: false, message: "Failed to send OTP email" });
      }

      res.json({ success: true, message: "OTP sent", sessionId });
    } catch (err) {
      console.error("OTP request error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

/* OTP verify */
app.post("/api/otp/verify", async (req, res) => {
  try {
    const { sessionId, code } = req.body;
    if (!sessionId || !code)
      return res
        .status(400)
        .json({ success: false, message: "sessionId and code required" });

    const session = await OtpSession.findOne({ sessionId });
    if (!session)
      return res
        .status(404)
        .json({ success: false, message: "Session not found or expired" });
    if (!session.otpHash || !session.otpExpiry)
      return res
        .status(400)
        .json({ success: false, message: "No OTP pending" });
    if (session.verified)
      return res.json({ success: true, message: "OTP already verified" });
    if (new Date() > session.otpExpiry)
      return res.status(400).json({ success: false, message: "OTP expired" });

    const match = await bcrypt.compare(String(code), session.otpHash);
    if (!match)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    session.verified = true;
    session.otpHash = undefined;
    session.otpExpiry = undefined;
    await session.save();

    res.json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error("OTP verify error:", err);
    res.status(500).json({ success: false });
  }
});

/* CLIENT LOGGING ENDPOINT - FOR DEBUGGING */
app.post("/api/log", (req, res) => {
  const { action, email, name, itemsCount, amount, error } = req.body;
  const timestamp = new Date().toLocaleTimeString();
  if (error) {
    console.log(`[${timestamp}] CLIENT LOG: ${action} | Error: ${error}`);
  } else {
    console.log(
      `[${timestamp}] CLIENT LOG: ${action} | Email: ${email} | Name: ${name} | Items: ${itemsCount} | Amount: ${amount}`
    );
  }
  res.json({ logged: true });
});

/* PAYSTACK INITIALIZE (sessionId required and verified) */
app.post("/api/pay", payLimiter, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const time = new Date().toLocaleTimeString();
    console.log("[" + time + "] PAYSTACK /api/pay - sessionId: " + sessionId);

    if (!sessionId) {
      console.log("   ERROR: Missing sessionId");
      return res
        .status(400)
        .json({ status: false, message: "sessionId required" });
    }

    const session = await OtpSession.findOne({ sessionId });
    console.log("   Session lookup: " + (session ? "FOUND" : "NOT FOUND"));

    if (session) {
      console.log("      Verified: " + session.verified);
      console.log("      Email: " + session.email);
      console.log("      Amount: " + session.amount);
    }

    if (!session) {
      return res
        .status(404)
        .json({ status: false, message: "Session not found or expired" });
    }

    if (!session.verified) {
      console.log("   ERROR: Session not verified");
      return res
        .status(400)
        .json({ status: false, message: "Session not verified" });
    }

    if (!session.reference) {
      session.reference = generateReference();
      await session.save();
    }

    console.log("   Calling Paystack API...");

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: session.email,
        amount: Math.round(Number(session.amount) * 100),
        reference: session.reference,
        callback_url: `${req.protocol}://${req.get(
          "host"
        )}/payment-success.html?reference=${encodeURIComponent(
          session.reference
        )}`,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    if (response.data?.status) {
      console.log("   SUCCESS: Paystack initialized");
      console.log("   Reference: " + response.data.data.reference);
      console.log("   URL ready for redirect\n");

      return res.json({
        status: true,
        url: response.data.data.authorization_url,
        reference: response.data.data.reference,
        sessionId: session.sessionId,
      });
    } else {
      console.log("   ERROR: Paystack returned false");
      return res
        .status(500)
        .json({
          status: false,
          message: "Failed to initialize payment",
          data: response.data,
        });
    }
  } catch (error) {
    console.log("   EXCEPTION: " + error.message);
    res.status(500).json({
      status: false,
      message: "Payment initialization failed",
      error: error.response?.data || error.message,
    });
  }
});

/* QUICK PAY (no OTP) - create a verified session and return sessionId */
app.post(
  "/api/pay-now",
  payLimiter,
  optionalVerifyCustomerToken,
  async (req, res) => {
    try {
      // Check if maintenance mode is enabled
      const maintenanceSetting = await Setting.findOne({ key: "maintenanceMode" });
      if (maintenanceSetting && (maintenanceSetting.value === "true" || maintenanceSetting.value === true)) {
        console.log("[MAINTENANCE] Blocking payment - store is in maintenance mode");
        return res.status(503).json({
          success: false,
          message: "Store is currently under maintenance. Please try again later.",
          maintenance: true
        });
      }

      const { email, name, phone, address, items, amount } = req.body;
      const time = new Date().toLocaleTimeString();
      console.log("[" + time + "] SESSION /api/pay-now - " + email);
      console.log(
        "   Name: " +
          name +
          " | Items: " +
          (items?.length || 0) +
          " | Amount: " +
          amount
      );

      if (!email || !items || !Array.isArray(items) || !amount) {
        console.log("   ERROR: Missing required fields");
        return res
          .status(400)
          .json({
            success: false,
            message: "Missing required fields (email, items, amount)",
          });
      }

      const sessionId = generateSessionId();
      console.log("   sessionId: " + sessionId);

      const formattedItems = (items || []).map((i) => ({
        productId: i._id || i.productId || null,
        productName: i.name || i.productName || "",
        price: Number(i.price || 0),
        quantity: Number(i.qty || i.quantity || 1),
        subtotal: Number((i.price || 0) * (i.qty || i.quantity || 1)),
      }));

      const sessionDoc = new OtpSession({
        sessionId,
        userId: req.userId || null,
        email,
        name,
        phone,
        address,
        amount: Number(amount),
        items: formattedItems,
        verified: true,
      });

      await sessionDoc.save();
      console.log("   SUCCESS: Saved to DB with verified=true");

      return res.json({
        success: true,
        sessionId,
        message: "Payment session created",
      });
    } catch (error) {
      console.log("   EXCEPTION: " + error.message);
      return res
        .status(500)
        .json({
          success: false,
          message: "Failed to create payment session",
          error: error.message,
        });
    }
  }
);

/* PAYSTACK WEBHOOK (express.raw) */
app.post(
  "/api/paystack/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const time = new Date().toLocaleTimeString();
    try {
      const signature = req.headers["x-paystack-signature"];
      const bodyBuffer = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(req.body || "");
      const expected = crypto
        .createHmac("sha512", PAYSTACK_SECRET_KEY)
        .update(bodyBuffer)
        .digest("hex");

      console.log("[" + time + "] WEBHOOK /api/paystack/webhook");
      console.log(
        "   Signature check: " + (signature === expected ? "VALID" : "INVALID")
      );

      if (signature !== expected) {
        console.log("   ERROR: Invalid webhook signature\n");
        return res.sendStatus(400);
      }

      let event;
      try {
        event = JSON.parse(bodyBuffer.toString());
      } catch (e) {
        console.log("   ERROR: JSON parse failed\n");
        return res.sendStatus(400);
      }

      console.log("   Event: " + event.event);

      if (event.event === "charge.success") {
        const ref = event.data.reference;
        const amountPaid = (event.data.amount || 0) / 100;
        console.log("   Reference: " + ref);
        console.log("   Amount: " + amountPaid);

        const session = await OtpSession.findOne({ reference: ref });
        console.log("   Session lookup: " + (session ? "FOUND" : "NOT FOUND"));

        if (!session) {
          const existingSale = await Sale.findOne({ reference: ref });
          if (existingSale) {
            console.log("   Sale already exists\n");
            return res.sendStatus(200);
          }
          console.log("   WARNING: No session for reference\n");
          return res.sendStatus(200);
        }

        const existing = await Sale.findOne({ reference: ref });
        if (existing) {
          console.log("   Sale already created");
          try {
            await OtpSession.deleteOne({ sessionId: session.sessionId });
          } catch (error_) {
            console.warn(
              "Failed to cleanup OtpSession (existing sale):",
              error_?.message || error_
            );
          }
          console.log("   SUCCESS\n");
          return res.sendStatus(200);
        }

        const formattedItems = session.items || [];
        const newSale = new Sale({
          reference: ref,
          userId: session.userId || null,
          email: session.email,
          name: session.name,
          phone: session.phone,
          address: session.address,
          amount: amountPaid,
          status: "paid",
          paidAt: new Date(),
          otpVerified: true,
          items: formattedItems,
        });

        await newSale.save();
        console.log("   Sale created in DB");
        await processSaleRewards(newSale);
        await processSaleRewards(newSale);

        // Create or update customer record
        try {
          const existingCustomer = await User.findOne({ email: session.email });
          if (!existingCustomer) {
            const newCustomer = new User({
              email: session.email,
              name: session.name || "Customer",
              phone: session.phone || "",
              role: "customer",
              password: await bcrypt.hash(
                crypto.randomBytes(16).toString("hex"),
                12
              ),
            });
            await newCustomer.save();
            console.log("   Customer record created");
          } else {
            // Update existing customer with latest info
            if (session.name) existingCustomer.name = session.name;
            if (session.phone) existingCustomer.phone = session.phone;
            await existingCustomer.save();
            console.log("   Customer record updated");
          }
        } catch (error_) {
          console.log("   Customer record error: " + error_.message);
        }

        // Send order confirmation email
        try {
          const itemsForEmail = formattedItems.map((item) => ({
            name: item.name || item.productName,
            quantity: item.qty || 1,
            price: item.price,
          }));

          await sendOrderConfirmationEmail(session.email, {
            reference: ref,
            items: itemsForEmail,
            amount: amountPaid,
            name: session.name,
            email: session.email,
          });
          console.log("   Confirmation email sent");
        } catch (error_) {
          console.log("   Email failed: " + error_.message);
        }

        // Send order status notification (processing status after successful payment)
        try {
          const orderData = {
            reference: ref,
            items: formattedItems,
            amount: amountPaid,
            name: session.name,
            email: session.email,
            date: new Date().toLocaleDateString(),
          };
          await sendOrderStatusEmail(session.email, orderData, "processing");
          console.log("   Status email sent (processing)");
        } catch (error_) {
          console.log("   Status email failed: " + error_.message);
        }

        // Update stock
        for (const item of formattedItems) {
          try {
            const productId = item._id || item.id;
            const quantity = item.qty || 1;

            if (!productId) continue;

            const prod = await Product.findById(productId);
            if (!prod) continue;

            if (typeof prod.stock === "number") {
              const newStock = Math.max(0, (prod.stock || 0) - quantity);
              prod.stock = newStock;
              prod.available = newStock > 0;
              await prod.save();
            } else {
              prod.available = false;
              await prod.save();
            }
          } catch (e) {
            console.log("   Stock update failed: " + e.message);
          }
        }

        try {
          await OtpSession.deleteOne({ sessionId: session.sessionId });
        } catch (error_) {
          console.warn(
            "Failed to cleanup OtpSession:",
            error_?.message || error_
          );
        }
        console.log("   SUCCESS\n");
      } else {
        console.log("   Unhandled event type: " + event.event + "\n");
      }

      res.sendStatus(200);
    } catch (err) {
      console.log("   EXCEPTION: " + err.message + "\n");
      res.sendStatus(500);
    }
  }
);

/* VERIFY PAYSTACK (helper used by payment-success page) */
app.get("/api/paystack/verify/:reference", async (req, res) => {
  const { reference } = req.params;
  if (!reference)
    return res
      .status(400)
      .json({ success: false, message: "Reference is required" });

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error(
      "Paystack verify error:",
      error.response?.data || error.message
    );
    res
      .status(500)
      .json({
        success: false,
        message: "Verification failed",
        error: error.response?.data || error.message,
      });
  }
});

/* VERIFY PAYMENT AND GET SALE DETAILS */
app.get("/api/verify-payment", async (req, res) => {
  const { reference } = req.query;
  const time = new Date().toLocaleTimeString();
  console.log(
    "[" + time + "] VERIFY /api/verify-payment - reference: " + reference
  );

  if (!reference) {
    console.log("   ERROR: Missing reference\n");
    return res
      .status(400)
      .json({ success: false, message: "Reference is required" });
  }

  try {
    // First check if Sale already exists in DB
    let sale = await Sale.findOne({ reference: String(reference) });
    console.log("   DB Lookup: " + (sale ? "FOUND" : "NOT FOUND"));

    if (sale) {
      console.log("      Name: " + sale.name);
      console.log("      Email: " + sale.email);
      console.log("      Amount: " + sale.amount);
      console.log("      Items: " + (sale.items?.length || 0));
      console.log("   SUCCESS (from DB)\n");

      return res.json({
        success: true,
        sale: {
          _id: sale._id,
          reference: sale.reference,
          name: sale.name,
          email: sale.email,
          phone: sale.phone,
          address: sale.address,
          items: sale.items,
          amount: sale.amount,
          status: sale.status,
          date: sale.date,
          paidAt: sale.paidAt,
        },
      });
    }

    // If not found, check if session exists and try to create from Paystack verification
    console.log("   Checking session...");
    const session = await OtpSession.findOne({ reference: String(reference) });

    if (session) {
      console.log("   Session found, verifying with Paystack...");

      // Verify with Paystack to confirm payment
      try {
        const response = await axios.get(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(
            reference
          )}`,
          {
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        );

        if (
          response.data?.status &&
          response.data.data?.status === "success"
        ) {
          console.log("   Paystack confirmed payment, creating Sale...");

          // Payment confirmed by Paystack - create Sale record
          const amountPaid = (response.data.data.amount || 0) / 100;
          const formattedItems = session.items || [];

          const newSale = new Sale({
            reference: reference,
            userId: session.userId || null,
            email: session.email,
            name: session.name,
            phone: session.phone,
            address: session.address,
            amount: amountPaid,
            status: "paid",
            paidAt: new Date(),
            otpVerified: true,
            items: formattedItems,
          });

          await newSale.save();
          console.log("   Sale created from Paystack verification");

          // Create or update customer record
          try {
            const existingCustomer = await User.findOne({
              email: session.email,
            });
            if (!existingCustomer) {
              const newCustomer = new User({
                email: session.email,
                name: session.name || "Customer",
                phone: session.phone || "",
                role: "customer",
                password: await bcrypt.hash(
                  crypto.randomBytes(16).toString("hex"),
                  12
                ),
              });
              await newCustomer.save();
              console.log("   Customer record created");
            } else {
              if (session.name) existingCustomer.name = session.name;
              if (session.phone) existingCustomer.phone = session.phone;
              await existingCustomer.save();
              console.log("   Customer record updated");
            }
          } catch (error_) {
            console.log("   Customer record error: " + error_.message);
          }

          // Try to send email
          try {
            const itemsForEmail = formattedItems.map((item) => ({
              name: item.name || item.productName,
              quantity: item.qty || item.quantity || 1,
              price: item.price,
            }));

            await sendOrderConfirmationEmail(session.email, {
              reference: reference,
              items: itemsForEmail,
              amount: amountPaid,
              name: session.name,
              email: session.email,
            });
            console.log("   Confirmation email sent");
          } catch (error_) {
            console.log("   Email send failed: " + error_.message);
          }

          // Update stock
          for (const item of formattedItems) {
            try {
              const productId = item._id || item.id;
              const quantity = item.qty || item.quantity || 1;

              if (!productId) continue;

              const prod = await Product.findById(productId);
              if (!prod) continue;

              if (typeof prod.stock === "number") {
                const newStock = Math.max(0, (prod.stock || 0) - quantity);
                prod.stock = newStock;
                prod.available = newStock > 0;
                await prod.save();
              } else {
                prod.available = false;
                await prod.save();
              }
            } catch (e) {
              console.log("   Stock update error: " + e.message);
            }
          }

          console.log("   SUCCESS (created from Paystack)\n");

          return res.json({
            success: true,
            sale: {
              _id: newSale._id,
              reference: newSale.reference,
              name: newSale.name,
              email: newSale.email,
              phone: newSale.phone,
              address: newSale.address,
              items: newSale.items,
              amount: newSale.amount,
              status: newSale.status,
              date: newSale.date,
              paidAt: newSale.paidAt,
            },
          });
        } else {
          console.log("   Paystack shows payment not successful\n");
          return res
            .status(400)
            .json({
              success: false,
              message: "Payment not confirmed by Paystack",
            });
        }
      } catch (psError) {
        console.log(
          "   Paystack verification error: " + psError.message + "\n"
        );
        return res
          .status(500)
          .json({
            success: false,
            message: "Could not verify with Paystack",
            error: psError.message,
          });
      }
    }

    console.log("   No session or sale found\n");
    return res.status(404).json({ success: false, message: "Order not found" });
  } catch (error) {
    console.log("   EXCEPTION: " + error.message + "\n");
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to verify payment",
        error: error.message,
      });
  }
});

/* NEWSLETTER SUBSCRIPTION */
app.post(
  "/api/newsletter/subscribe",
  validateRequest(validationSchemas.newsletterSchema),
  async (req, res) => {
    try {
      const { email } = req.validatedData;

      // Check if already subscribed
      const existing = await Newsletter.findOne({ email: email.toLowerCase() });
      if (existing) {
        if (existing.isActive) {
          return res
            .status(200)
            .json({
              success: true,
              message: "Already subscribed to our newsletter!",
            });
        } else {
          // Reactivate subscription
          existing.isActive = true;
          existing.subscribedAt = Date.now();
          await existing.save();
          return res
            .status(200)
            .json({
              success: true,
              message: "Resubscribed to our newsletter!",
            });
        }
      }

      // Create new subscription
      const subscriber = new Newsletter({ email: email.toLowerCase() });
      await subscriber.save();

      // Send welcome email
      const welcomeHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Arial', sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #d4af37, #b6912e); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9f6f1; padding: 30px; border-radius: 0 0 8px 8px; }
          .highlight { color: #d4af37; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💎 Luxe Jewelry</h1>
            <p>Welcome to Our Newsletter!</p>
          </div>
          <div class="content">
            <h2>Thank You for Subscribing!</h2>
            <p>Welcome to the Luxe Jewelry newsletter! You'll now receive:</p>
            <ul>
              <li><span class="highlight">Exclusive Offers</span> - Special discounts just for subscribers</li>
              <li><span class="highlight">New Collections</span> - First access to our latest pieces</li>
              <li><span class="highlight">Style Tips</span> - Expert jewelry styling advice</li>
              <li><span class="highlight">Special Events</span> - VIP invitations to exclusive events</li>
            </ul>
            <p>We respect your privacy and will never share your email. You can unsubscribe anytime.</p>
            <p style="text-align: center; margin-top: 30px;">
              <a href="http://localhost:5000" style="display: inline-block; background: #d4af37; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Visit Our Store</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Luxe Jewelry. All rights reserved.<br>
            <a href="http://localhost:5000/privacy.html" style="color: #d4af37; text-decoration: none;">Privacy Policy</a> | 
            <a href="http://localhost:5000/contact.html" style="color: #d4af37; text-decoration: none;">Contact Us</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

      try {
        await sendOtpEmail(
          subscriber.email,
          "Welcome to Luxe Jewelry Newsletter!",
          "Thank you for subscribing to Luxe Jewelry newsletter!",
          welcomeHtml
        );
      } catch (error_) {
        console.warn(
          "[WARN] Welcome email failed but subscription saved:",
          error_.message
        );
      }

      res
        .status(200)
        .json({
          success: true,
          message: "Successfully subscribed to our newsletter!",
        });
    } catch (error) {
      console.error("[ERROR] Newsletter subscription error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Subscription failed. Please try again.",
        });
    }
  }
);

/* ================== ADVANCED SEARCH & FILTERING ================== */
// Advanced product search with filters
app.get("/api/search", async (req, res) => {
  try {
    const {
      q,
      category,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { available: true };

    // Text search
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
      ];
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number.parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = Number.parseFloat(maxPrice);
    }

    // Sorting
    let sortObj = { createdAt: -1 };
    if (sort === "price_asc") sortObj = { price: 1 };
    else if (sort === "price_desc") sortObj = { price: -1 };
    else if (sort === "name_asc") sortObj = { name: 1 };
    else if (sort === "name_desc") sortObj = { name: -1 };
    else if (sort === "popular") sortObj = { views: -1 };

    // Pagination
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);

    const products = await Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(Number.parseInt(limit));

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      products,
      pagination: {
        current: Number.parseInt(page),
        pages: Math.ceil(total / Number.parseInt(limit)),
        count: products.length,
        total,
      },
    });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ success: false, message: "Search failed" });
  }
});

// Get available categories for filtering
app.get("/api/categories/list", async (req, res) => {
  try {
    const categories = await Product.distinct("category", { available: true });
    categories.sort();
    res.json({ success: true, categories });
  } catch (err) {
    console.error("Categories fetch error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching categories" });
  }
});

// Get price range for filtering
app.get("/api/products/price-range", async (req, res) => {
  try {
    const result = await Product.aggregate([
      { $match: { available: true } },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
        },
      },
    ]);

    const { minPrice = 0, maxPrice = 1000000 } = result[0] || {};
    res.json({ success: true, minPrice, maxPrice });
  } catch (err) {
    console.error("Price range error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching price range" });
  }
});

/* CATCH-ALL FRONTEND ROUTE */
app.get(/^\/(?!api).*/, (req, res) => {
  const idx = path.join(publicDir, "index.html");
  if (fs.existsSync(idx)) return res.sendFile(idx);
  const fallback = path.join(__dirname, "index.html");
  if (fs.existsSync(fallback)) return res.sendFile(fallback);
  res
    .status(404)
    .send(
      "Frontend not found. Please place your files in ./public or root index.html"
    );
});

/* ================== WISHLIST ROUTES ================== */
// Add to wishlist
app.post("/api/wishlist", authenticateJWT, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId)
      return res
        .status(400)
        .json({ success: false, message: "Product ID required" });

    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    // Check if already in wishlist
    const existing = await Wishlist.findOne({ userId: req.userId, productId });
    if (existing) {
      return res
        .status(200)
        .json({ success: true, message: "Already in wishlist" });
    }

    const wishlistItem = new Wishlist({
      userId: req.userId,
      productId,
      productName: product.name,
      price: product.price,
      image: product.image,
    });

    await wishlistItem.save();
    res
      .status(201)
      .json({
        success: true,
        message: "Added to wishlist",
        item: wishlistItem,
      });
  } catch (err) {
    console.error("Wishlist add error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error adding to wishlist" });
  }
});

// Get user's wishlist
app.get("/api/wishlist", authenticateJWT, async (req, res) => {
  try {
    const wishlist = await Wishlist.find({ userId: req.userId })
      .populate("productId", "name price image")
      .sort({ addedAt: -1 });
    res.json({ success: true, wishlist });
  } catch (err) {
    console.error("Wishlist fetch error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching wishlist" });
  }
});

// Remove from wishlist
app.delete("/api/wishlist/:id", authenticateJWT, async (req, res) => {
  try {
    const item = await Wishlist.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Wishlist item not found" });
    res.json({ success: true, message: "Removed from wishlist" });
  } catch (err) {
    console.error("Wishlist delete error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error removing from wishlist" });
  }
});

/* ================== REVIEW & RATING ROUTES ================== */
// Add/Update review
app.post("/api/reviews", authenticateJWT, async (req, res) => {
  try {
    const { productId, rating, title, comment } = req.body;

    if (!productId || !rating) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID and rating required" });
    }

    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ success: false, message: "Rating must be between 1 and 5" });
    }

    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    // Check if user already reviewed this product
    let review = await Review.findOne({ productId, userId: req.userId });

    if (review) {
      // Update existing review
      review.rating = rating;
      review.title = title || review.title;
      review.comment = comment || review.comment;
      review.updatedAt = Date.now();
      await review.save();
      return res.json({ success: true, message: "Review updated", review });
    }

    // Create new review
    review = new Review({
      productId,
      userId: req.userId,
      rating,
      title,
      comment,
      verified: false,
    });

    await review.save();
    res.status(201).json({ success: true, message: "Review created", review });
  } catch (err) {
    console.error("Review create error:", err);
    res.status(500).json({ success: false, message: "Error creating review" });
  }
});

// Get reviews for product
app.get("/api/reviews/:productId", async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    // Calculate average rating
    const avgRating =
      reviews.length > 0
        ? (
            reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          ).toFixed(1)
        : 0;

    res.json({
      success: true,
      reviews,
      stats: {
        averageRating: avgRating,
        totalReviews: reviews.length,
      },
    });
  } catch (err) {
    console.error("Reviews fetch error:", err);
    res.status(500).json({ success: false, message: "Error fetching reviews" });
  }
});

// Delete review
app.delete("/api/reviews/:id", authenticateJWT, async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!review)
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    res.json({ success: true, message: "Review deleted" });
  } catch (err) {
    console.error("Review delete error:", err);
    res.status(500).json({ success: false, message: "Error deleting review" });
  }
});

/* ================== COUPON ROUTES ================== */
const couponRoutes = require("./routes/coupons");
app.use("/api/coupons", couponRoutes);

/* START SERVER */
if (require.main === module) {
  console.log("[DEBUG] About to start listening on port " + PORT);
  try {
    console.log("[DEBUG] Creating server instance...");

    const server = app.listen(PORT, () => {
      console.log(
        `[SERVER] Callback fired - Server is ready at http://localhost:${PORT}`
      );
      console.log(`[SERVER] 🎉 Server is ready to accept requests`);
    });

    server.on("listening", () => {
      console.log(
        `[SERVER] 'listening' event - Server successfully bound to port ${PORT}`
      );
      if (!PAYSTACK_SECRET_KEY)
        console.warn(
          "[WARNING] PAYSTACK_SECRET_KEY not set — payments will fail until configured."
        );
      if (!EMAIL_USER || !EMAIL_PASS)
        console.warn(
          "[WARNING] EMAIL_USER/EMAIL_PASS not set — OTP emails will fail until configured."
        );
      if (!ADMIN_PASS_HASH)
        console.warn(
          "[WARNING] ADMIN_PASS_HASH not set — manager login will be disabled until configured."
        );
    });

    console.log("[DEBUG] Listen call completed, setting error handler");

    server.on("error", (err) => {
      console.error(`[ERROR-SERVER] Server error event: ${err.code}`);
      if (err.code === "EADDRINUSE") {
        console.error(`[ERROR] Port ${PORT} is already in use`);
        process.exit(1);
      } else if (err.code === "EACCES") {
        console.error(`[ERROR] Permission denied binding to port ${PORT}`);
        process.exit(1);
      } else {
        console.error(`[ERROR] Server error: ${err.code} - ${err.message}`);
        process.exit(1);
      }
    });

    console.log("[DEBUG] Server error handler attached");
  } catch (err) {
    console.error(`[ERROR] Failed to start server: ${err.message}`);
    console.error(`[ERROR] Stack: ${err.stack}`);
    process.exit(1);
  }

  process.on("unhandledRejection", (reason, promise) => {
    console.error("[ERROR] Unhandled Rejection - reason:", reason);
    if (reason instanceof Error) {
      console.error(reason.stack);
    }
  });

  process.on("uncaughtException", (error) => {
    console.error("[ERROR] Uncaught Exception:", error.message);
    console.error(error.stack);
    process.exit(1);
  });
}

// CSRF error handler: catch csurf ForbiddenError and return JSON 403
app.use((err, req, res, next) => {
  try {
    const isCsrfError =
      err &&
      (err.code === "EBADCSRFTOKEN" ||
        err.message === "invalid csrf token" ||
        err.name === "ForbiddenError");
    if (!isCsrfError) return next(err);

    // Log a concise message (avoid full stack trace to reduce noise)
    console.warn(
      "[CSRF] Invalid or missing CSRF token for",
      req.method,
      req.originalUrl
    );

    // Return JSON for API callers, plain text for others
    const acceptsJson =
      req.headers.accept && req.headers.accept.includes("application/json");
    if (acceptsJson || req.xhr || req.originalUrl.startsWith("/api/")) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid CSRF token" });
    }

    return res.status(403).send("Forbidden - invalid CSRF token");
  } catch (handlerErr) {
    // If the error handler itself fails, delegate to default handler
    console.error("[CSRF] Error in CSRF error handler", handlerErr);
    return next(err);
  }
});
// ============ NEWSLETTER ENDPOINTS ============

// Get all subscribers
app.get("/api/subscribers", async (req, res) => {
  try {
    const subscribers = await NewsletterSubscriber.find().select("email name");
    res.json(subscribers || []);
  } catch (err) {
    console.error("[NEWSLETTER] Error fetching subscribers:", err);
    res.json([]);
  }
});

// Send newsletter to multiple recipients
app.post(
  "/api/newsletter/send",
  authenticateJWT,
  verifyRole("admin"),
  async (req, res) => {
    try {
      const { subject, message, recipients, includeStoreInfo } = req.body;

      if (!subject || !message || !recipients || recipients.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Subject, message, and recipients are required"
        });
      }

      // Check if SMTP is configured
      if (!SMTP_USER || !SMTP_PASS) {
        console.error("[NEWSLETTER] SMTP credentials not configured");
        return res.status(500).json({
          success: false,
          message: "Email service not configured on server. Contact administrator."
        });
      }

      console.log(`[NEWSLETTER] Preparing to send to ${recipients.length} recipients`);

      // Build email HTML
      let emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #d4af37, #b6912e); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">✨ Luxe Jewelry Newsletter</h1>
            </div>

            <!-- Content -->
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
              <div style="color: #333;">
                ${message.replace(/\n/g, '<br>')}
              </div>

              ${includeStoreInfo ? `
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                <div style="background: white; padding: 20px; border-radius: 6px; margin-top: 20px;">
                  <h3 style="margin-top: 0; color: #d4af37;">📍 Luxe Jewelry</h3>
                  <p style="margin: 8px 0;"><strong>Email:</strong> support@luxejewelry.com</p>
                  <p style="margin: 8px 0;"><strong>Phone:</strong> +234 901 289 2640</p>
                  <p style="margin: 8px 0;"><strong>Hours:</strong> Monday - Saturday, 9 AM - 6 PM</p>
                </div>
              ` : ''}

              <!-- Footer -->
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                <p style="margin: 5px 0;">© 2025 Luxe Jewelry. All rights reserved.</p>
                <p style="margin: 5px 0;">You're receiving this email because you subscribed to our newsletter.</p>
                <p style="margin: 5px 0;">
                  <a href="http://localhost:3000" style="color: #d4af37; text-decoration: none;">Visit our store</a> | 
                  <a href="http://localhost:3000" style="color: #d4af37; text-decoration: none;">Unsubscribe</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      `;

      // Build plain text version
      let emailText = message + "\n\n";
      if (includeStoreInfo) {
        emailText += `---\n`;
        emailText += `Luxe Jewelry - Premium Jewelry Collection\n`;
        emailText += `Email: support@luxejewelry.com\n`;
        emailText += `Phone: +234 901 289 2640\n`;
        emailText += `Hours: Monday - Saturday, 9 AM - 6 PM\n\n`;
      }
      emailText += `© 2025 Luxe Jewelry. All rights reserved.\n`;
      emailText += `You're receiving this because you subscribed to our newsletter.\n`;

      // Store campaign record first
      const campaign = new NewsletterCampaign({
        subject,
        message,
        recipientCount: recipients.length,
        sentAt: new Date(),
        sentBy: req.userId,
        status: "sending"
      });

      await campaign.save();
      console.log("[NEWSLETTER] Campaign saved with ID:", campaign._id);

      // Use main transporter instead of creating a new one
      console.log("[NEWSLETTER] Using main transporter for sending");

      // Send emails in parallel (but batch them to avoid rate limiting)
      const batchSize = 10;
      let sentCount = 0;
      let failedCount = 0;
      const failedEmails = [];

      try {
        for (let i = 0; i < recipients.length; i += batchSize) {
          const batch = recipients.slice(i, i + batchSize);
          
          const promises = batch.map(async (email) => {
            try {
              const mailOptions = {
                from: `Luxe Jewelry <${SMTP_USER}>`,
                to: email,
                subject: subject,
                text: emailText,
                html: emailHtml,
                replyTo: "support@luxejewelry.com",
                envelope: { from: SMTP_USER, to: email }
              };

              await sendMailWithRetry(mailOptions);
              sentCount++;
              console.log(`[NEWSLETTER] Email sent to: ${email}`);
              return true;
            } catch (emailError) {
              console.error(`[NEWSLETTER] Failed to send to ${email}:`, {
                message: emailError.message,
              code: emailError.code,
              response: emailError.response,
              accepted: emailError.accepted,
              rejected: emailError.rejected,
              stack: emailError.stack,
            });
            failedCount++;
            failedEmails.push(email);
            return false;
          }
        });

        // Wait for batch to complete before next batch
        await Promise.all(promises);
        console.log(`[NEWSLETTER] Batch completed: ${Math.min(i + batchSize, recipients.length)}/${recipients.length}`);
      }

      // Update campaign status
      campaign.status = "sent";
      campaign.sentCount = sentCount;
      campaign.failedCount = failedCount;
      campaign.failedEmails = failedEmails;
      await campaign.save();

      console.log(`[NEWSLETTER] Campaign ${campaign._id} completed: ${sentCount} sent, ${failedCount} failed`);

      // Return response
      console.log("[NEWSLETTER] Preparing to send response...");
      const responseData = {
        success: true,
        message: failedCount === 0 
          ? `Newsletter successfully sent to ${sentCount} recipients!`
          : `Newsletter sent to ${sentCount} recipients (${failedCount} failed)`,
        campaignId: campaign._id,
        sentCount,
        failedCount
      };
      
      if (failedCount > 0) {
        responseData.failedEmails = failedEmails;
      }
      
      console.log("[NEWSLETTER] Sending response:", responseData);
      res.json(responseData);
      console.log("[NEWSLETTER] Response sent successfully");
      } catch (sendError) {
        console.error("[NEWSLETTER] Error during batch sending:", sendError);
        throw sendError;
      }

    } catch (error) {
      console.error("[NEWSLETTER] Error sending newsletter:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send newsletter: " + error.message
      });
    }
  }
);

// Get campaign history
app.get(
  "/api/newsletter/history",
  authenticateJWT,
  verifyRole("admin"),
  async (req, res) => {
    try {
      const campaigns = await NewsletterCampaign.find()
        .sort({ sentAt: -1 })
        .limit(20);
      
      res.json(campaigns || []);
    } catch (error) {
      console.error("[NEWSLETTER] Error fetching campaign history:", error);
      res.json([]);
    }
  }
);

module.exports = app;