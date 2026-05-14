# Unit Testing Plan

## Auth Pages

### LoginPage
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-LGN-001 | checkAccountAndContinue() | Check if email exists in the system | Email field is empty | Error message `Please enter your email first.` is shown. No API call is made. The page stays on the account step. |  |  |
| UT-LGN-001 | checkAccountAndContinue() | Check if email exists in the system | Email exists, account is active, and `requiresSetup = false` | `POST /api/auth/check-account` is called. The page moves from the account step to the password step. The password field becomes visible. |  |  |
| UT-LGN-001 | checkAccountAndContinue() | Check if email exists in the system | Email exists, but account is inactive | Error message `Account is not active.` is shown. The page stays on the account step. |  |  |
| UT-LGN-001 | checkAccountAndContinue() | Check if email exists in the system | Email exists and `requiresSetup = true` | `onNavigateSetupPassword(email)` is called immediately. The user is taken to `SetupPasswordPage.tsx`. |  |  |
| UT-LGN-001 | checkAccountAndContinue() | Check if email exists in the system | Email does not exist | Redirect state is shown. After 2 seconds, `onNavigateSignup()` is called and the user is taken to `SignupPage.tsx`. |  |  |
| UT-LGN-002 | loginWithPassword() | Submit password for authentication | Email or password is empty | Error message `Please fill in your password.` is shown. No login API call is made. |  |  |
| UT-LGN-002 | loginWithPassword() | Submit password for authentication | Valid passenger account, backend returns full session object | `POST /api/auth/login` is called. The page changes to the success state. After the delay, `onLoginSuccess(session)` is called. |  |  |
| UT-LGN-002 | loginWithPassword() | Submit password for authentication | Valid staff account, backend returns MFA required with `mfaMethod = email_otp` | `pendingMfa` is stored. The page moves to `MfaVerification.tsx`. Email OTP destination hint is shown if returned. |  |  |
| UT-LGN-002 | loginWithPassword() | Submit password for authentication | Valid staff account, backend returns MFA required with `mfaMethod = google_authenticator` and `isSetup = false` | `pendingMfa` is stored. The page moves to `MfaSetup.tsx`. |  |  |
| UT-LGN-002 | loginWithPassword() | Submit password for authentication | Backend returns `requiresSetup = true` | `onNavigateSetupPassword(email)` is called. The user is taken to `SetupPasswordPage.tsx`. |  |  |
| UT-LGN-002 | loginWithPassword() | Submit password for authentication | Backend returns error or invalid credentials | Error message from backend, or `Invalid login details.`, is shown. The page stays on the password step. |  |  |
| UT-LGN-003 | loginWithOtp() | Request email OTP login | Email field is empty | Error message `Please enter your email.` is shown. No OTP-start API call is made. |  |  |
| UT-LGN-003 | loginWithOtp() | Request email OTP login | Valid passenger email | `POST /api/auth/login/start-otp` is called. `pendingMfa` is stored. The page moves to `MfaVerification.tsx`. |  |  |
| UT-LGN-003 | loginWithOtp() | Request email OTP login | Backend returns error | Error message from backend, or `Unable to start OTP login.`, is shown. The page stays on the password step. |  |  |
| UT-LGN-004 | setShowPassword() | Toggle password visibility | Password is currently hidden | Password input `type` changes from `password` to `text`. The typed password value remains unchanged. |  |  |
| UT-LGN-004 | setShowPassword() | Toggle password visibility | Password is currently visible | Password input `type` changes from `text` to `password`. The typed password value remains unchanged. |  |  |
| UT-LGN-005 | verifyOtp() | Verify MFA or OTP code | Valid OTP and valid challenge ID | `POST /api/auth/login/verify` is called. The success state is shown. `resolvedUser` is stored. After the delay, `onLoginSuccess(session)` is called. |  |  |
| UT-LGN-005 | verifyOtp() | Verify MFA or OTP code | Invalid OTP or expired challenge | Function returns `false`. The page stays on `MfaVerification.tsx`. No success redirect happens. |  |  |
| UT-LGN-006 | handleResendOtp() | Resend login OTP | Resend succeeds | `POST /api/auth/login/start-otp` is called again. `challengeId`, `maskedDestination`, and `debugOtp` are refreshed in `pendingMfa`. |  |  |
| UT-LGN-006 | handleResendOtp() | Resend login OTP | Resend fails | Error message from backend, or `Failed to resend code.`, is shown. The user remains on the MFA page. |  |  |

