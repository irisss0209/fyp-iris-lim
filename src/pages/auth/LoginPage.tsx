import React, { useEffect, useState } from 'react';
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
} from 'lucide-react';
import { MfaVerification } from './MfaVerification';
import { MfaSetup } from './MfaSetup';
import { UserSession } from '../../types/session';
import { usePasswordToggle } from '../../hooks/usePasswordToggle';
import { Spinner } from '../../components/Spinner';

type AuthStep = 'account' | 'password' | 'mfa' | 'mfa_setup' | 'success';

interface PendingMfaState {
  email: string;
  mfaMethod: 'email_otp' | 'google_authenticator';
  challengeId?: string;
  maskedDestination?: string;
  debugOtp?: string | null;
  isSetup?: boolean;
}

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
  onNavigateSignup: () => void;
  onNavigateSetupPassword: (email: string) => void;
  onNavigateForgotPassword: () => void;
  initialMfaState?: PendingMfaState | null;
  initialEmail?: string;
}

export function LoginPage({
  onLoginSuccess,
  onNavigateSignup,
  onNavigateSetupPassword,
  onNavigateForgotPassword,
  initialMfaState,
  initialEmail
}: LoginPageProps) {
  const [step, setStep] = useState<AuthStep>('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { isVisible, toggle } = usePasswordToggle(['login']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [resolvedUser, setResolvedUser] = useState<UserSession | null>(null);
  const [pendingMfa, setPendingMfa] = useState<PendingMfaState | null>(null);
  const [accountRole, setAccountRole] = useState<'operator' | 'passenger' | 'auxiliary' | null>(null);

  useEffect(() => {
    if (step === 'success' && resolvedUser) {
      const t = setTimeout(() => onLoginSuccess(resolvedUser), 1400);
      return () => clearTimeout(t);
    }
  }, [step, resolvedUser, onLoginSuccess]);

  useEffect(() => {
    if (initialMfaState) {
      setPendingMfa(initialMfaState);
      setEmail(initialEmail || initialMfaState.email);
      if (initialMfaState.mfaMethod === 'google_authenticator' && initialMfaState.isSetup === false) {
        setStep('mfa_setup');
      } else {
        setStep('mfa');
      }
    }
  }, [initialMfaState, initialEmail]);

  const checkAccountAndContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Please enter your email first.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/check-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to check account right now.');
        return;
      }

      if (!data.exists) {
        setIsRedirecting(true);
        setTimeout(() => {
          onNavigateSignup();
        }, 2000);
        return;
      }

      if (data.isActive === false) {
        setError('Account is not active.');
        return;
      }

      if (data.requiresSetup) {
        onNavigateSetupPassword(normalizedEmail);
        return;
      }

      setAccountRole(data.role ?? null);
      setStep('password');
    } catch {
      setError('Unable to connect to the server. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    if (!normalizedEmail || !trimmedPassword) {
      setError('Please fill in your password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password: trimmedPassword }),
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Invalid login details.');
        return;
      }

      if (data.requiresSetup) {
        onNavigateSetupPassword(normalizedEmail);
        return;
      }

      // Passenger: backend returns session directly (no second factor)
      if (data.userId) {
        setResolvedUser(data);
        setStep('success');
        return;
      }

      setPendingMfa({
        email: normalizedEmail,
        mfaMethod: data.mfaMethod === 'google_authenticator' ? 'google_authenticator' : 'email_otp',
        challengeId: data.challengeId,
        maskedDestination: data.maskedDestination,
        debugOtp: data.debugOtp,
        isSetup: data.isSetup
      });

      if (data.mfaMethod === 'google_authenticator' && data.isSetup === false) {
        setStep('mfa_setup');
      } else {
        setStep('mfa');
      }
    } catch {
      setError('Unable to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Please enter your email.');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/login/start-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Unable to start OTP login.');
        return;
      }

      setPendingMfa({
        email: normalizedEmail,
        mfaMethod: 'email_otp',
        challengeId: data.challengeId,
        maskedDestination: data.maskedDestination,
        debugOtp: data.debugOtp
      });
      setStep('mfa');
    } catch {
      setError('Unable to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (code: string): Promise<boolean> => {
    if (!pendingMfa) return false;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/login/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingMfa.email,
          code,
          challengeId: pendingMfa.challengeId
        }),
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok) {
        return false;
      }

      setResolvedUser(data);
      setStep('success');
      return true;
    } catch {
      return false;
    }
  };

  const handleResendOtp = async () => {
    if (!pendingMfa) return;
    setError('');
    try {
      // Re-trigger either password login or direct OTP login to get a new code
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/login/start-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingMfa.email }),
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to resend code.');
        return;
      }

      setPendingMfa({
        ...pendingMfa,
        challengeId: data.challengeId,
        maskedDestination: data.maskedDestination,
        debugOtp: data.debugOtp
      });
    } catch {
      setError('Unable to connect to server.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF9F5] flex flex-col items-center justify-center px-4 py-8 sm:py-12">
      {step !== 'success' ? (
        <>
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex-shrink-0"
              style={{
                backgroundImage: 'url(https://railly.s3.ap-southeast-1.amazonaws.com/assets/Railly_logo.png)',
                backgroundSize: '100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
              aria-label="Railly"
            />
            <div>
              <div className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Railly</div>
              <div className="text-xs text-gray-400">For Safer Commute</div>
            </div>
          </div>

          <div className="w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {step === 'account' && (
              <div key="account" className="p-5 sm:p-8">
                <div className="mb-5 sm:mb-7">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                    {isRedirecting ? 'Redirecting...' : 'Sign In'}
                  </h1>
                  <p className="text-sm text-gray-400 mt-1">
                    {isRedirecting
                      ? 'Account not found. Sending you to the sign up page...'
                      : 'Enter your email to continue'}
                  </p>
                </div>

                <form onSubmit={checkAccountAndContinue} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Email address
                    </label>
                    <div className="relative">
                      <MailIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        placeholder="Enter your email"
                        autoComplete="email"
                        className="w-full pl-10 pr-4 py-2.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/25 focus:border-[#0B4F6C] transition-colors placeholder-gray-300"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2" role="alert">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#0B4F6C' }}
                  >
                    {isLoading ? <span className="flex items-center gap-2"><Spinner /> </span> : <>Continue</>}
                  </button>

                  <div className="mt-4 text-center">
                    <span className="text-sm text-gray-500">Don&apos;t have an account? </span>
                    <button
                      type="button"
                      onClick={onNavigateSignup}
                      className="text-sm font-semibold hover:underline transition-colors focus:outline-none"
                      style={{ color: '#0B4F6C' }}
                    >
                      Sign up here
                    </button>
                  </div>
                </form>
              </div>
            )}

            {step === 'password' && (
              <div key="password" className="p-5 sm:p-8">
                <div className="mb-6 sm:mb-8">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Welcome back</h1>
                  <p className="text-sm text-gray-400 mt-1">{email}</p>
                </div>

                <form onSubmit={loginWithPassword} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <LockIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        id="password"
                        type={isVisible('login') ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className="w-full pl-10 pr-11 py-2.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/25 focus:border-[#0B4F6C] transition-colors placeholder-gray-400"
                      />
                      <button
                        type="button"
                        onClick={() => toggle('login')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={isVisible('login') ? 'Hide password' : 'Show password'}
                      >
                        {isVisible('login') ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2" role="alert">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#0B4F6C' }}
                  >
                    {isLoading ? <span className="flex items-center gap-2"><Spinner /> Signing in...</span> : <>Sign In</>}
                  </button>

                  {accountRole === 'passenger' && (
                    <button
                      type="button"
                      onClick={loginWithOtp}
                      disabled={isLoading}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                    >
                      Login with OTP
                    </button>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => { setStep('account'); setPassword(''); setError(''); }}
                      className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Use Another Email
                    </button>
                    <button
                      type="button"
                      onClick={onNavigateForgotPassword}
                      className="text-sm font-semibold hover:underline transition-colors focus:outline-none"
                      style={{ color: '#0B4F6C' }}
                    >
                      Forgot password?
                    </button>
                  </div>
                </form>
              </div>
            )}

            {step === 'mfa' && (
              <MfaVerification
                email={pendingMfa?.email || email}
                onVerify={verifyOtp}
                onBack={() => {
                  setStep('password');
                  setPendingMfa(null);
                }}
                accentColor="#0B4F6C"
                method={pendingMfa?.mfaMethod}
                destinationHint={pendingMfa?.maskedDestination}
                onResend={handleResendOtp}
              />
            )}

            {step === 'mfa_setup' && (
              <MfaSetup
                email={pendingMfa?.email || email}
                onActivate={() => {
                  setStep('mfa');
                  setPendingMfa(prev => prev ? { ...prev, isSetup: true } : null);
                }}
                onBack={() => {
                  setStep('password');
                  setPendingMfa(null);
                }}
                accentColor="#0B4F6C"
              />
            )}

            <div className="px-5 sm:px-8 py-3 sm:py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-1.5">
              <span className="text-xs text-gray-400">
                Secured with end-to-end encryption - Railly v2.1
              </span>
            </div>
          </div>
        </>
      ) : (
        <div
          key="success"
          className="flex flex-col items-center justify-center text-center"
        >
          <div className="mb-4 text-[#0B4F6C]">
            <Spinner />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Identity Verified</h2>
          <p className="text-sm text-gray-400">
            Launching {resolvedUser?.description ?? 'your dashboard'}...
          </p>
        </div>
      )}
    </div>
  );
}
