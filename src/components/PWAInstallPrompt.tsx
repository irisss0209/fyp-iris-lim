import { useState, useEffect } from 'react';
import { Share, X, Smartphone, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

    // 4. Show for iOS if not standalone (iOS doesn't support beforeinstallprompt)
    if (/iphone|ipad|ipod/.test(ua) && !isStandalone) {
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
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed inset-x-0 bottom-0 z-[9999] p-4 flex justify-center pointer-events-none"
      >
        <div className="w-full max-w-sm bg-white/90 backdrop-blur-xl border border-white/20 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-6 pointer-events-auto relative overflow-hidden">
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#0B4F6C]/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          
          <button 
            onClick={() => setShow(false)}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0B4F6C] flex items-center justify-center text-white shadow-lg shadow-[#0B4F6C]/20">
              <Download size={28} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 leading-tight">Install Railly</h3>
              <p className="text-sm text-gray-500 font-medium">Get the full experience</p>
            </div>
          </div>

          <div className="space-y-4">
            {platform === 'ios' ? (
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-sm text-gray-700 leading-relaxed">
                  1. Tap the <span className="inline-flex items-center bg-white p-1 rounded-md shadow-sm mx-1"><Share size={14} className="text-blue-500" /></span> <span className="font-bold">Share</span> button below.
                </p>
                <p className="text-sm text-gray-700 leading-relaxed mt-2">
                  2. Scroll down and select <span className="font-bold text-gray-900">"Add to Home Screen"</span>.
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Tap the button below to install Railly directly to your home screen for fast access.
                </p>
                <button 
                  onClick={handleAndroidInstall}
                  className="w-full mt-4 py-3 bg-[#0B4F6C] text-white rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all"
                >
                  Install Now
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <Smartphone size={12} />
            Works like a real app
          </div>
        </div>

        {/* --- Animated Arrows --- */}
        {platform === 'ios' && (
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="fixed bottom-[10px] left-1/2 -translate-x-1/2 flex flex-col items-center z-[10000]"
          >
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[15px] border-t-blue-500" />
          </motion.div>
        )}

        {platform === 'android' && !deferredPrompt && (
          <motion.div 
            animate={{ x: [0, 10, 0], y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="fixed top-4 right-4 flex flex-col items-end z-[10000]"
          >
             <div className="bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded-full mb-1">TAP HERE</div>
             <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[15px] border-r-blue-500 rotate-[45deg]" />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
