import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/api-auth';
import { upsertCustomerProductPrice } from '@/lib/server/pricing';

type Params = { params: Promise<{ id: string; productId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const guard = requireUser(request, ['admin', 'sale']);
  if (!guard.ok) return guard.response;
  const { id, productId } = await params;

  const body = await request.json().catch(() => null);
  const price = Number(body?.price);
  const reason = typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim() : 'Manual override';

  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: 'price must be a valid number' }, { status: 400 });
  }

  try {
    const result = upsertCustomerProductPrice({
      actorId: guard.user.id,
      customerId: id,
      productId,
      price,
      reason,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
  }
}
