import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/api-auth';
import { appendProductToGoogleSheets, findProductByBarcode } from '@/lib/server/inventory';

export async function POST(request: NextRequest) {
  const guard = requireUser(request, ['admin']);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { barcode, name, category, brand, series, price, quantity, expiryDate, quantityPerBox, notes, imageUrl } = body;

  // Validate required fields
  const missing: string[] = [];
  if (!barcode || typeof barcode !== 'string') missing.push('barcode');
  if (!name || typeof name !== 'string') missing.push('name');
  if (!category || typeof category !== 'string') missing.push('category');
  if (!brand || typeof brand !== 'string') missing.push('brand');
  if (!series || typeof series !== 'string') missing.push('series');
  if (price == null || typeof price !== 'number' || price < 0) missing.push('price');
  if (quantity == null || typeof quantity !== 'number' || quantity < 0) missing.push('quantity');

  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing or invalid fields: ${missing.join(', ')}` }, { status: 400 });
  }

  // Check for duplicate barcode
  const existing = await findProductByBarcode(String(barcode).trim());
  if (existing) {
    return NextResponse.json({ error: 'สินค้าบาร์โค้ดนี้มีในระบบแล้ว' }, { status: 409 });
  }

  const result = await appendProductToGoogleSheets({
    barcode: String(barcode).trim(),
    name: String(name).trim(),
    category: String(category).trim(),
    brand: String(brand).trim(),
    series: String(series).trim(),
    price: Number(price),
    quantity: Number(quantity),
    expiryDate: String(expiryDate ?? '').trim(),
    quantityPerBox: Number(quantityPerBox ?? 0),
    notes: String(notes ?? '').trim(),
    imageUrl: String(imageUrl ?? '').trim(),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
