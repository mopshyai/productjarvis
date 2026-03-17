# ProductJarvis Launch Checklist

**Status:** ✅ Ready for SaaS Launch (March 16, 2026)
**Core Product:** 100% Functional | **Infrastructure:** Production-Ready

---

## Phase 1: Infrastructure (1 day)

### Supabase Setup
- [ ] Create production project → note URL + keys
- [ ] **Configure Auth Settings:**
  - [ ] Site URL: `https://auth.productjarvis.com`
  - [ ] Redirect URLs: `https://auth.productjarvis.com/callback`
  - [ ] Enable Google OAuth provider
- [ ] Enable backups + connection pooling
- [ ] Run migrations: `supabase link && supabase db push`
- [ ] Verify schema: `supabase db diff` (should be clean)
- [ ] Set secrets:
  ```bash
  supabase secrets set \
    SUPABASE_URL="https://xxx.supabase.co" \
    SUPABASE_SERVICE_ROLE_KEY="xxx" \
    ANTHROPIC_API_KEY="sk-ant-xxx" \
    OPENAI_API_KEY="sk-xxx" \
    CORS_ALLOWED_ORIGINS="https://productjarvis.com,https://app.productjarvis.com,..."
  ```
- [ ] Deploy 31 edge functions: `./scripts/deploy.sh`
- [ ] Test critical endpoints: `/api/session`, `/api/prd/generate`, `/api/command/execute`

### Vercel Setup
- [ ] Create project + connect GitHub
- [ ] Configure 7 subdomains (www, app, auth, admin, docs, blog, api)
- [ ] Set environment variables:
  ```
  VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
  VITE_USE_LIVE_API=true
  VITE_SENTRY_DSN, VITE_POSTHOG_KEY
  ```
- [ ] Deploy: `npm run build && vercel --prod`
- [ ] Verify build (~2.35s), check bundle sizes (`npm run analyze`)

### DNS + SSL
- [ ] Point domain to Vercel
- [ ] Configure all 7 subdomains:
  - [ ] `productjarvis.com` (apex → redirects to www)
  - [ ] `www.productjarvis.com`
  - [ ] `app.productjarvis.com`
  - [ ] `auth.productjarvis.com`
  - [ ] `admin.productjarvis.com`
  - [ ] `docs.productjarvis.com`
  - [ ] `blog.productjarvis.com`
  - [ ] `api.productjarvis.com`
- [ ] Verify SSL auto-provisioned for all subdomains

### Observability
- [ ] Sentry: Create project, test error reporting, set alerts
- [ ] PostHog: Create project, test event tracking, set up dashboards

---

## Phase 2: Testing (1 day)

**See ROUTING_AUDIT.md for complete testing matrix**

### Auth Flow
- [ ] Google OAuth sign-in → verify user in DB → test logout
- [ ] Invite code validation (valid/invalid)
- [ ] Waitlist submission

### Onboarding
- [ ] Complete all steps → verify workspace created + `onboarding_complete` flag

### Core Features
- [ ] Dashboard loads with metrics
- [ ] Command Bar executes + routes correctly
- [ ] PRD Generator: generate → stream → save → update (verify 10/hr rate limit)
- [ ] Ticket Factory: preview → push (mock)
- [ ] Decision Memory: search + citations
- [ ] Daily Digest: risks + confidence scores
- [ ] Opportunities: load + search
- [ ] Settings: update workspace, toggle flags, change AI model

### Rate Limiting
- [ ] Test all limits (PRD: 10/hr, update: 30/hr, command: 60/hr)
- [ ] Verify 429 responses + `retry-after` headers

### Cross-Surface Routing
- [ ] Navigate WWW → APP → AUTH → ADMIN → DOCS → BLOG
- [ ] Verify redirects work (e.g., `www.*/workspace` → `app.*`)
- [ ] Test API subdomain: `api.productjarvis.com/api/methodologies` returns JSON (not HTML)
- [ ] Test API subdomain: `api.productjarvis.com/` returns status JSON

### Performance
- [ ] Check Web Vitals (CLS, FID, LCP)
- [ ] Verify service worker caching (`public/sw.js`)
- [ ] Test offline behavior

### Security
- [ ] Verify CORS, CSP, XSS protection headers
- [ ] Test workspace isolation (RLS policies)

---

## Phase 3: Launch Day

### Pre-Launch (Morning)
- [ ] Run smoke tests: `./scripts/cutover_smoke.sh`
- [ ] Check Sentry/PostHog dashboards (error rate = 0)
- [ ] Brief team + prepare incident response plan

### Launch (Afternoon)
- [ ] Announce on social media
- [ ] Monitor dashboards (first 2 hours: errors, sign-ups, performance)

### Post-Launch (Evening)
- [ ] Review error logs + user metrics
- [ ] Document issues + plan fixes

---

## Phase 4: First Week

### Daily Monitoring
- [ ] Day 1: Fix critical bugs
- [ ] Day 2-7: Address user issues, optimize performance

### Week 1 Review
- [ ] Metrics: sign-ups, active users, error rate, performance
- [ ] Action items: bugs, improvements, roadmap updates

---

## Rollback Plan

**If critical issues:**
1. Check Sentry + PostHog for impact
2. Rollback: `vercel rollback` or `supabase functions deploy <name>`
3. Update status page + notify users

---

## Success Criteria
- [ ] Zero critical errors (24h)
- [ ] 95%+ uptime (week 1)
- [ ] <2s page load
- [ ] Successful sign-ups + positive feedback

---

## Post-Launch Content (Low Priority)
**Legal:** Privacy, Terms, Security pages
**Marketing:** About, Contact pages
**Docs:** Getting started, API docs, Changelog
**Blog:** Launch announcement, use cases

*(Can be completed after launch — core product is ready)*

---

**Launch Status:** [ ] GO / [ ] NO-GO
**Completed By:** _____________ **Date:** _____________