### SignupPage
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-SGN-001 | handleSignupSubmit() | Submit sign up form | One or more required fields are empty | Error message `Please fill out all fields to create an account.` is shown. No API call is made. |  |  |
| UT-SGN-001 | handleSignupSubmit() | Submit sign up form | Password and confirm password do not match | Error message `Passwords do not match.` is shown. No API call is made. |  |  |
| UT-SGN-001 | handleSignupSubmit() | Submit sign up form | Password does not satisfy complexity rules | Error message starting with `Password must contain:` is shown. No API call is made. |  |  |
| UT-SGN-001 | handleSignupSubmit() | Submit sign up form | All fields are valid | `POST /api/auth/signup/start` is called. `signupChallengeId` is stored. The page moves from the details step to `MfaVerification.tsx`. |  |  |
| UT-SGN-001 | handleSignupSubmit() | Submit sign up form | Backend rejects sign up request | Error message from backend, or `Failed to start signup.`, is shown. The page stays on the details step. |  |  |
| UT-SGN-002 | verifyOtp() | Complete sign up with OTP | Valid OTP and valid `signupChallengeId` | `POST /api/auth/signup/complete` is called. The page changes to the success state. After the delay, `onSignupSuccess(session)` is called. |  |  |
| UT-SGN-002 | verifyOtp() | Complete sign up with OTP | Invalid OTP | Error message from backend, or `Verification failed.`, is shown. Function returns `false`. The page stays on `MfaVerification.tsx`. |  |  |
| UT-SGN-003 | handleResendOtp() | Resend sign up OTP | Resend succeeds | `POST /api/auth/signup/start` is called again with the same name, email, and password. `signupChallengeId` is updated with the new challenge ID. |  |  |
| UT-SGN-003 | handleResendOtp() | Resend sign up OTP | Resend fails | Error message from backend, or `Failed to resend code.`, is shown. The user remains on the MFA page. |  |  |
| UT-SGN-004 | setShowPassword()/setShowConfirmPassword() | Toggle password visibility | Toggle password field only | Password field changes between `password` and `text`. Confirm password field is not affected. |  |  |
| UT-SGN-004 | setShowPassword()/setShowConfirmPassword() | Toggle password visibility | Toggle confirm password field only | Confirm password field changes between `password` and `text`. Password field is not affected. |  |  |

### SetupPasswordPage
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-SPW-001 | handleSubmit() | Set initial password for first-time account | Password and confirm password do not match | Error message `Passwords do not match.` is shown. No API call is made. |  |  |
| UT-SPW-001 | handleSubmit() | Set initial password for first-time account | Password does not satisfy complexity rules | Error message starting with `Password must contain:` is shown. No API call is made. |  |  |
| UT-SPW-001 | handleSubmit() | Set initial password for first-time account | Valid password, backend returns MFA email OTP required | `POST /api/auth/setup-password` is called. `pendingMfa` is stored. The page moves to `MfaVerification.tsx`. |  |  |
| UT-SPW-001 | handleSubmit() | Set initial password for first-time account | Valid password, backend returns Google Authenticator setup required | `POST /api/auth/setup-password` is called. `pendingMfa` is stored. The page moves to `MfaSetup.tsx`. |  |  |
| UT-SPW-001 | handleSubmit() | Set initial password for first-time account | Valid password, backend returns direct session with `requiresMfa = false` | `resolvedUser` is stored. The page changes to the success state. After the delay, `onSuccess(session)` is called. |  |  |
| UT-SPW-001 | handleSubmit() | Set initial password for first-time account | Backend rejects setup request | Error message from backend, or `Failed to set password.`, is shown. The page stays on the password step. |  |  |
| UT-SPW-002 | verifyOtp() | Verify OTP after setup-password step | Valid OTP | `POST /api/auth/login/verify` is called. The page changes to the success state and later calls `onSuccess(session)`. |  |  |
| UT-SPW-002 | verifyOtp() | Verify OTP after setup-password step | Invalid OTP | Function returns `false`. The page stays on `MfaVerification.tsx`. No success redirect occurs. |  |  |
| UT-SPW-003 | handleResendOtp() | Resend OTP after setup-password step | Resend is triggered from MFA page | `handleSubmit()` is called again internally to generate a new challenge. The current password values are reused for the new request. |  |  |
| UT-SPW-004 | setShowPassword()/setShowConfirmPassword() | Toggle password visibility | Toggle password field or confirm password field | Only the clicked field changes visibility. Typed values remain unchanged. |  |  |

### ForgotPasswordPage
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-FPW-001 | handleEmailSubmit() | Start forgot password flow | Email field is empty | Error message `Please enter your email.` is shown. No API call is made. |  |  |
| UT-FPW-001 | handleEmailSubmit() | Start forgot password flow | Valid email | `POST /api/auth/forgot-password/start` is called. `challengeId` and `maskedDestination` are stored. The page moves to `MfaVerification.tsx`. |  |  |
| UT-FPW-001 | handleEmailSubmit() | Start forgot password flow | Backend rejects request | Error message from backend, or `Something went wrong. Please try again.`, is shown. The page stays on the email step. |  |  |
| UT-FPW-002 | verifyOtp() | Accept reset OTP and move to new password step | OTP field is non-empty | `verifiedCode` is stored. The page moves from the OTP step to the new-password step. No reset-password API call is made yet. |  |  |
| UT-FPW-002 | verifyOtp() | Accept reset OTP and move to new password step | OTP field is empty | Function returns `false`. The page stays on `MfaVerification.tsx`. |  |  |
| UT-FPW-003 | handlePasswordSubmit() | Submit new password | Password and confirm password do not match | Error message `Passwords do not match.` is shown. No reset-password API call is made. |  |  |
| UT-FPW-003 | handlePasswordSubmit() | Submit new password | Password does not satisfy complexity rules | Error message starting with `Password must contain:` is shown. No reset-password API call is made. |  |  |
| UT-FPW-003 | handlePasswordSubmit() | Submit new password | Valid password and valid verified code | `POST /api/auth/forgot-password/reset` is called. The page changes to the success state. After 2 seconds, `onBack()` is triggered. |  |  |
| UT-FPW-003 | handlePasswordSubmit() | Submit new password | Backend rejects reset request | Error message from backend, or `Failed to reset password. Please try again.`, is shown. The page stays on the new-password step. |  |  |
| UT-FPW-004 | handleResendOtp() | Resend forgot-password OTP | Resend succeeds | `POST /api/auth/forgot-password/start` is called again. `challengeId` is refreshed. The page remains on `MfaVerification.tsx`. |  |  |
| UT-FPW-004 | handleResendOtp() | Resend forgot-password OTP | Resend fails silently | No crash occurs. The user remains on the OTP screen and can continue retrying later. |  |  |
| UT-FPW-005 | setShowPassword()/setShowConfirmPassword() | Toggle reset-password visibility | Toggle password fields | Only the clicked field changes visibility. Input values remain unchanged. |  |  |

