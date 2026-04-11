import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/api-auth';
import { getApprovals } from '@/lib/server/pricing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guard = await requireUser(request, ['admin', 'sale']);
  if (!guard.ok) return guard.response;
  return NextResponse.json({ items: getApprovals() });
}
