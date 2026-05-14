# Railly System Architecture

## Overview

**Railly** is a Malaysian women's safety commuter rail platform focused on incident reporting, AI-powered detection, and auxiliary staff response coordination. It serves three user roles across two interfaces:

- **Operator** — Web dashboard (control room staff)
- **Passenger** — Mobile PWA (commuters reporting incidents)
- **Auxiliary** — Mobile PWA (on-ground response staff)

**Core Tech Stack:**
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite 7 |
| Backend | ASP.NET Core (.NET 10) |
| Database | PostgreSQL (via Entity Framework Core + Npgsql) |
| Real-time | SignalR (`/hubs/alerts`) |
| Cloud | AWS (S3, Secrets Manager, SES, RDS) |
| AI | Google Vertex AI (Gemini) |
| Push | Web Push (VAPID) |

---

## 1. Presentation Layer

### 1.1 Web Operator UI (`/src/pages/web-operator/`)

| Page | File | Purpose |
|------|------|---------|
| Dashboard | `Dashboard.tsx` | KPI cards (pending/verified/resolved), 7-day trend chart, recent alerts |
| Live Alerts | `LiveAlerts.tsx` | Real-time incident table with line/station/status filters; SignalR updates |
| Reports | `Reports.tsx` | Monthly analytics — KPIs, daily/status charts, incident list, PDF export |
| Shift Management | `ShiftManagement.tsx` | Shift CRUD + bulk import from CSV/XLSX |
| User Management | `UserManagement.tsx` | User list, status toggle (Active/Suspended/Archived), bulk import |
| Settings | `Settings.tsx` | Sound alert mode (On/Off/Peak), time format preferences |

### 1.2 Mobile Passenger UI (`/src/pages/mobile-passenger/`)

| Page | File | Purpose |
|------|------|---------|
| Home | `Home.tsx` | Personal report list with filters |
| Create Report | `CreateReport.tsx` | Incident submission form (line → station → coach → description → photo) |
| Passenger Report | `PassengerReport.tsx` | Single report detail view with status timeline |
| Incident Near Me | `IncidentNearMe.tsx` | Top 10 active incidents today (public, no auth required) |
| Insights | `Insights.tsx` | Personal stats (report count, verified rate) + trend chart |
| Profile | `PassengerProfile.tsx` | Account details and stats |

### 1.3 Mobile Auxiliary UI (`/src/pages/mobile-auxiliary/`)

| Page | File | Purpose |
|------|------|---------|
| Shift | `AuxiliaryShift.tsx` | Current shift info (station, time, on-duty status) |
| Recent Alerts | `RecentAlerts.tsx` | Live incident feed for assigned station ±2 stations |
| Alert Detail | `AlertDetailView.tsx` | Full incident detail, status action buttons, status timeline |
| Alert History | `AlertsHistory.tsx` | Incidents handled (resolved/escalated/dismissed) by this user |
| Profile | `AuxiliaryProfile.tsx` | Stats: avg reaction time, resolved count |

### 1.4 Auth Pages (`/src/pages/auth/`)

| Page | File | Purpose |
|------|------|---------|
| Login | `LoginPage.tsx` | Email check → password → MFA/OTP step routing |
| Signup | `SignupPage.tsx` | Name/email/password → OTP verify → account creation (passengers only) |
| Setup Password | `SetupPasswordPage.tsx` | Initial password setup for new operator/auxiliary accounts |
| Forgot Password | `ForgotPasswordPage.tsx` | Email → OTP verify → reset password |
| Change Password | `ChangePasswordPage.tsx` | Authenticated password change with OTP re-verification |
| MFA Setup | `MfaSetup.tsx` | Display TOTP QR code (Google Authenticator), verify activation |
| MFA Verification | `MfaVerification.tsx` | TOTP code entry (operators) or OTP code entry (auxiliary) |

### 1.5 Shared Components (`/src/components/`)

