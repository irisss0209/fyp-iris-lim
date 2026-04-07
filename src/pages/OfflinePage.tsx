import { motion } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * OfflinePage – shown by the service worker when a navigation request fails
 * and no cached version is available.
 *
 * NOTE: This page must also be referenced in your workbox config's
 * `offlineFallback` or `navigateFallback` option if you want the SW to
 * serve it automatically. For the in-app usage see App.tsx.
 */
export function OfflinePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #FAF9F5 0%, #e8e6f0 100%)',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Animated icon */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: '6rem',
          height: '6rem',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1e1b4b, #4338ca)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '2rem',
          boxShadow: '0 16px 48px rgba(30,27,75,0.25)',
        }}
      >
        <WifiOff size={32} color="#fff" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e1b4b', margin: '0 0 0.75rem' }}
      >
        You're offline
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ color: '#6b7280', maxWidth: '22rem', lineHeight: 1.6, margin: '0 0 2rem' }}
      >
        It looks like your internet connection is unavailable. Railly requires a connection to display live transit data.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => window.location.reload()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'linear-gradient(135deg, #1e1b4b, #4338ca)',
          color: '#fff',
          border: 'none',
          borderRadius: '0.75rem',
          padding: '0.75rem 1.75rem',
          fontSize: '1rem',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(30,27,75,0.3)',
        }}
      >
        <RefreshCw size={18} />
        Try Again
      </motion.button>
    </div>
  );
}
