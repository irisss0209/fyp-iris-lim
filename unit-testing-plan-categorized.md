# Unit Testing Plan by Category

This version groups the 30 most important unit tests by technical category instead of by page. The selected units focus on the highest-risk flows in Railly: authentication, incident reporting, alert handling, operational status updates, OTP verification, and supporting business logic.

## Table 1 Frontend Unit Testing

| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail | Priority |
|---|---|---|---|---|---|---|---|
| UT-FE-001 | checkAccountAndContinue() | Check whether the entered account can continue the login flow | Leave the email field blank and click `Continue` | Error message `Please enter your email first.` is shown. No API call is made. The page remains on the account step. |  |  | Critical |
|  |  |  | Enter a registered active email that does not require setup, then click `Continue` | `POST /api/auth/check-account` is called. The page moves to the password step and the password field becomes visible. |  |  |  |
|  |  |  | Enter a registered staff email that requires first-time setup, then click `Continue` | `onNavigateSetupPassword(email)` is called and the user is redirected to `SetupPasswordPage.tsx`. |  |  |  |
|  |  |  | Enter an unregistered email and click `Continue` | Redirect state is shown. After the delay, `onNavigateSignup()` is called and the user is redirected to `SignupPage.tsx`. |  |  |  |
| UT-FE-002 | loginWithPassword() | Submit password login for direct session or MFA flow | Enter a valid email, leave the password blank, and click `Sign In` | Error message `Please fill in your password.` is shown. No login API call is made. |  |  | Critical |
|  |  |  | Enter valid passenger credentials and click `Sign In` | `POST /api/auth/login` is called. The page changes to success state and `onLoginSuccess(session)` is triggered after the success delay. |  |  |  |
|  |  |  | Enter valid staff credentials that require MFA and click `Sign In` | `pendingMfa` is stored. The page moves to `MfaVerification.tsx` for email OTP, or `MfaSetup.tsx` for operator setup when `mfaMethod = google_authenticator` and `isSetup = false`. |  |  |  |
|  |  |  | Enter a valid email with an incorrect password and click `Sign In` | Error message from backend, or `Invalid login details.`, is shown. The page remains on the password step. |  |  |  |
| UT-FE-003 | handleFileUpload() | Import auxiliary shift schedules from an uploaded file | Select a file, then upload it successfully through the shift import action | `POST /operator/shifts/import` is called with `FormData`. A success toast is shown, and `fetchShifts()` is called when one or more rows are inserted. |  |  | High |
|  |  |  | Select a file and receive a failed upload response from the backend | An error toast such as `Upload failed` is shown. The current shift list remains visible and loading state ends. |  |  |  |
|  |  |  | Start the upload and the network request throws | An error toast such as `Server error during upload` is shown and loading state is reset. |  |  |  |
| UT-FE-004 | handleSignupSubmit() | Submit passenger sign-up details | Leave one or more required fields empty and click the sign-up button | Error message `Please fill out all fields to create an account.` is shown. No API call is made. |  |  | Critical |
|  |  |  | Enter passwords that do not match, then submit | Error message `Passwords do not match.` is shown. No API call is made. |  |  |  |
|  |  |  | Enter valid name, email, and password values, then submit | `POST /api/auth/signup/start` is called. `signupChallengeId` is stored and the page moves to `MfaVerification.tsx`. |  |  |  |
| UT-FE-005 | handleSubmit() | Set the initial password for a first-time staff account | Enter passwords that do not match and submit | Error message `Passwords do not match.` is shown. No API call is made. |  |  | Critical |
|  |  |  | Enter a password that fails the complexity rules and submit | An error message starting with `Password must contain:` is shown. No API call is made. |  |  |  |
|  |  |  | Enter a valid password and receive email OTP MFA response | `POST /api/auth/setup-password` is called. `pendingMfa` is stored and the page moves to `MfaVerification.tsx`. |  |  |  |
|  |  |  | Enter a valid password and receive Google Authenticator setup response | `POST /api/auth/setup-password` is called. `pendingMfa` is stored and the page moves to `MfaSetup.tsx`. |  |  |  |
| UT-FE-006 | handleOtpSubmit() | Submit and validate the MFA verification code | Enter fewer than 6 digits and click `Verify Account` | Error message `Please enter the full 6-digit code.` is shown. `onVerify()` is not called. |  |  | Critical |
|  |  |  | Enter a valid 6-digit code and submit | Verifying state is shown. `onVerify()` resolves `true` and the parent flow continues without showing an OTP error. |  |  |  |
|  |  |  | Enter an invalid 6-digit code and submit | Error message `Incorrect code. Please try again.` is shown. All OTP boxes are cleared and focus returns to the first box. |  |  |  |
| UT-FE-007 | handleSubmit() | Submit a passenger incident report | Attempt to submit with missing required form fields | Validation errors are shown. Submission does not proceed and no report API call is made. |  |  | Critical |
|  |  |  | Submit a valid report while the browser is online | `POST /api/data/report` is called. If a photo exists, the image upload request is also sent. The step changes to `sent`, then `onBack()` is triggered after the delay. |  |  |  |
|  |  |  | Submit a valid report while offline or when the network request throws | The report is queued locally through the offline queue. Background sync registration is attempted. The step changes to `queued`, then `onBack()` is triggered after the delay. |  |  |  |
| UT-FE-008 | downloadPDF() | Export the operator monthly report as a PDF document | Click `Download PDF` when report stats are available and chart sections exist on the page | Chart sections are captured with `html2canvas`, `ReportPDF` is rendered to a blob, browser download is triggered, and `isPdfGenerating` returns to `false` after completion. |  |  | High |
|  |  |  | Click `Download PDF` when report stats are not available | The function returns early and no PDF download is triggered. |  |  |  |
|  |  |  | Click `Download PDF` and a rendering/export error occurs | The error is logged, no unhandled crash occurs, and `isPdfGenerating` returns to `false`. |  |  |  |
| UT-FE-009 | confirmAction() | Confirm an auxiliary alert action from the modal | Open the modal and confirm `En Route` for a valid alert | The alert list is optimistically patched with `en_route`, `enrouteBy`, and `enrouteAt`. `updateAlertStatus()` is called for the selected alert. |  |  | Critical |
|  |  |  | Open the modal and confirm `Resolved`, `Dismissed`, or `Escalated` with a comment | The selected alert and list are optimistically patched with the new status, timestamp, officer name, and comment. The modal closes and `updateAlertStatus()` is called. |  |  |  |
| UT-FE-010 | handleModalConfirm() | Confirm an operator alert action from the live-alerts modal | Open the modal and confirm `Verify` for a pending alert | The selected alert is optimistically patched to `verified`, audit fields are populated, stats counters are updated, the modal closes, and `updateAlertStatus()` is called. |  |  | Critical |
|  |  |  | Open the modal and confirm `Dismiss` for a selected alert | The selected alert is optimistically patched to `dismissed`, dismissal audit fields are populated, stats counters are updated, the modal closes, and `updateAlertStatus()` is called. |  |  |  |
|  |  |  | Open the modal and confirm `Escalate` for a verified alert that is eligible for escalation | The selected alert is optimistically patched to `escalated`, escalation audit fields and local escalation timer are updated, stats counters are recalculated, the modal closes, and `updateAlertStatus()` is called. |  |  |  |

