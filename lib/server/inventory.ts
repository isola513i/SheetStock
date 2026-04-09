import 'server-only';

import { google } from 'googleapis';
import { mockInventory } from '@/lib/mock-data';
import { InventoryApiResponse, InventoryDateRange, InventoryItem, InventoryQuery, InventorySortPreset, InventoryStockFilter } from '@/lib/types';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const DEFAULT_SORT: InventorySortPreset = 'latest';

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

function normalizeDateRange(value: string | null): InventoryDateRange {
  if (value === 'today' || value === '7d' || value === '30d') return value;
  return 'all';
}

function normalizeStockFilter(value: string | null): InventoryStockFilter {
  if (value === 'inStock' || value === 'lowStock' || value === 'outOfStock') return value;
  return 'all';
}

function normalizeSort(value: string | null): InventorySortPreset {
  if (value === 'lowStock' || value === 'highStock' || value === 'priceHigh' || value === 'priceLow' || value === 'nameAsc' || value === 'nameDesc') {
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

function parseInventoryDate(value: string): Date {
  if (!value) return new Date(0);

  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);
    if (year > 2400) year -= 543; // Convert Thai Buddhist year to CE.
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export function parseInventoryQuery(searchParams: URLSearchParams): Required<InventoryQuery> {
  const q = searchParams.get('q') ?? '';
  const reason = searchParams.get('reason') ?? '';
  const stock = normalizeStockFilter(searchParams.get('stock'));
  const dateRange = normalizeDateRange(searchParams.get('dateRange'));
  const minQty = normalizeOptionalNumber(searchParams.get('minQty')) ?? 0;
  const maxQty = normalizeOptionalNumber(searchParams.get('maxQty')) ?? Number.POSITIVE_INFINITY;
  const minPrice = normalizeOptionalNumber(searchParams.get('minPrice')) ?? 0;
  const maxPrice = normalizeOptionalNumber(searchParams.get('maxPrice')) ?? Number.POSITIVE_INFINITY;
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const type = searchParams.get('type') ?? '';
  const sort = normalizeSort(searchParams.get('sort'));
  const sortBy = (searchParams.get('sortBy') ?? 'date') as Required<InventoryQuery>['sortBy'];
  const sortOrder = (searchParams.get('sortOrder') ?? 'desc') as Required<InventoryQuery>['sortOrder'];
  const page = normalizeNumber(searchParams.get('page'), DEFAULT_PAGE);
  const pageSize = Math.min(normalizeNumber(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

  return { q, reason, stock, dateRange, minQty, maxQty, minPrice, maxPrice, from, to, type, sort, sortBy, sortOrder, page, pageSize };
}

export async function loadInventoryFromGoogleSheets(): Promise<InventoryItem[]> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
    ?.replace(/^"/, '')
    ?.replace(/"$/, '')
    ?.replace(/\\n/g, '\n')
    ?.replace(/\\"/g, '"')
    ?.trim();
  const apiKey = process.env.GOOGLE_API_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const range = process.env.GOOGLE_SHEETS_RANGE ?? 'inventory!A:W';

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
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
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
      const boxBarcode = safeString(row[5]);
      const itemBarcode = safeString(row[6]);

      return {
        id: itemBarcode || boxBarcode || String(idx + 1),
        date: safeString(row[0]),
        mainReason: safeString(row[1]),
        dataType: safeString(row[2]),
        fromLocation: safeString(row[3]),
        toLocation: safeString(row[4]),
        boxBarcode,
        itemBarcode,
        countedQuantity: safeNumber(row[7]),
        totalQuantity: safeNumber(row[8]),
        storePrice: safeNumber(row[9]),
        changedPrice: safeNumber(row[10]),
        // Prefer "URL ของรูป" (column O) for UI thumbnails.
        imageUrl: safeString(row[14]) || safeString(row[11]),
        expiryImageUrl: safeString(row[12]),
        perBoxImageUrl: safeString(row[13]),
        imageLinkUrl: safeString(row[14]),
        totalScanTime: safeString(row[15]),
        ofHowManyItems: safeNumber(row[16]),
        countNumber: safeNumber(row[17]),
        totalPiecesCounted: safeNumber(row[19]),
        details: safeString(row[20]),
      };
    });
  } catch (error) {
    console.error('Failed to fetch inventory from Google Sheets', error);
    return mockInventory;
  }
}

export async function getInventoryData(query: Required<InventoryQuery>): Promise<InventoryApiResponse> {
  const source = await loadInventoryFromGoogleSheets();
  const lowerQ = query.q.trim().toLowerCase();
  const barcodeQuery = /^\d{6,}$/.test(query.q.trim()) ? query.q.trim() : '';
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const filtered = source.filter((item) => {
    const matchQuery =
      !lowerQ ||
      item.details.toLowerCase().includes(lowerQ) ||
      item.itemBarcode.toLowerCase().includes(lowerQ) ||
      item.boxBarcode.toLowerCase().includes(lowerQ);

    const matchBarcodePriority =
      !barcodeQuery || item.itemBarcode === barcodeQuery || item.boxBarcode === barcodeQuery;

    const matchReason = !query.reason || item.mainReason === query.reason;
    const matchType = !query.type || item.dataType === query.type;
    const matchFrom = !query.from || item.fromLocation === query.from;
    const matchTo = !query.to || item.toLocation === query.to;

    const matchStock =
      query.stock === 'all' ||
      (query.stock === 'outOfStock' && item.totalQuantity <= 0) ||
      (query.stock === 'lowStock' && item.totalQuantity > 0 && item.totalQuantity < 10) ||
      (query.stock === 'inStock' && item.totalQuantity > 0);

    const dateValue = parseInventoryDate(item.date);
    const matchDate =
      query.dateRange === 'all' ||
      (query.dateRange === 'today' && dateValue.toDateString() === now.toDateString()) ||
      (query.dateRange === '7d' && dateValue >= sevenDaysAgo) ||
      (query.dateRange === '30d' && dateValue >= thirtyDaysAgo);

    const matchQty = item.totalQuantity >= query.minQty && item.totalQuantity <= query.maxQty;
    const matchPrice = item.storePrice >= query.minPrice && item.storePrice <= query.maxPrice;

    return matchQuery && matchBarcodePriority && matchReason && matchType && matchFrom && matchTo && matchStock && matchDate && matchQty && matchPrice;
  });

  filtered.sort((a, b) => {
    if (query.sort === 'latest') return parseInventoryDate(b.date).getTime() - parseInventoryDate(a.date).getTime();
    if (query.sort === 'lowStock') return a.totalQuantity - b.totalQuantity;
    if (query.sort === 'highStock') return b.totalQuantity - a.totalQuantity;
    if (query.sort === 'priceHigh') return b.storePrice - a.storePrice;
    if (query.sort === 'priceLow') return a.storePrice - b.storePrice;
    if (query.sort === 'nameAsc') return a.details.localeCompare(b.details, 'th');
    if (query.sort === 'nameDesc') return b.details.localeCompare(a.details, 'th');

    // Backward-compatible fallback
    let comparison = 0;
    if (query.sortBy === 'date') comparison = parseInventoryDate(a.date).getTime() - parseInventoryDate(b.date).getTime();
    if (query.sortBy === 'quantity') comparison = a.totalQuantity - b.totalQuantity;
    if (query.sortBy === 'price') comparison = a.storePrice - b.storePrice;
    return query.sortOrder === 'asc' ? comparison : -comparison;
  });

  const start = (query.page - 1) * query.pageSize;
  const paged = filtered.slice(start, start + query.pageSize);

  const countBy = (values: string[]) => {
    const map = new Map<string, number>();
    values.filter(Boolean).forEach((value) => {
      map.set(value, (map.get(value) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  };

  const availableFacets = {
    reasons: countBy(source.map((item) => item.mainReason)),
    dataTypes: countBy(source.map((item) => item.dataType)),
    fromLocations: countBy(source.map((item) => item.fromLocation)),
    toLocations: countBy(source.map((item) => item.toLocation)),
  };

  return {
    items: paged,
    total: filtered.length,
    page: query.page,
    pageSize: query.pageSize,
    reasons: availableFacets.reasons.map((item) => item.value),
    availableFacets,
  };
}
