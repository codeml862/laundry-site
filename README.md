# Quicklywash — Laundry pickup & delivery

A Next.js (App Router) laundry booking platform. Customers browse services, book pickups, pay (cash or Razorpay) and track orders. Admins and staff run everything from the operations dashboard.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + TypeScript
- **Tailwind CSS 4** + **shadcn/ui** (Base UI primitives)
- **PostgreSQL** (Supabase) via **Prisma 6**
- Auth: email/password and Google sign-in, 30-day sliding sessions stored in the database
- Payments: Razorpay · Email: SMTP (nodemailer) · Images: Cloudinary (optional)

## Project structure

```
src/
  app/                 Routes only
    api/               Backend API routes (auth, account, booking, cart, catalog, admin, payments, maintenance)
    admin/             Operations dashboard (/admin) and staff sign-in (/admin/login)
    account/           Customer dashboard
    book/ services/    Booking flow and service catalogue
    login/ register/ … Customer auth pages
  components/
    ui/                shadcn/ui components
    site/              Header, footer, logo, navigation, shared site data provider
    home/              Homepage sections
    customer/          Account, booking, services, auth forms, cart
    dashboard/         Operations dashboard (one folder per section: orders, customers,
                       services, pickups, payments, reports, staff)
  lib/
    server/            Server-only logic shared by API routes and pages
                       (db, auth/sessions, role guards, Google OAuth, pricing, payments, email)
    utils.ts
  hooks/
prisma/                Schema and migrations
scripts/seed.mjs       Creates the settings row and the first admin
scripts/checks/        Route and permission checks against a mocked database (`npm run check`)
public/images/         Site images
```

## Roles

| Role | Signs in at | Access |
| --- | --- | --- |
| Customer | `/login` (email or Google) | `/account`, booking, payments |
| Staff | `/admin/login` | Only the dashboard sections the admin assigned to them |
| Rider | `/admin/login` | Their pickups and deliveries |
| Admin | `/admin/login` | Everything: orders, services, customers, team, coupons, payments, settings |

Roles are enforced on the server (API routes and page guards), not only in the UI.

## Database (Supabase)

The database is Supabase Postgres in Mumbai (`ap-south-1`). The app connects only through Prisma on the server.
Row-level security is enabled on every table with no policies, so Supabase's public REST/GraphQL API (and the
publishable key) cannot read or change any data; Prisma's `postgres` role is unaffected.

## Local setup

1. Node.js 22 LTS or newer.
2. Copy `.env.example` to `.env` and fill in the values below.
3. Install and prepare the database:
   ```sh
   npm ci
   npm run db:migrate
   npm run db:seed
   ```
4. Start: `npm run dev` and open http://localhost:3000.
   Before deploying, run `npm run typecheck` and `npm run check`.
5. Sign in at `/admin/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD`, then add your services, prices, pickup slots and payment options in the dashboard.

In development without SMTP, verification and password-reset emails are printed in the terminal.

## Environment variables

| Variable | Use |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL URL used by the app (Supabase transaction pooler, port 6543, `?pgbouncer=true`). |
| `DIRECT_URL` | Supabase session pooler (port 5432) used for migrations. |
| `APP_URL` | Site origin, e.g. `http://localhost:3000` or `https://yourdomain.com`. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First administrator, created by `npm run db:seed` (password ≥ 12 characters). |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in. Redirect URI: `<APP_URL>/api/auth/google/callback`. |
| `SMTP_URL`, `MAIL_FROM` | Required in production for verification, password reset and order emails. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Online payments. Webhook: `/api/payments/webhook`. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Optional image uploads in the dashboard. |
| `CRON_SECRET` | Protects `/api/maintenance` (daily reminders and cleanup). |

## Deploying to Vercel

1. Push this repository to GitHub, then import `codeml862/laundry-site` in Vercel with framework **Next.js** and the repository root as the root directory.
2. The checked-in `vercel.json` uses `npm ci` and `npm run build`. Leave the output directory at the Next.js default; this is a full-stack app, not a static export. Installation also runs `prisma generate`.
3. Set `DATABASE_URL`, `DIRECT_URL`, `APP_URL`, `SMTP_URL`, `MAIL_FROM` and `CRON_SECRET` in Vercel. Use an HTTPS production origin for `APP_URL`, never the localhost value in `.env.example`. Set the optional Google, payment and upload credentials only for integrations you use. Never upload `.env` to GitHub.
4. Before using the production app, run `npm run db:migrate` against the production database. For a new database, set `ADMIN_EMAIL` / `ADMIN_PASSWORD` locally and run `npm run db:seed` once. These commands change the target database, so check its connection URLs first. They are intentionally not part of every deployment build.
5. Deploy. If the Vercel domain is assigned after the first build, set `APP_URL` to that HTTPS domain and redeploy. Set the Google callback to `<APP_URL>/api/auth/google/callback` and the Razorpay webhook to `<APP_URL>/api/payments/webhook` when using those integrations.
6. `vercel.json` preserves the daily `/api/maintenance` cron; Vercel sends `CRON_SECRET` for authentication. Verify `/`, `/services`, `/sitemap.xml` and `/robots.txt` on the deployed domain.

Vercel reference: https://vercel.com/docs/frameworks/full-stack/nextjs

## Homepage and SEO

- `src/app/page.tsx` is the homepage/index entry in the Next.js App Router. An `index.html` or `index.tsx` file is not needed.
- `src/lib/seo.ts` supplies page titles, descriptions, canonical URLs, Open Graph and Twitter sharing metadata.
- `src/app/sitemap.ts` generates `/sitemap.xml` for the homepage, services, booking and legal pages.
- `src/app/robots.ts` generates `/robots.txt`. Account, admin, API and authentication routes are excluded from crawling; pages default to `noindex` unless their public metadata opts in. This is crawler guidance, not access control.
- `APP_URL` defines the canonical origin. If absent, SEO uses `VERCEL_PROJECT_PRODUCTION_URL`, then `VERCEL_URL`, then localhost for local development. Vercel system environment variables must be enabled for that fallback. Set `APP_URL` explicitly for production authentication/email links as well.

Vercel URL variables: https://vercel.com/docs/environment-variables/system-environment-variables
