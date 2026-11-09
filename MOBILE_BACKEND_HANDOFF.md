# SafeReport Mobile Backend Handoff

This document is for the Expo/React Native developer or AI building the
SafeReport mobile application. The mobile app should treat the deployed Next.js
application as its backend; it does not need to access Prisma directly.

## Backend

- Base URL: `https://crime-report-ashy.vercel.app`
- Format: JSON over HTTPS
- Authentication: HMAC-SHA256 bearer token from `POST /api/auth/mobile-login`
  (NextAuth cookie sessions are still accepted for browser clients)
- Database: PostgreSQL with Prisma
- Report IDs: 16-character uppercase hexadecimal strings, for example
  `F9C0DA163E07A2C3`

Configure the mobile app with:

```text
EXPO_PUBLIC_API_BASE_URL=https://crime-report-ashy.vercel.app
```

Do not add a trailing slash.

## API Status

| Feature | Endpoint | Current mobile status |
|---|---|---|
| Public report tracking | `GET /api/reports/{reportId}/details` | Working and confirmed against real data |
| User signup | `POST /api/auth/signup` | Live; returns public user fields, does not create a session |
| Mobile sign in | `POST /api/auth/mobile-login` | Live; returns a 30-day bearer token plus user profile |
| Session revalidation | `GET /api/auth/mobile-session` | Live with bearer token; `401` clears the stored session |
| Password reset request | `POST /api/auth/password-reset` | Implemented; requires `RESEND_API_KEY` and `PASSWORD_RESET_FROM` |
| Password reset confirm | `POST /api/auth/password-reset/confirm` | Implemented; single-use token, 30-minute expiry |
| Report creation | `POST /api/reports/create` | Live (bearer optional; anonymous reports allowed) |
| Image analysis | `POST /api/analyze-image` | Live; depends on Gemini availability/key configuration |
| My Reports | `GET /api/reports/mine` | Live with bearer token |
| List reports | `GET /api/reports` | `ADMIN` / `MODERATOR` only; bearer token accepted |
| Update report status | `PATCH /api/reports/{reportId}` | `ADMIN` / `MODERATOR` only; bearer token accepted |
| Browser sign in | `POST /api/auth/[...nextauth]` | Web NextAuth route, not used by the mobile client |

## Verified Mobile Integration Audit

> Historical note: this audit was performed before mobile bearer authentication
> and live report creation were connected. The **API Status** table above is the
> current source of truth.

The following checks were performed from the Expo mobile application:

- Public tracking returned HTTP 200 with real backend data for
  `F9C0DA163E07A2C3`.
- Tracking returned HTTP 404 for an unknown report ID.
- Invalid image payloads returned HTTP 400.
- Invalid report creation payloads returned HTTP 400 and did not write data.
- Valid PNG image-analysis requests timed out at the provider/server boundary
  for both small and larger valid PNG files.
- Image analysis is implemented in the submit screen.
- The submit screen applies suggested category, title, and description without
  overwriting manually entered text.
- The submit screen provides explicit error fallback for 400, 408, 429,
  502, 503, 504, and network failures.
- Creation and tracking modes are separately identified so demo submissions
  cannot be presented as real trackable reports.
- Native Expo calls should work; Expo web requires API CORS headers.

Valid report creation and signup were intentionally not tested because they
write real production data. The mobile app should keep these paths demo-only
until explicit production-write authorization and database/storage validation
are complete.

## Public Report Tracking

Request:

```text
GET /api/reports/{reportId}/details
Accept: application/json
```

Example:

```text
GET /api/reports/F9C0DA163E07A2C3/details
```

Success response:

