# Railly — Activity Diagrams (Mermaid)

> **System:** Railly — Transit Safety Incident Management System  
> All diagrams use Mermaid `flowchart TD` syntax.  
> Render with VS Code Mermaid extension, Mermaid Live Editor, or any Mermaid-compatible tool.

---

## Table of Contents

1. [User Registration & MFA Setup](#1-user-registration--mfa-setup)
2. [Login with MFA Verification](#2-login-with-mfa-verification)
3. [Password Recovery (Forgot Password)](#3-password-recovery-forgot-password)
4. [Change Password (Authenticated)](#4-change-password-authenticated)
5. [Session Management & Auto-Logout](#5-session-management--auto-logout)
6. [Passenger: Submit Incident Report (with Offline Support)](#6-passenger-submit-incident-report-with-offline-support)
7. [Passenger: Track Report & Request Escalation](#7-passenger-track-report--request-escalation)
8. [Operator: Alert Management Lifecycle](#8-operator-alert-management-lifecycle)
9. [Operator: Dashboard & Report Generation](#9-operator-dashboard--report-generation)
10. [Operator: User Account Management](#10-operator-user-account-management)
11. [Operator: Shift Schedule Management](#11-operator-shift-schedule-management)
12. [Auxiliary: Shift Detection & Alert Response](#12-auxiliary-shift-detection--alert-response)
13. [Push Notification Subscription & Real-time Delivery](#13-push-notification-subscription--real-time-delivery)
14. [Offline Queue: Report Sync on Reconnection](#14-offline-queue-report-sync-on-reconnection)

---

## 1. User Registration & MFA Setup

> **Actor:** Passenger (only role that can self-register)  
> **Trigger:** User navigates to the Sign Up page  
> **Outcome:** Account created with MFA configured, redirected to Login

```mermaid
flowchart TD
    START(["⬤ Start"])
    START --> A[Navigate to Sign Up Page]
    A --> B[Enter Full Name,\nEmail & Password]
    B --> C{Input Valid?\nPassword strength\n+ email format}
    C -->|No| D[Show Inline\nValidation Errors]
    D --> B
    C -->|Yes| E[Submit Registration\nRequest to API]
    E --> F{Account Already\nExists?}
    F -->|Yes| G[Show 'Email Already\nRegistered' Error]
    G --> B
    F -->|No| H[System Sends\nEmail OTP]
    H --> I[User Enters\nEmail OTP Code]
    I --> J{OTP Valid &\nNot Expired?}
    J -->|No: Invalid| K{Retry Limit\nReached?}
    K -->|No - Retry| I
    K -->|Yes| L[Show 'Too Many\nAttempts' Error]
    L --> M[Resend OTP]
    M --> I
    J -->|Yes| N[Navigate to\nMFA Setup Page]
    N --> O[System Generates\nTOTP Secret Key]
    O --> P[Display QR Code\nfor Google Authenticator]
    P --> Q[User Scans QR Code\nwith Authenticator App]
    Q --> R[User Enters\n6-digit TOTP Code]
    R --> S{TOTP Code\nValid?}
    S -->|No| T[Show 'Invalid Code'\nError Message]
    T --> R
    S -->|Yes| U[MFA Setup\nComplete]
    U --> V[Account Activated\nin System]
    V --> W[Redirect to\nLogin Page]
    W --> END(["⬤ End"])

    style START fill:#333,color:#fff,stroke:#333
    style END fill:#333,color:#fff,stroke:#333
    style D fill:#FFEBEE,stroke:#C62828
    style G fill:#FFEBEE,stroke:#C62828
    style L fill:#FFEBEE,stroke:#C62828
    style T fill:#FFEBEE,stroke:#C62828
    style V fill:#E8F5E9,stroke:#2E7D32
```

---

## 2. Login with MFA Verification

> **Actors:** Passenger, Operator, Auxiliary Staff  
> **Trigger:** User navigates to the Login page  
> **Outcome:** Authenticated session established; user redirected to role-specific interface

```mermaid
flowchart TD
    START(["⬤ Start"])
    START --> A[Navigate to Login Page]
    A --> B[Enter Email Address]
    B --> C[Enter Password]
    C --> D[Submit Credentials]
    D --> E{Account\nStatus Check}
    E -->|Suspended| F[Show 'Account Suspended'\nError — Contact Support]
    F --> FAIL1(["⬤ End: Blocked"])
    E -->|Archived| G[Show 'Account\nNo Longer Active' Error]
    G --> FAIL1
    E -->|Active| H{Password\nCorrect?}
    H -->|No| I[Show 'Invalid\nCredentials' Error]
    I --> J{Attempt\nCount}
    J -->|Under Limit| C
    J -->|Exceeded| K[Temporary\nAccount Lock]
    K --> FAIL1
    H -->|Yes| L{MFA Method\nConfigured?}
    L -->|Email OTP| M[Send OTP\nto Registered Email]
    L -->|Google Authenticator\nTOTP| N[Prompt for\n6-digit TOTP Code]
    M --> O[User Enters\nEmail OTP]
    N --> P[User Enters\nTOTP Code]
    O --> Q{Code\nValid?}
    P --> Q
    Q -->|No| R{Retry\nAllowed?}
    R -->|Yes| L
    R -->|No| S[Session Invalidated\nShow Error]
    S --> FAIL1
    Q -->|Yes| T[Session Established\nHttpOnly Cookie Set]
    T --> U{Determine\nUser Role}
    U -->|Operator| V{Desktop\nBrowser?}
    V -->|No - Mobile| W[Show 'Desktop\nRequired' Warning]
    W --> FAIL1
    V -->|Yes| X[Load Operator\nDashboard Interface]
    U -->|Passenger| Y[Load Passenger\nHome Interface]
    U -->|Auxiliary| Z[Load Auxiliary\nAlerts Interface]
    X --> SUCCESS(["⬤ End: Logged In"])
    Y --> SUCCESS
    Z --> SUCCESS

    style START fill:#333,color:#fff,stroke:#333
    style SUCCESS fill:#1B5E20,color:#fff,stroke:#1B5E20
    style FAIL1 fill:#B71C1C,color:#fff,stroke:#B71C1C
    style F fill:#FFEBEE,stroke:#C62828
    style G fill:#FFEBEE,stroke:#C62828
    style I fill:#FFEBEE,stroke:#C62828
    style S fill:#FFEBEE,stroke:#C62828
    style W fill:#FFF3E0,stroke:#E65100
```

---

## 3. Password Recovery (Forgot Password)

> **Actors:** Passenger, Operator, Auxiliary Staff  
> **Trigger:** User clicks "Forgot Password" on Login page  
> **Outcome:** Password successfully reset; user redirected to Login

```mermaid
flowchart TD
    START(["⬤ Start"])
    START --> A[Click 'Forgot Password'\non Login Page]
    A --> B[Navigate to\nForgot Password Page]
    B --> C[Enter Registered\nEmail Address]
    C --> D[Submit Email]
    D --> E{Email Found\nin System?}
    E -->|No| F[Show Generic Message\n'If email exists, OTP sent'\nPrevent email enumeration]
    F --> END1(["⬤ End"])
    E -->|Yes| G[Generate Reset\nOTP Code]
    G --> H[Send OTP\nto Email via Email Service]
    H --> I[User Checks\nInbox]
    I --> J[Enter OTP\nCode on Page]
    J --> K{OTP Valid\n& Not Expired?}
    K -->|No: Expired| L[Show 'OTP Expired'\nError]
    L --> M{Resend\nRequested?}
    M -->|Yes| G
    M -->|No| END1
    K -->|No: Invalid| N[Show 'Invalid Code'\nError]
    N --> O{Retry\nRemaining?}
    O -->|Yes| J
    O -->|No| P[Block Further\nAttempts]
    P --> END1
    K -->|Yes| Q[OTP Verified\nProceed to Reset]
    Q --> R[Enter New\nPassword]
    R --> S[Confirm New\nPassword]
    S --> T{Passwords\nMatch?}
    T -->|No| U[Show Mismatch\nError]
    U --> R
    T -->|Yes| V{Password Meets\nStrength Requirements?}
    V -->|No — Too Weak| W[Show Strength\nRequirements]
    W --> R
    V -->|Yes| X[Submit Password\nReset to API]
    X --> Y[Password Updated\nin Database]
    Y --> Z[Invalidate All\nExisting Sessions]
    Z --> AA[Redirect to\nLogin Page]
    AA --> END2(["⬤ End: Password Reset"])

    style START fill:#333,color:#fff,stroke:#333
    style END1 fill:#333,color:#fff,stroke:#333
    style END2 fill:#1B5E20,color:#fff,stroke:#1B5E20
    style F fill:#FFF9C4,stroke:#F9A825
    style L fill:#FFEBEE,stroke:#C62828
    style N fill:#FFEBEE,stroke:#C62828
    style P fill:#FFEBEE,stroke:#C62828
    style U fill:#FFEBEE,stroke:#C62828
    style W fill:#FFF3E0,stroke:#E65100
```

---

## 4. Change Password (Authenticated)

> **Actors:** Passenger, Operator, Auxiliary Staff  
> **Trigger:** User navigates to Change Password from their profile/settings  
> **Outcome:** Password updated; session remains active

```mermaid
flowchart TD
    START(["⬤ Start"])
    START --> A[Navigate to\nChange Password Page]
    A --> B[Enter Current\nPassword]
    B --> C[Enter New\nPassword]
    C --> D{Password Strength\nMeter Check}
    D -->|Weak| E[Show Strength\nIndicator Warning]
    E --> C
    D -->|Acceptable| F[Confirm New\nPassword]
    F --> G{Passwords\nMatch?}
    G -->|No| H[Show Mismatch\nError]
    H --> C
    G -->|Yes| I[Submit to\nAPI: /auth/change-password]
    I --> J{Current Password\nCorrect?}
    J -->|No| K[Show 'Incorrect\nCurrent Password' Error]
    K --> B
    J -->|Yes| L{New Password Same\nas Current?}
    L -->|Yes| M[Show 'Must Differ\nfrom Current' Error]
    M --> C
    L -->|No| N[Update Password\nin Database]
    N --> O[Show Success\nToast Notification]
    O --> END(["⬤ End: Password Changed"])

    style START fill:#333,color:#fff,stroke:#333
    style END fill:#1B5E20,color:#fff,stroke:#1B5E20
    style E fill:#FFF3E0,stroke:#E65100
    style H fill:#FFEBEE,stroke:#C62828
    style K fill:#FFEBEE,stroke:#C62828
    style M fill:#FFEBEE,stroke:#C62828
    style O fill:#E8F5E9,stroke:#2E7D32
```

---

## 5. Session Management & Auto-Logout

> **Actors:** Passenger, Operator, Auxiliary Staff  
> **Trigger:** User is authenticated and idle / receives 401 response  
> **Outcome:** User safely logged out; sensitive cache cleared

```mermaid
flowchart TD
    START(["⬤ Start: Active Session"])
    START --> A[User Authenticated\nSession Active]
    A --> B{Monitor\nUser Activity}
    B -->|Active Interaction| C[Reset Inactivity\nTimer to 0]
    C --> B
    B -->|Idle for 55 Minutes| D[Show Session Expiry\nWarning Banner]
    D --> E{User Responds\nWithin 5 min?}
    E -->|Yes — Clicks OK| F[Reset Inactivity\nTimer]
    F --> B
    E -->|No — Still Idle| G[Idle Timer Reaches\n60 Minutes]
    G --> H[Trigger Auto-Logout]

    A --> I{API Response\nReceived}
    I -->|200 OK| B
    I -->|401 Unauthorized| J[Session Expired\nor Invalid]
    J --> H

    H --> K[Clear HttpOnly\nCookie Session]
    K --> L[Clear Cached\nSensitive API Data\nService Worker Cache]
    L --> M[Clear Offline\nReport Queue]
    M --> N[Disconnect\nSignalR Hub]
    N --> O[Redirect to\nLogin Page]
    O --> P[Show 'Session Expired'\nMessage to User]
    P --> END(["⬤ End: Logged Out"])

    style START fill:#333,color:#fff,stroke:#333
    style END fill:#333,color:#fff,stroke:#333
    style D fill:#FFF9C4,stroke:#F9A825
    style J fill:#FFEBEE,stroke:#C62828
    style H fill:#FF8F00,color:#fff,stroke:#E65100
    style L fill:#E3F2FD,stroke:#1565C0
    style P fill:#FFF9C4,stroke:#F9A825
```

---

## 6. Passenger: Submit Incident Report (with Offline Support)

> **Actor:** Passenger  
> **Trigger:** Passenger witnesses an incident and taps "Report Incident"  
> **Outcome:** Report submitted to server (or queued offline for later sync)

```mermaid
flowchart TD
    START(["⬤ Start"])
    START --> A[Tap 'Report Incident'\nButton]
    A --> B{GPS Permission\nGranted?}
    B -->|Yes| C[Fetch Device\nGPS Coordinates]
    C --> D{Nearby Station\nDetected?}
    D -->|Yes| E[Auto-fill Detected\nLine & Station]
    D -->|No - Out of Range| F[Prompt Manual\nStation Selection]
    B -->|No / Denied| F
    E --> G[User Confirms or\nChanges Location]
    F --> G
    G --> H[Step 2: Select\nTrain Number]
    H --> I[Select Coach\nNumber]
    I --> J[Select Door /\nPlatform]
    J --> K[Step 3: Select\nIncident Type]

    K --> L{Add Photo\nEvidence?}
    L -->|Yes| M{Photo Source}
    M -->|Camera| N[Launch Device\nCamera]
    M -->|Gallery| O[Open Photo\nGallery Picker]
    N --> P[Capture Photo]
    O --> P
    P --> Q[Attach Photo\nto Report]
    L -->|No - Skip| R[Step 4: Enter\nIncident Description]
    Q --> R

    R --> S[Preview Report\nSummary Screen]
    S --> T{Submit\nReport?}
    T -->|Edit| A
    T -->|Cancel| END1(["⬤ End: Cancelled"])
    T -->|Submit| U{Network\nAvailable?}

    U -->|Online| V[POST Report to\n/api/data/incident-reports]
    U -->|Offline| W[Serialize Report\nto Local Storage Queue]
    W --> X[Show Offline\nStatus Banner]
    X --> Y[Show 'Queued for\nSync' Confirmation]
    Y --> END2(["⬤ End: Report Queued"])

    V --> Z{Server\nResponse}
    Z -->|201 Created| AA[Show Success Screen\nwith Incident ID]
    Z -->|Server Error| AB[Show Retry\nOption]
    AB --> V
    AA --> AC[Report Appears in\n'My Reports' History]
    AC --> END3(["⬤ End: Report Submitted"])

    style START fill:#333,color:#fff,stroke:#333
    style END1 fill:#333,color:#fff,stroke:#333
    style END2 fill:#E65100,color:#fff,stroke:#BF360C
    style END3 fill:#1B5E20,color:#fff,stroke:#1B5E20
    style W fill:#FFF3E0,stroke:#E65100
    style AA fill:#E8F5E9,stroke:#2E7D32
    style AB fill:#FFEBEE,stroke:#C62828
```

---

## 7. Passenger: Track Report & Request Escalation

> **Actor:** Passenger  
> **Trigger:** Passenger opens "My Reports" to check on a submitted report  
> **Outcome:** Passenger stays informed; optionally requests escalation or adds a comment

```mermaid
flowchart TD
    START(["⬤ Start"])
    START --> A[Navigate to\n'My Reports' Tab]
    A --> B[Load Report\nHistory from API]
    B --> C[Display List of\nOwn Submitted Reports]
    C --> D[Select a\nReport to View]
    D --> E[View Report Details\nStatus / Time / Location / Type]
    E --> F{Current\nReport Status?}

    F -->|Pending| G[Status: Waiting for\nOperator to Verify]
    F -->|Verified| H[Status: Confirmed\nby Operator]
    F -->|Escalated| I[Status: Escalated to\nEmergency Services]
    F -->|En Route| J[Status: Responders\nDispatched]
    F -->|Resolved| K[Status: Incident\nClosed]
    F -->|Dismissed| L[Status: Marked as\nFalse Alarm]

    G --> M{Actions\nAvailable}
    H --> M
    M -->|Request Escalation| N{Incident Critical\n& Still Open?}
    N -->|Yes| O[Tap 'Request\nEscalation' Button]
    O --> P[Submit Escalation\nRequest with Reason]
    P --> Q[Escalation Request\nSent to Operator]
    Q --> R[Show 'Request Sent'\nConfirmation]
    N -->|No — Already Escalated\nor Resolved| S[Show 'Action\nNot Available' Toast]

    M -->|Add Comment| T[Tap 'Add Comment'\nButton]
    T --> U[Type Comment\nor Update]
    U --> V[Submit Comment\nto API]
    V --> W[Comment Attached\nto Report Thread]
    W --> X[Show Comment\nPosted Confirmation]

    I --> Y[Monitor for\nStatus Updates]
    J --> Y
    Y --> Z{Real-time Update\nReceived via SignalR?}
    Z -->|Yes| AA[Update Status\nBadge in UI]
    AA --> C
    Z -->|No| Y

    K --> END1(["⬤ End: Resolved"])
    L --> END2(["⬤ End: Dismissed"])
    R --> END3(["⬤ End: Escalation Requested"])
    X --> END4(["⬤ End: Comment Added"])

    style START fill:#333,color:#fff,stroke:#333
    style END1 fill:#1B5E20,color:#fff,stroke:#1B5E20
    style END2 fill:#37474F,color:#fff,stroke:#263238
    style END3 fill:#1565C0,color:#fff,stroke:#0D47A1
    style END4 fill:#6A1B9A,color:#fff,stroke:#4A148C
    style G fill:#FFF9C4,stroke:#F9A825
    style H fill:#E3F2FD,stroke:#1565C0
    style I fill:#FF8F00,color:#fff,stroke:#E65100
    style J fill:#1565C0,color:#fff,stroke:#0D47A1
    style K fill:#E8F5E9,stroke:#2E7D32
    style L fill:#ECEFF1,stroke:#546E7A
    style S fill:#FFEBEE,stroke:#C62828
```

---

## 8. Operator: Alert Management Lifecycle

> **Actor:** Operator (primary), Auxiliary Staff (supporting), AI Detection System (initiator)  
> **Trigger:** New alert arrives via AI camera detection or passenger report  
> **Outcome:** Alert fully resolved or dismissed with complete audit trail

```mermaid
flowchart TD
    START(["⬤ Start: Alert Event"])
    START --> A{Alert Source}
    A -->|AI Camera| B[AI System Detects\nAnomalous Event]
    A -->|Passenger Report| C[Passenger Submits\nIncident Report via App]
    B --> D[AI Creates Alert Record\nwith Confidence Score & Snapshot]
    C --> E[System Creates Alert Record\nSource: Passenger]
    D --> F[SignalR Hub Broadcasts\nAlert to Operator]
    E --> F
    F --> G[Operator Receives\nPush Notification]
    G --> H[Unread Badge Count\nIncremented in Sidebar]
    H --> I[Operator Opens\nLive Alert Feed]
    I --> J[Click Alert to\nOpen Detail View]
    J --> K[Review Alert Info\nLine / Station / Train / Coach / Type]
    K --> L{Evidence\nAvailable?}
    L -->|Yes - Camera Snapshot| M[Open Image\nLightbox Viewer]
    M --> N[Review Visual\nEvidence]
    N --> O{Operator\nAssessment}
    L -->|No Image| O

    O -->|FALSE ALARM| P[Click 'Dismiss' Button]
    P --> P1[Enter Dismissal\nJustification Comment]
    P1 --> P2[Confirm Action]
    P2 --> P3[Alert Status → Dismissed]
    P3 --> P4[Audit Trail Entry:\nDismissed By + Time + Comment]
    P4 --> END1(["⬤ End: Alert Dismissed"])

    O -->|VALID INCIDENT| Q[Click 'Verify' Button]
    Q --> Q1[Enter Verification\nComment / Note]
    Q1 --> Q2[Confirm Action]
    Q2 --> Q3[Alert Status → Verified]
    Q3 --> Q4[Audit Trail Entry:\nVerified By + Time + Comment]
    Q4 --> R{Severity Level\nAssessment}

    R -->|Low / Moderate\nStation Staff Can Handle| S[Assign to Auxiliary\nStaff at Station]
    S --> S1[Auxiliary Staff Receives\nPush Notification]
    S1 --> S2[Auxiliary Marks\nAlert 'En Route']
    S2 --> S3[Auxiliary Arrives\nat Scene]
    S3 --> S4[Auxiliary Marks\nAlert 'Resolved']

    R -->|High / Critical\nEmergency Response Needed| T[Click 'Escalate' Button]
    T --> T1[Enter Escalation\nReason & Comment]
    T1 --> T2[Confirm Action]
    T2 --> T3[Alert Status → Escalated]
    T3 --> T4[Notify Emergency\nServices External]
    T4 --> T5[Audit Trail Entry:\nEscalated By + Time + Comment]
    T5 --> U[Operator Clicks\n'Mark En Route']
    U --> U1[Enter En Route\nComment]
    U1 --> U2[Alert Status → En Route]
    U2 --> U3[Audit Trail Entry:\nEn Route By + Time + Comment]
    U3 --> V[Responders Arrive\nat Incident Location]

    S4 --> W[Operator Verifies\nResolution]
    V --> W
    W --> X[Click 'Resolve' Button]
    X --> X1[Enter Resolution\nSummary Comment]
    X1 --> X2[Confirm Action]
    X2 --> X3[Alert Status → Resolved]
    X3 --> X4[Full Audit Trail\nRecorded & Complete]
    X4 --> END2(["⬤ End: Alert Resolved"])

    style START fill:#333,color:#fff,stroke:#333
    style END1 fill:#546E7A,color:#fff,stroke:#37474F
    style END2 fill:#1B5E20,color:#fff,stroke:#1B5E20
    style P3 fill:#ECEFF1,stroke:#546E7A
    style Q3 fill:#E3F2FD,stroke:#1565C0
    style T3 fill:#FF8F00,color:#fff,stroke:#E65100
    style U2 fill:#1565C0,color:#fff,stroke:#0D47A1
    style X3 fill:#E8F5E9,stroke:#2E7D32
    style T4 fill:#FFEBEE,stroke:#C62828
```

---

## 9. Operator: Dashboard & Report Generation

> **Actor:** Operator  
> **Trigger:** Operator opens Dashboard or navigates to Reports  
> **Outcome:** Data viewed and optionally exported as PDF

```mermaid
flowchart TD
    START(["⬤ Start"])
    START --> A[Operator Opens\nDashboard Page]
    A --> B[Load KPI Metrics\nfrom API — Default: Today]
    B --> C[Render Dashboard\nKPI Cards]
    C --> D[Pending / Verified /\nResolved / Dismissed Count]
    D --> E[Average Response\nTime Display]
    E --> F[Camera Online\nStatus Count]
    F --> G[Recent Alerts\nSummary Table]

    G --> H{Apply Date\nFilter?}
    H -->|Yes| I[Select Range:\nToday / Yesterday /\n7 Days / 30 Days / Custom]
    I --> J[Reload All Dashboard\nData with New Range]
    J --> C
    H -->|No - View Current| K{Interact with\nRecent Alerts Table?}
    K -->|Click Alert Row| L[Open Alert Detail\nModal / Expanded Row]
    L --> M[View Alert Status\nTimeline in Table]
    M --> K
    K -->|Navigate to Reports| N[Select Reports Tab]

    N --> O[Choose Report\nMonth & Year]
    O --> P[Fetch Monthly\nIncident Data from API]
    P --> Q[Render Incident\nData Table]
    Q --> R[Render Incident Type\nDistribution Chart]
    R --> S[Render Line-based\nAlert Distribution Chart]
    S --> T[Display KPI Summary\nCards for Month]

    T --> U{Generate AI\nSummary?}
    U -->|Yes| V[Send Report Data\nto AI API Endpoint]
    V --> W{AI Response\nReceived?}
    W -->|Yes| X[Render AI-Generated\nNarrative Paragraph]
    W -->|No / Error| Y[Show 'Summary\nUnavailable' Message]
    Y --> Z{Export to PDF?}
    X --> Z

    Z -->|Yes| AA[Trigger html2canvas\nPage Capture]
    AA --> AB[Convert Canvas to\njsPDF Document]
    AB --> AC[Trigger Browser\nDownload of PDF]
    AC --> AD[PDF Saved to\nDevice]
    AD --> END1(["⬤ End: Report Exported"])
    Z -->|No| END2(["⬤ End: Report Viewed"])
    U -->|No| Z

    style START fill:#333,color:#fff,stroke:#333
    style END1 fill:#1B5E20,color:#fff,stroke:#1B5E20
    style END2 fill:#333,color:#fff,stroke:#333
    style X fill:#E8F5E9,stroke:#2E7D32
    style Y fill:#FFF3E0,stroke:#E65100
    style AD fill:#E8F5E9,stroke:#2E7D32
```

---

## 10. Operator: User Account Management

> **Actor:** Operator  
> **Trigger:** Operator opens User Management page  
> **Outcome:** User status updated (Suspended / Reactivated / Archived)

```mermaid
flowchart TD
    START(["⬤ Start"])
    START --> A[Navigate to User\nManagement Page]
    A --> B[Load All Users\nfrom API]
    B --> C[Display User\nList Table]

    C --> D{Apply\nFilters?}
    D -->|Filter by Role| E[Select Role:\nOperator / Passenger / Auxiliary]
    E --> F[Reload Filtered\nUser List]
    F --> C
    D -->|Filter by Status| G[Select Status:\nActive / Suspended / Archived]
    G --> F
    D -->|Search by Name\nor Email| H[Enter Search\nKeyword]
    H --> I[Filter Results\nin Real-time]
    I --> C
    D -->|No Filter| J[Select User\nfrom Table]

    C --> J
    J --> K{Choose\nAction}

    K -->|Suspend Active User| L[Click 'Suspend'\nButton on Row]
    L --> L1[Show Confirmation\nDialog]
    L1 --> L2{Operator\nConfirms?}
    L2 -->|Cancel| C
    L2 -->|Confirm| L3[PATCH /users/:id/status\nBody: Suspended]
    L3 --> L4[User Cannot\nLogin Anymore]
    L4 --> L5[Refresh User\nList]
    L5 --> C

    K -->|Reactivate Suspended\nUser| M[Click 'Reactivate'\nButton on Row]
    M --> M1[Show Confirmation\nDialog]
    M1 --> M2{Operator\nConfirms?}
    M2 -->|Cancel| C
    M2 -->|Confirm| M3[PATCH /users/:id/status\nBody: Active]
    M3 --> M4[User Can\nLogin Again]
    M4 --> M5[Refresh User\nList]
    M5 --> C

    K -->|Archive User\nPermanent| N[Click 'Archive'\nButton on Row]
    N --> N1[Show Confirmation\nDialog — Irreversible Warning]
    N1 --> N2{Operator\nConfirms?}
    N2 -->|Cancel| C
    N2 -->|Confirm| N3[PATCH /users/:id/status\nBody: Archived]
    N3 --> N4[User Permanently\nDeactivated — Data Retained]
    N4 --> N5[Refresh User\nList]
    N5 --> C

    K -->|Done Reviewing| END(["⬤ End"])

    style START fill:#333,color:#fff,stroke:#333
    style END fill:#333,color:#fff,stroke:#333
    style L4 fill:#FFEBEE,stroke:#C62828
    style M4 fill:#E8F5E9,stroke:#2E7D32
    style N4 fill:#37474F,color:#fff,stroke:#263238
    style N1 fill:#FFF3E0,stroke:#E65100
```

---

## 11. Operator: Shift Schedule Management

> **Actor:** Operator  
> **Trigger:** Operator opens Shift Management page  
> **Outcome:** Shifts viewed, filtered, or bulk-uploaded via CSV

```mermaid
flowchart TD
    START(["⬤ Start"])
    START --> A[Navigate to\nShift Management Page]
    A --> B[Load All Auxiliary\nShifts from API]
    B --> C[Display Shift\nSchedule Table]

    C --> D{Apply\nFilters?}
    D -->|Filter by Line| E[Select Transit\nLine]
    E --> F[Reload Filtered\nShift List]
    F --> C
    D -->|Filter by Station| G[Select Station\nName]
    G --> F
    D -->|Filter by Status| H[Select:\nUpcoming / In Progress / Completed]
    H --> F
    D -->|Filter by Shift Type| I[Select:\nMorning / Afternoon / All]
    I --> F
    D -->|Search| J[Enter User Name or\nStation to Search]
    J --> K[Display Matched\nResults]
    K --> C

    D -->|Bulk Upload\nShifts| L{First Time?\nNeed Template?}
    L -->|Yes - Download Template| M[Click 'Download\nCSV Template']
    M --> N[Browser Downloads\nShift Template CSV]
    N --> O[Operator Fills in\nShift Data in CSV]
    O --> P[Click 'Upload CSV'\nButton]
    L -->|No - Have CSV| P

    P --> Q[Select CSV\nFile from Device]
    Q --> R[Frontend Validates\nFile Type is .csv]
    R --> S{Valid\nFormat?}
    S -->|No| T[Show 'Invalid File\nType' Error]
    T --> P
    S -->|Yes| U[POST CSV File\nto /operator/shifts/upload]
    U --> V{Server Validates\nCSV Contents}
    V -->|Validation Errors\nMissing fields / Bad dates| W[Show Row-level\nValidation Errors]
    W --> O
    V -->|Valid| X[Bulk Insert Shifts\ninto Database]
    X --> Y[Return Success\nCount & Summary]
    Y --> Z[Show 'N Shifts\nUploaded' Toast]
    Z --> AA[Refresh Shift\nList from API]
    AA --> C

    D -->|No Action| END(["⬤ End"])

    style START fill:#333,color:#fff,stroke:#333
    style END fill:#333,color:#fff,stroke:#333
    style T fill:#FFEBEE,stroke:#C62828
    style W fill:#FFEBEE,stroke:#C62828
    style Z fill:#E8F5E9,stroke:#2E7D32
    style N fill:#E3F2FD,stroke:#1565C0
```

---

## 12. Auxiliary: Shift Detection & Alert Response

> **Actor:** Auxiliary Staff  
> **Trigger:** Auxiliary staff opens the app during or before their assigned shift  
> **Outcome:** Alert responded to and marked resolved; audit trail recorded

```mermaid
flowchart TD
    START(["⬤ Start: Open App"])
    START --> A[Load Auxiliary\nInterface]
    A --> B[Fetch Current\nShift from API]
    B --> C{Active Shift\nFound?}

    C -->|No Shift Today| D[Show 'No Active\nShift Assigned' Banner]
    D --> E[View Upcoming\nShift Details if Any]
    E --> END1(["⬤ End: Off Duty"])

    C -->|Upcoming — Not Yet Started| F[Show Upcoming\nShift Banner with Countdown]
    F --> G[Wait Until\nShift Start Time]
    G --> C

    C -->|Active Shift| H[Show Active Shift\nBanner: Station + Time]
    H --> I[Load Station-Filtered\nAlert List]
    I --> J{New Alert\nNotification?}
    J -->|Push Notification\nReceived| K[Tap Notification\nor Open App]
    J -->|Manual Refresh| L[Pull to Refresh\nor Auto-refresh]
    K --> M[View Alert\nin Feed]
    L --> M

    M --> N[Tap Alert to\nOpen Detail View]
    N --> O[View Alert Info:\nType / Time / Platform / Coach]
    O --> P[View Response\nTimeline & Audit Trail]
    P --> Q{Alert\nStatus?}

    Q -->|Already Resolved\nor Dismissed| R[View Audit Trail\nOnly — Read Only]
    R --> I

    Q -->|Pending or Verified\nAction Required| S{Respond\nto Alert?}
    S -->|No — Monitor| I

    S -->|Yes| T[Tap 'Mark\nEn Route' Button]
    T --> T1[Alert Status Updated\nto 'En Route']
    T1 --> T2[Audit Entry:\nEn Route By + Timestamp]
    T2 --> U[Travel to\nIncident Location\non Platform / Train]
    U --> V[Assess Situation\nOn-site]
    V --> W{Situation\nHandled?}

    W -->|Needs Emergency\nResponse| X[Contact Operator\nto Escalate]
    X --> Y[Await Emergency\nServices Arrival]
    Y --> Z[Situation Resolved\nwith Emergency Support]

    W -->|Handled by\nAuxiliary| AA[Tap 'Mark\nResolved' Button]
    Z --> AA
    AA --> AB[Enter Resolution\nComment or Note]
    AB --> AC[Submit Resolution\nto API]
    AC --> AD[Alert Status Updated\nto 'Resolved']
    AD --> AE[Audit Trail Complete:\nResolved By + Time + Comment]
    AE --> AF{More Pending\nAlerts?}
    AF -->|Yes| I
    AF -->|No| AG[View Alerts\nHistory Archive]
    AG --> AH{Shift\nEnded?}
    AH -->|No — Still On Duty| I
    AH -->|Yes| AI[Shift Status\nUpdated to Completed]
    AI --> END2(["⬤ End: Shift Complete"])

    style START fill:#333,color:#fff,stroke:#333
    style END1 fill:#546E7A,color:#fff,stroke:#37474F
    style END2 fill:#1B5E20,color:#fff,stroke:#1B5E20
    style T1 fill:#1565C0,color:#fff,stroke:#0D47A1
    style AD fill:#1B5E20,color:#fff,stroke:#155724
    style D fill:#ECEFF1,stroke:#546E7A
    style X fill:#FFEBEE,stroke:#C62828
```

---

## 13. Push Notification Subscription & Real-time Delivery

> **Actors:** Passenger, Operator, Auxiliary Staff; Push Notification Service (system)  
> **Trigger:** User enables notifications in Settings / first login; an alert event occurs  
> **Outcome:** User receives real-time push notification when alert is created or updated

```mermaid
flowchart TD
    START(["⬤ Start: Enable Notifications"])
    START --> A[User Navigates to\nSettings / Preferences]
    A --> B[Click 'Enable Push\nNotifications' Toggle]
    B --> C{Browser Push\nPermission Status}
    C -->|Denied Previously| D[Show 'Blocked in Browser'\nInstruction to Re-enable]
    D --> END1(["⬤ End: Blocked"])
    C -->|Not Yet Asked| E[Browser Shows\nPermission Prompt]
    E --> F{User Grants\nPermission?}
    F -->|Deny| G[Show 'Notifications\nDisabled' Message]
    G --> END1
    F -->|Allow| H[Generate Push\nSubscription Object\nEndpoint + Keys]
    C -->|Already Granted| H
    H --> I[POST Subscription\nto /api/notifications/subscribe]
    I --> J[Subscription Saved\nin Database]
    J --> K[Preference Synced\nAcross Sessions]
    K --> READY(["⬤ Subscribed — Waiting for Events"])

    READY --> L{Alert Event\nOccurs}
    L -->|New Alert Created| M[Backend Creates\nAlert Record in DB]
    L -->|Alert Status Changed| N[Backend Updates\nAlert Record]
    M --> O[SignalR Hub\nBroadcasts to Clients]
    N --> O
    O --> P[Backend Sends\nWeb Push to\nAll Subscribed Users]
    P --> Q{Relevant to\nUser Role?}
    Q -->|Not Relevant| END2(["⬤ End: Silently Ignored"])
    Q -->|Relevant| R{App State}

    R -->|App in Foreground\nUser is on Page| S[Update Live Alert\nFeed in Real-time]
    S --> T[Increment Unread\nAlert Badge Count]
    T --> U[Show In-App\nToast Notification]
    U --> END3(["⬤ End: UI Updated"])

    R -->|App in Background\nor Tab Inactive| V[Browser Shows\nOS Push Notification]
    V --> W{User Taps\nNotification?}
    W -->|Yes| X[App Opens /\nFocused on Tab]
    X --> Y{Navigate to\nAlert Context}
    Y -->|Operator| Z[Open Live\nAlert Feed]
    Y -->|Passenger| AA[Open Report\nStatus Page]
    Y -->|Auxiliary| AB[Open Alert\nDetail View]
    Z --> END3
    AA --> END3
    AB --> END3
    W -->|No — Dismissed| END4(["⬤ End: Notification Dismissed"])

    style START fill:#333,color:#fff,stroke:#333
    style READY fill:#1565C0,color:#fff,stroke:#0D47A1
    style END1 fill:#B71C1C,color:#fff,stroke:#7F0000
    style END2 fill:#546E7A,color:#fff,stroke:#37474F
    style END3 fill:#1B5E20,color:#fff,stroke:#1B5E20
    style END4 fill:#546E7A,color:#fff,stroke:#37474F
    style D fill:#FFEBEE,stroke:#C62828
    style G fill:#FFEBEE,stroke:#C62828
    style U fill:#E8F5E9,stroke:#2E7D32
```

---

## 14. Offline Queue: Report Sync on Reconnection

> **Actor:** Passenger (system behavior on reconnect)  
> **Trigger:** App detects network restoration while offline reports are queued  
> **Outcome:** All queued reports flushed and submitted to the server

```mermaid
flowchart TD
    START(["⬤ Start: App Loads / Network Restored"])
    START --> A{Network\nAvailable?}
    A -->|No| B[Show Offline\nStatus Banner]
    B --> C[Continue in\nOffline Mode]
    C --> D{User Submits\nReport While Offline?}
    D -->|Yes| E[Serialize Report\nData to JSON]
    E --> F[Append to\nLocalStorage Offline Queue]
    F --> G[Show 'Saved Offline —\nWill Sync When Online']
    G --> H{Network\nRestored?}
    H -->|No| C
    H -->|Yes| I
    A -->|Yes| I[Check LocalStorage\nfor Queued Reports]

    I --> J{Queued Reports\nFound?}
    J -->|None| END1(["⬤ End: Nothing to Sync"])
    J -->|Yes — N Reports Queued| K[Show 'Syncing\nQueued Reports' Indicator]
    K --> L[Iterate Through\nQueue — Report by Report]

    L --> M[Take First\nQueued Report]
    M --> N[POST Report to\n/api/data/incident-reports]
    N --> O{Server\nResponse}
    O -->|201 Created| P[Remove Report\nfrom LocalStorage Queue]
    P --> Q[Show 'Report\nSynced' Toast]
    Q --> R{More Reports\nin Queue?}
    R -->|Yes| L
    R -->|No| S[Clear Offline\nQueue Completely]
    S --> T[Remove Offline\nStatus Banner]
    T --> U[All Reports\nNow in Server]
    U --> END2(["⬤ End: Sync Complete"])

    O -->|Network Lost Again| V[Pause Sync\nRe-queue Unsent Reports]
    V --> B
    O -->|Server Error 5xx| W[Log Error\nKeep in Queue]
    W --> X{Retry\nAttempts Left?}
    X -->|Yes| N
    X -->|No| Y[Mark Report\nas 'Sync Failed']
    Y --> Z[Show 'Sync Failed\nTap to Retry' Message]
    Z --> END3(["⬤ End: Manual Retry Needed"])

    style START fill:#333,color:#fff,stroke:#333
    style END1 fill:#333,color:#fff,stroke:#333
    style END2 fill:#1B5E20,color:#fff,stroke:#1B5E20
    style END3 fill:#E65100,color:#fff,stroke:#BF360C
    style B fill:#FFF3E0,stroke:#E65100
    style G fill:#FFF9C4,stroke:#F9A825
    style K fill:#E3F2FD,stroke:#1565C0
    style Q fill:#E8F5E9,stroke:#2E7D32
    style W fill:#FFEBEE,stroke:#C62828
    style Z fill:#FFEBEE,stroke:#C62828
```

---

## Activity Diagram Summary

| # | Diagram | Primary Actor(s) | Key Decision Points |
|---|---|---|---|
| 1 | User Registration & MFA Setup | Passenger | Input validation, OTP validity, TOTP validity |
| 2 | Login with MFA | All Roles | Account status, password check, MFA method, role-based redirect |
| 3 | Password Recovery | All Roles | OTP validity, password strength, match check |
| 4 | Change Password | All Roles | Current password correct, strength rules, new ≠ current |
| 5 | Session Management & Auto-Logout | All Roles | 55-min warning, 60-min idle, 401 response |
| 6 | Submit Incident Report (Offline) | Passenger | GPS availability, station detection, online/offline, server response |
| 7 | Track Report & Request Escalation | Passenger | Report status state, escalation eligibility, real-time updates |
| 8 | Alert Management Lifecycle | Operator, Auxiliary | Alert source, validity assessment, severity, response path |
| 9 | Dashboard & Report Generation | Operator | Date filter, AI summary request, PDF export |
| 10 | User Account Management | Operator | Role/status filter, action selection, destructive confirmation |
| 11 | Shift Schedule Management | Operator | Filter type, CSV upload, server validation |
| 12 | Shift Detection & Alert Response | Auxiliary | Shift status, alert action, escalation needed |
| 13 | Push Notification Delivery | All Roles | Permission granted, app state, role relevance |
| 14 | Offline Queue Sync | Passenger (system) | Queue found, server response, retry limit |
