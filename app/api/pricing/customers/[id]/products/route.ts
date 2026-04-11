import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/api-auth';
import { bulkUpdateCustomerPrices, getPricingRowsForCustomer } from '@/lib/server/pricing';

type Params = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: Params) {
  const guard = await requireUser(request, ['admin', 'sale']);
  if (!guard.ok) return guard.response;
  const { id } = await params;
  return NextResponse.json({ customerId: id, items: await getPricingRowsForCustomer(id) });
}

export async function POST(request: NextRequest, { params }: Params) {
  const guard = await requireUser(request, ['admin', 'sale']);
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const productIds = Array.isArray(body?.productIds) ? body.productIds.filter((item: unknown) => typeof item === 'string') : [];
  const adjustmentType = body?.adjustmentType === 'fixed' ? 'fixed' : 'percent';
  const adjustmentValue = Number(body?.adjustmentValue ?? 0);
  const reason = typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim() : 'Bulk update';

  if (!productIds.length) {
    return NextResponse.json({ error: 'productIds is required' }, { status: 400 });
  }

  return NextResponse.json({
    customerId: id,
    result: await bulkUpdateCustomerPrices({
      actorId: guard.user.id,
      customerId: id,
      productIds,
      adjustmentType,
      adjustmentValue,
      reason,
    }),
  });
}
