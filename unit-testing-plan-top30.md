# Unit Testing Test Plan - Top 30 Important Cases

This shortlist keeps only the most important unit test case IDs based on business risk and core workflow coverage: authentication, passenger reporting, auxiliary alert response, and operator monitoring/administration.

## Table 1 Auth/LoginPage.tsx
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-LGN-001 | checkAccountAndContinue() | Check if the email exists in the system | Leave the email field blank and click `Continue` | Error message `Please enter your email first.` is shown. No API call is made. The page stays on the account step. |  |  |
| UT-LGN-001 | checkAccountAndContinue() | Check if the email exists in the system | Enter a registered active email that does not require first-time setup, then click `Continue` | `POST /api/auth/check-account` is called. The page moves from the account step to the password step. |  |  |
| UT-LGN-001 | checkAccountAndContinue() | Check if the email exists in the system | Enter a registered email that requires first-time password setup, then click `Continue` | `onNavigateSetupPassword(email)` is called and the user is taken to `auth/SetupPasswordPage.tsx`. |  |  |
| UT-LGN-001 | checkAccountAndContinue() | Check if the email exists in the system | Enter an unregistered email and click `Continue` | Redirect state is shown and the user is taken to `auth/SignupPage.tsx`. |  |  |
| UT-LGN-002 | loginWithPassword() | Submit password for authentication | Enter a valid email, leave the password blank, and click `Sign In` | Error message `Please fill in your password.` is shown. No login API call is made. |  |  |
| UT-LGN-002 | loginWithPassword() | Submit password for authentication | Enter valid passenger credentials and click `Sign In` | `POST /api/auth/login` is called. The page changes to success state and `onLoginSuccess(session)` is triggered after the delay. |  |  |
| UT-LGN-002 | loginWithPassword() | Submit password for authentication | Enter valid operator or auxiliary credentials for an account that requires MFA, then click `Sign In` | `pendingMfa` is stored and the user is directed to `auth/MfaVerification.tsx` or `auth/MfaSetup.tsx` based on MFA method and setup state. |  |  |
| UT-LGN-002 | loginWithPassword() | Submit password for authentication | Enter a valid email with an incorrect password and click `Sign In` | Error message from backend, or `Invalid login details.`, is shown. The page stays on the password step. |  |  |
| UT-LGN-003 | loginWithOtp() | Request email OTP login | Leave the email field blank and click `Login with OTP` | Error message `Please enter your email.` is shown. No OTP-start API call is made. |  |  |
| UT-LGN-003 | loginWithOtp() | Request email OTP login | Enter a valid passenger email and click `Login with OTP` | `POST /api/auth/login/start-otp` is called. `pendingMfa` is stored and the page moves to `auth/MfaVerification.tsx`. |  |  |
| UT-LGN-005 | verifyOtp() | Verify MFA or OTP code | On the MFA page, enter a valid OTP and submit it | `POST /api/auth/login/verify` is called. `resolvedUser` is stored, success state is shown, and `onLoginSuccess(session)` is triggered after the delay. |  |  |
| UT-LGN-005 | verifyOtp() | Verify MFA or OTP code | On the MFA page, enter an invalid or expired OTP and submit it | Function returns `false`. The page stays on `auth/MfaVerification.tsx`. |  |  |

