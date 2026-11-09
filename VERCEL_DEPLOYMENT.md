# Deploying to Vercel

This project serves the storefront and API from one Express app. Vercel detects
the root `server.js` Express app and deploys it as a function. Files under
`public/` are served from Vercel's CDN.

## Deploy

1. Push this project to a Git provider and import the repository in Vercel.
2. Keep the **Root Directory** set to the repository root.
3. Add the environment variables below in **Project Settings → Environment
   Variables** for Production (and Preview if needed).
4. Deploy. Vercel sets `NODE_ENV=production` and `VERCEL` automatically.

No separate build or output-directory setting is needed. Vercel installs
dependencies from `package-lock.json` and detects `server.js` automatically.

## Required environment variables

- `JWT_SECRET`: a private, random secret of at least 32 characters.
- `MONGO_URI`: connection string for a remotely hosted MongoDB database
  (for example, MongoDB Atlas). A local `127.0.0.1` database is not accessible
  from Vercel. Confirm your MongoDB provider allows connections from Vercel and
  that the database user has read/write access.

Set these additional variables for the corresponding features:

- Payments: `PAYSTACK_SECRET_KEY`
- Email and OTP: `SMTP_USER`, `SMTP_PASS` (or `EMAIL_USER`, `EMAIL_PASS`);
  configure `SMTP_HOST` and `SMTP_PORT` for your mail provider. Use port `465`
  with implicit TLS or `587` with STARTTLS; Vercel blocks outbound port `25`.
  For Gmail, use an app password, not your normal account password.
- Site admin login: `SITE_ADMIN_USER` and `SITE_ADMIN_PASS_HASH` (or the
  supported `ADMIN2_USER` / `ADMIN2_PASS_HASH` alternatives). When the configured
  user is a short username such as `admin`, the admin login accepts an email
  whose local part matches that username.
- Manager environment login: `ADMIN_USER` and `ADMIN_PASS_HASH` (or
  `ADMIN_PASS` for local development). These are optional when manager accounts
  are authenticated from MongoDB.
- Absolute links in emails: `FRONTEND_URL` and `SHOP_URL` set to the deployed
  site URL.

Do not put secrets in source control or expose secret keys in frontend code.
Customer registration, customer login, and database-backed admin login require
MongoDB. Check `/api/health` after deployment; it returns `503` when the
database is not configured or cannot be reached. The server waits for the
database connection before handling database-backed API requests and responds
with `503` rather than a misleading registration or credential error when the
database is unavailable.
After changing Vercel environment variables, redeploy so the function receives
the updated values. Check the function logs for `[SMTP]` errors and confirm the
newsletter subscriber is saved separately from welcome-email delivery.

## Important limitations

Vercel functions are stateless and their writable filesystem is temporary.
Product image uploads are written under `/tmp` on Vercel and will not persist.
Configure durable object storage such as S3 or Cloudinary before relying on
uploaded product images in production. The `mobile/` directory is outside
Vercel's static `public/` directory; move any mobile files that must be
published to `public/mobile/`. Use managed Redis if enabling Redis-backed
features.