### ChangePasswordPage
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-CPW-001 | handleSendOtp() | Start authenticated change-password flow | Valid current password, new password, and confirm password | `POST /api/auth/change-password/start` is called. `challengeId` and `maskedEmail` are stored. The page moves from the password step to `MfaVerification.tsx`. |  |  |
| UT-CPW-001 | handleSendOtp() | Start authenticated change-password flow | Backend rejects OTP-start request | Error message from backend, or `Failed to send code.`, is shown. The page stays on the password step. |  |  |
| UT-CPW-001 | handleSendOtp() | Start authenticated change-password flow | Network error | Error message `Network error. Please try again.` is shown. The page stays on the password step. |  |  |
| UT-CPW-002 | handleVerifyOtp() | Complete password change after OTP | Valid OTP and valid challenge ID | `POST /api/auth/change-password` is called. The page changes to the success step. After the delay, `onBack()` is called. |  |  |
| UT-CPW-002 | handleVerifyOtp() | Complete password change after OTP | Invalid OTP or backend rejection | Password change is not completed. The user remains on `MfaVerification.tsx`. |  |  |
| UT-CPW-003 | handleResend() | Resend change-password OTP | Resend succeeds | `POST /api/auth/change-password/start` is called again. `challengeId` is refreshed with the latest value. |  |  |
| UT-CPW-004 | setShowPw() | Toggle current, new, and confirm password visibility | Toggle one password field | Only the selected field changes between hidden and visible states. Other fields are not affected. |  |  |
| UT-CPW-005 | onBack() | Leave change-password page | User clicks Back or success timeout finishes | `onBack()` is called once, and the parent page returns to the previous settings or profile screen. |  |  |

### MfaSetup
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-MFS-001 | fetchSetupData() | Load QR code and MFA secret | API request succeeds | `GET /api/auth/mfa/setup?email=...` is called. QR code and secret are displayed on screen. |  |  |
| UT-MFS-001 | fetchSetupData() | Load QR code and MFA secret | API request fails | Error message `Failed to initialize MFA setup. Please try again.` or connection error is shown. QR code is not displayed. |  |  |
| UT-MFS-002 | handleCopySecret() | Copy MFA secret to clipboard | Secret is available | `navigator.clipboard.writeText(secret)` is called. A copied confirmation state is shown temporarily. |  |  |
| UT-MFS-003 | handleCodeChange() | Enter authenticator code | Numeric digit is entered in one OTP box | That digit is stored in the correct OTP slot. Focus moves to the next input. Previous error message is cleared. |  |  |
| UT-MFS-003 | handleCodeChange() | Enter authenticator code | Non-numeric character is entered | The invalid character is ignored. OTP state is not updated with a letter or symbol. |  |  |
| UT-MFS-004 | handleActivate() | Activate Google Authenticator MFA | Fewer than 6 digits are entered | Error message `Please enter the 6-digit code.` is shown. No activation API call is made. |  |  |
| UT-MFS-004 | handleActivate() | Activate Google Authenticator MFA | Valid 6-digit code | `POST /api/auth/mfa/activate` is called. `onActivate()` is triggered. The parent page moves to `MfaVerification.tsx`. |  |  |
| UT-MFS-004 | handleActivate() | Activate Google Authenticator MFA | Invalid 6-digit code | Error message from backend, or `Invalid code. Please try again.`, is shown. The page stays on the verify step. |  |  |

### MfaVerification
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-MFV-001 | handleOtpChange() | Enter OTP one digit at a time | Numeric digit is entered into one box | The digit is stored in the correct slot. Focus moves to the next input. Existing OTP error is cleared. |  |  |
| UT-MFV-001 | handleOtpChange() | Enter OTP one digit at a time | Non-numeric character is entered | The invalid character is ignored. OTP state is not updated with the invalid character. |  |  |
| UT-MFV-002 | handleOtpPaste() | Paste full OTP code | User pastes a 6-digit code | All 6 OTP boxes are populated in order. The verification-ready state is set immediately. |  |  |
| UT-MFV-003 | handleOtpSubmit() | Submit OTP code | Fewer than 6 digits are entered | Error message `Please enter the full 6-digit code.` is shown. `onVerify()` is not called. |  |  |
| UT-MFV-003 | handleOtpSubmit() | Submit OTP code | `onVerify()` resolves `true` | Verifying state appears. No error is shown. The parent component proceeds with success flow. |  |  |
| UT-MFV-003 | handleOtpSubmit() | Submit OTP code | `onVerify()` resolves `false` | Error message `Incorrect code. Please try again.` is shown. OTP boxes are cleared and focus returns to the first input. |  |  |
| UT-MFV-004 | handleResendClick() | Resend OTP after countdown | Countdown reaches 0 and resend is clicked | `onResend()` is called once. Countdown resets to 60 seconds. Focus returns to the first OTP input. |  |  |
| UT-MFV-005 | handleOtpKeyDown() | Navigate OTP fields with keyboard | Backspace is pressed on an empty OTP field | Focus moves to the previous OTP field. |  |  |

