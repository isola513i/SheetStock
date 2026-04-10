import 'server-only';

import { google } from 'googleapis';
import { mockInventory } from '@/lib/mock-data';
import { InventoryApiResponse, InventoryItem, InventoryQuery, InventorySortPreset, InventoryStockFilter } from '@/lib/types';
// Lazy import to avoid circular dependency with inventory-events.ts
let _notifyClients: (() => void) | null = null;

export function setNotifyClients(fn: () => void) {
  _notifyClients = fn;
}

function notifyClientsIfConnected() {
  _notifyClients?.();
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const DEFAULT_SORT: InventorySortPreset = 'nameAsc';

function normalizeNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeOptionalNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeStockFilter(value: string | null): InventoryStockFilter {
  if (value === 'inStock' || value === 'lowStock' || value === 'outOfStock') return value;
  return 'all';
}

function normalizeSort(value: string | null): InventorySortPreset {
  if (value === 'lowStock' || value === 'highStock' || value === 'priceHigh' || value === 'priceLow' || value === 'nameAsc' || value === 'nameDesc' || value === 'expiryAsc' || value === 'expiryDesc') {
    return value;
  }
  return DEFAULT_SORT;
}

function safeString(value: string | null | undefined): string {
  return value == null || value === '' ? '' : String(value);
}

function safeNumber(value: string | null | undefined): number {
  if (value == null || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseExpiryDate(value: string): Date {
  if (!value) return new Date(0);

  // Support DD/MM/YYYY format with Thai Buddhist year
  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);
    if (year > 2400) year -= 543;
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  // Support MM/YYYY format
  const monthYearMatch = value.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthYearMatch) {
    const month = Number(monthYearMatch[1]);
    let year = Number(monthYearMatch[2]);
    if (year > 2400) year -= 543;
    const parsed = new Date(year, month - 1, 1);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export function parseInventoryQuery(searchParams: URLSearchParams): Required<InventoryQuery> {
  const q = searchParams.get('q') ?? '';
  const stock = normalizeStockFilter(searchParams.get('stock'));
  const category = searchParams.get('category') ?? '';
  const brand = searchParams.get('brand') ?? '';
  const series = searchParams.get('series') ?? '';
  const minQty = normalizeOptionalNumber(searchParams.get('minQty')) ?? 0;
  const maxQty = normalizeOptionalNumber(searchParams.get('maxQty')) ?? Number.POSITIVE_INFINITY;
  const minPrice = normalizeOptionalNumber(searchParams.get('minPrice')) ?? 0;
  const maxPrice = normalizeOptionalNumber(searchParams.get('maxPrice')) ?? Number.POSITIVE_INFINITY;
  const sort = normalizeSort(searchParams.get('sort'));
  const sortBy = (searchParams.get('sortBy') ?? 'name') as Required<InventoryQuery>['sortBy'];
  const sortOrder = (searchParams.get('sortOrder') ?? 'asc') as Required<InventoryQuery>['sortOrder'];
  const page = normalizeNumber(searchParams.get('page'), DEFAULT_PAGE);
  const pageSize = Math.min(normalizeNumber(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

  return { q, stock, category, brand, series, minQty, maxQty, minPrice, maxPrice, sort, sortBy, sortOrder, page, pageSize };
}

// In-memory cache for inventory data — avoids redundant Google Sheets calls
let inventoryCache: { data: InventoryItem[]; timestamp: number } | null = null;
const INVENTORY_CACHE_TTL = 60_000; // 1 minute

export function invalidateInventoryCache() {
  inventoryCache = null;
  facetCache = null;
}

export async function loadInventoryFromGoogleSheets(): Promise<InventoryItem[]> {
  if (inventoryCache && Date.now() - inventoryCache.timestamp < INVENTORY_CACHE_TTL) {
    return inventoryCache.data;
  }

  const result = await fetchInventoryFromGoogleSheets();
  inventoryCache = { data: result, timestamp: Date.now() };
  return result;
}

export async function fetchInventoryFromGoogleSheets(): Promise<InventoryItem[]> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
    ?.replace(/^"/, '')
    ?.replace(/"$/, '')
    ?.replace(/\\n/g, '\n')
    ?.replace(/\\"/g, '"')
    ?.trim();
  const apiKey = process.env.GOOGLE_API_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const range = process.env.GOOGLE_SHEETS_RANGE ?? 'inventory!A:K';

  if (!spreadsheetId || (!apiKey && (!clientEmail || !privateKey))) {
    return mockInventory;
  }

  try {
    const sheets = google.sheets({ version: 'v4' });
    let response;

    if (clientEmail && privateKey) {
      try {
        const auth = new google.auth.JWT({
          email: clientEmail,
          key: privateKey,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
          auth,
        });
      } catch (serviceAccountError) {
        if (!apiKey) throw serviceAccountError;
        response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
          key: apiKey,
        });
      }
    } else if (apiKey) {
      response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        key: apiKey,
      });
    } else {
      return mockInventory;
    }

    const rows = (response.data.values ?? []) as (string | undefined | null)[][];
    if (rows.length <= 1) return [];

    return rows.slice(1).map((row, idx) => {
      const barcode = safeString(row[0]);

      return {
        id: barcode || String(idx + 1),
        barcode,
        name: safeString(row[1]),
        category: safeString(row[2]),
        brand: safeString(row[3]),
        series: safeString(row[4]),
        price: safeNumber(row[5]),
        quantity: safeNumber(row[6]),
        expiryDate: safeString(row[7]),
        quantityPerBox: safeNumber(row[8]),
        notes: safeString(row[9]),
        imageUrl: safeString(row[10]),
      };
    });
  } catch (error) {
    console.error('Failed to fetch inventory from Google Sheets', error);
    return mockInventory;
  }
}

// Facet cache: compute facets once per data load, not per request
let facetCache: { data: InventoryItem[]; facets: ReturnType<typeof computeFacets> } | null = null;

function countBy(values: string[]) {
  const map = new Map<string, number>();
  for (const value of values) {
    if (value) map.set(value, (map.get(value) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

function computeFacets(source: InventoryItem[]) {
  return {
    categories: countBy(source.map((item) => item.category)),
    brands: countBy(source.map((item) => item.brand)),
    series: countBy(source.map((item) => item.series)),
  };
}

function getCachedFacets(source: InventoryItem[]) {
  if (!facetCache || facetCache.data !== source) {
    facetCache = { data: source, facets: computeFacets(source) };
  }
  return facetCache.facets;
}

export async function getInventoryData(query: Required<InventoryQuery>): Promise<InventoryApiResponse> {
  const source = await loadInventoryFromGoogleSheets();
  const cachedFacets = getCachedFacets(source);
  const lowerQ = query.q.trim().toLowerCase();
  const barcodeQuery = /^\d{6,}$/.test(query.q.trim()) ? query.q.trim() : '';

  const filtered = source.filter((item) => {
    const matchQuery =
      !lowerQ ||
      item.name.toLowerCase().includes(lowerQ) ||
      item.barcode.toLowerCase().includes(lowerQ) ||
      item.category.toLowerCase().includes(lowerQ) ||
      item.brand.toLowerCase().includes(lowerQ) ||
      item.series.toLowerCase().includes(lowerQ) ||
      item.notes.toLowerCase().includes(lowerQ);

    const matchBarcodePriority = !barcodeQuery || item.barcode === barcodeQuery;

    const matchCategory = !query.category || item.category === query.category;
    const matchBrand = !query.brand || item.brand === query.brand;
    const matchSeries = !query.series || item.series === query.series;

    const matchStock =
      query.stock === 'all' ||
      (query.stock === 'outOfStock' && item.quantity <= 0) ||
      (query.stock === 'lowStock' && item.quantity > 0 && item.quantity < 10) ||
      (query.stock === 'inStock' && item.quantity > 0);

    const matchQty = item.quantity >= query.minQty && item.quantity <= query.maxQty;
    const matchPrice = item.price >= query.minPrice && item.price <= query.maxPrice;

    return matchQuery && matchBarcodePriority && matchCategory && matchBrand && matchSeries && matchStock && matchQty && matchPrice;
  });

  filtered.sort((a, b) => {
    if (query.sort === 'lowStock') return a.quantity - b.quantity;
    if (query.sort === 'highStock') return b.quantity - a.quantity;
    if (query.sort === 'priceHigh') return b.price - a.price;
    if (query.sort === 'priceLow') return a.price - b.price;
    if (query.sort === 'nameAsc') return a.name.localeCompare(b.name, 'th');
    if (query.sort === 'nameDesc') return b.name.localeCompare(a.name, 'th');
    if (query.sort === 'expiryAsc') return parseExpiryDate(a.expiryDate).getTime() - parseExpiryDate(b.expiryDate).getTime();
    if (query.sort === 'expiryDesc') return parseExpiryDate(b.expiryDate).getTime() - parseExpiryDate(a.expiryDate).getTime();

    // Fallback
    let comparison = 0;
    if (query.sortBy === 'name') comparison = a.name.localeCompare(b.name, 'th');
    if (query.sortBy === 'quantity') comparison = a.quantity - b.quantity;
    if (query.sortBy === 'price') comparison = a.price - b.price;
    return query.sortOrder === 'asc' ? comparison : -comparison;
  });

  const start = (query.page - 1) * query.pageSize;
  const paged = filtered.slice(start, start + query.pageSize);

  return {
    items: paged,
    total: filtered.length,
    page: query.page,
    pageSize: query.pageSize,
    availableFacets: cachedFacets,
  };
}

export type NewProduct = {
  barcode: string;
  name: string;
  category: string;
  brand: string;
  series: string;
  price: number;
  quantity: number;
  expiryDate: string;
  quantityPerBox: number;
  notes: string;
  imageUrl: string;
};

export async function appendProductToGoogleSheets(product: NewProduct): Promise<{ ok: boolean; error?: string }> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
    ?.replace(/^"/, '')
    ?.replace(/"$/, '')
    ?.replace(/\\n/g, '\n')
    ?.replace(/\\"/g, '"')
    ?.trim();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const range = process.env.GOOGLE_SHEETS_RANGE ?? 'inventory!A:K';

  if (!spreadsheetId || !clientEmail || !privateKey) {
    return { ok: false, error: 'Google Sheets credentials not configured' };
  }

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4' });
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      auth,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          product.barcode,
          product.name,
          product.category,
          product.brand,
          product.series,
          product.price,
          product.quantity,
          product.expiryDate,
          product.quantityPerBox,
          product.notes,
          product.imageUrl,
        ]],
      },
    });

    // Clear cache so next fetch picks up the new row
    inventoryCache = null;
    facetCache = null;
    notifyClientsIfConnected();

    return { ok: true };
  } catch (error) {
    console.error('Failed to append product to Google Sheets', error);
    return { ok: false, error: 'Failed to write to Google Sheets' };
  }
}

export async function findProductByBarcode(barcode: string): Promise<InventoryItem | null> {
  const items = await loadInventoryFromGoogleSheets();
  return items.find((item) => item.barcode === barcode) ?? null;
}

export async function updateProductQuantityInSheet(barcode: string, addQuantity: number): Promise<{ ok: boolean; newQuantity: number; error?: string }> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
    ?.replace(/^"/, '')
    ?.replace(/"$/, '')
    ?.replace(/\\n/g, '\n')
    ?.replace(/\\"/g, '"')
    ?.trim();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const range = process.env.GOOGLE_SHEETS_RANGE ?? 'inventory!A:K';

  if (!spreadsheetId || !clientEmail || !privateKey) {
    return { ok: false, newQuantity: 0, error: 'Google Sheets credentials not configured' };
  }

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4' });
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range, auth });
    const rows = (response.data.values ?? []) as string[][];

    // Find row index (skip header at index 0)
    const rowIndex = rows.findIndex((row, idx) => idx > 0 && safeString(row[0]) === barcode);
    if (rowIndex === -1) {
      return { ok: false, newQuantity: 0, error: 'Product not found in sheet' };
    }

    const currentQty = safeNumber(rows[rowIndex][6]);
    const newQuantity = currentQty + addQuantity;

    // Update column G (quantity) — sheet rows are 1-indexed, so rowIndex+1
    const sheetName = range.split('!')[0] || 'inventory';
    const cellRange = `${sheetName}!G${rowIndex + 1}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: cellRange,
      auth,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[newQuantity]] },
    });

    inventoryCache = null;
    facetCache = null;
    notifyClientsIfConnected();

    return { ok: true, newQuantity };
  } catch (error) {
    console.error('Failed to update product quantity', error);
    return { ok: false, newQuantity: 0, error: 'Failed to update quantity' };
  }
}
