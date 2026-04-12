import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/server/api-auth';
import { loadInventoryFromGoogleSheets } from '@/lib/server/inventory';
import { findUserByPhone, findUserByEmail, getUserAccessTier } from '@/lib/server/users-sheet';
import type { AccessTier, CatalogItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { user } = await getRequestUser(request);

  let accessTier: AccessTier = 'public';
  if (user) {
    if (user.role === 'admin' || user.role === 'sale') {
      accessTier = 'vvip';
    } else {
      const sheetUser = user.phone
        ? await findUserByPhone(user.phone)
        : user.email
          ? await findUserByEmail(user.email)
          : null;
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

    if (accessTier === 'vip') {
      base.vipPrice = item.vipPrice || undefined;
    }
    if (accessTier === 'vvip') {
      base.vvipPrice = item.vvipPrice || undefined;
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