## Table 2 Backend Controller Unit Testing

| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail | Priority |
|---|---|---|---|---|---|---|---|
| UT-BE-001 | CheckAccount() | Check account existence and setup eligibility | Send a request with an empty or null email | The controller returns `400 BadRequest` with `Email is required.` |  |  | Critical |
|  |  |  | Send a request for an email that does not exist | The controller returns `200 OK` with `{ exists: false }`. |  |  |  |
|  |  |  | Send a request for an existing active user with a usable password | The controller returns `200 OK` with `exists = true`, the user role, `isActive = true`, and `requiresSetup = false`. |  |  |  |
|  |  |  | Send a request for an operator or auxiliary account without a password hash | The controller returns `200 OK` with `requiresSetup = true` so the frontend can route the user to first-time password setup. |  |  |  |
| UT-BE-002 | Login() | Authenticate user credentials and return the correct login flow | Submit a request with an empty email | The controller returns `400 BadRequest` with `Email is required.` |  |  | Critical |
|  |  |  | Submit an unknown email or incorrect password | The controller returns `401 Unauthorized` with `Invalid email or password. Please try again.` |  |  |  |
|  |  |  | Submit valid credentials for an inactive user | The controller returns `401 Unauthorized` with `Account is not active.` |  |  |  |
|  |  |  | Submit valid passenger credentials | The controller generates the JWT cookie and returns a full `UserSessionDto` without MFA. |  |  |  |
|  |  |  | Submit valid first-time staff credentials with no password hash | The controller returns `200 OK` with `requiresSetup = true` and the frontend role information. |  |  |  |
|  |  |  | Submit valid operator or auxiliary credentials with password already set | The controller returns the correct MFA response: Google Authenticator flow for operator, or email OTP challenge for auxiliary. |  |  |  |
| UT-BE-003 | ImportShifts() | Bulk-import auxiliary shifts from CSV or Excel | Submit no file or an unsupported file type to the shift import endpoint | The controller returns `400 BadRequest` with the parse or file-type error from `ParseFileAsync()`. |  |  | High |
|  |  |  | Submit a file containing valid shift rows | Valid rows are inserted into `AuxiliaryShifts`, `SaveChangesAsync()` is called, and the controller returns `200 OK` with the number of inserted rows and any accumulated row errors. |  |  |  |
|  |  |  | Submit a file containing invalid date, invalid time, non-auxiliary user, missing station, or duplicate shift rows | Invalid rows are skipped, matching error messages are added to the `errors` collection, and only valid rows are inserted. |  |  |  |
| UT-BE-004 | VerifyLogin() | Verify MFA or OTP login before issuing a session | Submit a request with missing email or code | The controller returns `400 BadRequest` with `Email and code are required.` |  |  | Critical |
|  |  |  | Submit a request for an inactive or missing user | The controller returns `401 Unauthorized` with `Invalid login attempt.` |  |  |  |
|  |  |  | Submit an operator verification request with invalid or missing authenticator configuration | The controller returns `401 Unauthorized` because the authenticator app is not configured or the code is invalid. |  |  |  |
|  |  |  | Submit a passenger or auxiliary OTP verification request without `challengeId` | The controller returns `400 BadRequest` with `Challenge ID is required for OTP verification.` |  |  |  |
|  |  |  | Submit a valid OTP or authenticator code | The controller returns `200 OK` with the session payload. If a pending password hash exists in challenge metadata, the password is applied and the user is activated. |  |  |  |
| UT-BE-005 | SetupPassword() | Set the first password for a staff account and start MFA onboarding | Submit a request with missing email or password | The controller returns `400 BadRequest` with `Email and password are required.` |  |  | Critical |
|  |  |  | Submit a request for a user that does not exist | The controller returns `404 NotFound` with `User not found.` |  |  |  |
|  |  |  | Submit a request for an account that already has a password | The controller returns `400 BadRequest` with `Password has already been set for this account.` |  |  |  |
|  |  |  | Submit a weak password | The controller returns `400 BadRequest` with an error message beginning `Password must contain:`. |  |  |  |
|  |  |  | Submit a valid password for an operator or auxiliary account | The controller stores the hashed password in challenge metadata and returns the correct next MFA step: Google Authenticator setup for operators or email OTP flow for auxiliary staff. |  |  |  |
| UT-BE-006 | SubmitReport() | Create a passenger report and its linked incident | Call the endpoint without an authenticated user ID | The controller returns `401 Unauthorized` with `Unable to identify user from token.` |  |  | Critical |
|  |  |  | Submit a report with invalid coach, line, or station selection | The controller returns `400 BadRequest` with the corresponding validation error. |  |  |  |
|  |  |  | Submit a valid report payload | A `UserReport` and linked `Incident` are created within a transaction. The controller returns `201 Created` with `Success = true` and the new `ReportId`. SignalR and push notification hooks are triggered after success. |  |  |  |
| UT-BE-007 | UpdateIncidentStatus() | Allow passengers to cancel or escalate their own reports under the correct rules | Call the endpoint without an authenticated user ID | The controller returns `401 Unauthorized`. |  |  | Critical |
|  |  |  | Attempt to modify a report that does not belong to the current user | The controller returns `401 Unauthorized` with `You can only modify your own reports.` |  |  |  |
|  |  |  | Attempt to cancel a non-pending report or cancel without a required comment | The controller returns `400 BadRequest` with the relevant business-rule error message. |  |  |  |
|  |  |  | Attempt to escalate before the required 2-minute wait window | The controller returns `400 BadRequest` and does not change the incident status. |  |  |  |
|  |  |  | Submit a valid cancel or escalate action | The incident status and audit fields are updated, changes are saved, and the controller returns success. |  |  |  |
| UT-BE-008 | ImportUsers() | Bulk-import operator and auxiliary accounts from CSV or Excel | Submit no file or an unsupported file type to the user import endpoint | The controller returns `400 BadRequest` with the parse or file-type error from `ParseFileAsync()`. |  |  | High |
|  |  |  | Submit a file containing valid operator or auxiliary rows | Valid rows are inserted into `Users`, generated IDs use the correct role prefix, `SaveChangesAsync()` is called, and the controller returns `200 OK` with the inserted count and error list. |  |  |  |
|  |  |  | Submit a file containing passenger roles, duplicate emails, invalid roles, or incomplete rows | Invalid rows are skipped, detailed validation errors are added to the `errors` collection, and only valid rows are inserted. |  |  |  |
| UT-BE-009 | UpdateAlertStatus() | Update auxiliary-owned incident status and audit fields | Submit an alert ID that cannot be parsed | The controller returns `400 BadRequest`. |  |  | Critical |
|  |  |  | Submit a valid alert ID with an unsupported status string | The controller returns `400 BadRequest` with `Invalid status`. |  |  |  |
|  |  |  | Submit `en_route`, `resolved`, `dismissed`, or `escalated` for a valid alert | The controller updates the incident status and matching audit fields, saves changes, emits `IncidentStatusChanged`, triggers push notifications, and returns `200 OK` with `Status updated.` |  |  |  |
| UT-BE-010 | UpdateAlertStatus() | Update operator-owned incident status with escalation rules enforced | Submit an alert ID with invalid format | The controller returns `400 BadRequest` with an invalid ID error. |  |  | Critical |
|  |  |  | Submit a request for an incident that does not exist | The controller returns `404 NotFound`. |  |  |  |
|  |  |  | Submit an unsupported status value | The controller returns `400 BadRequest` with `Invalid status`. |  |  |  |
|  |  |  | Submit `verify`, `dismiss`, or `resolve` for a valid incident | The controller updates the status and matching audit trail fields, saves changes, emits the SignalR event, triggers push notifications, and returns the normalized incident status. |  |  |  |
|  |  |  | Submit `escalate` for an incident that is not verified or has not waited 2 minutes since verification | The controller restores the previous status and returns `400 BadRequest` with the escalation rule error. |  |  |  |

