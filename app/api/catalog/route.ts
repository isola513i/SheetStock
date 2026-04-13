import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/server/api-auth';
import { loadInventoryFromGoogleSheets, invalidateInventoryCache } from '@/lib/server/inventory';
import { findUserByPhone, getUserAccessTier } from '@/lib/server/users-sheet';
import type { AccessTier, CatalogItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { user } = await getRequestUser(request);

  // Cache-busting: only admin/sale can invalidate cache
  if (request.nextUrl.searchParams.get('refresh') === 'true' && user && (user.role === 'admin' || user.role === 'sale')) {
    invalidateInventoryCache();
  }

  let accessTier: AccessTier = 'public';
  if (user) {
    if (user.role === 'admin' || user.role === 'sale') {
      accessTier = 'vvip';
    } else {
      const sheetUser = user.phone ? await findUserByPhone(user.phone) : null;
      accessTier = sheetUser ? getUserAccessTier(sheetUser) : 'public';
    }
  }

  const products = await loadInventoryFromGoogleSheets();

  const items: CatalogItem[] = products.map((item) => {
    const base: CatalogItem = {
      productId: item.id,
      barcode: item.barcode,
      name: item.name,
      category: item.category,
      brand: item.brand,
      series: item.series,
      imageUrl: item.imageUrl,
      stock: item.quantity,
      quantityPerBox: item.quantityPerBox,
      expiryDate: item.expiryDate,
      price: item.price,
    };

    if ((accessTier === 'vip' || accessTier === 'vvip') && item.vipPrice > 0) {
      base.vipPrice = item.vipPrice;
    }
    if (accessTier === 'vvip' && item.vvipPrice > 0) {
      base.vvipPrice = item.vvipPrice;
    }

    return base;
  });

  return NextResponse.json({
    accessTier,
    isLoggedIn: !!user,
    userRole: user?.role ?? null,
    userName: user?.name ?? null,
    items,
  });
}
