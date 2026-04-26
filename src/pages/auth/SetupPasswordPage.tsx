import React, { useState } from 'react';
import {
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowLeftIcon,
  CheckCircle2Icon
} from 'lucide-react';

import { MfaVerification } from './MfaVerification';
import { MfaSetup } from './MfaSetup';

interface SetupPasswordPageProps {
  email: string;
  onSuccess: (session: any) => void;
  onBack: () => void;
}

type SetupStep = 'password' | 'mfa' | 'mfa_setup' | 'success';

export function SetupPasswordPage({ email, onSuccess, onBack }: SetupPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<SetupStep>('password');
  const [pendingMfa, setPendingMfa] = useState<any>(null);
  const [resolvedUser, setResolvedUser] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Password strength validation
    const missingRequirements: string[] = [];

    if (password.length < 8) missingRequirements.push('at least 8 characters');
    if (!/[A-Z]/.test(password)) missingRequirements.push('one uppercase letter');
    if (!/[a-z]/.test(password)) missingRequirements.push('one lowercase letter');
    if (!/[0-9]/.test(password)) missingRequirements.push('one number');
    if (!/[!@#$%^&*(),.?":{}|<>_~-]/.test(password)) missingRequirements.push('one special character');

    if (missingRequirements.length > 0) {
      setError(`Password must contain: ${missingRequirements.join(', ')}.`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5293/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), password })
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to set password.');
        return;
      }

      setPendingMfa(data);
      
      if (data.requiresMfa) {
        if (data.mfaMethod === 'google_authenticator' && data.isSetup === false) {
          setStep('mfa_setup');
        } else {
          setStep('mfa');
        }
      } else {
        // This case shouldn't happen for staff roles based on current requirements
        setResolvedUser(data);
        setStep('success');
      }
    } catch {
      setError('Connection error. Please ensure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (code: string): Promise<boolean> => {
    if (!pendingMfa) return false;
    try {
      const response = await fetch('http://localhost:5293/api/auth/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingMfa.email,
          code,
          challengeId: pendingMfa.challengeId
        })
      });
      const data = await response.json();
      if (!response.ok) return false;

      setResolvedUser(data);
      setStep('success');
      return true;
    } catch {
      return false;
    }
  };

  const handleResendOtp = async () => {
    // Re-trigger the setup password flow to generate a new challenge that includes the password metadata
    handleSubmit({ preventDefault: () => { } } as React.FormEvent);
  };

  if (step === 'success' && resolvedUser) {
    setTimeout(() => onSuccess(resolvedUser), 1500);
    return (
      <div className="min-h-screen w-full bg-[#FAF9F5] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl text-center border border-gray-100">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2Icon size={40} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Setup Complete!</h1>
          <p className="text-gray-500 mb-8">Redirecting you to your dashboard...</p>
          <div className="flex justify-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#FAF9F5] flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div

        className="flex items-center gap-3 mb-6 sm:mb-8"
      >
        <div
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex-shrink-0"
          style={{
            backgroundImage: 'url(/Railly_logo.png)',
            backgroundSize: '100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
          aria-label="Railly"
        />
        <div>
          <div className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Railly</div>
          <div className="text-xs text-gray-400">Admin Portal</div>
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
      >
        {step === 'password' && (
          <div className="p-8 sm:p-10">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors mb-6 text-sm font-semibold"
            >
              <ArrowLeftIcon size={16} />
              Back to login
            </button>

            <div className="mb-8">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                Set your password</h1>
              <p className="text-sm text-gray-400 mt-2">
                Welcome aboard! Since this is your first time, please secure your account <span className="text-[#0B4F6C] font-bold">({email})</span> with a new password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4" noValidate>
              {/* Password */}
              <div>
                <label htmlFor="reg-password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <LockIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter your password"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-11 py-2.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/25 focus:border-[#0B4F6C] transition-colors placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="reg-confirm-password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <LockIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-11 py-2.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/25 focus:border-[#0B4F6C] transition-colors placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                  </button>
                </div>
              </div>

              {/* Error */}
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
                style={{ backgroundColor: '#0B4F6C' }}
              >
                {isLoading
                  ? <span className="flex items-center gap-2"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg> Saving…</span>
                  : <>Activate Account</>}
              </button>
            </form>
          </div>
        )}

        {step === 'mfa' && (
          <MfaVerification
            email={pendingMfa?.email || email}
            onVerify={verifyOtp}
            onBack={() => setStep('password')}
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
              setPendingMfa((prev: any) => prev ? { ...prev, isSetup: true } : null);
            }}
            onBack={() => setStep('password')}
            accentColor="#0B4F6C"
            challengeId={pendingMfa?.challengeId}
          />
        )}

        {step === 'password' && (
          <div className="px-5 sm:px-8 py-3 sm:py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-1.5">
            <span className="text-xs text-gray-400">
              Secured with end-to-end encryption - Railly v2.1
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
