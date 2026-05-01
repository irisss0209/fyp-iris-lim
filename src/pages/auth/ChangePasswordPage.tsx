import { useState } from 'react';
import {
  ArrowLeft,
  EyeIcon,
  EyeOffIcon,
  ShieldCheckIcon
} from 'lucide-react';
import { UserSession } from '../../App';

interface ChangePasswordPageProps {
  session: UserSession;
  onBack: () => void;
}

const DARKBLUE = '#0B4F6C';

export function ChangePasswordPage({ session, onBack }: ChangePasswordPageProps) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdatePassword = async () => {
    setError('');
    setIsUpdating(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.email,
          currentPassword: currentPw,
          newPassword: newPw
        }),
        credentials: 'include'
      });

      if (res.ok) {
        setSaved(true);
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
        setTimeout(() => {
          setSaved(false);
          onBack();
        }, 2000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const inputBase =
    'w-full px-4 py-3 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0B4F6C]/20 focus:border-[#0B4F6C] text-gray-800 font-medium transition-all placeholder:text-gray-400';

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
              Enter your current password and choose a new strong one.
            </p>
          </div>

          <div className="space-y-4">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 px-1">Current Password</label>
              <div className="relative">
                <input
                  type={showPw.current ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  className={inputBase}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => ({ ...p, current: !p.current }))}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw.current ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </div>

            <div className="h-px bg-gray-50 mx-2" />

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 px-1">New Password</label>
              <div className="relative">
                <input
                  type={showPw.new ? 'text' : 'password'}
                  placeholder="New password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className={inputBase}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => ({ ...p, new: !p.new }))}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw.new ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 px-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showPw.confirm ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  className={inputBase}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw.confirm ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </div>
          </div>

          {newPw && confirmPw && newPw !== confirmPw && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
              Passwords do not match.
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {saved && (
            <div className="bg-green-50 text-green-700 text-sm p-4 rounded-2xl border border-green-100 flex items-center justify-center gap-2 font-bold animate-in fade-in zoom-in duration-300">
              Password updated successfully!
            </div>
          )}

          <button
            onClick={handleUpdatePassword}
            disabled={isUpdating || !currentPw || !newPw || newPw !== confirmPw || newPw.length < 8}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white shadow-lg shadow-[#0B4F6C]/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            style={{ backgroundColor: DARKBLUE }}
          >
            {isUpdating ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Updating...
              </div>
            ) : (
              'Update Password'
            )}
          </button >
          <button
            onClick={onBack}

            className="block mx-auto text-[14px] text-gray-400 px-8"
          >
            Back
          </button>        </div>

        <p className="text-center text-[10px] text-gray-400 px-8">
          Changing your password will not log you out of this session.
        </p>
      </div>
    </div>
  );
}
