import { useState, useEffect } from 'react';
import { OperatorInterface } from './pages/web-operator/OperatorInterface';
import { PassengerInterface } from './pages/mobile-passenger/PassengerInterface';
import { AuxiliaryInterface } from './pages/mobile-auxiliary/AuxiliaryInterface';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { SetupPasswordPage } from './pages/auth/SetupPasswordPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { UpdatePrompt } from './components/UpdatePrompt';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { OfflineBanner } from './components/OfflineBanner';
import { requestAndSubscribe, unsubscribeFromPush } from './utils/pushNotifications';
import { flushPendingReports } from './utils/offlineQueue';
import type { UserRole, UserSession } from './types/session';

export type { UserRole };
export type { UserSession } from './types/session';

const API_BASE = import.meta.env.VITE_API_BASE as string;

type AuthView = 'login' | 'signup' | 'setup-password' | 'forgot-password';

export function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [setupEmail, setSetupEmail] = useState('');
  const [pendingMfa, setPendingMfa] = useState<any>(null);

  // On mount, restore session from HttpOnly cookie only
  useEffect(() => {
    localStorage.removeItem('user_session'); // clear any legacy stored session
    fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.userId) setSession(data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Subscribe to push notifications after login
  useEffect(() => {
    if (!session?.userId) return;
    requestAndSubscribe();
  }, [session?.userId]);

  // Auto-flush queued offline reports when connection is restored
  useEffect(() => {
    if (!session) return;
    const handleOnline = () => flushPendingReports(API_BASE);
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [session]);

  const handleLoginSuccess = (s: UserSession) => {
    setSession(s);
    setPendingMfa(null);
  };

  const handleLogout = () => {
    fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    }).catch(() => {});
    unsubscribeFromPush().catch(() => {});
    navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_SENSITIVE_CACHES' });
    setSession(null);
    setAuthView('login');
  };

  // Auto-logout when any API call returns 401 (cookie expired)
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : '';
      if (res.status === 401 && session && !url.includes('/api/auth/')) {
        handleLogout();
      }
      return res;
    };
    return () => { window.fetch = originalFetch; };
  }, [session]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#FAF9F5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl"
            style={{
              backgroundImage: 'url(/Railly_logo.png)',
              backgroundSize: '100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-[#0B4F6C] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-[#0B4F6C] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-[#0B4F6C] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <OfflineBanner />
      <UpdatePrompt />

      {!session ? (
        <>
          {authView === 'login' && (
            <LoginPage
              onLoginSuccess={handleLoginSuccess}
              onNavigateSignup={() => setAuthView('signup')}
              onNavigateSetupPassword={(email) => {
                setSetupEmail(email);
                setAuthView('setup-password');
              }}
              onNavigateForgotPassword={() => setAuthView('forgot-password')}
              initialMfaState={pendingMfa}
              initialEmail={setupEmail}
            />
          )}

          {authView === 'signup' && (
            <SignupPage
              onSignupSuccess={handleLoginSuccess}
              onNavigateLogin={() => setAuthView('login')}
            />
          )}

          {authView === 'setup-password' && (
            <SetupPasswordPage
              email={setupEmail}
              onSuccess={handleLoginSuccess}
              onBack={() => setAuthView('login')}
            />
          )}

          {authView === 'forgot-password' && (
            <ForgotPasswordPage
              onBack={() => setAuthView('login')}
            />
          )}
        </>
      ) : (
        // ✅ Logged in → route based on role
        (() => {
          switch (session.role) {
            case 'operator':
              return (
                <div className="min-h-screen w-full" style={{ backgroundColor: '#FAF9F5' }}>
                  <PWAInstallPrompt />
                  <OperatorInterface session={session} onLogout={handleLogout} />
                </div>
              );
            case 'passenger':
              return (
                <div className="min-h-screen w-full flex justify-center bg-[#FAF9F5]">
                  <PWAInstallPrompt />
                  <PassengerInterface session={session} onLogout={handleLogout} />
                </div>
              );
            case 'auxiliary':
              return (
                <div className="min-h-screen w-full flex justify-center bg-[#FAF9F5]">
                  <PWAInstallPrompt />
                  <AuxiliaryInterface session={session} onLogout={handleLogout} />
                </div>
              );
            default:
              return null;
          }
        })()
      )}
    </>
  );
}
