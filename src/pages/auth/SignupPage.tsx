import React, { useState } from 'react';
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
} from 'lucide-react';
import { MfaVerification } from './MfaVerification';

import { UserSession } from '../../types/session';
import { usePasswordToggle } from '../../hooks/usePasswordToggle';
import { Spinner } from '../../components/Spinner';
import { validatePassword } from '../../utils/validatePassword';

type SignupStep = 'details' | 'mfa' | 'success';

interface SignupPageProps {
  onSignupSuccess: (session: UserSession) => void;
  onNavigateLogin: () => void;
}

const ACCENT = '#0B4F6C';

export function SignupPage({ onSignupSuccess, onNavigateLogin }: SignupPageProps) {
  const [step, setStep] = useState<SignupStep>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { isVisible, toggle } = usePasswordToggle(['reg', 'confirm']);
  const [isLoading, setIsLoading] = useState(false);
  const [signupChallengeId, setSignupChallengeId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      setError('Please fill out all fields to create an account.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const pwError = validatePassword(password);
    if (pwError) { setError(pwError); return; }

    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/signup/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail, password }),
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to start signup.');
        return;
      }

      setSignupChallengeId(data.challengeId);
      setStep('mfa');
    } catch {
      setError('Unable to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (code: string): Promise<boolean> => {
    if (!signupChallengeId) return false;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/signup/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          code,
          challengeId: signupChallengeId
        }),
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Verification failed.');
        return false;
      }

      // Success! Account created and logged in.
      setStep('success');

      const session: UserSession = {
        userId: data.userId,
        userName: data.userName,
        email: data.email,
        role: data.role,
        token: data.token,
        description: data.description
      };

      // Delay success redirect slightly for animation
      setTimeout(() => onSignupSuccess(session), 1500);
      return true;
    } catch {
      setError('Connection error during verification.');
      return false;
    }
  };

  const handleResendOtp = async () => {
    setError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/signup/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to resend code.');
        return;
      }
      setSignupChallengeId(data.challengeId);
    } catch {
      setError('Unable to connect to server.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF9F5] flex flex-col items-center justify-center px-4 py-8 sm:py-12">
      {/* Logo */}
      <div
        className="flex items-center gap-3 mb-6 sm:mb-8"
      >
        <div
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex-shrink-0"
          style={{
            backgroundImage: 'url(https://railly.s3.ap-southeast-1.amazonaws.com/assets/Railly_logo.png)',
            backgroundSize: '160%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
          aria-label="Railly"
        />
        <div>
          <div className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Railly</div>
          <div className="text-xs text-gray-400">Integrated Transit Safety</div>
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
      >
          {/* ── STEP 1: Details ── */}
          {step === 'details' && (
            <div
              className="p-5 sm:p-8"
            >
              <div className="mb-5 sm:mb-7">

                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                  Sign Up
                </h1>
              </div>

              <form onSubmit={handleSignupSubmit} className="space-y-3 sm:space-y-4" noValidate>
                <div>
                  <label htmlFor="reg-name" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(''); }}
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/25 focus:border-[#0B4F6C] transition-colors placeholder-gray-300"
                  />
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <MailIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      id="reg-email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder="Enter your email"
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-2.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/25 focus:border-[#0B4F6C] transition-colors placeholder-gray-300"
                    />
                  </div>
                </div>


                <div>
                  <label htmlFor="reg-password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <LockIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      id="reg-password"
                      type={isVisible('reg') ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      placeholder="Enter your password"
                      autoComplete="new-password"
                      className="w-full pl-10 pr-11 py-2.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/25 focus:border-[#0B4F6C] transition-colors placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => toggle('reg')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={isVisible('reg') ? 'Hide password' : 'Show password'}
                    >
                      {isVisible('reg') ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-confirm-password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <LockIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      id="reg-confirm-password"
                      type={isVisible('confirm') ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      className="w-full pl-10 pr-11 py-2.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/25 focus:border-[#0B4F6C] transition-colors placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => toggle('confirm')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={isVisible('confirm') ? 'Hide password' : 'Show password'}
                    >
                      {isVisible('confirm') ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p
                    className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                  style={{ backgroundColor: ACCENT }}
                >
                  {isLoading
                    ? <span className="flex items-center gap-2"><Spinner /> </span>
                    : <>Sign Up</>}
                </button>

                <div className="mt-5 text-center">
                  <span className="text-sm text-gray-500">Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => { onNavigateLogin(); setError(''); }}
                    className="text-sm font-semibold hover:underline transition-colors focus:outline-none"
                    style={{ color: ACCENT }}
                  >
                    Log in
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── STEP 2: MFA ── */}
          {step === 'mfa' && (
            <MfaVerification
              email={email}
              onVerify={verifyOtp}
              onBack={() => setStep('details')}
              accentColor={ACCENT}
              onResend={handleResendOtp}
            />
          )}

          {/* ── STEP 3: Success ── */}
          {step === 'success' && (
            <div
              className="p-8 flex flex-col items-center justify-center text-center py-12 sm:py-14"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-1">Account Created</h2>
              <p className="text-sm text-gray-400">
                Directing to app
              </p>
              <div className="mt-6 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: ACCENT, animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

        {/* Footer */}
        {step !== 'success' && (
          <div className="px-5 sm:px-8 py-3 sm:py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-1.5">
            <span className="text-xs text-gray-400">
              Secured with end-to-end encryption · Railly v2.1
            </span>
          </div>
        )}
      </div>

      {/* Step indicator */}
      {step !== 'success' && (
        <div className="flex items-center gap-2 mt-5 sm:mt-6">
          <div className="w-2 h-2 rounded-full transition-colors duration-300"
            style={{ backgroundColor: step === 'details' ? ACCENT : '#CBD5E0' }} />
          <div className="w-2 h-2 rounded-full transition-colors duration-300"
            style={{ backgroundColor: step === 'mfa' ? ACCENT : '#CBD5E0' }} />
        </div>
      )}
    </div>
  );
}
