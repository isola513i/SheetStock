import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/api-auth';
import { getCatalogForCustomer, getCustomers } from '@/lib/server/pricing';
import { loadInventoryFromGoogleSheets } from '@/lib/server/inventory';

export async function GET(request: NextRequest) {
  const guard = requireUser(request, ['customer', 'sale', 'admin']);
  if (!guard.ok) return guard.response;

  const requestedCustomerId = request.nextUrl.searchParams.get('customerId');
  const customerId =
    guard.user.role === 'customer'
      ? guard.user.customerId
      : requestedCustomerId;

  // If admin/sale without customerId, show all products at base price
  if (!customerId) {
    const products = await loadInventoryFromGoogleSheets();
    const items = products.map((item) => ({
      productId: item.id,
      name: item.details,
      imageUrl: item.imageUrl,
      stock: item.totalQuantity,
      finalPrice: item.storePrice || item.changedPrice || 0,
      priceSource: 'base' as const,
    }));
    return NextResponse.json({
      customerId: null,
      customers: getCustomers().map((c) => ({ id: c.id, name: c.name })),
      items,
    });
  }

  return NextResponse.json({
    customerId,
    customers: guard.user.role !== 'customer'
      ? getCustomers().map((c) => ({ id: c.id, name: c.name }))
      : undefined,
    items: await getCatalogForCustomer(customerId),
  });
}
