# Railly – Unit Testing Plan (Top 30 Critical Test Cases)

> **Project:** Railly – Transit Safety Monitoring Platform  
> **Total Tests:** 30  
> **Categories:** Frontend (10) · Backend Controllers (10) · Services / Helpers (10)

---

## ID Naming Convention

| Prefix | Category |
|--------|----------|
| `UT-FE-` | Frontend |
| `UT-BC-` | Backend Controller |
| `UT-SH-` | Service / Helper |

---

## 1 · Frontend

| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass / Fail |
|---|---|---|---|---|---|---|
| UT-FE-001 | `validatePassword()` | Verify that the password validation utility correctly enforces all complexity rules | Password is fewer than 8 characters | Returns an error string listing "at least 8 characters" | | |
| | | | Password has no uppercase letter | Returns an error string listing "one uppercase letter" | | |
| | | | Password has no lowercase letter | Returns an error string listing "one lowercase letter" | | |
| | | | Password has no digit | Returns an error string listing "one number" | | |
| | | | Password has no special character | Returns an error string listing "one special character" | | |
| | | | Password satisfies all rules (e.g. `Railly@2024`) | Returns `null` (no error) | | |
| UT-FE-002 | `usePasswordToggle()` | Verify the custom hook correctly manages password field visibility state | Hook initialised with default key `"password"` | `isVisible("password")` returns `false` | | |
| | | | `toggle("password")` is called once | `isVisible("password")` returns `true` | | |
| | | | `toggle("password")` is called a second time | `isVisible("password")` returns `false` (toggled back) | | |
| | | | Hook initialised with multiple keys `["old", "new", "confirm"]` | Each key is independently tracked; toggling `"new"` does not affect `"old"` or `"confirm"` | | |
| UT-FE-003 | `checkAccountAndContinue()` | Verify the account-check step in LoginPage handles all routing outcomes correctly | Email field is empty on form submit | Displays error "Please enter your email first." and stays on `account` step | | |
| | | | API returns `{ exists: false }` | Sets `isRedirecting = true` and navigates to Sign Up after 2 s | | |
| | | | API returns `{ exists: true, isActive: false }` | Displays error "Account is not active." | | |
| | | | API returns `{ exists: true, requiresSetup: true }` | Calls `onNavigateSetupPassword()` with the normalised email | | |
| | | | API returns `{ exists: true, isActive: true, role: "operator" }` | Advances step to `"password"` and stores role as `"operator"` | | |
| UT-FE-004 | `loginWithPassword()` | Verify the password-submit step routes to the correct MFA flow based on role | API returns `{ userId, role: "passenger" }` (direct session) | Sets `resolvedUser` and advances step to `"success"` | | |
| | | | API returns `{ requiresMfa: true, mfaMethod: "google_authenticator", isSetup: false }` | Advances step to `"mfa_setup"` | | |
| | | | API returns `{ requiresMfa: true, mfaMethod: "email_otp", challengeId: "..." }` | Advances step to `"mfa"` with `pendingMfa.mfaMethod === "email_otp"` | | |
| | | | API returns HTTP 401 | Sets error message from `data.error` and does not advance the step | | |
| UT-FE-005 | `handleOtpChange()` | Verify the 6-box OTP input handles digit entry and auto-submission | A digit is typed in box 4 (index 3) | Focus automatically moves to box 5 (index 4) | | |
| | | | A non-numeric character is typed | Input is rejected; the box value remains empty | | |
| | | | A digit is typed in the last box (index 5) and all previous boxes are filled | `onVerify()` is called automatically with the complete 6-digit code | | |
| UT-FE-006 | `handleOtpPaste()` | Verify that a 6-digit code pasted into the OTP field is distributed and submitted | User pastes a valid 6-digit numeric string | All 6 boxes are populated and `onVerify()` is called immediately | | |
| | | | User pastes a string containing letters or more than 6 characters | Non-digits are stripped; only the first 6 digits are used | | |
| UT-FE-007 | `parseMYTDatetime()` | Verify the utility correctly converts datetime strings to MYT-aware Date objects | Input is an ISO-8601 UTC string, e.g. `"2024-04-07T05:30:00Z"` | Returns a `Date` equivalent to `2024-04-07T13:30:00+08:00` | | |
| | | | Input is a plain space-separated string with no timezone suffix, e.g. `"2024-04-07 13:30"` | Treats it as MYT (+08:00) and returns the correct UTC equivalent | | |
| | | | Input already contains `+08:00` offset | Returns the correct `Date` without double-adding 8 hours | | |
| UT-FE-008 | `fmtDelta()` | Verify the report delta formatter produces correct directional labels and "good/bad" flags | `v = 10, invertGood = false` | Returns `{ label: "↑ 10%", good: true }` | | |
| | | | `v = -5, invertGood = false` | Returns `{ label: "↓ 5%", good: false }` | | |
| | | | `v = -8, invertGood = true` (e.g. false-alarm rate) | Returns `{ label: "↓ 8%", good: true }` (a decrease is good) | | |
| | | | `v = 0, diff = undefined` | Returns `null` | | |
| UT-FE-009 | `fmtTimeDiff()` | Verify the response-time delta formatter converts minutes correctly | `v = 45` (minutes) | Returns `"45 mins more"` | | |
| | | | `v = -90` (minutes) | Returns `"1.5 hrs less"` | | |
| | | | `v = 0` | Returns `""` (empty string) | | |
| UT-FE-010 | `flushPendingReports()` | Verify the offline queue sync function submits queued reports and removes them on success | Queue contains 2 pending reports; API returns HTTP 200 for both | Both reports are submitted, removed from IndexedDB, and the function returns `2` | | |
| | | | API returns a non-2xx response for the first report | The first report is skipped; the loop continues to process the next report | | |
| | | | API throws a network error (simulated offline) | The loop breaks immediately; no reports are removed; returns `0` | | |

