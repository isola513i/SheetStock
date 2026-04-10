import { useEffect, useRef } from 'react';

export function useInventoryStream(onUpdate: () => void) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    let es: EventSource | null = null;
    let retryDelay = 1000;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let unmounted = false;

    function connect() {
      if (unmounted) return;
      es = new EventSource('/api/inventory/stream');

      es.onopen = () => {
        retryDelay = 1000; // reset backoff on success
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'inventory-updated') {
            onUpdateRef.current();
          }
        } catch { /* ignore malformed events */ }
      };

      es.onerror = () => {
        es?.close();
        es = null;
        if (unmounted) return;
        retryTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 15000);
          connect();
        }, retryDelay);
      };
    }

    connect();

    return () => {
      unmounted = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
    };
  }, []);
}
