import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
} from 'lucide-react';
import { MfaVerification } from './MfaVerification';

type AuthStep = 'credentials' | 'phone' | 'mfa' | 'success';
type UserRole = 'command' | 'police' | 'saferide';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole) => void;
  onNavigateSignup: () => void;
}


const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);


export function LoginPage({ onLoginSuccess, onNavigateSignup }: LoginPageProps) {
  const [step, setStep] = useState<AuthStep>('credentials');
  const [resolvedUser, setResolvedUser] = useState<{ otp: string; role: UserRole; description: string } | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (step === 'success' && resolvedUser) {
      const t = setTimeout(() => onLoginSuccess(resolvedUser.role), 1400);
      return () => clearTimeout(t);
    }
  }, [step, onLoginSuccess, resolvedUser]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter your email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5293/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid email or password. Please try again.');
        setIsLoading(false);
        return;
      }

      setResolvedUser(data);
      setStep('mfa');
    } catch (err) {
      setError('Unable to connect to the server. Is the ASP.NET backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();

    if (!trimmedPhone || !trimmedPassword) {
      setError('Please enter your phone number and password.');
      return;
    }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setIsLoading(false);

    setError('Phone login is not currently supported through the mock database.');
    return;
  };

  const verifyOtp = async (code: string): Promise<boolean> => {
    await new Promise((r) => setTimeout(r, 800));

    if (resolvedUser && code === resolvedUser.otp) {
      setStep('success');
      return true;
    }
    return false;
  };

  const Spinner = () => (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );

  return (
    <div className="min-h-screen w-full bg-[#FAF9F5] flex flex-col items-center justify-center px-4 py-8 sm:py-12">

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
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
          <div className="text-xs text-gray-400">For Safer Commute</div>
        </div>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
        className="w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
      >
        <AnimatePresence mode="wait">

          {/* ── STEP 1: Credentials ── */}
          {step === 'credentials' && (
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="p-5 sm:p-8"
            >
              <div className="mb-5 sm:mb-7">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                  Sign In
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Enter your credentials
                </p>
              </div>

              <form onSubmit={handleCredentialsSubmit} className="space-y-3 sm:space-y-4" noValidate>
                {/* Email Input */}
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
                      aria-required="true"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-xs font-semibold text-gray-700">
                      Password
                    </label>
                    <button type="button" className="text-xs text-gray-400 mt-1 hover:text-gray-600 hover:underline focus:outline-none transition-colors">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <LockIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="w-full pl-10 pr-11 py-2.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/25 focus:border-[#0B4F6C] transition-colors placeholder-gray-400"
                      aria-required="true"
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

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
                      role="alert"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                  style={{ backgroundColor: '#0B4F6C' }}
                >
                  {isLoading
                    ? <span className="flex items-center gap-2"><Spinner /> Verifying…</span>
                    : <>Sign In</>}
                </button>

                {/* Google & Phone Sign In */}
                <div className="mt-4">
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink-0 mx-4 text-xs font-medium tracking-wider text-gray-400 uppercase">Or continue with</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-all duration-200"
                    >
                      <GoogleIcon />
                      Google
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStep('phone'); setError(''); setPassword(''); }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-all duration-200"
                    >
                      <PhoneIcon size={18} className="text-gray-500" />
                      Phone
                    </button>
                  </div>
                </div>

                {/* Sign up link for Email */}
                <div className="mt-5 text-center">
                  <span className="text-sm text-gray-500">Don't have an account? </span>
                  <button type="button" onClick={() => { onNavigateSignup(); setError(''); setPassword(''); }} className="text-sm font-semibold hover:underline transition-colors focus:outline-none" style={{ color: '#0B4F6C' }}>Sign up here</button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ── STEP 1.5: Phone Credentials ── */}
          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="p-5 sm:p-8"
            >
              <div className="mb-5 sm:mb-7">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                  Sign In
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Enter your phone number to continue
                </p>
              </div>

              <form onSubmit={handlePhoneSubmit} className="space-y-3 sm:space-y-4" noValidate>
                {/* Phone Input */}
                <div>
                  <label htmlFor="phone" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Phone number
                  </label>
                  <div className="flex border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#0B4F6C]/25 focus-within:border-[#0B4F6C] transition-colors bg-gray-50">
                    <div className="flex items-center justify-center px-3.5 bg-gray-100 border-r border-gray-200 text-sm font-medium text-gray-600 select-none">
                      +60
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setError(''); }}
                      placeholder="12-345 6789"
                      autoComplete="tel"
                      className="w-full pl-3 pr-4 py-2.5 text-sm text-gray-900 bg-transparent focus:outline-none placeholder-gray-300"
                      aria-required="true"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-xs font-semibold text-gray-700">
                      Password
                    </label>
                    <button type="button" className="text-xs text-gray-400 mt-1 hover:text-gray-600 hover:underline focus:outline-none transition-colors">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <LockIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="w-full pl-10 pr-11 py-2.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/25 focus:border-[#0B4F6C] transition-colors placeholder-gray-400"
                      aria-required="true"
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

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
                      role="alert"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                  style={{ backgroundColor: '#0B4F6C' }}
                >
                  {isLoading
                    ? <span className="flex items-center gap-2"><Spinner /> Verifying…</span>
                    : <>Sign In</>}
                </button>

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => { setStep('credentials'); setError(''); setPassword(''); }}
                    className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Login with Email
                  </button>
                </div>

                {/* Sign up link for Phone */}
                <div className="mt-5 text-center">
                  <span className="text-sm text-gray-500">Don't have an account? </span>
                  <button type="button" onClick={() => { onNavigateSignup(); setError(''); setPassword(''); }} className="text-sm font-semibold hover:underline transition-colors focus:outline-none" style={{ color: '#0B4F6C' }}>Sign up here</button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ── STEP 2: MFA ── */}
          {step === 'mfa' && (
            <MfaVerification
              email={resolvedUser?.role === 'command' || resolvedUser?.role === 'police' ? email : (email || phone || 'passenger')}
              phone={phone || undefined}
              onVerify={verifyOtp}
              onBack={() => {
                setStep('credentials');
                setResolvedUser(null);
              }}
              accentColor={'#0B4F6C'}
            />
          )}

          {/* ── STEP 3: Success ── */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="p-8 flex flex-col items-center justify-center text-center py-12 sm:py-14"
            >
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                style={{ backgroundColor: '#F0FBF6' }}
              >
                <CheckCircleIcon size={32} style={{ color: '#2D7A5D' }} />
              </motion.div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Identity Verified</h2>
              <p className="text-sm text-gray-400">
                Launching {resolvedUser?.description ?? 'your dashboard'}…
              </p>
              <div className="mt-6 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: '#0B4F6C' }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        {step !== 'success' && (
          <div className="px-5 sm:px-8 py-3 sm:py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-1.5">
            <span className="text-xs text-gray-400">
              Secured with end-to-end encryption · Railly v2.1
            </span>
          </div>
        )}
      </motion.div>

      {/* Step indicator */}
      {step !== 'success' && (
        <div className="flex items-center gap-2 mt-5 sm:mt-6">
          <div className="w-2 h-2 rounded-full transition-colors duration-300"
            style={{ backgroundColor: step === 'credentials' ? '#0B4F6C' : '#CBD5E0' }} />
          <div className="w-2 h-2 rounded-full transition-colors duration-300"
            style={{ backgroundColor: step === 'mfa' ? '#0B4F6C' : '#CBD5E0' }} />
        </div>
      )}
    </div>
  );
}