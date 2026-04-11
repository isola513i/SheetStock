import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/api-auth';
import { findProductByBarcode, updateProductQuantityInSheet } from '@/lib/server/inventory';

// GET: Look up barcode — check inventory + fetch from external databases if not found
export async function GET(request: NextRequest) {
  const guard = await requireUser(request, ['admin']);
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

  // Product not found — try multiple databases for auto-fill suggestions
  const suggestion = await lookupBarcode(barcode);
  return NextResponse.json({ exists: false, suggestion });
}

// POST: Add quantity to existing product
export async function POST(request: NextRequest) {
  const guard = await requireUser(request, ['admin']);
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

// --- Product suggestion type ---

type ProductSuggestion = {
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
};

// --- Lookup barcode across multiple databases ---

const UNRELIABLE_NAMES = /^(to be deleted|test|todo|n\/a|unknown|\.+|x+|\?+)$/i;

function cleanSuggestion(s: ProductSuggestion | null): ProductSuggestion | null {
  if (!s) return null;
  if (!s.name || s.name.length < 2 || UNRELIABLE_NAMES.test(s.name.trim())) {
    s.name = '';
  }
  return (s.name || s.brand) ? s : null;
}

async function lookupBarcode(barcode: string): Promise<ProductSuggestion | null> {
  // Try Open Food Facts + Open Beauty Facts in parallel
  const [food, beauty] = await Promise.all([
    fetchOpenFoodFacts(barcode),
    fetchOpenBeautyFacts(barcode),
  ]);

  // Prefer whichever returned more complete data
  if (food && beauty) {
    const cleanFood = cleanSuggestion(food);
    const cleanBeauty = cleanSuggestion(beauty);
    if (cleanFood && cleanBeauty) {
      const foodScore = [cleanFood.name, cleanFood.brand, cleanFood.category, cleanFood.imageUrl].filter(Boolean).length;
      const beautyScore = [cleanBeauty.name, cleanBeauty.brand, cleanBeauty.category, cleanBeauty.imageUrl].filter(Boolean).length;
      return beautyScore > foodScore ? cleanBeauty : cleanFood;
    }
    return cleanFood || cleanBeauty;
  }

  if (food) return cleanSuggestion(food);
  if (beauty) return cleanSuggestion(beauty);

  // Fallback: UPC ItemDB
  return cleanSuggestion(await fetchUpcItemDb(barcode));
}

// --- Open Food Facts (food, snacks, beverages) ---

async function fetchOpenFoodFacts(barcode: string): Promise<ProductSuggestion | null> {
  return fetchOpenDatabase(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`);
}

// --- Open Beauty Facts (skincare, cosmetics, K-beauty) ---

async function fetchOpenBeautyFacts(barcode: string): Promise<ProductSuggestion | null> {
  return fetchOpenDatabase(`https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`);
}

// Shared parser for Open Food Facts / Open Beauty Facts (same API format)
async function fetchOpenDatabase(url: string): Promise<ProductSuggestion | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    return {
      name: p.product_name_ko || p.product_name_th || p.product_name || '',
      brand: p.brands || '',
      category: p.categories_tags?.[0]?.replace(/^[a-z]{2}:/, '') || p.categories || '',
      imageUrl: p.image_front_url || p.image_url || '',
    };
  } catch {
    return null;
  }
}

// --- UPC ItemDB (broad international coverage, free tier) ---

async function fetchUpcItemDb(barcode: string): Promise<ProductSuggestion | null> {
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.items?.length) return null;

    const item = data.items[0];
    return {
      name: item.title || '',
      brand: item.brand || '',
      category: item.category || '',
      imageUrl: item.images?.[0] || '',
    };
  } catch {
    return null;
  }
}