| Component | Purpose |
|-----------|---------|
| `IncidentTable.tsx` | Reusable incident list table |
| `ReportKPICards.tsx` | KPI metric display cards |
| `ReportCharts.tsx` | Recharts bar/pie/line chart wrappers |
| `ReportPDF.tsx` | PDF export via `@react-pdf/renderer` |
| `JustificationModal.tsx` | Comment input modal for status actions |
| `StatusTimeline.tsx` | Vertical timeline of incident lifecycle |
| `OfflineBanner.tsx` | "You are offline" indicator |
| `PWAInstallPrompt.tsx` | Add-to-homescreen prompt |
| `UpdatePrompt.tsx` | New version available notification |
| `Spinner.tsx` | Loading indicator |

### 1.6 PWA & Offline Support

- **Service Worker** registered via `vite-plugin-pwa` — caches static assets
- **Offline Queue** (`/src/utils/offlineQueue.ts`) — stores pending reports in LocalStorage, flushes on reconnect
- **Push Notifications** (`/src/utils/pushNotifications.ts`) — requests permission, subscribes with VAPID public key, registers with backend
- **OfflinePage** (`/src/pages/OfflinePage.tsx`) — fallback route when offline

---

## 2. API Gateway Layer

### 2.1 Middleware Pipeline (in order, `Program.cs`)

| Middleware | Responsibility |
|-----------|---------------|
| Exception Handler | Catches unhandled exceptions, returns JSON `{ message: "An error occurred" }` |
| DB Migration Runner | Runs pending EF Core migrations on startup |
| Forwarded Headers | Reads `X-Forwarded-For` / `X-Forwarded-Proto` (reverse proxy support) |
| Swagger / OpenAPI | API docs at `/swagger` (development) |
| CORS | Allows: `railly.systems`, `localhost:5173`, `localhost:3000` |
| Rate Limiting | Per-IP sliding window (see rates below) |
| JWT Authentication | Validates Bearer token from HttpOnly cookie |
| Authorization | Enforces `[Authorize]` and role policies |
| Controller Routing | Maps HTTP requests to controller actions |
| SignalR Hub | Maps `/hubs/alerts` WebSocket endpoint |
| Health Check | `/health` endpoint |

**Rate Limits:**
- `/api/auth/*` endpoints: **10 req/min per IP** (sliding window, 6 segments)
- All other API endpoints: **120 req/min per IP**
- Returns HTTP 429 on breach

**JWT Config:**
- Issuer & Audience: `railly.my`
- Expiry: 8 hours
- Delivered via HttpOnly secure cookie (not Authorization header)

### 2.2 Route Groups

#### `/api/auth` — AuthController

| Endpoint | Method | Auth | Rate Limit | Purpose |
|----------|--------|------|-----------|---------|
| `/check-account` | POST | No | — | Check if email exists; return role/status/MFA requirements |
| `/login` | POST | No | auth | Validate password; route to TOTP (operator), email OTP (auxiliary), or issue JWT (passenger) |
| `/login/start-otp` | POST | No | auth | Send email OTP for auxiliary login second factor |
| `/login/verify` | POST | No | auth | Verify TOTP or email OTP, issue JWT cookie |
| `/mfa/setup` | GET | No | — | Generate TOTP secret + QR code URI |
| `/mfa/activate` | POST | No | — | Verify TOTP code to activate MFA |
| `/setup-password` | POST | No | — | Set initial password for new operator/auxiliary staff |
| `/change-password/start` | POST | Yes | auth | Send OTP to initiate password change |
| `/change-password` | POST | Yes | auth | Verify OTP + update password |
| `/signup/start` | POST | No | auth | Initiate passenger signup (sends email OTP) |
| `/signup/complete` | POST | No | — | Verify OTP + create passenger account |
| `/forgot-password/start` | POST | No | auth | Send password reset OTP |
| `/forgot-password/reset` | POST | No | auth | Verify OTP + reset password |
| `/me` | GET | Yes | — | Return current user session from JWT |
| `/logout` | POST | No | — | Clear JWT cookie |

