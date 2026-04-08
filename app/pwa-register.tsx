'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const isLocalDev =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (isLocalDev) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => undefined);
        });
      });

      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            caches.delete(key).catch(() => undefined);
          });
        });
      }
      return;
    }

    const register = () => {
      navigator.serviceWorker.register('/sw.js', {scope: '/'}).catch(() => undefined);
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, {once: true});
    }

    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
