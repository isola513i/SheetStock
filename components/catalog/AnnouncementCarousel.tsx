'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { AnnouncementItem } from '@/lib/types';

type AnnouncementCarouselProps = {
  items: AnnouncementItem[];
};

const AUTO_SLIDE_MS = 5000;

export function AnnouncementCarousel({ items }: AnnouncementCarouselProps) {
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
    <section className="px-4 pb-2 pt-3">
      <div className="overflow-hidden rounded-[1.75rem] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,#f6f4f1_0%,#efede8_100%)] px-5 py-4 shadow-[0_18px_38px_-30px_rgba(29,41,57,0.35)]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeItem.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-[86px] content-center"
          >
            <p className="text-center text-[1.05rem] font-semibold leading-[1.45] text-[#1f2737] sm:text-[1.15rem]">
              {activeItem.text}
            </p>
          </motion.div>
        </AnimatePresence>

        {items.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`ไปที่ประกาศ ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ${
                  index === normalizedIndex ? 'w-6 bg-[#29335C]' : 'w-2.5 bg-[#29335C]/20'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
