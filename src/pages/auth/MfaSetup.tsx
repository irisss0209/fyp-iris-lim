import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Copy, Check, ArrowRight } from 'lucide-react';

interface MfaSetupProps {
  email: string;
  onActivate: () => void;
  onBack: () => void;
  accentColor?: string;
}

export function MfaSetup({
  email,
  onActivate,
  onBack,
  accentColor = '#0B4F6C',
}: MfaSetupProps) {
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeUri: string } | null>(null);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [step, setStep] = useState<'qr' | 'verify'>('qr');

  useEffect(() => {
    fetchSetupData();
  }, []);

  const fetchSetupData = async () => {
    try {
      const response = await fetch(`http://localhost:5293/api/auth/mfa/setup?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        setSetupData(data);
      } else {
        setError('Failed to initialize MFA setup. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Please check your internet.');
    }
  };

  const handleCopySecret = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.secret);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCodeChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[index] = cleaned;
    setCode(next);
    setError('');
    
    if (cleaned && index < 5) {
      const nextInput = document.getElementById(`mfa-setup-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleActivate = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5293/api/auth/mfa/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      });

      if (response.ok) {
        onActivate();
      } else {
        const data = await response.json();
        setError(data.error || 'Invalid code. Please try again.');
      }
    } catch (err) {
      setError('Failed to activate MFA. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 sm:p-8"
    >
      <div className="mb-6">
        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
          <ShieldCheck className="text-blue-600" size={24} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Secure Your Account</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set up Google Authenticator to add an extra layer of security.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === 'qr' ? (
          <motion.div
            key="qr-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-gray-50 rounded-2xl p-6 flex flex-col items-center justify-center border border-gray-100">
              {setupData ? (
                <>
                  <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
                    <QRCodeSVG value={setupData.qrCodeUri} size={180} />
                  </div>
                  <p className="text-xs text-gray-400 text-center max-w-[200px]">
                    Scan this QR code with your Google Authenticator or Authy app.
                  </p>
                </>
              ) : (
                <div className="h-[220px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Manual Entry</p>
              <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl">
                <code className="flex-1 text-sm font-mono text-gray-600 overflow-hidden text-ellipsis">
                  {setupData?.secret || '••••••••••••••••'}
                </code>
                <button
                  onClick={handleCopySecret}
                  className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                >
                  {isCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <button
              onClick={() => setStep('verify')}
              className="w-full py-3.5 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: accentColor }}
            >
              I've scanned the code <ArrowRight size={18} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="verify-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                Enter the 6-digit code from your app to confirm.
              </p>
              <div className="flex gap-2 justify-center">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    id={`mfa-setup-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    className="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 p-3 rounded-xl text-center border border-red-100">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleActivate}
                disabled={isLoading || code.join('').length < 6}
                className="w-full py-3.5 text-white rounded-xl font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: accentColor }}
              >
                {isLoading ? 'Activating...' : 'Activate MFA'}
              </button>
              <button
                onClick={() => setStep('qr')}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Back to QR Code
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 pt-6 border-t border-gray-100">
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-gray-600 font-medium"
        >
          Cancel Setup
        </button>
      </div>
    </motion.div>
  );
}
