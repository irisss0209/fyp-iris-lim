import React, { useState, useEffect, useRef } from 'react';
import { RefreshCwIcon } from 'lucide-react';

export interface MfaVerificationProps {
  email: string;
  phone?: string;
  onVerify: (otp: string) => Promise<boolean>;
  onBack: () => void;
  accentColor?: string;
  method?: 'email_otp' | 'google_authenticator';
  destinationHint?: string;
  onResend?: () => Promise<void>;
}

export function MfaVerification({
  email,
  onVerify,
  onBack,
  accentColor = '#0B4F6C',
  method = 'email_otp',
  destinationHint,
  onResend,
}: MfaVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleResendClick = async () => {
    if (countdown > 0 || !onResend) return;
    setIsResending(true);
    try {
      await onResend();
      setCountdown(60);
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    setTimeout(() => otpRefs.current[0]?.focus(), 300);
  }, []);

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
    setIsVerifying(true);
    const success = await onVerify(fullOtp);
    setIsVerifying(false);

    if (!success) {
      setOtpError('Incorrect code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    }
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
    <div
      className="p-5 sm:p-8"
    >
      <div className="mb-5 sm:mb-7">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
          {method === 'google_authenticator' ? 'Google Authenticator' : 'Verify Email'}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {method === 'google_authenticator' ? (
            <>Enter the 6-digit code from your Google Authenticator app.</>
          ) : (
            <>
              Enter the 6-digit code sent to{' '}
              <span className="font-medium text-gray-600">{destinationHint || maskedEmail}</span>
            </>
          )}
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
            disabled={isVerifying}
          />
        ))}
      </div>

      {otpError && (
        <p
          className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4 text-center"
        >
          {otpError}
        </p>
      )}

      <button
        onClick={() => handleOtpSubmit()}
        disabled={isVerifying || otp.join('').length < 6}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: accentColor }}
      >
        {isVerifying ? <Spinner /> : 'Verify Account'}
      </button>

      {method === 'email_otp' && onResend && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Didn&apos;t receive the code?{' '}
            {countdown > 0 ? (
              <span className="font-medium text-gray-400">Resend in {countdown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResendClick}
                disabled={isResending}
                className="font-bold text-[#0B4F6C] hover:underline disabled:opacity-50"
              >
                {isResending ? 'Sending...' : 'Resend Code'}
              </button>
            )}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 sm:mt-5">
        <button
          onClick={onBack}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Back
        </button>

      </div>
    </div>
  );
}