**Authentication Flows by Role:**
- **Passenger (single-factor):** Password → JWT cookie issued
- **Operator (two-factor):** Password → TOTP (Google Authenticator) → JWT cookie
- **Auxiliary (two-factor):** Password → Email OTP (6-digit, 5-min expiry) → JWT cookie
- **New staff onboarding:** Admin creates account → staff uses `/setup-password` → MFA/OTP setup → first login

#### `/api/data` — Passenger, Operator & Auxiliary endpoints

**Passenger:**

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/lines` | GET | No | List all train lines with coaches and trains |
| `/report` | POST | Yes | Submit a passenger incident report |
| `/report/{reportId}/image` | POST | Yes | Upload incident photo to S3 (JPEG/PNG/GIF/WebP, max 5MB) |
| `/profile` | GET | Yes | Passenger: report count, verified count. Auxiliary: reaction time, resolved count |
| `/incident-near-me` | GET | No | Top 10 active incidents today (public) |
| `/my-history` | GET | Yes | User's own submitted report history with status timeline |
| `/incident/{incidentId}/status` | POST | Yes | Passenger escalates (Pending→Escalated) or dismisses own report |
| `/stations-by-line/{lineId}` | GET | No | Stations on a given line |
| `/ai/travel-advice` | POST | Yes | Gemini-generated safety tip based on current active incidents |

**Operator:**

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/ai/report-summary` | POST | Operator | Gemini AI executive summary of monthly incident data |
| `/home-stats` | GET | Operator | Dashboard KPIs: recent reports + 30-day trend by day-of-week |
| `/incident-alerts` | GET | Yes | All incidents from last 35 days (optional station filter) |
| `/incident-alerts/{id}/status` | POST | Operator | Update incident status: Verified / Escalated / En_Route / Resolved / Dismissed |
| `/operator/dashboard` | GET | Operator | KPIs (pending/verified/resolved/dismissed), camera health, avg response time |
| `/operator/alerts` | GET | Operator | Today's incidents with line/station filter dropdowns + status breakdown |
| `/operator/reports` | GET | Operator | Monthly report: KPIs, daily/status charts, incident list |
| `/operator/users` | GET | Operator | Paginated user list (50/page) |
| `/operator/users/{userId}/status` | PATCH | Operator | Set user status (Active/Suspended/Archived) |
| `/operator/shifts` | GET | Yes | All auxiliary shift assignments with line info |
| `/operator/shifts/import` | POST | Operator | Bulk import shifts from CSV/XLSX (EPPlus) |
| `/operator/users/import` | POST | Operator | Bulk import operator/auxiliary accounts from CSV/XLSX |
| `/operator/settings` | GET | Operator | Get notification preferences (sound alert mode, time format) |
| `/operator/settings` | POST | Operator | Save notification preferences |

**Status Update Rules:**
- Operator can only escalate from `Verified` status, with a 2-minute cooldown since last escalation
- All status changes trigger SignalR broadcast + push notifications

**Auxiliary:**

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/auxiliary/shift` | GET | Auxiliary | Current/upcoming/past shift with on-duty status |
| `/auxiliary/users` | GET | Auxiliary | List all auxiliary staff |
| `/auxiliary/stations` | GET | Auxiliary | List all stations |
| `/auxiliary/alerts` | GET | Auxiliary | Incidents at assigned station ±2 stations (sequence order on any line) |
| `/auxiliary/alerts/{id}/status` | POST | Auxiliary | Update incident: En_Route / Resolved / Escalated / Dismissed |
| `/auxiliary/history` | GET | Auxiliary | Incidents this user has handled |

**Proximity Logic:** Auxiliary sees incidents within ±2 stations (by sequence) on any line their assigned station belongs to. Shift validation checks station_id + (start_time ≤ now < end_time) in MYT.

#### `/api/detections` — DetectionController

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/notify` | POST | X-Api-Key header | Lambda callback after AI detection inserts Detection + Incident; triggers SignalR + push |

