'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';

type CatalogResponse = {
  customerId: string;
  items: Array<{
    productId: string;
    name: string;
    imageUrl: string;
    stock: number;
    finalPrice: number;
    priceSource: 'base' | 'tier' | 'override';
  }>;
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch catalog');
  }
  return (await response.json()) as CatalogResponse;
};

export default function CatalogPage() {
  const router = useRouter();
  const { data, isLoading } = useSWR('/api/catalog', fetcher, { revalidateOnFocus: true });

  const onLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  return (
    <main className="min-h-dvh bg-[#F2F2F7] px-5 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl text-gray-900">สินค้าแนะนำ</h1>
        <button type="button" onClick={onLogout} className="h-10 rounded-full bg-white border border-gray-200 px-4 text-xs text-gray-600">
          ออกจากระบบ
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-24 rounded-2xl bg-white border border-gray-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.items ?? []).map((item) => (
            <div key={item.productId} className="rounded-2xl border border-gray-200 bg-white p-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded-lg object-cover bg-gray-100" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-900">{item.name}</p>
                <p className="mt-1 text-xs text-gray-500">คงเหลือ {item.stock}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[var(--brand-primary)]">฿{item.finalPrice.toFixed(2)}</p>
                <p className="mt-1 text-[10px] text-gray-400">{item.priceSource}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
