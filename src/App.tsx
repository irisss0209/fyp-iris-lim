import { useState } from 'react';
import { OperatorInterface as CommandCenterApp } from './pages/web-operator/OperatorInterface';
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
  const [session, setSession] = useState<UserSession | null>(null);
  const [authView, setAuthView] = useState<AuthView>('login');

  return (
    <>
      <UpdatePrompt />

      {!session && authView === 'login' && (
        <LoginPage 
          onLoginSuccess={(s) => setSession(s)}
          onNavigateSignup={() => setAuthView('signup')}
        />
      )}

      {!session && authView === 'signup' && (
        <SignupPage 
          onSignupSuccess={(s) => setSession(s)}
          onNavigateLogin={() => setAuthView('login')}
        />
      )}

      {(session?.role === 'operator' || session?.role === 'command') && (
        <div className="min-h-screen w-full" style={{ backgroundColor: '#FAF9F5' }}>
          <CommandCenterApp onLogout={() => setSession(null)} />
        </div>
      )}

      {(session?.role === 'passenger' || session?.role === 'auxiliary') && (
        <div
          className="min-h-screen w-full flex items-start justify-center py-0 sm:py-8"
          style={{ backgroundColor: '#FAF9F5' }}
        >
          {session.role === 'passenger' && <PassengerInterface session={session} onLogout={() => setSession(null)} />}
          {session.role === 'auxiliary' && <AuxiliaryInterface session={session} onLogout={() => setSession(null)} />}
        </div>
      )}
    </>
  );
}