import { useState, useEffect } from 'react';
import { OperatorInterface } from './pages/web-operator/OperatorInterface';
import { PassengerInterface } from './pages/mobile-passenger/PassengerInterface';
import { AuxiliaryInterface } from './pages/mobile-auxiliary/AuxiliaryInterface';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { SetupPasswordPage } from './pages/auth/SetupPasswordPage';
import { UpdatePrompt } from './components/UpdatePrompt';
import { requestAndSubscribe } from './utils/pushNotifications';

const API = import.meta.env.VITE_API_URL as string;

export type UserRole = 'operator' | 'passenger' | 'auxiliary';

export interface UserSession {
  userId: string;
  userName: string;
  email?: string;
  role: UserRole;
  token?: string;
  employeeId?: string;
  otp?: string;
  description?: string;
}

type AuthView = 'login' | 'signup' | 'setup-password';

export function App() {
  const [session, setSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('user_session');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [authView, setAuthView] = useState<AuthView>('login');
  const [setupEmail, setSetupEmail] = useState('');
  const [pendingMfa, setPendingMfa] = useState<any>(null);

  // Restore session from HttpOnly cookie if no localStorage session
  useEffect(() => {
    if (session) return;
    fetch(`${API}/api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.userId) setSession(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (session) {
      localStorage.setItem('user_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('user_session');
    }
  }, [session]);

  // Subscribe to push notifications after login
  useEffect(() => {
    if (!session?.userId) return;

    if (session.role === 'passenger') {
      // Passengers include their location so the backend can do proximity checks
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          pos => requestAndSubscribe(pos.coords.latitude, pos.coords.longitude),
          ()  => requestAndSubscribe()
        );
      } else {
        requestAndSubscribe();
      }
    } else {
      // Auxiliary and operator don't need location
      requestAndSubscribe();
    }
  }, [session?.userId]);

  const handleLogout = () => {
    fetch(`${API}/api/auth/logout`, { 
      method: 'POST',
      credentials: 'include'
    }).catch(() => {});
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

  if (!session) {
    return (
      <>
        <UpdatePrompt />

        {authView === 'login' && (
          <LoginPage
            onLoginSuccess={(s) => {
              setSession(s);
              setPendingMfa(null);
            }}
            onNavigateSignup={() => setAuthView('signup')}
            onNavigateSetupPassword={(email) => {
              setSetupEmail(email);
              setAuthView('setup-password');
            }}
            initialMfaState={pendingMfa}
            initialEmail={setupEmail}
          />
        )}

        {authView === 'signup' && (
          <SignupPage
            onSignupSuccess={(s) => setSession(s)}
            onNavigateLogin={() => setAuthView('login')}
          />
        )}

        {authView === 'setup-password' && (
          <SetupPasswordPage
            email={setupEmail}
            onSuccess={(session) => {
              setSession(session);
            }}
            onBack={() => setAuthView('login')}
          />
        )}
      </>
    );
  }

  // ✅ Logged in → route based on role
  switch (session.role) {
    case 'operator':
      return (
        <div className="min-h-screen w-full" style={{ backgroundColor: '#FAF9F5' }}>
          <OperatorInterface session={session} onLogout={handleLogout} />
        </div>
      );

    case 'passenger':
      return (
        <div className="min-h-screen w-full flex justify-center bg-[#FAF9F5]">
          <PassengerInterface session={session} onLogout={handleLogout} />
        </div>
      );

    case 'auxiliary':
      return (
        <div className="min-h-screen w-full flex justify-center bg-[#FAF9F5]">
          <AuxiliaryInterface session={session} onLogout={handleLogout} />
        </div>
      );

    default:
      return null;
  }
}