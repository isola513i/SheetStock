import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/api-auth';
import { findProductByBarcode, updateProductQuantityInSheet } from '@/lib/server/inventory';

// GET: Look up barcode — check inventory + fetch from Open Food Facts if not found
export async function GET(request: NextRequest) {
  const guard = requireUser(request, ['admin']);
  if (!guard.ok) return guard.response;

  const barcode = request.nextUrl.searchParams.get('barcode')?.trim();
  if (!barcode) {
    return NextResponse.json({ error: 'barcode is required' }, { status: 400 });
  }

  // Check if product exists in inventory
  const existing = await findProductByBarcode(barcode);
  if (existing) {
    return NextResponse.json({ exists: true, item: existing });
  }

  // Product not found — try Open Food Facts for auto-fill suggestions
  const suggestion = await fetchOpenFoodFacts(barcode);
  return NextResponse.json({ exists: false, suggestion });
}

// POST: Add quantity to existing product
export async function POST(request: NextRequest) {
  const guard = requireUser(request, ['admin']);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  if (!body?.barcode || typeof body.addQuantity !== 'number' || body.addQuantity <= 0) {
    return NextResponse.json({ error: 'barcode and positive addQuantity are required' }, { status: 400 });
  }

  const result = await updateProductQuantityInSheet(body.barcode, body.addQuantity);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, newQuantity: result.newQuantity });
}

// Fetch product info from Open Food Facts (free, no API key needed)
async function fetchOpenFoodFacts(barcode: string) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    return {
      name: p.product_name_th || p.product_name || '',
      brand: p.brands || '',
      category: p.categories_tags?.[0]?.replace('en:', '') || p.categories || '',
      imageUrl: p.image_front_url || p.image_url || '',
    };
  } catch {
    return null;
  }
}