---

## 2 · Backend Controllers

| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass / Fail |
|---|---|---|---|---|---|---|
| UT-BC-001 | `CheckAccount()` | Verify the account-lookup endpoint returns the correct flags for each account state | Email is empty or null | Returns `400 Bad Request` with "Email is required." | | |
| | | | Email does not match any user | Returns `200 OK` with `{ exists: false }` | | |
| | | | User exists but `Status` is not `Active` | Returns `200 OK` with `{ exists: true, isActive: false }` | | |
| | | | User is `Operator` or `Auxiliary` with no password hash set | Returns `200 OK` with `{ exists: true, requiresSetup: true }` | | |
| | | | User exists, is active, and has a password | Returns `200 OK` with `{ exists: true, role: "...", isActive: true, requiresSetup: false }` | | |
| UT-BC-002 | `Login()` | Verify the login endpoint enforces role-specific MFA routing | Password is incorrect | Returns `401 Unauthorized` with "Invalid email or password." | | |
| | | | User is `Passenger` and password is correct | Returns `200 OK` with a full `UserSessionDto` (JWT cookie set, no MFA step) | | |
| | | | User is `Operator` and password is correct | Returns `200 OK` with `{ requiresMfa: true, mfaMethod: "google_authenticator" }` | | |
| | | | User is `Auxiliary` and password is correct | Returns `200 OK` with `{ requiresMfa: true, mfaMethod: "email_otp", challengeId: "..." }` | | |
| | | | User account `Status` is `Suspended` | Returns `401 Unauthorized` with "Account is not active." | | |
| UT-BC-003 | `VerifyLogin()` | Verify the OTP/TOTP verification step issues a JWT on success | Email or code field is empty | Returns `400 Bad Request` | | |
| | | | User is `Operator` and TOTP code is valid | Returns `200 OK` with `UserSessionDto`; `auth_token` cookie is set | | |
| | | | User is `Operator` and TOTP code is invalid | Returns `401 Unauthorized` with "Invalid or expired verification code." | | |
| | | | User is `Auxiliary`; `ChallengeId` is missing | Returns `400 Bad Request` with "Challenge ID is required." | | |
| | | | User is `Auxiliary`; correct OTP provided with valid `ChallengeId` | Returns `200 OK` with `UserSessionDto`; cookie is set | | |
| UT-BC-004 | `UpdateAlertStatus()` | Verify the incident status workflow enforces business rules | ID format is malformed (e.g. `"XYZ-abc"`) | Returns `400 Bad Request` with "Invalid ID format" | | |
| | | | Incident does not exist | Returns `404 Not Found` | | |
| | | | Status is `"escalated"` but current status is not `"Verified"` | Returns `400 Bad Request` with "You can only escalate a verified incident." | | |
| | | | Status is `"escalated"` and current status is `Verified` but less than 2 minutes have elapsed | Returns `400 Bad Request` with "You can only escalate after 2 minutes…" | | |
| | | | Valid status transition (e.g. `Pending → Verified`) | Returns `200 OK`; `IncidentStatusChanged` SignalR event is broadcast | | |
| UT-BC-005 | `SignupStart()` | Verify the registration flow validates uniqueness and password strength before sending OTP | Email already registered | Returns `400 Bad Request` with "An account with this email already exists." | | |
| | | | Password is too weak (e.g. missing special character) | Returns `400 Bad Request` with a descriptive error listing what is missing | | |
| | | | Valid new email and strong password | Returns `200 OK` with `{ challengeId, expiresInSeconds }` | | |
| UT-BC-006 | `SignupComplete()` | Verify the account creation step validates the OTP before persisting the user | OTP code is wrong or `ChallengeId` is invalid | Returns `401 Unauthorized` with "Invalid or expired verification code." | | |
| | | | Duplicate email exists (race condition) | Returns `400 Bad Request` with "Account already exists." | | |
| | | | Correct OTP and unique email | Returns `200 OK` with `UserSessionDto`; new `Passenger` user record is created | | |
| UT-BC-007 | `ChangePassword()` | Verify that changing a password re-verifies the current password and prevents reuse | OTP or `ChallengeId` is invalid | Returns `401 Unauthorized` | | |
| | | | Current password is wrong (re-verification step) | Returns `400 Bad Request` with "Incorrect current password." | | |
| | | | New password is the same as the current password | Returns `400 Bad Request` with "New password cannot be the same as your current password." | | |
| | | | All validations pass | Returns `200 OK` with "Password updated successfully." | | |
| UT-BC-008 | `SubmitReport()` (PassengerController) | Verify that a passenger incident report is persisted and broadcast | `CoachId` is 0 or negative | Returns `400 Bad Request` with "Coach selection is required." | | |
| | | | `LineId` or `StationId` is null or empty | Returns `400 Bad Request` with "Line and Station selection is required." | | |
| | | | All fields are valid and user is authenticated | Returns `201 Created`; `UserReport` and linked `Incident` records created; `NewIncident` SignalR event broadcast | | |
| UT-BC-009 | `UpdateUserStatus()` | Verify the operator user-management endpoint enforces status transition rules | `userId` does not exist | Returns `404 Not Found` | | |
| | | | Target user status is `Archived` | Returns `400 Bad Request` with "Archived users cannot be modified." | | |
| | | | Status value is not one of `Active`, `Suspended`, `Archived` | Returns `400 Bad Request` with "Invalid status." | | |
| | | | Valid status transition | Returns `200 OK` with `{ userId, status }` | | |
| UT-BC-010 | `UploadReportImage()` (PassengerController) | Verify the image-upload endpoint enforces file size, type, and ownership | No file is provided | Returns `400 Bad Request` with "No image provided." | | |
| | | | File size exceeds 5 MB | Returns `400 Bad Request` with "Image must be smaller than 5 MB." | | |
| | | | File MIME type is not JPEG, PNG, GIF, or WebP | Returns `400 Bad Request` with "Only JPEG, PNG, GIF, and WebP images are accepted." | | |
| | | | Report belongs to a different user | Returns `404 Not Found` with "Report not found." | | |
| | | | Valid file, correct owner | Returns `200 OK` with `{ imageUrl }`; `ImageUrl` column updated in DB | | |