```json
{
  "reportId": "F9C0DA163E07A2C3",
  "type": "EMERGENCY",
  "title": "Dark Armored Figure",
  "description": "Description returned by the backend",
  "location": "Location returned by the backend",
  "status": "PENDING",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

Statuses:

- `PENDING`
- `IN_PROGRESS`
- `RESOLVED`
- `DISMISSED`

Unknown ID response:

```json
{ "error": "Report not found" }
```

HTTP status: `404`.

## Image Analysis

Request:

```text
POST /api/analyze-image
Content-Type: application/json
```

Body:

```json
{
  "image": "data:image/png;base64,BASE64_DATA"
}
```

Supported image formats:

- JPEG
- PNG
- WebP

The mobile client must send a complete Base64 data URL, not raw Base64 and not
a binary file.

Success response:

```json
{
  "title": "Brief incident title",
  "reportType": "Other",
  "description": "Clear incident description"
}
```

Valid `reportType` values:

- `Theft`
- `Fire Outbreak`
- `Medical Emergency`
- `Natural Disaster`
- `Violence`
- `Other`

Important HTTP responses:

- `400`: missing, invalid, unsupported, or oversized image
- `408` or `504`: image analysis request timed out
- `429`: rate limit or Gemini quota exceeded
- `503`: Gemini or configuration unavailable
- `502`: Gemini authentication/model failure
- `500`: unexpected provider or server failure

Backend image requests have a provider timeout. Valid deployed PNG requests
currently need investigation because they can remain at the Gemini/provider
boundary until the client or server timeout occurs. Until valid requests
consistently return a result, the mobile UI must retain manual-entry fallback.

The mobile UI should treat `503` as a temporary provider outage and offer
retry/manual entry. Do not claim the image was analyzed if the request fails.

## Anonymous Report Creation

Request:

```text
POST /api/reports/create
Content-Type: application/json
```

Body for an anonymous report:

```json
{
  "type": "EMERGENCY",
  "specificType": "Fire Outbreak",
  "title": "Fire reported near campus",
  "description": "Smoke and fire are visible near the entrance.",
  "location": "Lagos",
  "latitude": 6.5244,
  "longitude": 3.3792,
  "image": null,
  "anonymous": true,
  "reporterName": null
}
```

Rules:

- `type` must be `EMERGENCY` or `NON_EMERGENCY`.
- `specificType` must be one of the five named incident types or `Other`.
- `title` must contain 3-120 characters.
- `description` must contain 10-5000 characters.
- `location` is optional.
- `latitude` and `longitude`, when supplied, must be finite numbers and within
  valid coordinate ranges.
- `image` may be `null` or one complete JPEG, PNG, or WebP data URL.
- Anonymous reports must use `anonymous: true`.
- Named identity reports require a mobile-authenticated session.

Success response:

```json
{
  "success": true,
  "reportId": "16_CHARACTER_REPORT_ID",
  "message": "Report submitted successfully"
}
```

Important:

- A real report is not created when the endpoint returns `500`, `503`, or an
  error JSON body.
- Current anonymous report creation may fail in production when evidence
  storage or the database path is unavailable.
- If an image is supplied, Cloudinary credentials must be configured on the
  backend. Anonymous report creation with `image: null` currently does not
  require Cloudinary.

## User Signup

Request:

```text
POST /api/auth/signup
Content-Type: application/json
```

Body:

```json
{
  "email": "user@example.com",
  "password": "AtLeast8Characters",
  "name": "Example User"
}
```

Success: HTTP `201` with public user fields. Password is never returned.

Signup does not create a mobile session. Call `POST /api/auth/mobile-login`
after a successful signup to obtain a bearer token.

## Mobile Authentication Guidance

Mobile sign-in is a dedicated JSON endpoint, not a NextAuth browser flow:

1. `POST /api/auth/mobile-login` with `{ email, password }` verifies the bcrypt
   hash and returns `{ token, user }`.
2. The token is an HMAC-SHA256 bearer token valid for 30 days. Store it in
   `expo-secure-store`; never in AsyncStorage or a URL.
3. Send it as `Authorization: Bearer <token>` on protected requests.
4. `GET /api/auth/mobile-session` revalidates it and returns the current profile
   and role.
5. A `401` means the token is invalid or expired: clear it and sign in again.
   A network error is not a `401`; keep the cached profile.

Dependencies: `MOBILE_AUTH_SECRET` (falls back to `NEXTAUTH_SECRET`) must be
configured. Never scrape the NextAuth web pages from the app or reuse browser
cookies.

## Password Reset

```text
POST /api/auth/password-reset
Content-Type: application/json

{ "email": "user@example.com" }
```

Always returns `200` with a generic message so the endpoint cannot be used to
enumerate accounts. If the account exists, the backend emails a signed,
single-use code valid for 30 minutes. The code is bound to the user's current
password hash, so it stops working after a successful reset.

```text
POST /api/auth/password-reset/confirm
Content-Type: application/json

{ "token": "<code from email>", "password": "NewPassword1" }
```

Success: `{ "success": true }`. New passwords must be 8–72 characters and
contain at least one letter and one digit.

Email delivery configuration:

- `RESEND_API_KEY` — Resend API key.
- `PASSWORD_RESET_FROM` — verified sender, e.g. `SafeReport <no-reply@example.com>`.
- `PASSWORD_RESET_SECRET` — optional; falls back to `NEXTAUTH_SECRET`.

Without email configuration the request endpoint returns `503`. The email
contains a `safereport://reset-password?token=…` deep link and the raw code.
Resetting a password does not revoke bearer tokens already issued to other
devices.

## My Reports

```text
GET /api/reports/mine
```

This endpoint accepts the mobile bearer token and returns reports linked to the
signed-in account.

## Admin APIs

All report listing and status updates require a signed-in user whose database
role is `ADMIN` or `MODERATOR`. Mobile bearer tokens and NextAuth browser
sessions are both accepted, and the role is re-read from the database on every
request.

List reports:

```text
GET /api/reports
GET /api/reports?status=PENDING
GET /api/reports?type=EMERGENCY
```

Update status:

```text
PATCH /api/reports/{reportId}
Content-Type: application/json

{ "status": "IN_PROGRESS" }
```

Valid statuses are listed above.

## Mobile Integration Rules

1. Use typed API functions and one shared `ApiError` format.
2. Keep base URL configuration outside feature code.
3. Validate report fields locally before requests.
4. Convert Expo images to complete data URLs; keep the payload below 5 MB.
5. Do not send bearer credentials or NextAuth cookies manually.
6. Never display demo credentials, mock reports, or mock submissions as real
   backend data.
7. Handle `401`, `403`, `404`, `429`, `503`, and network failures explicitly.
8. Public tracking should remain the first mobile feature connected to real
   backend data.

## Recommended Demo Sequence

For a stable client demonstration:

1. Public tracking against a known real report ID.
2. Image analysis, with manual-entry fallback during provider outages.
3. Anonymous report creation after database/evidence-storage verification.
4. Mobile-safe authentication.
5. My Reports.
6. Admin report listing and status updates.