#### `/notifications` — NotificationController

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/subscribe` | POST | Yes | Register device push subscription (VAPID endpoint + keys) |
| `/unsubscribe` | DELETE | Yes | Remove push subscription on logout or opt-out |

#### `/api/geo` — GeoController

Handles geolocation-related queries using Google Geocoding API.

---

## 3. Business Logic Layer

### 3.1 Authentication Services

**AuthChallengeStore (Singleton):**
- In-memory store for OTP challenges (6-digit codes, 15-min expiry)
- `Create(id, duration, metadata?)` — generates challenge with optional metadata (e.g., password hash for handoff)
- `VerifyAndConsume(challengeId, userId, code)` — single-use verification
- Prevents database bloat from short-lived codes

**ChallengeCleanupService (HostedService):**
- Background timer that expires stale OTP challenges from `AuthChallengeStore`

**TotpService:**
- `GenerateSecret()` — 32-char base32 secret
- `VerifyCode(secret, code)` — RFC 6238 TOTP validation (±1 step tolerance)
- `GetQrCodeUri(email, secret)` — generates `otpauth://` URI for QR codes

**TotpUsedCodeCache (Singleton):**
- Caches recently used TOTP codes to prevent replay attacks within the 30-second validity window

### 3.2 Image Storage — AWS S3

- **Upload flow:** Backend issues presigned upload URL → Passenger uploads directly to S3 (never through API server)
- **Read flow:** Backend generates 60-second presigned read URLs per request
- **Key pattern:** `snapshots/user-report/{userId}-{reportId}`
- **Constraints:** 5MB max, JPEG/PNG/GIF/WebP only (MIME + magic bytes checked server-side before URL issuance)

### 3.3 Push Notification Service

- **Protocol:** Web Push (VAPID)
- **Triggers:**
  - `NotifyNewIncident(incidentId, actedByUserId)` — new report submitted or AI detection received
  - `NotifyStatusChange(incidentId, actedByUserId)` — incident status updated by operator/auxiliary
  - `NotifyReEscalation(incidentId, actedByUserId)` — incident re-escalated
- Queries `PushSubscriptions` table for all relevant users, sends WebPush notification to each

### 3.4 Email Service (AWS SES)

- `SendLoginOtpAsync(email, name, code)` — sends 6-digit OTP for auxiliary login, password reset, change-password flows
- Also handles signup verification email

### 3.5 Alert / Incident Service

**AlertService:**
- `MapToAlertDTO(Incident, now)` — converts DB Incident + navigations to `AlertDTO`
- Resolves line/station/coach from Detection source or UserReport source
- Generates S3 presigned URLs for any attached images
- Formats all timestamps as MYT (+8h from UTC)

### 3.6 Train Ingestion & AI Detection Pipeline

This pipeline handles automated incident detection from physical CCTV cameras on trains — no passenger input required.

**AI Models:**

| Model | Architecture | Task | Training Platform |
|-------|-------------|------|------------------|
| Gender Detection | MobileNetV3 | Classifies detected persons as male/female to identify male intrusion into women-only coaches | Kaggle (GPU notebook) |
| Object Detection | YOLOv11s (YOLO11s) | Detects and localises persons within the camera frame in real time | Kaggle (GPU notebook) |

- **Inference pipeline:** YOLO11s first detects persons in the frame → each detected bounding box is cropped and passed to MobileNetV3 for gender classification
- **Detection trigger:** If a male person is classified within a women-only coach frame, the detection is treated as a positive incident
- **YOLOv11s** (small variant) is chosen for its balance of speed and accuracy — suitable for real-time inference on the Raspberry Pi's constrained hardware
- **MobileNetV3** is a lightweight CNN architecture optimised for mobile/edge devices — low latency gender classification without a GPU
- Both models were trained on Kaggle using GPU-accelerated notebooks, then exported and deployed onto the Raspberry Pi