## Table 3 Services and Helpers Unit Testing

| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail | Priority |
|---|---|---|---|---|---|---|---|
| UT-SH-001 | MapToAlertDTO() | Map incidents into frontend-ready alert DTOs | Pass an AI-detection incident with camera, line, station, confidence, and image data | The DTO uses `ALT-` ID prefix, sets `source = ai`, maps confidence/device fields, and resolves line/station/train/coach details from detection data. |  |  | Critical |
|  |  |  | Pass a passenger-report incident with report, line-station, and passenger metadata | The DTO uses `RPT-` ID prefix, sets `source = passenger`, maps report description and reporter name, and resolves line/station/train/coach details from report data. |  |  |  |
|  |  |  | Pass an incident whose image URL is an S3 URL | `GeneratePresignedUrl()` is called and the DTO contains the presigned image URL instead of the raw S3 URL. |  |  |  |
|  |  |  | Pass audit timestamps in UTC | The DTO formats audit timestamps in MYT-style local strings and ensures `Elapsed` is at least 1 minute. |  |  |  |
| UT-SH-002 | UploadFileWithKeyAsync() | Upload a validated file to S3 using a deterministic object key | Pass a valid file and a valid S3 object key | The service uploads the file stream to the configured S3 bucket with the provided key and returns the expected public S3 URL. |  |  | Critical |
|  |  |  | Pass a file when the AWS client throws an `AmazonS3Exception` | The service logs the AWS error and rethrows the exception so the caller can handle the upload failure. |  |  |  |
|  |  |  | Pass a file when a non-AWS exception occurs during upload | The service logs the failure and rethrows the exception. |  |  |  |
| UT-SH-003 | GeneratePresignedUrl() | Generate a temporary S3 download URL for a stored object | Pass a valid object key and use the default expiry time | The service generates a presigned GET URL for the configured bucket using the default expiry window. |  |  | High |
|  |  |  | Pass a valid object key and a custom expiry in minutes | The service generates a presigned GET URL that uses the supplied expiry duration. |  |  |  |
| UT-SH-004 | UploadFileAsync() | Upload a file to S3 using a generated object name inside a folder | Pass a valid file and folder name | The service generates a unique file key using the folder and original filename, uploads the file stream to the configured S3 bucket, and returns the expected public S3 URL. |  |  | High |
|  |  |  | Pass a file when the AWS client throws an `AmazonS3Exception` | The service logs the AWS error and rethrows the exception so the caller can handle the upload failure. |  |  |  |
|  |  |  | Pass a file when a non-AWS exception occurs during upload | The service logs the failure and rethrows the exception. |  |  |  |
| UT-SH-005 | SendLoginOtpAsync() | Send the Railly OTP verification email through SES | Pass a valid recipient email, recipient name, and OTP code | The service builds the SES `SendEmailRequest`, uses the configured sender address, and returns `true` after `SendEmailAsync()` succeeds. |  |  | Critical |
|  |  |  | Call the service when SES throws an exception | The service catches the exception, logs/writes the error, and returns `false`. |  |  |  |
|  |  |  | Pass typical user details and a code | The generated email content includes the Railly OTP subject, the recipient name, and the OTP code in the HTML body. |  |  |  |
| UT-SH-006 | GenerateAsync() | Request AI-generated text from Gemini through Vertex AI | Call the service when project ID or credentials are missing | The service returns the fallback text `AI insights are currently unavailable.` without attempting a successful AI response parse. |  |  | Critical |
|  |  |  | Call the service when the Vertex API returns a successful response containing candidate text | The service extracts the first candidate text, trims it, and returns the generated AI content. |  |  |  |
|  |  |  | Call the service when the HTTP response is unsuccessful or parsing fails | The service returns the fallback text instead of throwing an unhandled exception. |  |  |  |
| UT-SH-007 | detectNearbyLines() | Detect the unique nearby train lines from the user’s current location | Location permission and nearby station lookup both succeed, and the returned stations include one or more line names | `setIsLocating(true)` is triggered first, unique line names are extracted from the nearby station response, `onSuccess(lines)` is called with deduplicated line names, and loading ends with `setIsLocating(false)`. |  |  | Critical |
|  |  |  | Geolocation succeeds but no nearby lines are returned | `onError("No nearby lines detected at your location.")` is called and loading ends. |  |  |  |
|  |  |  | Geolocation is denied or the helper throws an error | The helper maps the error to a user-friendly message, calls `onError(message)`, and always ends with `setIsLocating(false)`. |  |  |  |
| UT-SH-008 | detectNearbyStations() | Detect nearby station objects from the user’s current location | Location permission and nearby station lookup succeed with one or more stations returned | `setIsLocating(true)` is triggered, `onSuccess(stations)` is called with the returned station objects, and loading ends with `setIsLocating(false)`. |  |  | High |
|  |  |  | Geolocation succeeds but no nearby stations are returned | `onError("No nearby stations detected.")` is called and loading ends. |  |  |  |
|  |  |  | Geolocation is denied or the helper throws an error | The helper calls `onError(message)` with a readable failure reason and always resets loading state. |  |  |  |
| UT-SH-009 | validatePassword() | Enforce the project password complexity policy | Pass a password shorter than 8 characters or missing one or more required character classes | The function returns a message beginning `Password must contain:` followed by each missing requirement. |  |  | Critical |
|  |  |  | Pass a password that satisfies all rules | The function returns `null`. |  |  |  |
| UT-SH-010 | flushPendingReports() | Synchronize queued offline reports when connectivity returns | Call the function when there are no queued reports | The function returns `0` and makes no API calls. |  |  | Critical |
|  |  |  | Flush queued reports when the report creation request succeeds | `POST /api/data/report` is called for each queued record. Successful records are removed from IndexedDB and counted in the returned flushed total. |  |  |  |
|  |  |  | Flush a queued report with a photo after the report API succeeds | The image upload request is attempted for the returned `reportId`. A photo upload failure does not block removal of the already-submitted queued report. |  |  |  |
|  |  |  | Flush queued reports while the network is still unavailable | The function stops processing, preserves unflushed records, and returns the number of reports flushed before the failure. |  |  |  |
