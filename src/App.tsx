import { useState } from 'react';
import { CommandCenterApp } from './pages/web-operator/CommandCenterApp';
import { SafeRideMobile } from './pages/mobile-passenger/SafeRideMobile';
import { PoliceHub } from './pages/mobile-police/PoliceHub';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { UpdatePrompt } from './components/UpdatePrompt';

type UserRole = 'command' | 'saferide' | 'police';
type AuthView = 'login' | 'signup';

export function App() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [authView, setAuthView] = useState<AuthView>('login');

  return (
    <>
      {/* PWA update/offline-ready toast – always mounted */}
      <UpdatePrompt />

      {!userRole && authView === 'login' && (
        <LoginPage 
          onLoginSuccess={(role) => setUserRole(role)}
          onNavigateSignup={() => setAuthView('signup')}
        />
      )}

      {!userRole && authView === 'signup' && (
        <SignupPage 
          onSignupSuccess={(role) => setUserRole(role)}
          onNavigateLogin={() => setAuthView('login')}
        />
      )}

      {userRole === 'command' && (
        <div className="min-h-screen w-full" style={{ backgroundColor: '#FAF9F5' }}>
          <CommandCenterApp onLogout={() => setUserRole(null)} />
        </div>
      )}

      {(userRole === 'saferide' || userRole === 'police') && (
        <div
          className="min-h-screen w-full flex items-start justify-center py-0 sm:py-8"
          style={{ backgroundColor: '#FAF9F5' }}
        >
          {userRole === 'saferide' && <SafeRideMobile onLogout={() => setUserRole(null)} />}
          {userRole === 'police' && <PoliceHub onLogout={() => setUserRole(null)} />}
        </div>
      )}
    </>
  );
}