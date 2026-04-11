'use client';

import { useState } from 'react';
import Image from 'next/image';

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
  sizes = '(max-width: 768px) 50vw, 200px',
  priority = false,
}: ProductImageProps) {
  const safeSrc = toSafeImageSrc(src) || fallbackSrc;
  const [imgSrc, setImgSrc] = useState(safeSrc);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      referrerPolicy="no-referrer"
      priority={priority}
      onError={() => {
        if (imgSrc !== fallbackSrc) setImgSrc(fallbackSrc);
      }}
    />
  );
}
