import { useState, useEffect } from 'react';
import { OperatorInterface } from './pages/web-operator/OperatorInterface';
import { PassengerInterface } from './pages/mobile-passenger/PassengerInterface';
import { AuxiliaryInterface } from './pages/mobile-auxiliary/AuxiliaryInterface';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { UpdatePrompt } from './components/UpdatePrompt';

export type UserRole = 'operator' | 'passenger' | 'auxiliary' | 'command';

export interface UserSession {
  userId: string;
  userName: string;
  email?: string;
  role: UserRole;
  employeeId?: string;
  otp?: string;
  description?: string;
}

type AuthView = 'login' | 'signup';

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

  useEffect(() => {
    if (session) {
      localStorage.setItem('user_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('user_session');
    }
  }, [session]);

  const handleLogout = () => {
    setSession(null);
    setAuthView('login');
  };

  // 🔐 Not logged in → show auth pages
  if (!session) {
    return (
      <>
        <UpdatePrompt />

        {authView === 'login' && (
          <LoginPage
            onLoginSuccess={(s) => setSession(s)}
            onNavigateSignup={() => setAuthView('signup')}
          />
        )}

        {authView === 'signup' && (
          <SignupPage
            onSignupSuccess={(s) => setSession(s)}
            onNavigateLogin={() => setAuthView('login')}
          />
        )}
      </>
    );
  }

  // ✅ Logged in → route based on role
  switch (session.role) {
    case 'operator':
    case 'command':
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