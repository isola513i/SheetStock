'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { AnnouncementItem } from '@/lib/types';

type AnnouncementCarouselProps = {
  items: AnnouncementItem[];
  hidden?: boolean;
};

const AUTO_SLIDE_MS = 7600;

export function AnnouncementCarousel({ items, hidden = false }: AnnouncementCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (items.length <= 1 || isPaused || hidden) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, AUTO_SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [hidden, isPaused, items.length]);

  if (items.length === 0) return null;

  const normalizedIndex = activeIndex % items.length;
  const activeItem = items[normalizedIndex] ?? items[0];

  return (
    <section
      aria-label="ประกาศร้านค้า"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className={`overflow-hidden border-y border-[color:color-mix(in_oklab,var(--border-subtle)_92%,transparent)] bg-[color:color-mix(in_oklab,var(--bg-card)_55%,var(--bg-secondary))] transition-[max-height,opacity,transform,padding] duration-300 ease-out ${
        hidden ? 'max-h-0 translate-y-[-8px] py-0 opacity-0' : 'max-h-16 py-2 opacity-100'
      }`}
    >
      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeItem.id}
            initial={{ opacity: 0, x: 10, filter: 'blur(2px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -10, filter: 'blur(2px)' }}
            transition={{ duration: 0.52, ease: [0.25, 0.1, 0.25, 1] }}
            className="min-h-8 content-center"
          >
            <p className="mx-auto max-w-[34rem] truncate text-center text-[0.9rem] font-medium leading-8 tracking-[-0.01em] text-[var(--text-primary)]">
              {activeItem.text}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
