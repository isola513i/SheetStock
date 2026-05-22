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
        hidden ? 'max-h-0 translate-y-[-8px] py-0 opacity-0' : 'max-h-28 py-3 opacity-100'
      }`}
    >
      <div className="px-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeItem.id}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-[44px] content-center"
          >
            <p className="mx-auto max-w-[34rem] text-center text-[0.97rem] font-medium leading-[1.4] tracking-[-0.01em] text-[var(--text-primary)]">
              {activeItem.text}
            </p>
          </motion.div>
        </AnimatePresence>

        {items.length > 1 && (
          <div className="mt-2.5 flex justify-center gap-1.5">
            {items.map((item, index) => (
              <span
                key={item.id}
                aria-hidden="true"
                className={`block h-1.5 transition-[width,background-color,opacity] duration-200 ${
                  index === normalizedIndex
                    ? 'w-8 bg-[color:color-mix(in_oklab,var(--text-primary)_92%,transparent)] opacity-100'
                    : 'w-3 bg-[color:color-mix(in_oklab,var(--text-primary)_18%,transparent)] opacity-80'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