## Passenger Mobile Pages

### PassengerInterface
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-PIF-001 | setActiveTab() | Navigate between passenger tabs | User taps `Home` / `Report` / `Incident` / `Insights` / `Profile` tab | `activeTab` updates to the selected tab. Only the selected page component is rendered in the content area. |  |  |
| UT-PIF-002 | setShowChangePassword() | Open change-password screen from profile | Profile page triggers `onChangePassword()` | `showChangePassword` becomes `true`. `ChangePasswordPage.tsx` replaces the normal tab content. |  |  |
| UT-PIF-003 | onBack() | Return from change-password screen | `ChangePasswordPage.tsx` triggers its back callback | `showChangePassword` becomes `false`. The previously selected passenger tab layout is shown again. |  |  |
| UT-PIF-004 | handleOnline() | Flush queued offline reports after reconnecting | Browser fires `online` event | `flushPendingReports(API_BASE)` is called once. Queued passenger reports attempt to sync automatically. |  |  |

### Home
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-HOM-001 | useEffect() | Load nearby incidents on page load | API returns one or more incidents | `GET /api/data/incident-near-me` is called. Incident summary cards are rendered on the page. |  |  |
| UT-HOM-001 | useEffect() | Load nearby incidents on page load | API returns empty array | The page loads without crashing. No incident cards are shown. |  |  |
| UT-HOM-002 | useEffect() | Load train lines on page load | API returns available lines | `GET /api/data/lines` is called. Line picker shows `All Lines` plus all returned line names. |  |  |
| UT-HOM-003 | useEffect() | Load most recent passenger report | Session exists and report history contains at least one report | `GET /api/data/my-history` is called. `recentReport` shows the latest report summary card. |  |  |
| UT-HOM-004 | handleDetectLocation() | Detect current line from device location | No line filter is currently selected | Location helper runs. `selectedLine` changes to the first detected line. |  |  |
| UT-HOM-004 | handleDetectLocation() | Detect current line from device location | A specific line is already selected | `selectedLine` resets back to `All Lines`. |  |  |
| UT-HOM-005 | onNavigate() | Open Report or Incident screen from action cards | Passenger taps report shortcut or incident shortcut | `onNavigate('report')` or `onNavigate('incident')` is called. The parent interface switches tabs accordingly. |  |  |
| UT-HOM-006 | emergencyCall() | Trigger emergency dial action | Passenger taps emergency button | `window.location.href` is set to `tel:999`. |  |  |

### PassengerReport
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-PRP-001 | fetchHistory() | Load passenger report history | API returns report list | `GET /api/data/my-history?userId=...` is called. History list is rendered from returned reports. |  |  |
| UT-PRP-001 | fetchHistory() | Load passenger report history | API returns empty list | History view loads without crashing. Empty-state UI is shown instead of report rows. |  |  |
| UT-PRP-002 | setView() | Switch from history dashboard to create-report view | Passenger taps `Create Report` | `view` changes from `dashboard` to `create`. `CreateReport.tsx` is rendered. |  |  |
| UT-PRP-003 | setStatusFilter()/setDateFilter() | Filter report history | Passenger changes status filter or date filter | Only reports matching the selected status and date condition remain visible. |  |  |
| UT-PRP-004 | setSelectedReport() | Open report detail modal | Passenger taps one report row/card | `selectedReport` is stored. Detailed report modal/panel opens and shows audit trail. |  |  |
| UT-PRP-005 | handleUpdateStatus() | Cancel a report | Report is eligible for cancellation and API request succeeds | Status update endpoint is called. The selected report and the history list are updated to the canceled state. Comment box is cleared. |  |  |
| UT-PRP-006 | handleUpdateStatus() | Escalate a report | Report is eligible for escalation and API request succeeds | Status update endpoint is called. The selected report and the history list are updated to escalated state. Escalation timer data is refreshed. |  |  |

### CreateReport
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-CRT-001 | useEffect() | Load line options for report form | Component mounts | `GET /api/data/lines` is called. Line dropdown is populated with returned line names. |  |  |
| UT-CRT-002 | useEffect() | Load stations after a line is selected | `selectedLineId` is set to a valid line ID | `GET /api/data/stations-by-line/{lineId}` is called. Station dropdown updates to only that line's stations. |  |  |
| UT-CRT-003 | validate() | Validate required report form fields | One or more required fields are empty | Validation returns false. Matching field errors are shown. Form submission does not continue. |  |  |
| UT-CRT-004 | handleFileSelected() | Attach a photo to the report | User selects a camera or gallery file | `photoFile` is stored. `photoPreview` is created and preview UI is shown. |  |  |
| UT-CRT-005 | clearPhoto() | Remove attached report photo | A photo is already attached | `photoFile` becomes `null`. `photoPreview` is cleared. Preview UI disappears. |  |  |
| UT-CRT-006 | handleDetectLocation() | Detect nearby stations | Location helper returns nearby stations | `nearbyStations` is populated. Nearby station suggestions become visible and selectable. |  |  |
| UT-CRT-007 | handleSubmit() | Submit valid report while online | Form is valid and browser is online | `POST /api/data/report` is called. If photo exists, upload request is also sent. Step changes to `sent`, then `onBack()` runs after the delay. |  |  |
| UT-CRT-008 | handleSubmit() | Queue report while offline | Form is valid and browser is offline, or network call throws | Report is saved to offline queue. Background sync registration is attempted. Step changes to `queued`, then `onBack()` runs after the delay. |  |  |

