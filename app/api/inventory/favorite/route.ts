import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/api-auth';
import { toggleFavoriteInSheet } from '@/lib/server/inventory';

export async function POST(request: NextRequest) {
  const guard = await requireUser(request, ['admin']);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  if (!body?.barcode || typeof body.favorite !== 'boolean') {
    return NextResponse.json({ error: 'barcode and favorite (boolean) are required' }, { status: 400 });
  }

  const result = await toggleFavoriteInSheet(body.barcode, body.favorite);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
