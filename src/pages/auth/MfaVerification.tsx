import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCwIcon } from 'lucide-react';

export interface MfaVerificationProps {
  email: string;
  phone?: string;
  onVerify: (otp: string) => Promise<boolean>;
  onBack: () => void;
  accentColor?: string;
}

export function MfaVerification({
  email,
  phone,
  onVerify,
  onBack,
  accentColor = '#0B4F6C',
}: MfaVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setTimeout(() => otpRefs.current[0]?.focus(), 300);
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = cleaned;
    setOtp(next);
    setOtpError('');
    if (cleaned && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    if (cleaned && index === 5) {
      const full = [...next].join('');
      if (full.length === 6) handleOtpSubmit(full);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      handleOtpSubmit(pasted);
    }
  };

  const handleOtpSubmit = async (code?: string) => {
    const fullOtp = code ?? otp.join('');
    if (fullOtp.length < 6) {
      setOtpError('Please enter the full 6-digit code.');
      return;
    }
    setIsLoading(true);
    const success = await onVerify(fullOtp);
    setIsLoading(false);

    if (!success) {
      setOtpError('Incorrect code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    }
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    setResendCooldown(30);
    setTimeout(() => otpRefs.current[0]?.focus(), 50);
  };

  const maskedEmail = email.includes('@') ? email.replace(
    /(.{2})(.*)(@.*)/,
    (_, a, b, c) => a + '•'.repeat(b.length) + c
  ) : 'your email';

  const Spinner = () => (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );

  return (
    <motion.div
      key="mfa"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="p-5 sm:p-8"
    >
      <div className="mb-5 sm:mb-7">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
          Verify {phone ? 'Phone & Email' : 'Email'}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Enter the 6-digit code sent to{' '}
          <span className="font-medium text-gray-600">{maskedEmail}</span>
          {phone ? ' and your phone.' : '.'}
        </p>
      </div>

      <div
        className="flex gap-1.5 sm:gap-2.5 justify-center mb-5"
        onPaste={handleOtpPaste}
        role="group"
      >
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { otpRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(i, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(i, e)}
            className={`
              w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-xl border-2 transition-all duration-150
              focus:outline-none focus:ring-0
              ${otpError ? 'border-red-300 bg-red-50 text-red-600' : digit ? 'border-[#0B4F6C] bg-[#EBF4F8] text-[#0B4F6C]' : 'border-gray-200 bg-gray-50 text-gray-900'}
            `}
            disabled={isLoading}
          />
        ))}
      </div>

      <AnimatePresence>
        {otpError && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4 text-center"
          >
            {otpError}
          </motion.p>
        )}
      </AnimatePresence>

      <button
        onClick={() => handleOtpSubmit()}
        disabled={isLoading || otp.join('').length < 6}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: accentColor }}
      >
        {isLoading
          ? <span className="flex items-center gap-2"><Spinner /> Verifying…</span>
          : <> Verify Code</>}
      </button>

      <div className="flex items-center justify-between mt-4 sm:mt-5">
        <button
          onClick={onBack}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: resendCooldown > 0 ? undefined : accentColor }}
        >
          <RefreshCwIcon size={12} />
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
        </button>
      </div>
    </motion.div>
  );
}
