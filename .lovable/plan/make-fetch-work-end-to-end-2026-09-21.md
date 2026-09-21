# Make FETCH work end to end

## 1. Sign-up works instantly (no email confirmation)

Turn on instant account activation so a new account is usable the moment someone signs up — no confirmation email, no waiting. The sign-up screen stops showing the "check your email" step and drops straight into the app.

## 2. Sign-in options

Email + password and Google sign-in both stay on and get re-checked.

About GitHub: GitHub sign-in is not available on the built-in accounts system this app uses — only email/password, Google, Apple and Microsoft are. I can add Apple or Microsoft instead if you want another one-tap option. Tell me and I'll add it; otherwise the app keeps Google + email.

## 3. Drive screen (for motorcycle riders)

Replace the demo list with real requests:
- Online/offline switch that actually saves your status, so passengers can see you.
- Live queue of nearby waiting requests with the passenger's name, photo and rating, pickup and drop-off, service type and fare.
- Accept assigns the ride to you; Skip hides it for you.
- Once accepted: buttons to start the trip and complete it.
- Today's real trip count and pesos earned, with the 0% commission line kept.

## 4. Activity screen

Replace the demo history with your real past rides — service, route, fare, payment status and date. Passengers get a "Rate your rider" button on finished rides they haven't rated yet.

## 5. Dashboard

Verify and fix the rider dashboard so it shows real upcoming rides, real earnings totals and the ratings you've received, refreshing as ride status changes.

## 6. Full test run

Create a test rider and a test passenger, then run one complete ride in the preview: request a free ride, accept it as the rider, start and complete it, pay via GCash, rate the rider, and confirm earnings and rating counts update. Fix anything that breaks along the way and confirm a clean build.

## Technical notes

- `configure_auth` with `auto_confirm_email: true`; re-assert Google via `configure_social_auth`.
- Rewrite `src/routes/drive.tsx` and `src/routes/activity.tsx` against the existing `rides`, `profiles`, `ratings` and `user_roles` tables — no schema changes expected beyond, if needed, a policy allowing riders to read requesting passengers' profiles.
- Rider online toggle writes `profiles.is_online` plus current coordinates.
- Verification with Playwright at localhost:8080, 390x844.