**Edge Layer — Raspberry Pi:**
- Mounted on-train, connected to CCTV cameras in women-only coaches
- Runs YOLO11s + MobileNetV3 inference locally on each camera frame in real time
- On a positive detection (male in women-only coach), captures a snapshot and publishes the event via **MQTT over TLS** to AWS IoT Core
- Edge processing keeps latency low and avoids streaming raw video to the cloud

**AWS IoT Core:**
- MQTT broker that receives detection messages from Raspberry Pi devices
- Routes the payload and frame snapshot to **AWS S3** (`railly` bucket) for storage
- Triggers **AWS Lambda** (`railly-detection-handler`) to process the detection event

**AWS Lambda — `railly-detection-handler`:**
- Processes the IoT event: reads detection metadata (camera, coach, line, station, timestamp)
- Inserts a `Detection` record and a corresponding `Incident` record (`source=AI_DETECTION`, `status=Pending`) into RDS PostgreSQL
- Calls `POST /api/detections/notify` on the Fargate backend (authenticated with `X-Api-Key`)
- Backend then broadcasts `NewIncident` via SignalR and fires WebPush notifications to operators and on-duty auxiliary staff

**S3 Bucket — `railly`:**
- Stores raw frame snapshots captured by the Raspberry Pi at detection time
- Lambda records the S3 key in the `Detection` row; backend later generates presigned URLs for operator/auxiliary to view the frame

---

### 3.7 AI Integration — Google Vertex AI (Gemini)


**GeminiService:**
- `GenerateAsync(prompt, cancellationToken)` — sends prompt to Vertex AI Gemini endpoint
- Used for:
  - **Passenger:** `/ai/travel-advice` — safety tips based on live incidents on the passenger's route
  - **Operator:** `/ai/report-summary` — executive narrative summary of monthly incident data for reports

### 3.8 Geolocation — Google Geocoding API

- Resolves station names to lat/lng coordinates for map rendering
- Reverse-geocodes passenger GPS coordinates to human-readable addresses
- Results cached in-memory to reduce API quota consumption

### 3.9 Reporting Engine

- **Monthly Reports:** Operator endpoint aggregates KPIs (total incidents, resolved %, false alarm rate, avg response time), daily breakdowns, and per-line breakdowns
- **PDF Export:** Frontend renders via `@react-pdf/renderer`; also supports `jspdf` + `html2canvas` capture
- **XLSX Export:** `exceljs` used for spreadsheet generation

### 3.10 Real-time Hub — SignalR

- Hub: `/hubs/alerts`
- Events broadcast to connected clients:
  - `NewIncident` — fired on passenger report submission or Lambda AI detection callback
  - `IncidentStatusChanged` — fired on any status transition

---

## 4. Data Layer

### 4.1 PostgreSQL Database (EF Core / Npgsql)

**13 DbSets:**

| Table | Key Columns | Notes |
|-------|------------|-------|
| `Users` | Id, Email, PasswordHash, Role, Status, TotpSecret, IsActivated | Roles: Passenger, Operator, Auxiliary |
| `TrainLines` | Id, Name, Code | LRT/MRT line metadata |
| `Stations` | Id, Name, Code, Lat, Lng | Station with coordinates |
| `LineStations` | LineId, StationId, SequenceOrder | Composite PK; sequence used for proximity filtering |
| `TrainAssets` | Id, LineId, AssetCode, Status | Physical trains; Status: Active/Inactive/Maintenance |
| `TrainCoaches` | TrainId, CoachId, CoachType | Composite PK; CoachType: Womens_Only / Mixed |
| `Cameras` | Id, TrainId, CoachId, Status | CCTV per coach; Status: Active/Inactive/Faulty |
| `Detections` | Id, LineId, StationId, CameraId, ImageS3Key, DetectedAt | AI-detected incidents |
| `UserReports` | Id, ReporterId, LineId, StationId, TrainId, CoachId, Description, ImageS3Key | Passenger incident reports |
| `Incidents` | Id, Source, DetectionId?, UserReportId?, Status, + 5× (By/At/Comment) lifecycle columns | Master incident record |
| `AuxiliaryShifts` | Id, AuxiliaryId, StationId, StartTime, EndTime, Status | Shift scheduling |
| `PushSubscriptions` | Id, UserId, Endpoint, P256DH, Auth, CreatedAt | VAPID push tokens |
| `NotificationPreferences` | UserId, SoundAlertMode, TimeFormat | Per-user display preferences |

