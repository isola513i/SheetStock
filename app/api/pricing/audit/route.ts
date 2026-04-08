import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/api-auth';
import { getAuditLogs } from '@/lib/server/pricing';

export async function GET(request: NextRequest) {
  const guard = requireUser(request, ['admin', 'sale']);
  if (!guard.ok) return guard.response;
  return NextResponse.json({ items: getAuditLogs() });
}
