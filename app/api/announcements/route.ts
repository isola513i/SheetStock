import { NextRequest, NextResponse } from 'next/server';
import { applyTokenRefresh, requireUser } from '@/lib/server/api-auth';
import { loadAnnouncements, saveAnnouncements } from '@/lib/server/announcements';

export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await loadAnnouncements();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, ['admin']);
  if (!auth.ok) return auth.response;

  const payload = (await request.json().catch(() => null)) as { items?: unknown } | null;
  const messages = Array.isArray(payload?.items)
    ? payload.items.filter((item): item is string => typeof item === 'string')
    : [];

  const items = await saveAnnouncements(messages);
  return applyTokenRefresh(NextResponse.json({ items }), auth);
}
