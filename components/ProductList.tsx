'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { InventoryItem, InventoryViewMode } from '@/lib/types';

const BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
const FALLBACK_IMAGE_SRC = '/icons/icon-192x192.png';

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

export function ProductList({ processedInventory, viewMode, onItemClick }: ProductListProps) {
  // #region agent log
  useEffect(() => {
    const sample = processedInventory.slice(0, 20).map((item) => item.imageUrl);
    const invalid = sample.filter((value) => {
      if (!value) return true;
      if (value.startsWith('/')) return false;
      if (value.startsWith('http://') || value.startsWith('https://')) return false;
      return true;
    });
    fetch('http://127.0.0.1:7562/ingest/23774785-1479-4541-8a3e-191135ee76a3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a00100'},body:JSON.stringify({sessionId:'a00100',runId:'pre-fix-3',hypothesisId:'H4',location:'components/ProductList.tsx:26',message:'Image src shape snapshot',data:{viewMode,totalItems:processedInventory.length,sampled:sample.length,invalidCount:invalid.length,firstInvalid:invalid[0] ?? null},timestamp:Date.now()})}).catch(()=>{});
  }, [processedInventory, viewMode]);
  // #endregion
  // #region agent log
  useEffect(() => {
    const sample = processedInventory.slice(0, 20).map((item) => toSafeImageSrc(item.imageUrl));
    const invalid = sample.filter((value) => !value || (!value.startsWith('/') && !value.startsWith('http://') && !value.startsWith('https://')));
    fetch('http://127.0.0.1:7562/ingest/23774785-1479-4541-8a3e-191135ee76a3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a00100'},body:JSON.stringify({sessionId:'a00100',runId:'post-fix-1',hypothesisId:'H4',location:'components/ProductList.tsx:44',message:'Normalized image src snapshot',data:{totalItems:processedInventory.length,sampled:sample.length,invalidCount:invalid.length,firstNormalized:sample[0] ?? null},timestamp:Date.now()})}).catch(()=>{});
  }, [processedInventory]);
  // #endregion

  return (
    <main className="px-5 pb-6">
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            {processedInventory.map((item, idx) => {
              const isOutOfStock = item.totalQuantity <= 0;
              const isLowStock = item.totalQuantity > 0 && item.totalQuantity < 10;
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  key={item.id}
                  className={`bg-white rounded-[1.5rem] p-4 flex flex-col cursor-pointer border ${isOutOfStock ? 'border-red-200 bg-red-50/30' : isLowStock ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-200'}`}
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
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-3"
          >
            {processedInventory.map((item, idx) => {
              const isOutOfStock = item.totalQuantity <= 0;
              const isLowStock = item.totalQuantity > 0 && item.totalQuantity < 10;
              return (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  key={item.id}
                  className={`bg-white rounded-[1.2rem] p-3 flex items-center gap-4 cursor-pointer border transition-colors ${isOutOfStock ? 'border-red-200 bg-red-50/30' : isLowStock ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-200'}`}
                  onClick={() => onItemClick(item)}
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
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