## Table 2 Auth/SignupPage.tsx
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-SGN-001 | handleSignupSubmit() | Submit sign up form | Leave one or more required fields blank and click `Sign Up` | Error message `Please fill out all fields to create an account.` is shown. No API call is made. |  |  |
| UT-SGN-001 | handleSignupSubmit() | Submit sign up form | Enter different values in `Password` and `Confirm Password`, then click `Sign Up` | Error message `Passwords do not match.` is shown. No API call is made. |  |  |
| UT-SGN-001 | handleSignupSubmit() | Submit sign up form | Enter a weak password that does not meet the rules, then click `Sign Up` | Error message starting with `Password must contain:` is shown. No API call is made. |  |  |
| UT-SGN-001 | handleSignupSubmit() | Submit sign up form | Fill in all sign-up fields with valid details and click `Sign Up` | `POST /api/auth/signup/start` is called. `signupChallengeId` is stored. The page moves to `auth/MfaVerification.tsx`. |  |  |
| UT-SGN-002 | verifyOtp() | Complete sign up with OTP | On the signup OTP page, enter a valid OTP and submit it | `POST /api/auth/signup/complete` is called. The page changes to success state and `onSignupSuccess(session)` is triggered after the delay. |  |  |
| UT-SGN-002 | verifyOtp() | Complete sign up with OTP | On the signup OTP page, enter an invalid OTP and submit it | Error message from backend, or `Verification failed.`, is shown and the page stays on `auth/MfaVerification.tsx`. |  |  |

## Table 3 Auth/SetupPasswordPage.tsx
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-SPW-001 | handleSubmit() | Set initial password for first-time account | Enter different values in `Password` and `Confirm Password`, then click `Activate Account` | Error message `Passwords do not match.` is shown. No API call is made. |  |  |
| UT-SPW-001 | handleSubmit() | Set initial password for first-time account | Enter a weak password that does not meet the rules, then click `Activate Account` | Error message starting with `Password must contain:` is shown. No API call is made. |  |  |
| UT-SPW-001 | handleSubmit() | Set initial password for first-time account | Enter a valid password for a first-time staff account that requires MFA, then click `Activate Account` | `POST /api/auth/setup-password` is called. `pendingMfa` is stored and the user is directed to `auth/MfaVerification.tsx` or `auth/MfaSetup.tsx`. |  |  |
| UT-SPW-001 | handleSubmit() | Set initial password for first-time account | Enter a valid password for a first-time account that completes without MFA, then click `Activate Account` | `resolvedUser` is stored, success state is shown, and `onSuccess(session)` is triggered after the delay. |  |  |

## Table 4 Auth/ForgotPasswordPage.tsx
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-FPW-001 | handleEmailSubmit() | Start forgot-password flow | Leave the email field blank and click `Send Reset Code` | Error message `Please enter your email.` is shown. No API call is made. |  |  |
| UT-FPW-001 | handleEmailSubmit() | Start forgot-password flow | Enter a registered email and click `Send Reset Code` | `POST /api/auth/forgot-password/start` is called. `challengeId` and `maskedDestination` are stored. The page moves to `auth/MfaVerification.tsx`. |  |  |
| UT-FPW-003 | handlePasswordSubmit() | Submit new password | After reaching the reset-password form, enter different values in `New Password` and `Confirm New Password`, then click `Continue` | Error message `Passwords do not match.` is shown. No reset-password API call is made. |  |  |
| UT-FPW-003 | handlePasswordSubmit() | Submit new password | After reaching the reset-password form, enter a weak password and click `Continue` | Error message starting with `Password must contain:` is shown. No reset-password API call is made. |  |  |
| UT-FPW-003 | handlePasswordSubmit() | Submit new password | After OTP verification, enter a valid new password and click `Continue` | `POST /api/auth/forgot-password/reset` is called. The page changes to success state and `onBack()` is triggered after 2 seconds. |  |  |

## Table 5 Auth/ChangePasswordPage.tsx
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-CPW-002 | handleVerifyOtp() | Complete password change after OTP | On the change-password OTP page, enter a valid OTP and submit it | `POST /api/auth/change-password` is called. The page changes to the success step. After the delay, `onBack()` is called. |  |  |
| UT-CPW-002 | handleVerifyOtp() | Complete password change after OTP | On the change-password OTP page, enter an invalid OTP and submit it | Password change is not completed. The user remains on `auth/MfaVerification.tsx`. |  |  |

