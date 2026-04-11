'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { InventoryItem, InventoryViewMode } from '@/lib/types';
import { Eye, Heart, Tag } from 'lucide-react';
import { ProductImage } from '@/components/ProductImage';

const BRAND_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-pink-50 text-pink-700 border-pink-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-cyan-50 text-cyan-700 border-cyan-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-indigo-50 text-indigo-700 border-indigo-200',
  'bg-teal-50 text-teal-700 border-teal-200',
  'bg-orange-50 text-orange-700 border-orange-200',
];

function brandColor(brand: string): string {
  let hash = 0;
  for (let i = 0; i < brand.length; i++) hash = ((hash << 5) - hash + brand.charCodeAt(i)) | 0;
  return BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length];
}

const STAGGER_TRANSITION = (idx: number) => ({ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) });
const CONTAINER_TRANSITION = { duration: 0.15 };

const SWIPE_THRESHOLD = 70;

type ProductListProps = {
  processedInventory: InventoryItem[];
  viewMode: InventoryViewMode;
  onItemClick: (item: InventoryItem) => void;
  onToggleFavorite?: (barcode: string, favorite: boolean) => void;
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
  const isOutOfStock = item.quantity <= 0;
  const isLowStock = item.quantity > 0 && item.quantity < 10;
  const x = useMotionValue(0);
  const actionOpacity = useTransform(x, [-SWIPE_THRESHOLD, -30, 0, 30, SWIPE_THRESHOLD], [1, 0.5, 0, 0.5, 1]);
  const didSwipeRef = useRef(false);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const offset = info.offset.x;
      if (Math.abs(offset) >= SWIPE_THRESHOLD) {
        didSwipeRef.current = true;
        onItemClick(item);
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
      <motion.div
        className="absolute inset-y-0 left-0 w-20 flex items-center justify-center bg-[var(--brand-primary)] rounded-l-[1.2rem]"
        style={{ opacity: actionOpacity }}
      >
        <Eye className="w-5 h-5 text-white" />
      </motion.div>
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
          <ProductImage
            src={item.imageUrl}
            alt={item.name}
            sizes="64px"
            className={`object-contain rounded-lg ${isOutOfStock ? 'grayscale opacity-70' : ''}`}
          />
          {isOutOfStock && (
            <div className="absolute -top-1 -right-1 flex items-center justify-center">
              <span className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-red-400/60 animate-ping" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500 border-2 border-white" />
            </div>
          )}
        </div>
        <div className={`flex-1 min-w-0 ${isOutOfStock ? 'opacity-70' : ''}`}>
          <h3 className="font-medium text-sm text-gray-900 leading-tight">{[item.brand, item.category, item.series].filter(Boolean).join('') || item.name || item.barcode}</h3>
          <p className="text-[11px] text-gray-500 mt-1 truncate">บาร์โค้ด: {item.barcode}</p>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end justify-center">
          {!isOutOfStock && (
            <p className={`text-lg font-medium leading-none ${isLowStock ? 'text-yellow-600' : 'text-[var(--brand-primary)]'}`}>
              {item.quantity} <span className="text-[11px] font-normal ml-0.5 text-gray-400">ชิ้น</span>
            </p>
          )}
          {isLowStock && <span className="mt-1.5 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[9px] font-medium rounded-sm">ใกล้หมด</span>}
          {isOutOfStock && <span className="mt-1.5 px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-medium rounded-sm">สินค้าหมด</span>}
        </div>
      </motion.div>
    </div>
  );
}

const BATCH_SIZE = 30;

export const ProductList = memo(function ProductList({ processedInventory, viewMode, onItemClick, onToggleFavorite }: ProductListProps) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Reset visible count when data changes
  useEffect(() => { setVisibleCount(BATCH_SIZE); }, [processedInventory]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount((c) => Math.min(c + BATCH_SIZE, processedInventory.length)); },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [processedInventory.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleItems = processedInventory.slice(0, visibleCount);
  const hasMore = visibleCount < processedInventory.length;

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
            {visibleItems.map((item, idx) => {
              const isOutOfStock = item.quantity <= 0;
              const isLowStock = item.quantity > 0 && item.quantity < 10;
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={STAGGER_TRANSITION(idx)}
                  key={item.id}
                  className={`bg-white rounded-2xl overflow-hidden flex flex-col cursor-pointer border contain-card active:scale-[0.98] transition-transform ${isOutOfStock ? 'border-red-200' : isLowStock ? 'border-yellow-200' : 'border-gray-200'}`}
                  onClick={() => onItemClick(item)}
                >
                  <div className="relative aspect-square w-full bg-gray-100">
                    <ProductImage
                      src={item.imageUrl}
                      alt={item.name}
                      sizes="(max-width: 768px) 45vw, 200px"
                      className={`object-cover ${isOutOfStock ? 'grayscale opacity-70' : ''}`}
                    />
                    {isOutOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                        <span className="bg-red-500 text-white text-[10px] font-medium px-2.5 py-1 rounded-full shadow-sm">สินค้าหมด</span>
                      </div>
                    )}
                    {onToggleFavorite && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.barcode, !item.favorite); }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                      >
                        <Heart className={`w-4 h-4 ${item.favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                      </button>
                    )}
                  </div>
                  <div className={`px-3 py-2.5 ${isOutOfStock ? 'opacity-60' : ''}`}>
                    {item.brand && (
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-medium border rounded-full mb-1.5 ${brandColor(item.brand)}`}>{item.brand}</span>
                    )}
                    <h3 className="font-semibold text-[13px] text-gray-900 leading-tight line-clamp-2">{[item.brand, item.category, item.series].filter(Boolean).join('') || item.name || item.barcode}</h3>
                    {item.category && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{item.category}</p>}
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-[10px] text-gray-400 font-mono truncate">{item.barcode}</p>
                      {!isOutOfStock && (
                        <p className={`text-[11px] font-medium ${isLowStock ? 'text-yellow-600' : 'text-gray-600'}`}>
                          {item.quantity} ชิ้น
                        </p>
                      )}
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
            {visibleItems.map((item, idx) => (
              <SwipeableListItem key={item.id} item={item} idx={idx} onItemClick={onItemClick} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div ref={loadMoreRef} className="py-4 flex justify-center">
          <div className="grid grid-cols-2 gap-4 w-full">
            {[0, 1].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-white animate-pulse border border-gray-100" />
            ))}
          </div>
        </div>
      )}
    </main>
  );
});
