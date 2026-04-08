import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/api-auth';
import { bulkUpdateCustomerPrices } from '@/lib/server/pricing';

export async function POST(request: NextRequest) {
  const guard = requireUser(request, ['admin', 'sale']);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  const customerId = typeof body?.customerId === 'string' ? body.customerId : '';
  const productIds = Array.isArray(body?.productIds) ? body.productIds.filter((item: unknown) => typeof item === 'string') : [];
  const adjustmentType = body?.adjustmentType === 'fixed' ? 'fixed' : 'percent';
  const adjustmentValue = Number(body?.adjustmentValue ?? 0);
  const reason = typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim() : 'Bulk update';

  if (!customerId || !productIds.length) {
    return NextResponse.json({ error: 'customerId and productIds are required' }, { status: 400 });
  }

  return NextResponse.json({
    customerId,
    result: bulkUpdateCustomerPrices({
      actorId: guard.user.id,
      customerId,
      productIds,
      adjustmentType,
      adjustmentValue,
      reason,
    }),
  });
}