### IncidentNearMe
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-INM-001 | useEffect() | Load nearby incidents | Component mounts | `GET /api/data/incident-near-me` is called. Returned incidents are rendered in the list. |  |  |
| UT-INM-002 | useEffect() | Load line filter options | Component mounts | `GET /api/data/lines` is called. Line filter contains `All Lines` plus returned line names. |  |  |
| UT-INM-003 | handleDetectLocation() | Detect current line for incident filtering | No line is currently selected | Location helper runs. `selectedLine` changes to the first detected line. |  |  |
| UT-INM-003 | handleDetectLocation() | Detect current line for incident filtering | A specific line is already selected | `selectedLine` resets to `All Lines`. |  |  |
| UT-INM-004 | setSearchQuery() | Search incidents | User types a keyword into the search field | Only incidents matching the keyword remain visible in the filtered results. |  |  |
| UT-INM-005 | setStatusFilter() | Filter incidents by status | User selects a status from the dropdown | Only incidents with that status remain visible. |  |  |
| UT-INM-006 | setShowSampleImage() | Toggle sample image display | User clicks sample-image toggle | Sample image section appears when enabled and disappears when disabled. |  |  |

### Insights
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-INS-001 | getJson() / load() | Load lines and safety data for insights | Both API requests succeed | Line list and alert list are stored. Charts, cards, and overview data are rendered. `loading` becomes `false`. |  |  |
| UT-INS-001 | getJson() / load() | Load lines and safety data for insights | Alert request fails but line request succeeds | `errorText` shows `Unable to load safety data.`. Line picker still renders. Page does not crash. |  |  |
| UT-INS-002 | handleDetectLocation() | Detect current line for insights | `selectedLine = All Lines` | Location helper runs and sets `selectedLine` to the detected line if one is found. |  |  |
| UT-INS-002 | handleDetectLocation() | Detect current line for insights | `selectedLine` is already a specific line | `selectedLine` resets to `All Lines`. |  |  |
| UT-INS-003 | safetyLevel() | Classify route safety level | Active alert count is low, medium, or high | Helper returns `clear`, `moderate`, or `high` exactly according to the component thresholds. |  |  |
| UT-INS-004 | parseHour()/fmtHour() | Build hourly trend labels | Valid hour values are passed through helper functions | Correct hour buckets and 12-hour labels such as `12 AM`, `1 PM`, and `11 PM` are produced. |  |  |
| UT-INS-005 | useEffect() | Request AI travel advice | AI advice request succeeds | `POST /ai/travel-advice` is called. `aiAdvice` text is rendered in the advice panel. |  |  |
| UT-INS-005 | useEffect() | Request AI travel advice | AI advice request fails | `aiAdvice` remains null. Advice panel does not crash the page. |  |  |
| UT-INS-006 | setShowLinePicker()/setSelectedLine() | Open and pick line from line picker | User opens picker and chooses one line | Picker closes and `selectedLine` updates to the chosen value. |  |  |

### PassengerProfile
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-PPF-001 | useEffect() | Load passenger profile information | API request succeeds | `GET /api/data/profile` is called. Email, total reports, and verified count are displayed. |  |  |
| UT-PPF-002 | SectionHeader() | Expand and collapse profile sections | User clicks the same section header twice | First click opens the section. Second click closes the same section. |  |  |
| UT-PPF-003 | onChangePassword() | Open change-password flow from passenger profile | User taps `Change Password` | `onChangePassword()` is called once. Parent interface shows `ChangePasswordPage.tsx`. |  |  |
| UT-PPF-004 | onLogout() | Log out from passenger profile | User taps `Logout` | `onLogout()` is called once. Parent session is cleared by the parent handler. |  |  |

## Auxiliary Mobile Pages

### AuxiliaryInterface
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-AIF-001 | setActiveTab() | Navigate between auxiliary tabs | User taps `Alerts`, `History`, or `Profile` | `activeTab` updates and only the selected page content is rendered. |  |  |
| UT-AIF-002 | setAssignedStationId() | Receive station ID from active shift | `AuxiliaryShift.tsx` calls `onStationDetected(id)` | `assignedStationId` is stored and passed into `RecentAlerts.tsx`. |  |  |
| UT-AIF-003 | setShowChangePassword() | Open change-password page from auxiliary profile | Profile page triggers change-password action | `showChangePassword` becomes `true`. `ChangePasswordPage.tsx` replaces normal tab content. |  |  |
| UT-AIF-004 | onBack() | Return from auxiliary change-password page | Back callback fires from `ChangePasswordPage.tsx` | `showChangePassword` becomes `false`. Auxiliary tab layout appears again. |  |  |

