import { NextRequest, NextResponse } from 'next/server';
import { getInventoryData, parseInventoryQuery } from '@/lib/server/inventory';

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const query = parseInventoryQuery(request.nextUrl.searchParams);
    const data = await getInventoryData(query);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('GET /api/inventory failed', error);
    return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 });
  }
}