**Key Design Decisions:**

- **Composite PKs:** `LineStation (LineId+StationId)` and `TrainCoach (TrainId+CoachId)` — supports multi-line stations and multi-coach trains naturally
- **Incident source exclusivity:** PostgreSQL CHECK constraint enforces that each Incident references either `DetectionId` XOR `UserReportId`, never both
- **Status audit columns:** Instead of a separate status history table, each status stage has dedicated `*By`, `*At`, and `*Comment` columns — full lifecycle in one row
- **Soft deletes:** `IsDeleted` flag on user-facing entities; no hard DELETEs to preserve audit trail

**Enums (mapped to PostgreSQL native enums):**

```
UserRole:       Passenger | Operator | Auxiliary
UserStatus:     Active | Suspended | Archived
AssetStatus:    Active | Inactive | Maintenance
CoachType:      Womens_Only | Mixed
CameraStatus:   Active | Inactive | Faulty
IncidentSource: AI_DETECTION | USER_REPORT
IncidentStatus: Pending | Verified | En_Route | Escalated | Resolved | Dismissed
SoundAlertMode: On | Off | Peak
```

**Incident Lifecycle:**
```
Pending → Verified → En_Route → Resolved
        ↓                     ↓
     Dismissed            Escalated → Resolved
```

### 4.2 Caching

| Cache | Implementation | Purpose |
|-------|---------------|---------|
| OTP Challenge Store | `AuthChallengeStore` (in-memory Dictionary) | Short-lived OTP codes; avoids DB writes for transient state |
| TOTP Replay Cache | `TotpUsedCodeCache` (in-memory HashSet) | Prevents same TOTP code from being used twice |
| Geocoding Results | ASP.NET `IMemoryCache` | Reduces Google Geocoding API quota consumption |

### 4.3 Query Helpers

- `IncidentQueryExtensions` (`/backend/Data/IncidentQueryExtensions.cs`) — reusable EF Core query builders for filtering incidents by zone, severity, date range
- `BaseApiController` provides:
  - `MytNow` — `DateTime.UtcNow + 8h` for MYT display
  - `MytTodayUtc` — UTC midnight of today in MYT, used for DB range queries
  - `TryParseIncidentId(string, out int)` — strips `ALT-` / `RPT-` prefix and parses to int

---

## 5. Deployment Architecture

| Category | Stack |
|----------|-------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | ASP.NET Core (.NET 10), containerised via Docker |
| Database | PostgreSQL (AWS RDS `railly-db`) |
| Container Registry | AWS ECR (`fyp-backend`) |
| Container Runtime | AWS ECS + Fargate (`railly-backend-cluster` / `fyp-backend-service`) |
| Load Balancer | AWS ALB (`railly-backend-alb`) |
| Frontend Hosting | AWS S3 + CloudFront |
| Domain | name.com (`railly.systems`, `api.railly.systems`) |
| TLS Certificates | AWS ACM — `railly.systems` (us-east-1), `api.railly.systems` (ap-southeast-1) |
| Secrets | AWS Secrets Manager |
| Email | AWS SES |
| Object Storage | AWS S3 (`railly` — incident snapshots) |
| IoT Broker | AWS IoT Core (MQTT over TLS) |
| Edge Device | Raspberry Pi (YOLO11s + MobileNetV3 inference) |
| Detection Handler | AWS Lambda (`railly-detection-handler`) |
| Bastion / Admin Access | AWS EC2 (`railly-bastion`) |
| AI / LLM | Google Vertex AI (Gemini) |
| Geolocation | Google Geocoding API |
| Auth | JWT (HttpOnly cookie) + TOTP (operators) + Email OTP (auxiliary) |
| ML Training | Kaggle GPU notebooks |
| Push Notifications | Web Push (VAPID) |
| Real-time | SignalR (`/hubs/alerts`) |