---

## 3 · Services / Helpers

| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass / Fail |
|---|---|---|---|---|---|---|
| UT-SH-001 | `TotpService.VerifyCode()` | Verify that TOTP code validation accepts valid codes and rejects replays and invalid inputs | `base32Secret` or `code` is null or whitespace | Returns `false` immediately | | |
| | | | A correctly generated 6-digit TOTP code is supplied within the current 30-second window | Returns `true` | | |
| | | | The same valid code is submitted a second time (replay attempt) | Returns `false` (blocked by `TotpUsedCodeCache`) | | |
| | | | An expired code outside the ±1-window drift is supplied | Returns `false` | | |
| UT-SH-002 | `TotpService.GetQrCodeUri()` | Verify the QR-code URI is formatted to the `otpauth://totp/` specification | Email is `user@railly.my` and secret is `JBSWY3DPEHPK3PXP` | Returns URI matching `otpauth://totp/Railly:user%40railly.my?secret=JBSWY3DPEHPK3PXP&issuer=Railly` | | |
| | | | Email contains special characters (e.g. `user+tag@railly.my`) | Special characters are URL-encoded in the returned URI | | |
| UT-SH-003 | `TotpUsedCodeCache.TryMarkUsed()` | Verify the replay-prevention cache correctly tracks used codes within the 90-second window | A new (secret, code) pair is submitted | Returns `true` (first use accepted) | | |
| | | | The same (secret, code) pair is submitted again within 90 seconds | Returns `false` (replay blocked) | | |
| | | | A different code for the same secret is submitted | Returns `true` (different code is treated as a new entry) | | |
| UT-SH-004 | `AuthChallengeStore.Create()` | Verify that newly created challenges have correct structure and unique IDs | `Create()` is called with TTL of 5 minutes | Returns a unique `ChallengeId` (GUID), a 6-digit zero-padded `Code`, and `ExpiresAtUtc` approximately 5 minutes in the future | | |
| | | | `Create()` is called twice with the same `userId` | Two different `ChallengeId` values are returned | | |
| UT-SH-005 | `AuthChallengeStore.VerifyAndConsume()` | Verify that OTP verification enforces expiry, user binding, max-attempt lockout, and single-use consumption | Correct code and `userId` are supplied before expiry | Returns `(IsValid: true, Metadata)` and removes the entry from the store | | |
| | | | Submitted `userId` does not match the stored `userId` | Returns `(IsValid: false, null)` and removes the entry | | |
| | | | Challenge has expired (past `ExpiresAtUtc`) | Returns `(IsValid: false, null)` | | |
| | | | Wrong code is submitted 3 times (max failed attempts) | Returns `(IsValid: false, null)`; challenge is permanently invalidated | | |
| UT-SH-006 | `AuthChallengeStore.RemoveExpired()` | Verify the cleanup routine correctly purges only expired entries | Store contains 3 entries: 1 expired, 2 still valid | Returns `1`; the store retains exactly the 2 valid entries | | |
| | | | All entries are still valid | Returns `0`; no entries are removed | | |
| UT-SH-007 | `AlertService.MapToAlertDTO()` | Verify the incident-to-DTO mapper produces correct field values for each source type | Source is `AI_DETECTION` with a linked `Detection` entity | `dto.Source` is `"ai"`; `dto.TrainId`, `dto.CoachId`, `dto.Line`, and `dto.Confidence` are populated from the detection graph | | |
| | | | Source is `USER_REPORT` with a linked `UserReport` entity | `dto.Source` is `"passenger"`; `dto.ReportedBy` and `dto.PassengerComment` are populated | | |
| | | | Neither `Detection` nor `UserReport` is present | `dto.Source` is `"unknown"`; `dto.Line` defaults to `"Unknown"` | | |
| | | | `ImageUrl` contains an `amazonaws.com` path | `dto.ImageUrl` is replaced with a pre-signed S3 URL | | |
| UT-SH-008 | `S3Service.GeneratePresignedUrl()` | Verify that the S3 helper generates a valid pre-signed URL for a given key and expiry | Key is `"snapshots/user-report/USR-001-42.jpg"` and expiry is `60` seconds | Returns a URL starting with `https://` that contains the key and a signature parameter | | |
| | | | Key is empty or null | Throws an exception or returns an error | | |
| UT-SH-009 | `AuthChallengeStore.GetUserId()` | Verify the helper returns the correct user ID only for non-expired challenges | Valid, non-expired challenge ID | Returns the associated `userId` string | | |
| | | | Challenge has expired | Returns `null` and removes the entry from the store | | |
| | | | Unknown / non-existent challenge ID | Returns `null` | | |
| UT-SH-010 | `ValidatePasswordStrength()` (AuthController private helper) | Verify the backend password-strength validator mirrors the frontend rules | Password shorter than 8 characters | Returned list contains `"at least 8 characters"` | | |
| | | | Password lacks an uppercase letter | Returned list contains `"one uppercase letter"` | | |
| | | | Password lacks a digit | Returned list contains `"one number"` | | |
| | | | Password lacks a special character | Returned list contains `"one special character"` | | |
| | | | Password satisfies all rules | Returned list is empty | | |
