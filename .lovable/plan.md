# Fix FETCH account registration & sign-in

Staying on Lovable Cloud (the pasted Supabase URL/key will not be used — no changes needed there).

## Problems

1. **Email/password signup** — accounts are created, but the confirmation email never arrives, so new users can never sign in.
2. **Google sign-in** — fails or returns without logging in, even though the Google provider was previously configured.

## Fix

### 1. Make email/password signup work without waiting for an email
- Turn on instant account activation in the backend auth settings (new accounts become active immediately — no confirmation email needed). This matches how the app is meant to work for the Fetch community, where members just want to sign up and go.
- Confirm email/password sign-in is enabled.

### 2. Repair Google sign-in
- Re-apply the Google provider configuration on the backend.
- Test the full Google flow in the preview and fix whatever blocks it (redirect handling, session handoff back to the app).

### 3. Verify end to end in the preview
- Create a brand-new test account with email + password and confirm it lands signed in on the home map.
- Sign out and sign back in with the same account.
- Run the Google sign-in button and confirm it completes.
- Check the build is clean afterwards.

## Technical details

- `supabase--configure_auth` with `auto_confirm_email: true` (signup works instantly; no email step).
- `supabase--configure_social_auth` with `providers: ["google"]` to re-assert the Google provider.
- Code touch-ups only if testing reveals them (likely in `src/routes/auth.tsx`).
- No database schema changes. No migration to an external Supabase project.
