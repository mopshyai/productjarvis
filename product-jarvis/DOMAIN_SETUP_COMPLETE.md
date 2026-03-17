# ProductJarvis Domain Routing

## Source Of Truth

- Vercel project root: `product-jarvis/`
- Frontend app: Vite SPA in `src/`
- Domain config: `vercel.json`
- Host-aware routing: `src/App.jsx` + `src/lib/domainRoutes.js`

## Canonical Host Map

- `productjarvis.com` -> permanent redirect to `https://www.productjarvis.com/:path*`
- `www.productjarvis.com` -> marketing and public pages
- `app.productjarvis.com` -> workspace app at root-level paths
- `auth.productjarvis.com` -> auth flow at `/` and `/callback`
- `admin.productjarvis.com` -> settings surface at `/`
- `docs.productjarvis.com` -> docs, API docs, and changelog
- `blog.productjarvis.com` -> blog index and blog posts
- `api.productjarvis.com` -> API host, with `/` returning a status payload and `/api/*` proxying to Supabase Edge Functions

## API Contract

- canonical API base: `https://api.productjarvis.com/api`
- compatibility paths may remain on `/api/v1/*`, but `/api/*` is the primary contract
- the API host must never fall through to `index.html`
- `https://api.productjarvis.com/` should return an API status payload, not the marketing landing page
- Vercel maps frontend `/api/*` routes to flat Supabase functions such as `session`, `methodologies`, `prd-generate`, and `auth-callback`

## Auth Flow

- `https://auth.productjarvis.com/` is the only browser auth entrypoint
- users authenticate with Google first
- after authentication:
  - users with workspace access go to `app`
  - users without workspace access stay on the auth host and can redeem an invite code or join the waitlist

## Public Route Behavior

### Marketing

- `https://www.productjarvis.com/`
- `https://www.productjarvis.com/pricing`
- `https://www.productjarvis.com/about`
- `https://www.productjarvis.com/contact`
- `https://www.productjarvis.com/status`
- `https://www.productjarvis.com/privacy`
- `https://www.productjarvis.com/terms`
- `https://www.productjarvis.com/security`

### App

- `https://app.productjarvis.com/`
- `https://app.productjarvis.com/command`
- `https://app.productjarvis.com/prds`
- `https://app.productjarvis.com/decisions`
- `https://app.productjarvis.com/digest`
- `https://app.productjarvis.com/opportunities`
- `https://app.productjarvis.com/welcome`

### Auth

- `https://auth.productjarvis.com/`
- `https://auth.productjarvis.com/callback`

### Admin

- `https://admin.productjarvis.com/`

### Docs

- `https://docs.productjarvis.com/`
- `https://docs.productjarvis.com/<section>`
- `https://docs.productjarvis.com/<section>/<page>`
- `https://docs.productjarvis.com/api-docs`
- `https://docs.productjarvis.com/api-docs/<section>`
- `https://docs.productjarvis.com/changelog`

### Blog

- `https://blog.productjarvis.com/`
- `https://blog.productjarvis.com/<slug>`

### API

- `https://api.productjarvis.com/api/*`
- `https://api.productjarvis.com/`
- legacy compatibility remains on `https://www.productjarvis.com/api/v1/*`

## Redirect Rules

- apex always redirects to `www`
- legacy `www` paths redirect to canonical subdomains:
  - `/auth` -> `auth`
  - `/workspace/*` -> `app`
  - `/workspace/settings` -> `admin`
  - `/docs/*`, `/api-docs/*`, `/changelog` -> `docs`
  - `/blog/*` -> `blog`

## Local Development

Local development still works without subdomain DNS:

- marketing stays on `/`
- auth maps to `/auth`
- onboarding stays on `/welcome`
- app maps to `/workspace/*`
- admin maps to `/workspace/settings`
- docs map to `/docs/*`, `/api-docs/*`, `/changelog`
- blog maps to `/blog/*`

Run locally from the app root:

```bash
cd product-jarvis
npm run dev
```

Build locally from the app root:

```bash
cd product-jarvis
npm run build
```

## Verification Checklist

- preview deployment serves a new bundle and contains host-aware routing code before production promotion
- `www` renders landing/public pages
- `app` renders dashboard and workspace routes at root-level paths
- `auth` renders auth flow and callback
- `admin` renders settings
- `docs` renders docs, API docs, and changelog without `/docs` prefix
- `blog` renders blog index and slug pages without `/blog` prefix
- `api.productjarvis.com/api/methodologies` returns a backend response and never serves `index.html`
- localhost keeps working with the existing path-based routes
