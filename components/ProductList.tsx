'use client';

import { memo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { InventoryItem, InventoryViewMode } from '@/lib/types';
import { Eye, Tag } from 'lucide-react';

// Extract static transition objects to prevent re-creation each render
const STAGGER_TRANSITION = (idx: number) => ({ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) });
const CONTAINER_TRANSITION = { duration: 0.15 };

const BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
const FALLBACK_IMAGE_SRC = '/icons/icon-192x192.png';

const SWIPE_THRESHOLD = 70;

function toSafeImageSrc(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return FALLBACK_IMAGE_SRC;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  return `/${trimmed.replace(/^\.?\/*/, '')}`;
}

type ProductListProps = {
  processedInventory: InventoryItem[];
  viewMode: InventoryViewMode;
  onItemClick: (item: InventoryItem) => void;
};

function SwipeableListItem({
  item,
  idx,
  onItemClick,
}: {
  item: InventoryItem;
  idx: number;
  onItemClick: (item: InventoryItem) => void;
}) {
  const isOutOfStock = item.totalQuantity <= 0;
  const isLowStock = item.totalQuantity > 0 && item.totalQuantity < 10;
  const x = useMotionValue(0);
  const actionOpacity = useTransform(x, [-SWIPE_THRESHOLD, -30, 0, 30, SWIPE_THRESHOLD], [1, 0.5, 0, 0.5, 1]);
  const didSwipeRef = useRef(false);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const offset = info.offset.x;
      if (Math.abs(offset) >= SWIPE_THRESHOLD) {
        didSwipeRef.current = true;
        // Both left and right swipe open detail
        onItemClick(item);
        // Reset after a tick so the user sees the snap-back
        setTimeout(() => { didSwipeRef.current = false; }, 300);
      }
    },
    [item, onItemClick]
  );

  const handleClick = useCallback(() => {
    if (!didSwipeRef.current) {
      onItemClick(item);
    }
  }, [item, onItemClick]);

  return (
    <div className="relative overflow-hidden rounded-[1.2rem]">
      {/* Left action (behind card) */}
      <motion.div
        className="absolute inset-y-0 left-0 w-20 flex items-center justify-center bg-[var(--brand-primary)] rounded-l-[1.2rem]"
        style={{ opacity: actionOpacity }}
      >
        <Eye className="w-5 h-5 text-white" />
      </motion.div>
      {/* Right action (behind card) */}
      <motion.div
        className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-blue-500 rounded-r-[1.2rem]"
        style={{ opacity: actionOpacity }}
      >
        <Tag className="w-5 h-5 text-white" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={STAGGER_TRANSITION(idx)}
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        className={`relative bg-white p-3 flex items-center gap-4 cursor-pointer border transition-colors contain-card ${
          isOutOfStock ? 'border-red-200 bg-red-50/30' : isLowStock ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-200'
        } rounded-[1.2rem]`}
        onClick={handleClick}
      >
        <div className="relative h-16 w-16 shrink-0">
          <Image
            src={toSafeImageSrc(item.imageUrl)}
            alt={item.details}
            fill
            sizes="64px"
            className={`object-contain rounded-lg ${isOutOfStock ? 'grayscale opacity-70' : ''}`}
            referrerPolicy="no-referrer"
            priority={idx < 6}
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
          {isOutOfStock && (
            <div className="absolute -top-1 -right-1 flex items-center justify-center">
              <span className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-red-400/60 animate-ping" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500 border-2 border-white" />
            </div>
          )}
        </div>
        <div className={`flex-1 min-w-0 ${isOutOfStock ? 'opacity-70' : ''}`}>
          <h3 className="font-medium text-sm text-gray-900 leading-tight">{item.details}</h3>
          <p className="text-[11px] text-gray-500 mt-1 truncate">รหัส: {item.boxBarcode}</p>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end justify-center">
          {!isOutOfStock && (
            <p className={`text-lg font-medium leading-none ${isLowStock ? 'text-yellow-600' : 'text-[var(--brand-primary)]'}`}>
              {item.totalQuantity} <span className="text-[11px] font-normal ml-0.5 text-gray-400">ชิ้น</span>
            </p>
          )}
          {isLowStock && <span className="mt-1.5 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[9px] font-medium rounded-sm">ใกล้หมด</span>}
          {isOutOfStock && <span className="mt-1.5 px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-medium rounded-sm">สินค้าหมด</span>}
        </div>
      </motion.div>
    </div>
  );
}

export const ProductList = memo(function ProductList({ processedInventory, viewMode, onItemClick }: ProductListProps) {
  return (
    <main className="px-5 pb-6">
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={CONTAINER_TRANSITION}
            className="grid grid-cols-2 gap-4"
          >
            {processedInventory.map((item, idx) => {
              const isOutOfStock = item.totalQuantity <= 0;
              const isLowStock = item.totalQuantity > 0 && item.totalQuantity < 10;
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={STAGGER_TRANSITION(idx)}
                  key={item.id}
                  className={`bg-white rounded-[1.5rem] p-4 flex flex-col cursor-pointer border contain-card ${isOutOfStock ? 'border-red-200 bg-red-50/30' : isLowStock ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-200'}`}
                  onClick={() => onItemClick(item)}
                >
                  <div className="relative h-32 w-full mb-4">
                    <Image
                      src={toSafeImageSrc(item.imageUrl)}
                      alt={item.details}
                      fill
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className={`object-contain ${isOutOfStock ? 'grayscale opacity-70' : ''}`}
                      referrerPolicy="no-referrer"
                      priority={idx < 4}
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                    />
                    {isOutOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-red-500 text-white text-[10px] font-medium px-2 py-1 rounded-full shadow-sm">สินค้าหมด</span>
                      </div>
                    )}
                  </div>
                  <div className={`w-full text-center flex flex-col items-center ${isOutOfStock ? 'opacity-70' : ''}`}>
                    <h3 className="font-medium text-sm text-gray-900 truncate w-full">{item.details}</h3>
                    <p className="text-[11px] text-gray-500 mt-1 truncate w-full">กล่อง: {item.boxBarcode}</p>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      {!isOutOfStock && (
                        <p className={`text-[12px] font-medium truncate ${isLowStock ? 'text-yellow-600' : 'text-gray-700'}`}>
                          {item.totalQuantity} <span className="text-[10px] font-normal text-gray-400">ชิ้น</span>
                        </p>
                      )}
                      {isLowStock && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[9px] font-medium rounded-sm">ใกล้หมด</span>}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={CONTAINER_TRANSITION}
            className="flex flex-col gap-3"
          >
            {processedInventory.map((item, idx) => (
              <SwipeableListItem key={item.id} item={item} idx={idx} onItemClick={onItemClick} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
});
