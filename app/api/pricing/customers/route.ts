import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/api-auth';
import { getCustomers } from '@/lib/server/pricing';

export async function GET(request: NextRequest) {
  const guard = requireUser(request, ['admin', 'sale']);
  if (!guard.ok) return guard.response;

  const customers = getCustomers().filter((item) => {
    if (guard.user.role === 'admin') return true;
    return item.saleOwnerId === guard.user.id;
  });

  return NextResponse.json({ items: customers });
}
