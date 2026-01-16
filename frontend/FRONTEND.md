# Frontend Documentation

## Refactor Log

### 2026-01-16: Middleware to Proxy Migration

**Reason:** Next.js 16 deprecates the `middleware` export in favor of `proxy`.

**Changes:**
- Renamed `middleware.ts` to `proxy.ts`
- Changed function export from `middleware()` to `proxy()`
- The `config` matcher and internal `lib/supabase/middleware.ts` helper remain unchanged

### 2026-01-16: Google OAuth Addition

**Reason:** Provide users with an alternative sign-in method via Google.

**Changes:**
- Added Google OAuth button to `app/login/page.tsx`
- Added Google OAuth button to `app/signup/page.tsx`
- Uses Supabase `signInWithOAuth()` with `provider: 'google'`
- Redirects through existing `/auth/callback` route

**Configuration Required:**
Google OAuth credentials must be configured in the Supabase Dashboard:
1. Go to Authentication → Providers → Google
2. Add `OAUTH_GOOGLE_CLIENT_ID` and `OAUTH_GOOGLE_CLIENT_SECRET`
3. Set authorized redirect URI to `{SUPABASE_URL}/auth/v1/callback`
