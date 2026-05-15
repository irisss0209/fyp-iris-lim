import React, { useEffect, useState } from 'react';
import {
  LockIcon,
  MailIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowLeftIcon,
  CheckCircle2Icon
} from 'lucide-react';
import { MfaVerification } from './MfaVerification';
import { Spinner } from '../../components/Spinner';

interface ForgotPasswordPageProps {
  onBack: () => void;
}

type ForgotStep = 'email' | 'otp' | 'password' | 'success';

export function ForgotPasswordPage({ onBack }: ForgotPasswordPageProps) {
  const [step, setStep] = useState<ForgotStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [maskedDestination, setMaskedDestination] = useState('');
  const [verifiedCode, setVerifiedCode] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setError('Please enter your email.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/forgot-password/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized }),
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setChallengeId(data.challengeId);
      setMaskedDestination(data.maskedDestination);
      setStep('otp');
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

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
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          challengeId,
          code: verifiedCode,
          newPassword: password
        }),
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to reset password. Please try again.');
        return;
      }

      setStep('success');
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (code: string): Promise<boolean> => {
    // Validate the OTP format client-side; the code is verified by the server
    // when the user submits their new password via handlePasswordSubmit.
    if (!code || code.trim().length === 0) return false;
    setVerifiedCode(code.trim());
    setStep('password');
    return true;
  };

  const handleResendOtp = async (): Promise<void> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/forgot-password/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) setChallengeId(data.challengeId);
    } catch {
      // silently fail — MfaVerification handles the resend countdown
    }
  };

  useEffect(() => {
    if (step === 'success') {
      const t = setTimeout(() => onBack(), 2000);
      return () => clearTimeout(t);
    }
  }, [step, onBack]);

  if (step === 'success') {
    return (
      <div className="min-h-screen w-full bg-[#FAF9F5] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl text-center border border-gray-100">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2Icon size={40} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Password reset successfully!</h1>
          <p className="text-gray-500 mb-8">Please login with your new password. Redirecting...</p>
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
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
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
          <div className="text-xs text-gray-400">For Safer Commute</div>
        </div>
      </div>

      <div className="w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {step === 'email' && (
          <div className="p-5 sm:p-8">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors mb-6 text-sm font-semibold"
            >
              <ArrowLeftIcon size={16} />
              Back to login
            </button>

            <div className="mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Forgot password?</h1>
              <p className="text-sm text-gray-400 mt-1">Enter your email and we'll send you a reset code.</p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="fp-email" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <MailIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    id="fp-email"
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
                {isLoading
                  ? <span className="flex items-center gap-2"><Spinner /></span>
                  : 'Send Reset Code'}
              </button>
            </form>
          </div>
        )}

        {step === 'password' && (
          <div className="p-5 sm:p-8">
            <button
              onClick={() => { setStep('email'); setError(''); }}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors mb-6 text-sm font-semibold"
            >
              <ArrowLeftIcon size={16} />
              Back
            </button>

            <div className="mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">New password</h1>
              <p className="text-sm text-gray-400 mt-1">
                Choose a new password for{' '}
                <span className="text-[#0B4F6C] font-bold">{email}</span>
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3 sm:space-y-4" noValidate>
              <div>
                <label htmlFor="fp-password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <LockIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    id="fp-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-11 py-2.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/25 focus:border-[#0B4F6C] transition-colors placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="fp-confirm-password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <LockIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    id="fp-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-11 py-2.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/25 focus:border-[#0B4F6C] transition-colors placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
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
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200"
                style={{ backgroundColor: '#0B4F6C' }}
              >
                Continue
              </button>
            </form>
          </div>
        )}

        {step === 'otp' && (
          <MfaVerification
            email={email}
            onVerify={verifyOtp}
            onBack={() => setStep('email')}
            accentColor="#0B4F6C"
            method="email_otp"
            destinationHint={maskedDestination}
            onResend={handleResendOtp}
          />
        )}

        {step !== 'otp' && step !== 'password' && (
          <div className="px-5 sm:px-8 py-3 sm:py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-center">
            <span className="text-xs text-gray-400">
              Secured with end-to-end encryption - Railly v2.1
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