---

## 6. Security Layer

### 6.1 Authentication

| Mechanism | Applies To | Detail |
|-----------|-----------|--------|
| JWT (RS256) | All roles | Issued as HttpOnly secure cookie; 8h expiry; validated on every request |
| TOTP (RFC 6238) | Operators only | Google Authenticator compatible; 30s window ±1 step; used codes cached to prevent replay |
| Email OTP | Auxiliary (login), all (password ops) | 6-digit, 5-min expiry; single-use; stored in `AuthChallengeStore` |
| BCrypt | All | Password hashing via `BCrypt.Net-Next` |

### 6.2 Authorisation

- Role-based via `[Authorize(Roles = "Operator")]` etc. at controller level
- Passenger-owned resource checks (e.g., passenger can only escalate their own report)
- Auxiliary on-duty check enforced server-side before any alert action

### 6.3 Transport Security

- All production traffic over HTTPS/TLS
- `X-Forwarded-For` / `X-Forwarded-Proto` headers processed correctly behind reverse proxy
- CORS allowlist restricts browser-origin requests to known domains

### 6.4 Input Validation

- All request bodies validated via Data Annotations before processing
- File uploads: MIME type + magic bytes checked server-side before S3 URL issuance
- Parameterised queries only via EF Core (no raw SQL with user input)
- `TryParseIncidentId` prevents ID injection via prefixed incident ID strings

### 6.5 Rate Limiting

- `/api/auth/*`: 10 req/min per IP — protects against brute-force login and OTP enumeration
- All other endpoints: 120 req/min per IP
- Returns HTTP 429 with no body on breach

### 6.6 Secrets Management

- No secrets in source code or environment files committed to repository
- All production secrets in AWS Secrets Manager, fetched at application startup
- Secrets include: DB connection, JWT key, VAPID keys, external API keys, Lambda API key

### 6.7 OTP Replay Prevention

- `AuthChallengeStore.VerifyAndConsume()` — marks challenge as consumed on first use; second use rejected
- `TotpUsedCodeCache` — caches used TOTP codes for the duration of the 30s validity window

---

## 7. Key Data Flows

### 7.1 Passenger Report Submission

```
1. Passenger fills form (line → station → coach → description)
2. POST /api/data/report
   → Validates user identity (JWT)
   → Validates coach/line/station FK existence
   → Inserts UserReport record
   → Creates Incident (source=USER_REPORT, status=Pending)
3. If photo: POST /api/data/report/{id}/image
   → Validates MIME + size
   → Uploads to S3 at snapshots/user-report/{userId}-{reportId}
4. Backend:
   → Broadcasts NewIncident via SignalR (/hubs/alerts)
   → Sends WebPush to subscribed operators and on-duty auxiliary
5. Operator LiveAlerts page updates in real-time
6. Auxiliary RecentAlerts page updates if incident is at ±2 stations from their shift station
```

### 7.2 Operator Login (Two-Factor)

```
1. POST /api/auth/check-account    → confirms email exists, returns role=Operator
2. POST /api/auth/login            → validates password, challenge stored, no JWT yet
3. POST /api/auth/login/verify     → submits TOTP code
   → Validates against TOTP secret
   → Checks TotpUsedCodeCache (replay prevention)
   → Marks code used in cache
   → Issues JWT cookie (HttpOnly, Secure)
4. All subsequent requests use cookie automatically
```

### 7.3 AI Camera Detection (Lambda Flow)

