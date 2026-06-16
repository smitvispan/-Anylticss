# Analytics Dashboard

Production-ready Next.js application for analytics, admin workflows, OAuth integrations, and documentation pages.

## Requirements

- Node.js 20.x
- npm 10.x
- MongoDB

## Local Setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Production Checks

```bash
npm run lint
npm run typecheck
npm run build
```

Run everything together with:

```bash
npm run check
```

## Environment Variables

Use `.env.example` as the source of truth for required configuration.

Important production values:

- `NEXT_PUBLIC_SITE_URL` and `NEXTAUTH_URL` must point at the deployed app origin.
- `NEXTAUTH_SECRET` must be a long random secret.
- `MONGODB_URI` must point at the production database.
- Google, Facebook, email, and ERP variables must be set before using their related routes.

Do not commit `.env.local` or production secrets.

## Deployment Notes

- The app builds with `output: "standalone"` for simpler container or VPS deployments.
- Build-time linting is enabled, so CI will now fail on real lint errors instead of skipping them.
- OAuth callback URLs must exactly match the deployed domain values configured in the provider dashboards.

## Start In Production

```bash
npm run build
npm run start
```
