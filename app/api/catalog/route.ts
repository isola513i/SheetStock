import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/api-auth';
import { getCatalogForCustomer, getCustomers } from '@/lib/server/pricing';
import { loadInventoryFromGoogleSheets } from '@/lib/server/inventory';

export async function GET(request: NextRequest) {
  const guard = await requireUser(request, ['customer', 'sale', 'admin']);
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
      barcode: item.barcode,
      name: item.name,
      category: item.category,
      brand: item.brand,
      series: item.series,
      imageUrl: item.imageUrl,
      stock: item.quantity,
      expiryDate: item.expiryDate,
      basePrice: item.price,
      tierPrice: item.price,
      finalPrice: item.price,
      priceSource: 'base' as const,
      minAllowedPrice: Math.round(item.price * 0.85 * 100) / 100,
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