### AuxiliaryShift
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-ASH-001 | useEffect() | Load current auxiliary shift | API returns active shift details | `GET /api/data/auxiliary/shift?userId=...` is called. Shift information is rendered on screen. |  |  |
| UT-ASH-001 | useEffect() | Load current auxiliary shift | API returns no shift | `shift` becomes `null`. No-shift fallback UI is shown. |  |  |
| UT-ASH-002 | onStationDetected() | Pass assigned station back to parent | Shift contains a valid station ID | `onStationDetected(stationId)` is called once with the station ID from the API response. |  |  |
| UT-ASH-003 | endTime calculation | Calculate end time for overnight shift | Shift start time is later than shift end time on same calendar date | Shift end datetime is rolled into the next day so status calculation remains correct. |  |  |

### RecentAlerts
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-RAL-001 | load() | Load assigned-station alerts | `assignedStationId` is present and API succeeds | Station-specific alerts are fetched and rendered as alert cards. |  |  |
| UT-RAL-001 | load() | Load assigned-station alerts | `assignedStationId` is missing | Alert list is cleared and no alert cards are shown. |  |  |
| UT-RAL-002 | setActiveStatus() | Filter alerts by tab status | User taps `Pending`, `En Route`, `Resolved`, or `Dismissed` tab | `activeStatus` updates and only alerts with that status remain visible. |  |  |
| UT-RAL-003 | handleAction() | Open alert action confirmation modal | User taps an action such as `En Route`, `Resolved`, or `Dismissed` | `modalConfig` stores the alert ID and action. `JustificationModal.tsx` opens. |  |  |
| UT-RAL-004 | confirmAction() | Confirm an auxiliary alert action | Action request succeeds | Alert status endpoint is called. The selected alert and alert list are patched with new status, timestamp, comment, and user-name fields. Modal closes. |  |  |
| UT-RAL-005 | setSelectedAlert() | Open alert details | User taps an alert card | `selectedAlert` is stored and `AlertDetailView.tsx` is rendered for that alert. |  |  |
| UT-RAL-006 | load() | Refresh alerts when app becomes visible | Document visibility changes back to `visible` | `load()` runs again and the alert list refreshes from the backend. |  |  |

### AlertDetailView
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-ADV-001 | renderTimeline() | Render alert audit timeline | Alert contains created, verified, escalated, en-route, or resolved metadata | Timeline displays only the steps whose timestamps/comments exist in the alert object. |  |  |
| UT-ADV-002 | setLightboxUrl() | Open full-size alert image | User taps alert image | `lightboxUrl` is set to `snapshotUrl` or `imageUrl`. Full-screen lightbox opens. |  |  |
| UT-ADV-003 | setLightboxUrl() | Close full-size alert image | User taps close button or backdrop | `lightboxUrl` becomes `null`. Lightbox overlay disappears. |  |  |
| UT-ADV-004 | onAction() | Trigger auxiliary action from detail view | User taps `En Route`, `Resolved`, or `Dismissed` button | `onAction(alertId, status)` is called once with the selected status. |  |  |
| UT-ADV-005 | onBack() | Return from alert detail view | User taps back button | `onBack()` is called once. Parent page returns to alert list or history list. |  |  |

### AlertsHistory
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-AHS-001 | useEffect() | Load handled auxiliary cases | API returns history cases | `GET /api/data/auxiliary/history?userId=...` is called. Returned cases are rendered in the history list. |  |  |
| UT-AHS-002 | caseToAlert() | Convert history case into alert-detail shape | Valid case object is passed into helper | Returned alert object contains mapped ID, status, timestamps, comments, and image fields required by `AlertDetailView.tsx`. |  |  |
| UT-AHS-003 | setSearch() | Search alert history | User types into the search field | Only case rows matching the search keyword remain visible. |  |  |
| UT-AHS-004 | setDateFilter() | Filter alert history by date range | User selects `today`, `week`, `month`, or `all` | Only cases inside the selected date window remain visible. |  |  |
| UT-AHS-005 | setSelectedAlert() | Open read-only case detail | User taps a history case | `AlertDetailView.tsx` opens in read-only mode with the selected case converted through `caseToAlert()`. |  |  |

### AuxiliaryProfile
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-APF-001 | useEffect() | Load auxiliary profile information | API request succeeds | `GET /api/data/profile` is called. Email, average reaction time, and resolved count are displayed. |  |  |
| UT-APF-002 | SectionHeader() | Expand and collapse profile sections | User taps the same section header twice | Section opens on first tap and closes on second tap. |  |  |
| UT-APF-003 | onChangePassword() | Open change-password flow from auxiliary profile | User taps `Change Password` | `onChangePassword()` is called once. Parent interface opens `ChangePasswordPage.tsx`. |  |  |
| UT-APF-004 | onLogout() | Log out from auxiliary profile | User taps `Logout` | `onLogout()` is called once. Parent session is cleared by the parent handler. |  |  |

## Operator Web Pages

