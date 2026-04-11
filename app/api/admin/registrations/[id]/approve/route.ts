import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/api-auth';
import { approveRegistration } from '@/lib/server/registrations';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ['admin']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const tierId = body?.tierId;

  if (!tierId) {
    return NextResponse.json({ error: 'กรุณาเลือกระดับลูกค้า' }, { status: 400 });
  }

  const result = await approveRegistration(id, tierId, auth.user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
