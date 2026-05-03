import { useState, useEffect } from 'react';
import { Share, X, Download, MoreVertical } from 'lucide-react';

export function PWAInstallPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Detect if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone
      || document.referrer.includes('android-app://');

    if (isStandalone) return;

    // 2. Detect Platform
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform('ios');
    } else if (/android/.test(ua)) {
      setPlatform('android');
    }

    // 3. Handle Android's beforeinstallprompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Give it a small delay so it doesn't pop up immediately on page load
      setTimeout(() => setShow(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 4. Show after delay if not standalone (Fallback for both iOS and Android)
    if (!isStandalone) {
      setTimeout(() => setShow(true), 3000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-6 z-[9999] px-4 flex justify-center pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-full max-w-[320px] bg-white rounded-[28px] shadow-[0_15px_50px_rgba(0,0,0,0.2)] pointer-events-auto relative flex flex-col items-center">
        {/* Close button */}
        <button
          onClick={() => setShow(false)}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-6 pt-8 flex flex-col items-center text-center">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl mb-6 shadow-md overflow-hidden">
            <img
              src="https://railly.s3.ap-southeast-1.amazonaws.com/assets/Railly_logo_192x192.png"
              alt="Railly Logo"
              className="w-full h-full object-cover"
            />
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2">Install Railly</h3>
          <p className="text-[13px] leading-relaxed text-gray-500 font-medium px-2">
            Add this app to your home screen for easy access and a better experience.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="w-full border-t border-gray-100 py-4 flex items-center justify-center gap-2">
          {platform === 'ios' ? (
            <div className="flex items-center gap-1.5 text-sm text-gray-700">
              <span>Tap</span>
              <div className="p-1 bg-white border border-gray-100 rounded-md shadow-sm">
                <Share size={16} className="text-blue-500" />
              </div>
              <span>then "Add to Home Screen"</span>
            </div>
          ) : (
            deferredPrompt ? (
              <button
                onClick={handleAndroidInstall}
                className="flex items-center gap-2 text-[#0B4F6C] font-bold text-sm hover:opacity-80 transition-opacity"
              >
                <Download size={18} />
                <span>Tap to Install Now</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-gray-700">
                <span>Tap the three dots</span>
                <div className="p-1 bg-white border border-gray-100 rounded-md shadow-sm">
                  <MoreVertical size={16} className="text-gray-600" />
                </div>
                <span>then "Add to Home Screen"</span>
              </div>
            )
          )}
        </div>

        {/* Speech bubble tail */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45" />
      </div>
    </div>
  );
}
