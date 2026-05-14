import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { UserSession } from '../../types/session';
import { MfaVerification } from './MfaVerification';
import { usePasswordToggle } from '../../hooks/usePasswordToggle';
import { Spinner } from '../../components/Spinner';

interface ChangePasswordPageProps {
  session: UserSession;
  onBack: () => void;
}

const DARKBLUE = '#0B4F6C';
const API = import.meta.env.VITE_API_BASE as string;

type Step = 'passwords' | 'otp' | 'success';

export function ChangePasswordPage({ session, onBack }: ChangePasswordPageProps) {
  const [step, setStep] = useState<Step>('passwords');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const { isVisible, toggle } = usePasswordToggle(['current', 'new', 'confirm']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [challengeId, setChallengeId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  // Step 1 — verify current password + send OTP
  const handleSendOtp = async () => {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/change-password/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email, currentPassword: currentPw }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to send code.'); return; }
      setChallengeId(data.challengeId);
      setMaskedEmail(data.maskedDestination);
      setStep('otp');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 — verify OTP + submit new password
  const handleVerifyOtp = async (code: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.email,
          currentPassword: currentPw,
          newPassword: newPw,
          code,
          challengeId,
        }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Verification failed.');
        return false;
      }
      setStep('success');
      setTimeout(() => onBack(), 2000);
      return true;
    } catch {
      setError('Network error. Please try again.');
      return false;
    }
  };

  const handleResend = async () => {
    const res = await fetch(`${API}/api/auth/change-password/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: session.email, currentPassword: currentPw }),
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok) setChallengeId(data.challengeId);
  };

  const inputBase =
    'w-full px-4 py-3 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/20 focus:border-[#0B4F6C] text-gray-800 font-medium transition-all placeholder:text-gray-400';

  if (step === 'otp') {
    return (
      <MfaVerification
        email={session.email!}
        destinationHint={maskedEmail}
        method="email_otp"
        onVerify={handleVerifyOtp}
        onResend={handleResend}
        onBack={() => setStep('passwords')}
      />
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center px-4">
        <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm text-center space-y-3 max-w-sm w-full">
          <div className="w-16 h-16 mx-auto bg-green-50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Password Updated</h2>
          <p className="text-sm text-gray-500">Your password has been changed successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col">
      <div className="flex-1 px-4 py-8 max-w-md mx-auto w-full space-y-6">
        <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 mb-2">
              <img src="https://railly.s3.ap-southeast-1.amazonaws.com/assets/Railly_logo.png" alt="Railly Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
            <p className="text-sm text-gray-500 px-4">
              Enter your current password and choose a new one. We'll send a verification code to confirm.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { key: 'current', label: 'Current Password', value: currentPw, onChange: setCurrentPw },
              { key: 'new',     label: 'New Password',     value: newPw,     onChange: setNewPw },
              { key: 'confirm', label: 'Confirm Password', value: confirmPw, onChange: setConfirmPw },
            ].map(({ key, label, value, onChange }) => (
              <div key={key} className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 px-1">{label}</label>
                <div className="relative">
                  <input
                    type={isVisible(key) ? 'text' : 'password'}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className={inputBase}
                  />
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {isVisible(key) ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {newPw && confirmPw && newPw !== confirmPw && (
            <p className="text-xs text-red-500 text-center">Passwords do not match.</p>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100">{error}</div>
          )}

          <button
            onClick={handleSendOtp}
            disabled={isLoading || !currentPw || !newPw || newPw !== confirmPw || newPw.length < 8}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: DARKBLUE }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2"><Spinner /> Sending code…</span>
            ) : 'Continue'}
          </button>

          <button onClick={onBack} className="block mx-auto text-[14px] text-gray-400 px-8">
            Back
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-400 px-8">
          Changing your password will not log you out of this session.
        </p>
      </div>
    </div>
  );
}
