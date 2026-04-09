import { NextRequest, NextResponse } from 'next/server';
import { approveRequest } from '@/lib/server/pricing';
import { requireUser } from '@/lib/server/api-auth';

type Params = { params: Promise<{ approvalId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const guard = requireUser(request, ['admin']);
  if (!guard.ok) return guard.response;

  const { approvalId } = await params;
  try {
    const result = await approveRequest({ approvalId, actorId: guard.user.id });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
  }
}
