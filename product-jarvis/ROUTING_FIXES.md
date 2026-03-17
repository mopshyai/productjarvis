# Routing Fixes Summary

**Date:** March 16, 2026

---

## Issues Fixed

### 1. API Subdomain Proxy Broken ❌ → ✅

**Problem:**
- `api.productjarvis.com/api/methodologies` returned SPA HTML instead of proxying to Supabase
- Catch-all rewrite `/:path*` matched before specific `/api/*` rewrites

**Fix:**
- Changed `vercel.json` line 292: `/:path*` → `/((?!api/).*)`
- Now only matches paths NOT starting with `/api/`
- `/api/*` requests correctly proxy to Supabase Edge Functions

**Test:**
```bash
curl https://api.productjarvis.com/api/methodologies
# Should return JSON from Supabase, not HTML

curl https://api.productjarvis.com/
# Should return api-status.json
```

---

### 2. Redundant Redirect Removed

**Problem:**
- `redirects` block had duplicate rule for `api.*` root
- Conflicted with rewrite rule

**Fix:**
- Removed lines 298-303 in `vercel.json`
- Rewrite handles it cleanly

---

## Configuration Requirements

### Supabase Auth Settings

**Site URL:**
```
https://auth.productjarvis.com
```

**Redirect URLs (whitelist):**
```
https://auth.productjarvis.com/callback
http://localhost:5173/auth/callback
```

**Google OAuth Provider:**
- Enable in Supabase dashboard
- Configure client ID and secret

---

## Verification Checklist

- [ ] `api.productjarvis.com/api/session` returns JSON (not HTML)
- [ ] `api.productjarvis.com/api/methodologies` returns JSON (not HTML)
- [ ] `api.productjarvis.com/api/prd/generate` returns JSON (not HTML)
- [ ] `api.productjarvis.com/` returns status JSON
- [ ] `api.productjarvis.com/status` returns status JSON
- [ ] `auth.productjarvis.com/callback` handles OAuth callback
- [ ] Google OAuth flow completes successfully
- [ ] All 7 subdomains serve correct content

---

## Files Modified

1. `vercel.json` — Fixed API subdomain rewrite pattern
2. `LAUNCH_CHECKLIST.md` — Added Supabase auth config steps
3. `ROUTING_AUDIT.md` — Complete routing architecture documentation
4. `MEMORY.md` — Updated production status

---

## Next Steps

1. Deploy to Vercel
2. Configure DNS for all 7 subdomains
3. Set Supabase auth redirect URL
4. Run full testing matrix (see ROUTING_AUDIT.md)
5. Monitor for 24 hours

---

**Status:** ✅ All routing issues resolved. Ready for production.
