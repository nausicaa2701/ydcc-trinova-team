You are an expert full‑stack engineer.
The existing project is a web app for an AI‑driven salinity intrusion map in the Mekong Delta (stack: Python/FastAPI backend, Vite + React + TypeScript + Mapbox GL frontend, with existing map view and AI forecast dashboard).

Goal: Refactor/extend the current codebase to add authentication, role‑based access control, and new views without breaking existing features.

Please:

Do NOT rewrite or heavily refactor existing working modules (map view, AI forecast calls, core layout).

Focus on adding missing pieces and gently adapting code to support authentication & authorization.

Show code changes in small, focused snippets (backend + frontend), not one huge file.

1. Auth & roles – high level
Add a simple auth system with 3 roles:

SYSTEM_ADMIN

COOP_ADMIN (hợp tác xã admin)

FARMER (hộ dân)

Requirements:

Implement login with phone number + password.

Use JWT‑based auth (or session‑based if simpler with FastAPI) with role embedded in the token.

Add minimal user model fields:

ts
User {
  id: string;
  phone: string;
  name: string;
  role: "SYSTEM_ADMIN" | "COOP_ADMIN" | "FARMER";
  coopId?: string;      // only for COOP_ADMIN and FARMER
}
Add API endpoints:

POST /auth/login – phone + password → JWT + user info.

POST /auth/change-password – for logged‑in users.

GET /auth/me – return current user profile + role.

Frontend:

Store auth token (e.g. in localStorage or httpOnly cookie).

Global auth context (React) to expose user, role, isAuthenticated.

Protect routes by role.

Keep the auth implementation simple, but production‑oriented enough for a thesis/MVP.

2. Landing page + login
Add a landing page that:

Shows a welcome message + short description of the “AI‑driven salinity intrusion map” app.

Has clear buttons:

“Login as System Admin”

“Login as Cooperative Admin (HTX)”

“Login as Farmer”
(all go to the same login form, role is determined by account, not button).

Add a login page:

Fields: phone number, password.

On success, redirect based on role:

SYSTEM_ADMIN → system admin dashboard.

COOP_ADMIN → HTX admin dashboard.

FARMER → farmer dashboard.

Keep styling consistent with existing UI (Tailwind + shadcn/ui if already used).

3. System Admin features
For the role SYSTEM_ADMIN, add / adapt pages so they can:

View the global Map View

Reuse the existing salinity map component (Mapbox GL).

Show all cooperatives (HTX) as markers / polygons on the map.

System admin sees all HTX at normal color (no dimming).

View Analytics Dashboard + AI forecast

Reuse the existing AI forecast dashboard components.

Make sure there is a dedicated route like /admin/dashboard that shows:

Time‑series forecast for salinity.

Risk summary for the whole delta (or all HTX).

HTX Management

Create a new view: /admin/coops (HTX list).

Show table/grid of cooperatives:

id, name, province, center_lat, center_lon, status, etc.

Allow:

Add HTX (create)

Edit HTX (update basic info, location)

Delete HTX (soft delete if possible)

Edit JSON config per HTX (e.g. thresholds, crops, alert settings)

The JSON config can be a text area + JSON editor with basic validation.

Backend:

Add Cooperative model and CRUD endpoints:

GET /coops

POST /coops

PUT /coops/{id}

DELETE /coops/{id}

PUT /coops/{id}/config for JSON config.

Apply role checks: only SYSTEM_ADMIN can access these HTX management APIs.

Important: Reuse existing map & dashboard components where possible; just add routing + wrappers for role‑based visibility.

4. HTX Admin features
For COOP_ADMIN:

Map View scoped to their HTX

Route: /coop/map.

Reuse the existing salinity map, but:

Highlight their cooperative area (polygon or marker) in a stronger color.

Show other HTX in more faded / lighter colors to indicate context but less focus.

Farmer Management inside that HTX

Route: /coop/farmers.

Table of farmers in that HTX:

name, phone, field_id, any relevant metadata.

Actions:

Add farmer account:

Input name, phone, optional metadata.

Generate a temporary password and store hashed in DB.

Edit farmer info.

Delete farmer account (or deactivate).

Backend:

Add Farmer or reuse User with role FARMER and coopId referencing the coop.

Endpoints (role‑protected for COOP_ADMIN of that coop only):

GET /coops/{coopId}/farmers

POST /coops/{coopId}/farmers

PUT /coops/{coopId}/farmers/{farmerId}

DELETE /coops/{coopId}/farmers/{farmerId}

Forecast dashboard for that HTX

Route: /coop/dashboard.

Reuse AI forecast components, but filter data to that specific coop area:

Show salinity forecast & risk for the fields / polygons belonging to that coop.

Risk for crops/inputs (use existing risk model outputs if available).

Config sending messages to farmers (via n8n + Zalo)

HTX admin should see a simple config form for alert rules (basic version):

e.g. choose:

Threshold: salinity > X g/L.

Which farmers/groups to notify (all in coop for now).

When an alert condition is met (for now, simulate it with a button “Send test alert”), the backend should:

Call a fake API URL representing n8n/Zalo webhook, e.g.:

POST https://n8n.example.com/webhook/zalo-alert

Body should include:

farmer phone numbers

coopId

message template or risk info

Implement:

A backend endpoint POST /coop/{coopId}/alerts/test that:

Reads farmers of that coop.

Sends a POST request to the fake n8n URL with their phone numbers.

In the frontend, a button “Test Zalo Notification” calls this endpoint.

Note: No need to implement full alert logic engine – just the plumbing from HTX admin → backend → fake n8n URL.

5. Farmer (FARMER) features
For FARMER role:

Login & Profile

Farmers can log in with phone + password.

Provide a simple “My Profile” page:

View/update name, contact info, maybe field location.

Change password.

Map View

Route: /farmer/map.

Reuse existing salinity map.

Center the map on their coop region or on their field if location is known.

AI Dashboard (read‑only)

Route: /farmer/dashboard.

Show forecast + risk relevant to their coop (no editing, read‑only).

No admin functions (no HTX management, no farmer management, no config).

6. Role‑based routing & UI
Implement a central route config and guard:

Only SYSTEM_ADMIN can access /admin/*.

Only COOP_ADMIN can access /coop/*.

Only FARMER can access /farmer/*.

Landing page & login are public (if not authenticated).

In the UI:

Add a top‑level navigation that changes by role:

System admin: links to Map, Dashboard, HTX Management.

HTX admin: links to Map, Dashboard, Farmer Management, Alert Config.

Farmer: links to Map, Dashboard, Profile.

Again, reuse existing components when possible.

7. Constraints & style
Keep the existing salinity map and AI dashboard logic as intact as possible. Only add props / wrappers if necessary for role‑based filtering.

Any new frontend code should be in TypeScript and match existing patterns (React Query / Zustand, etc.).

Any new backend endpoints should:

Use existing FastAPI app structure, routers, and dependencies.

Use existing DB models or extend them minimally (e.g. add role, coopId to User).

Include some basic tests or at least docstrings for role checks (e.g. @requires_role("SYSTEM_ADMIN") decorator).

Please provide:

Backend changes (FastAPI) for models, auth, and new endpoints.

Frontend changes (React + Vite) for routing, auth context, role‑based navigation, and new pages/components.

Brief notes inline where you integrate with existing map/forecast components, to show you are extending, not rewriting them.