### OperatorInterface
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-OIF-001 | handleNavigate() | Navigate between operator pages | User opens Dashboard, Live Alerts, Reports, User Management, Shift Management, or Settings | `activePage` updates and only the selected operator page is rendered in the main content area. |  |  |
| UT-OIF-002 | handleNavigate() | Open Live Alerts with a preselected alert | `handleNavigate('live-alerts', alertId)` is called | `activePage` becomes `live-alerts`, `initialAlertId` stores the given ID, and `LiveAlerts.tsx` receives that ID. |  |  |
| UT-OIF-003 | setCollapsed() | Collapse or expand the operator sidebar | User clicks the sidebar toggle | `collapsed` changes between `true` and `false`. Sidebar layout switches accordingly. |  |  |
| UT-OIF-004 | useInactivityLogout() | Show inactivity warning before auto logout | No activity occurs until warning timer expires | Warning modal appears. `secondsLeft` starts counting down from 300. |  |  |
| UT-OIF-005 | extendSession() | Extend session from inactivity warning | User clicks `Extend Session` | Warning modal closes and inactivity timers reset. Auto logout is canceled for the current cycle. |  |  |
| UT-OIF-006 | onLogout() | Auto logout after inactivity timeout | No activity occurs until full inactivity timeout expires | `onLogout()` is called once. Parent app clears session and returns to login flow. |  |  |

### Dashboard
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-DSH-001 | fetchDashboard() | Load dashboard data for default range | Page loads with default selected range | `GET /operator/dashboard` is called. KPI cards, charts, and recent alerts render from returned data. |  |  |
| UT-DSH-002 | fetchDashboard() | Reload dashboard data for another range | User selects `today`, `yesterday`, `7 days`, `30 days`, or custom dates | A new dashboard request is sent with the correct query parameters. The view re-renders using the returned range-specific data. |  |  |
| UT-DSH-003 | getSubtitle() | Build dashboard subtitle for selected range | Each supported range is selected | Subtitle text matches the selected range and uses correctly formatted dates. |  |  |
| UT-DSH-004 | setExpandedId() | Expand a recent alert row | User clicks one recent alert row | `expandedId` is set to that alert's ID and the detail section opens below the row. |  |  |
| UT-DSH-004 | setExpandedId() | Expand a recent alert row | User clicks the same alert row again | `expandedId` becomes `null` and the detail section closes. |  |  |
| UT-DSH-005 | setAlertPage() | Paginate recent alerts | User clicks next, previous, or a page number | `alertPage` updates and the visible recent-alert rows change to the selected page. |  |  |
| UT-DSH-006 | onNavigate() | Open full Live Alerts page from dashboard | User clicks `View All` or equivalent navigation action | `onNavigate('live-alerts')` is called once. Parent interface switches to Live Alerts. |  |  |

### LiveAlerts
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-LVA-001 | fetchAlerts() | Load live alerts and support data | API request succeeds | Live alerts endpoint is called. `alerts`, `lines`, `stationsByLine`, `stats`, and `lastRefresh` update. Cards and counters are rendered. |  |  |
| UT-LVA-002 | useEffect() | Auto-open alert passed from dashboard | `initialAlertId` matches one loaded alert | That alert is stored in `selectedAlert`, its detail panel opens, and `onClearInitial()` is called. |  |  |
| UT-LVA-003 | handleLineChange() | Change line filter and reset station filter | User selects a different line | `lineFilter` updates and `stationFilter` resets to `all`. Station options become line-specific again. |  |  |
| UT-LVA-004 | setSourceFilter()/setActiveFilter()/setStationFilter() | Filter live alerts list | User applies source, status, line, or station filters | Only alerts matching all active filters remain visible in the list. |  |  |
| UT-LVA-005 | openModal() | Open confirmation modal for alert action | User clicks Verify, Dismiss, or Escalate | `pendingAction` stores alert ID and action type. Confirmation modal opens. |  |  |
| UT-LVA-006 | handleModalConfirm() | Confirm Verify action | Verify request succeeds | Alert action endpoint is called. Matching alert updates to verified state. Stats counters adjust. Modal closes. |  |  |
| UT-LVA-007 | handleModalConfirm() | Confirm Dismiss or Escalate action | Dismiss or escalate request succeeds | Matching alert updates to the selected status. Selected alert detail also updates. Escalated alerts store timestamp in `escalatedAt`. |  |  |
| UT-LVA-008 | setLightboxUrl() | Open and close alert image lightbox | User opens and closes image preview | Clicking image opens lightbox. Clicking backdrop or close control clears `lightboxUrl` and removes the overlay. |  |  |

### Reports
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-RPT-001 | useEffect() | Load monthly report data on page load | Initial report request succeeds | `GET /operator/reports` is called. `data`, `months`, and `selectedMonth` are initialized. Charts and summary cards render. |  |  |
| UT-RPT-002 | fetchReport() | Load report for another month | User chooses another month from picker | `GET /operator/reports?year=...&month=...` is called. Report dataset changes to the selected month. |  |  |
| UT-RPT-003 | useEffect() | Request AI summary for report | AI summary request succeeds | `POST /ai/report-summary` is called. Summary text is rendered. `aiSummaryLoading` ends. |  |  |
| UT-RPT-003 | useEffect() | Request AI summary for report | AI summary request fails | `aiSummaryError` becomes `true`. Main report page remains usable and visible. |  |  |
| UT-RPT-004 | setActiveTab() | Switch between Overview, Incidents, and Trends | User clicks another report tab | `activeTab` updates and only that tab's content panel is shown. |  |  |
| UT-RPT-005 | exportCSV() | Export incident data to CSV | User clicks `Export CSV` | CSV file is generated with headers and currently filtered incident rows, then browser download starts. |  |  |
| UT-RPT-006 | downloadPDF() | Export report as PDF | User clicks `Download PDF` | PDF generation begins, report sections are captured, download is triggered, and `isPdfGenerating` returns to `false` after completion. |  |  |
| UT-RPT-007 | setSearch()/setStatusFilter()/setSourceFilter()/setLineFilter()/setTrainFilter() | Filter incident report table | User changes one or more table filters | Table rows are reduced to only incidents matching all active filters. Pagination resets to page 1. |  |  |