## Table 6 Mobile-passenger/Home.tsx
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-P-H-001 | useEffect() | Load nearby incidents on page load | Open the `Home` page while incident records exist in the backend | `GET /api/data/incident-near-me` is called. Incident summary cards are rendered on the page. |  |  |
| UT-P-H-001 | useEffect() | Load nearby incidents on page load | Open the `Home` page when the backend returns an empty incident list | The page loads without crashing. No incident cards are shown. |  |  |
| UT-P-H-004 | handleDetectLocation() | Detect current line from device location | On `Home`, tap `Near Me` while `All Lines` is currently selected | Location helper runs. `selectedLine` changes to the first detected line. |  |  |
| UT-P-H-004 | handleDetectLocation() | Detect current line from device location | On `Home`, tap `Near Me` again while a specific line is already selected | `selectedLine` resets back to `All Lines`. |  |  |
| UT-P-H-005 | onNavigate() | Open Report or Incident screen from action cards | On `Home`, tap the report shortcut or incident shortcut | `onNavigate('report')` or `onNavigate('incident')` is called and the parent interface switches tabs accordingly. |  |  |

## Table 7 Mobile-passenger/PassengerReport.tsx
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-P-PR-001 | fetchHistory() | Load passenger report history | Open the `PassengerReport` page while report history exists | `GET /api/data/my-history?userId=...` is called. History list is rendered from returned reports. |  |  |
| UT-P-PR-001 | fetchHistory() | Load passenger report history | Open the `PassengerReport` page when no report history exists | History view loads without crashing. Empty-state UI is shown instead of report rows. |  |  |
| UT-P-PR-005 | handleUpdateStatus() | Update a passenger report status | Open an eligible report, enter a comment, and tap `Cancel` | Status update endpoint is called. The selected report and the history list are updated to the canceled state. Comment box is cleared. |  |  |
| UT-P-PR-005 | handleUpdateStatus() | Update a passenger report status | Open an eligible report, enter a comment, and tap `Escalate` | Status update endpoint is called. The selected report and the history list are updated to escalated state. Escalation timer data is refreshed. |  |  |

## Table 8 Mobile-passenger/CreateReport.tsx
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-P-CR-003 | validate() | Validate required report form fields | Leave one or more required report fields blank and tap `Submit Report` | Validation returns false. Matching field errors are shown. Form submission does not continue. |  |  |
| UT-P-CR-007 | handleSubmit() | Submit valid report | Fill in a valid report and tap `Submit Report` while the device is online | `POST /api/data/report` is called. If a photo exists, upload request is also sent. Step changes to `sent`, then `onBack()` runs after the delay. |  |  |
| UT-P-CR-007 | handleSubmit() | Submit valid report | Fill in a valid report and tap `Submit Report` while the device is offline, or disconnect the network before submitting | Report is saved to offline queue. Background sync registration is attempted. Step changes to `queued`, then `onBack()` runs after the delay. |  |  |

## Table 9 Mobile-passenger/Insights.tsx
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-P-I-001 | getJson() / load() | Load lines and safety data for insights | Open the `Insights` page when both line and alert API requests succeed | Line list and alert list are stored. Charts, cards, and overview data are rendered. `loading` becomes `false`. |  |  |
| UT-P-I-001 | getJson() / load() | Load lines and safety data for insights | Open the `Insights` page when the line API succeeds but the alert API fails | `errorText` shows `Unable to load safety data.` Line picker still renders. The page does not crash. |  |  |

## Table 10 Mobile-auxiliary/AuxiliaryShift.tsx
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-A-AS-001 | useEffect() | Load current auxiliary shift | Open the `AuxiliaryShift` page using an account with an active shift | Current shift information is rendered on screen. |  |  |
| UT-A-AS-001 | useEffect() | Load current auxiliary shift | Open the `AuxiliaryShift` page using an account with no active shift but an upcoming shift | Upcoming shift information is rendered on screen. |  |  |
| UT-A-AS-001 | useEffect() | Load current auxiliary shift | Open the `AuxiliaryShift` page using an account with no active or upcoming shift but with previous shift history | Previous shift information is rendered on screen. |  |  |
| UT-A-AS-002 | onStationDetected() | Pass assigned station back to parent | Open the `AuxiliaryShift` page using an account assigned to a station | `onStationDetected(stationId)` is called once with the station ID from the API response. |  |  |

