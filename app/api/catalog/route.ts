import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/api-auth';
import { getCatalogForCustomer } from '@/lib/server/pricing';

export async function GET(request: NextRequest) {
  const guard = requireUser(request, ['customer', 'sale', 'admin']);
  if (!guard.ok) return guard.response;

  const requestedCustomerId = request.nextUrl.searchParams.get('customerId');
  const customerId =
    guard.user.role === 'customer'
      ? guard.user.customerId
      : requestedCustomerId;

  if (!customerId) {
    return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
  }

  return NextResponse.json({
    customerId,
    items: await getCatalogForCustomer(customerId),
  });
}
