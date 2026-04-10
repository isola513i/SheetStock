'use client';

import { useCallback } from 'react';

export const FALLBACK_IMAGE_SRC = '/icons/icon-192x192.png';

type ProductImageProps = {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
};

export function toSafeImageSrc(value: string) {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  return `/${trimmed.replace(/^\.?\/*/, '')}`;
}

export function ProductImage({ src, alt, className = '', fallbackSrc = FALLBACK_IMAGE_SRC }: ProductImageProps) {
  const safeSrc = toSafeImageSrc(src) || fallbackSrc;

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const target = e.currentTarget;
      if (target.src !== window.location.origin + fallbackSrc && target.src !== fallbackSrc) {
        target.src = fallbackSrc;
      }
    },
    [fallbackSrc]
  );

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={safeSrc}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
}
