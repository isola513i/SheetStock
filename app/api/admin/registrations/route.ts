import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/api-auth';
import { getPendingRegistrations } from '@/lib/server/registrations';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, ['admin']);
  if (!auth.ok) return auth.response;

  const items = getPendingRegistrations();
  return NextResponse.json({ items });
}