### UserManagement
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-UMG-001 | fetchUsers() | Load operator user list | API request succeeds | `GET /operator/users` is called. User table rows render from returned users. `loading` becomes `false`. |  |  |
| UT-UMG-002 | mapToBackendStatus() | Map UI actions to backend status values | Action is approve, reject, suspend, or reactivate | Helper returns the exact backend status value required by the update-status API. |  |  |
| UT-UMG-003 | allowedTransitions() | Determine valid actions per current user status | Current status is pending, active, suspended, or rejected | Only valid transition actions are shown for that user row. Invalid actions are not shown. |  |  |
| UT-UMG-004 | handleStatusChange() | Change one user's status | Status update request succeeds | `POST /operator/users/{userId}/status` is called. Matching user row updates to the new status. Success toast appears. |  |  |
| UT-UMG-004 | handleStatusChange() | Change one user's status | Status update request fails | Error toast appears. User row remains in previous status. |  |  |
| UT-UMG-005 | handleUserUpload() | Import users from file | Upload request succeeds | `POST /operator/users/import` is called. Success toast appears. User list is refreshed. |  |  |
| UT-UMG-005 | handleUserUpload() | Import users from file | Upload request fails | Error toast appears. Uploading state ends. User list remains unchanged. |  |  |
| UT-UMG-006 | downloadUserTemplate() | Download user import template | User clicks template action | Template file download is triggered with the expected user-import columns. |  |  |
| UT-UMG-007 | setSearch()/setRoleFilter()/setStatusFilter() | Filter user table | User changes search, role, or status filter | Only user rows matching all selected filters remain visible in the table. |  |  |

### ShiftManagement
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-SHM-001 | fetchShifts() | Load auxiliary shift assignments | API request succeeds | `GET /operator/shifts` is called. Shift table rows render from returned schedule data. |  |  |
| UT-SHM-002 | getShiftStatus() | Calculate status of a shift | Shift time is upcoming, currently active, completed, or overnight | Helper returns `upcoming`, `in_progress`, or `completed` correctly for all supported timing cases. |  |  |
| UT-SHM-003 | handleLineChange() | Change line filter | User selects a different line | `filterLine` updates and `filterStation` resets so station options stay valid for the new line. |  |  |
| UT-SHM-004 | handleFileUpload() | Import shift schedule file | Upload request succeeds | `POST /operator/shifts/import` is called. Success toast appears. Shift list reloads. |  |  |
| UT-SHM-004 | handleFileUpload() | Import shift schedule file | Upload request fails | Error toast appears. Uploading state ends. Existing shift list remains visible. |  |  |
| UT-SHM-005 | downloadTemplate() | Download shift import template | User clicks template action | Template file download starts with the expected shift-import columns. |  |  |
| UT-SHM-006 | setSearch()/setFilterLine()/setFilterStation()/setFilterShift()/setFilterStatus() | Filter shift table | User changes search and/or dropdown filters | Only schedule rows matching all active filters remain visible. |  |  |

### Settings
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-SET-001 | useEffect() | Load operator settings from backend | API request succeeds | `GET /operator/settings` is called. `soundAlerts` and `timeFormat` controls reflect the returned values. |  |  |
| UT-SET-002 | setSoundAlerts() | Change operator sound-alert preference | User selects another sound-alert option | `soundAlerts` updates immediately and selected styling moves to the chosen option. |  |  |
| UT-SET-003 | setTimeFormat() | Change operator time format | User selects `12h` or `24h` | `timeFormat` updates immediately and the chosen option becomes active in the UI. |  |  |
| UT-SET-004 | handleSave() | Save operator settings | Save request succeeds | `POST /operator/settings` is called. `TimeContext` and `localStorage` are updated. `isSaving` returns to `false`. |  |  |
| UT-SET-004 | handleSave() | Save operator settings | Save request fails | `isSaving` still returns to `false`. The page stays open and does not crash. |  |  |
| UT-SET-005 | onNavigate() | Open change-password screen from settings | User clicks change-password action | `onNavigate('change-password')` is called once. Parent operator interface switches to `ChangePasswordPage.tsx`. |  |  |

## Offline Page

### OfflinePage
| Test Case ID | Function Name | Test Description | Test Conditions | Expected Results | Actual Results | Pass/Fail |
|---|---|---|---|---|---|---|
| UT-OFF-001 | OfflinePage() | Render offline fallback page | App is offline and OfflinePage is rendered | Offline title, explanation text, and retry button are visible without requiring any API response. |  |  |
| UT-OFF-002 | window.location.reload() | Retry loading the app from offline page | User clicks retry button | `window.location.reload()` is called once. |  |  |
| UT-OFF-003 | cached navigation links | Keep offline page usable without backend access | No network is available | Page remains visible and usable as a static fallback screen. It does not crash due to missing API data. |  |  |
