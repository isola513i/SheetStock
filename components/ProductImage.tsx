'use client';

import { useEffect, useState } from 'react';

export const FALLBACK_IMAGE_SRC = '/icons/icon-192x192.png';

type ProductImageProps = {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  sizes?: string;
  priority?: boolean;
};

export function toSafeImageSrc(value: string) {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  return `/${trimmed.replace(/^\.?\/*/, '')}`;
}

export function ProductImage({
  src,
  alt,
  className = '',
  fallbackSrc = FALLBACK_IMAGE_SRC,
  sizes: _sizes = '(max-width: 768px) 50vw, 200px',
  priority: _priority = false,
}: ProductImageProps) {
  const safeSrc = toSafeImageSrc(src) || fallbackSrc;
  const [imgSrc, setImgSrc] = useState(safeSrc);

  useEffect(() => {
    setImgSrc(safeSrc);
  }, [safeSrc]);

  return (
    // Product image URLs come from company sheet data and may use arbitrary hosts.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={alt}
      className={`absolute inset-0 h-full w-full ${className}`}
      referrerPolicy="no-referrer"
      loading={_priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => {
        if (imgSrc !== fallbackSrc) setImgSrc(fallbackSrc);
      }}
    />
  );
}