```
1. AWS Lambda runs detection model on CCTV frame
2. Lambda inserts Detection + Incident records directly into RDS
3. Lambda POST /api/detections/notify (X-Api-Key: {key})
   → API validates Lambda API key
   → Loads incident with navigations
   → Broadcasts NewIncident via SignalR
   → Sends WebPush to operators and auxiliary
4. Operator/Auxiliary UIs update in real-time
```

### 7.4 Incident Resolution (Auxiliary Flow)

```
1. Auxiliary receives push notification
2. RecentAlerts page shows new Pending incident (within ±2 stations of shift)
3. POST /api/data/auxiliary/alerts/{id}/status { status: "en_route", comment: "..." }
   → Validates auxiliary is on duty at assigned station
   → Updates Incident.Status=En_Route, EnrouteBy=userId, EnrouteAt=now
   → Broadcasts IncidentStatusChanged via SignalR
   → Sends WebPush to original passenger reporter
4. Auxiliary reaches scene, POST status: "resolved"
   → Updates Incident.Status=Resolved, ResolvedBy, ResolvedAt, ResolvedComment
   → Broadcasts + notifies
5. Passenger sees real-time status update in PassengerReport page
```

### 7.5 Monthly Report Generation

```
1. Operator selects month → GET /api/data/operator/reports?year=2026&month=5
2. Backend:
   → Queries all incidents for [month start, month end)
   → Calculates KPIs: total, resolved %, false alarm %, avg response time
   → Fetches previous month for delta comparisons
   → Groups by day-of-week and line for charts
3. Frontend renders:
   → KPI cards with delta indicators
   → Bar/line charts via Recharts
   → Full incident table
4. Operator exports PDF (ReportPDF.tsx via @react-pdf/renderer)
```

---

## 8. External Dependencies

| Service | SDK / Library | Purpose |
|---------|--------------|---------|
| AWS S3 | `AWSSDK.S3 4.0.4` | Incident image storage (ap-southeast-1) |
| AWS Secrets Manager | `AWSSDK.SecretsManager 4.0.4` | Runtime secrets at startup |
| AWS SES | `AWSSDK.SimpleEmail 4.0.2` | Transactional emails (OTP, verification) |
| AWS RDS PostgreSQL | `Npgsql.EFCore 10.0.1` | Primary database |
| Google Vertex AI (Gemini) | HTTP client (service account auth) | AI summaries + travel advice |
| Google Geocoding API | HTTP client | Coordinate ↔ address resolution |
| AWS Lambda | HTTP callback (`X-Api-Key`) | AI camera detection notification |
| Web Push (VAPID) | `WebPush 1.0.13` | Mobile push notifications |

---

## 9. Frontend Key Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `react` | 18.3.1 | UI framework |
| `@microsoft/signalr` | 10.0.0 | Real-time WebSocket hub client |
| `recharts` | 2.12.7 | Dashboard and report charts |
| `@react-pdf/renderer` | 4.5.1 | PDF report generation |
| `exceljs` | 4.4.0 | XLSX export |
| `qrcode.react` | 4.2.0 | TOTP QR code display |
| `framer-motion` | 11.5.4 | UI animations |
| `lucide-react` | 0.522.0 | Icon set |
| `vite-plugin-pwa` | 1.2.0 | Service worker + PWA manifest |
| `tailwindcss` | 3.4.17 | Utility-first CSS |

---

## 10. Non-Functional Characteristics

| Characteristic | Implementation |
|---------------|---------------|
| Real-time updates | SignalR hub; all clients see incident changes within 1–2 seconds |
| Offline support | Service worker caches static assets; LocalStorage queue for pending reports |
| MYT consistency | All timestamps stored UTC in DB; displayed as UTC+8 throughout UI |
| Scalable images | Direct-to-S3 upload (presigned URLs); API server never proxies file bytes |
| Replay attack prevention | OTP single-use + TOTP code cache |
| Audit trail | Soft deletes + per-status lifecycle columns on Incident retain full history |
| Bulk operations | CSV/XLSX import for shifts and users via EPPlus |
