/**
 * Compatibility wrapper for Base UI's event helper.
 *
 * Base UI sometimes passes a boolean capture flag for document-level touch
 * listeners that do not call preventDefault(). Chrome treats those as
 * non-passive scroll-blocking listeners and emits a console violation.
 */
export function addEventListener<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  listener: (this: Window, ev: WindowEventMap[K]) => unknown,
  options?: boolean | AddEventListenerOptions,
): () => void;
export function addEventListener<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  listener: (this: Document, ev: DocumentEventMap[K]) => unknown,
  options?: boolean | AddEventListenerOptions,
): () => void;
export function addEventListener(
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
) {
  const resolvedOptions = getPassiveTouchOptions(type, options);

  target.addEventListener(type, listener, resolvedOptions);
  return () => {
    target.removeEventListener(type, listener, resolvedOptions);
  };
}

function getPassiveTouchOptions(type: string, options?: boolean | AddEventListenerOptions) {
  if (type !== 'touchstart' && type !== 'touchmove') {
    return options;
  }

  if (options == null) {
    return { passive: true };
  }

  if (typeof options === 'boolean') {
    return { capture: options, passive: true };
  }

  if ('passive' in options) {
    return options;
  }

  return { ...options, passive: true };
}