## Table 11 Mobile-auxiliary/RecentAlerts.tsx
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-A-RA-001 | load() | Load assigned-station alerts | Open the `RecentAlerts` page while `assignedStationId` is available and the user has an active shift | Station-specific alerts are fetched and rendered as alert cards. |  |  |
| UT-A-RA-001 | load() | Load assigned-station alerts | Open the `RecentAlerts` page without `assignedStationId`, or without an active shift | Alert list is cleared and no alert cards are shown. |  |  |
| UT-A-RA-004 | confirmAction() | Confirm an auxiliary alert action | Open the alert action modal, enter justification if needed, and confirm the selected action | Alert status endpoint is called. The selected alert and alert list are patched with new status, timestamp, comment, and user-name fields. Modal closes. |  |  |

## Table 12 Mobile-auxiliary/AlertsHistory.tsx
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-A-HS-001 | useEffect() | Load handled auxiliary cases | Open the `AlertsHistory` page using an auxiliary account that has handled cases | `GET /api/data/auxiliary/history?userId=...` is called. Returned cases are rendered in the history list. |  |  |

## Table 13 web-operator/OperatorInterface.tsx
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-O-OI-001 | handleNavigate() | Navigate between operator pages | In the operator sidebar, click `Dashboard`, `Live Alerts`, `Reports`, `User Management`, `Shift Management`, or `Settings` | `activePage` updates and only the selected operator page is rendered in the main content area. |  |  |

## Table 14 web-operator/Dashboard.tsx
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-O-D-001 | fetchDashboard() | Load dashboard data for selected range | On the operator dashboard, select `Today`, `Yesterday`, `7 Days`, `30 Days`, or a custom date range | A dashboard request is sent with the correct query parameters and range-specific data is returned and rendered. |  |  |

## Table 15 web-operator/LiveAlerts.tsx
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-O-LA-001 | fetchAlerts() | Load live alerts and support data | Open the `Live Alerts` page or click the `Refresh` button | Live alerts endpoint is called. `alerts`, `lines`, `stationsByLine`, `stats`, and `lastRefresh` update. Cards and counters are rendered. |  |  |
| UT-O-LA-006 | handleModalConfirm() | Confirm operator alert action | Open the action modal, enter justification if needed, and confirm `Verify` | Alert action endpoint is called. Matching alert updates to verified state. Stats counters adjust. Modal closes. |  |  |
| UT-O-LA-006 | handleModalConfirm() | Confirm operator alert action | Open the action modal, enter justification if needed, and confirm `Dismiss` or `Escalate` | Matching alert updates to the selected status. Selected alert detail also updates. Escalated alerts store timestamp in `escalatedAt`. |  |  |

## Table 16 web-operator/Reports.tsx
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-O-R-001 | fetchReport() | Load report for another month | On the reports page, choose another month from the month picker | `GET /operator/reports?year=...&month=...` is called. Report dataset changes to the selected month. |  |  |

## Table 17 web-operator/UserManagement.tsx
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-O-UM-002 | handleStatusChange() | Change one user's status | In `User Management`, choose a new status for a user and confirm the action when the backend accepts the request | `POST /operator/users/{userId}/status` is called and the corresponding user row updates to the new status. |  |  |
| UT-O-UM-002 | handleStatusChange() | Change one user's status | In `User Management`, choose a new status for a user and confirm the action when the backend rejects the request | User row remains in the current status. |  |  |

## Table 18 web-operator/ShiftManagement.tsx
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-O-SM-002 | handleFileUpload() | Import shift schedule file | In `Shift Management`, upload a valid shift schedule file | `POST /operator/shifts/import` is called. Success toast appears and shift list reloads. |  |  |
| UT-O-SM-002 | handleFileUpload() | Import shift schedule file | In `Shift Management`, upload an invalid or failing shift schedule file | Error toast appears. Uploading state ends and existing shift list remains visible. |  |  |
