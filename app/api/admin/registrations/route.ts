import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/api-auth';
import { getPendingRegistrations } from '@/lib/server/registrations';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, ['admin']);
  if (!auth.ok) return auth.response;

  const items = await getPendingRegistrations();
  return NextResponse.json({ items });
}
