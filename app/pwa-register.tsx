'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCcw } from 'lucide-react';

export function PwaRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  const applyUpdate = useCallback(() => {
    if (!waitingWorker) return;
    waitingWorker.postMessage('SKIP_WAITING');
    setWaitingWorker(null);
    // Don't reload here — the 'controllerchange' listener handles it
    // after the new SW has actually taken control
  }, [waitingWorker]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const isLocalDev =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (isLocalDev) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((r) => r.unregister().catch(() => undefined));
      });
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k).catch(() => undefined)));
      }
      return;
    }

    const onReady = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((registration) => {
        // If there's already a waiting worker on load
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
        }

        // Listen for new updates
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW installed but waiting to activate
              setWaitingWorker(installing);
            }
          });
        });
      }).catch(() => undefined);

      // Reload all tabs when a new SW takes over
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    };

    if (document.readyState === 'complete') {
      onReady();
    } else {
      window.addEventListener('load', onReady, { once: true });
    }

    return () => window.removeEventListener('load', onReady);
  }, []);

  return (
    <AnimatePresence>
      {waitingWorker && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
        >
          <button
            onClick={applyUpdate}
            className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-gray-900 text-white text-sm font-medium shadow-xl shadow-black/20"
          >
            <RefreshCcw className="w-4 h-4" />
            มีเวอร์ชันใหม่ — แตะเพื่ออัปเดต
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
