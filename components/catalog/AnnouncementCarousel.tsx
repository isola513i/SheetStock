'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { AnnouncementItem } from '@/lib/types';

type AnnouncementCarouselProps = {
  items: AnnouncementItem[];
  hidden?: boolean;
};

const AUTO_SLIDE_MS = 5000;

export function AnnouncementCarousel({ items, hidden = false }: AnnouncementCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, AUTO_SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [items]);

  if (items.length === 0) return null;

  const normalizedIndex = activeIndex % items.length;
  const activeItem = items[normalizedIndex] ?? items[0];

  return (
    <section
      aria-label="ประกาศร้านค้า"
      className={`overflow-hidden border-y border-[color:color-mix(in_oklab,var(--border-subtle)_92%,transparent)] bg-[color:color-mix(in_oklab,var(--bg-card)_55%,var(--bg-secondary))] transition-[max-height,opacity,transform,padding] duration-200 ease-out ${
        hidden ? 'max-h-0 translate-y-[-8px] py-0 opacity-0' : 'max-h-16 py-2 opacity-100'
      }`}
    >
      <div className="px-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeItem.id}
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -36 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
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
