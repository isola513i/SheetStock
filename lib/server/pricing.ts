import 'server-only';

import { randomUUID } from 'node:crypto';
import { loadInventoryFromGoogleSheets } from '@/lib/server/inventory';
import { mockInventory } from '@/lib/mock-data';
import type {
  CatalogItem,
  CustomerAccount,
  CustomerProductOverride,
  InventoryItem,
  PriceApprovalRequest,
  PriceAuditLog,
  PriceSource,
  PriceTier,
} from '@/lib/types';

const priceTiers: PriceTier[] = [
  { id: 'tier-bronze', name: 'Bronze', discountType: 'percent', discountValue: 0 },
  { id: 'tier-silver', name: 'Silver', discountType: 'percent', discountValue: 5 },
  { id: 'tier-gold', name: 'Gold', discountType: 'percent', discountValue: 10 },
];

const customers: CustomerAccount[] = [
  { id: 'c-001', name: 'ร้านเจริญพาณิชย์', tierId: 'tier-silver', saleOwnerId: 'u-sale-a', status: 'active' },
  { id: 'c-002', name: 'ร้านรุ่งเรืองเทรด', tierId: 'tier-gold', saleOwnerId: 'u-sale-a', status: 'active' },
];

const overrides: CustomerProductOverride[] = [
  {
    customerId: 'c-001',
    productId: '1',
    price: 14.2,
    reason: 'ลูกค้าประจำ',
    effectiveFrom: new Date().toISOString(),
    updatedBy: 'u-sale-a',
    status: 'approved',
  },
];

const approvals: PriceApprovalRequest[] = [];
const auditLogs: PriceAuditLog[] = [];

// Cache for inventory data to avoid re-fetching on every pricing call
let cachedProducts: InventoryItem[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 1 minute

async function getProducts(): Promise<InventoryItem[]> {
  const now = Date.now();
  if (cachedProducts && now - cacheTimestamp < CACHE_TTL) {
    return cachedProducts;
  }
  try {
    cachedProducts = await loadInventoryFromGoogleSheets();
    cacheTimestamp = now;
    return cachedProducts;
  } catch {
    return cachedProducts ?? mockInventory;
  }
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function getTier(tierId: string) {
  return priceTiers.find((tier) => tier.id === tierId) ?? priceTiers[0];
}

function getTierPrice(basePrice: number, tierId: string) {
  const tier = getTier(tierId);
  if (tier.discountType === 'percent') {
    return round2(basePrice * (1 - tier.discountValue / 100));
  }
  return round2(Math.max(0, basePrice - tier.discountValue));
}

function getActiveOverride(customerId: string, productId: string) {
  return overrides.find(
    (item) =>
      item.customerId === customerId &&
      item.productId === productId &&
      item.status === 'approved' &&
      (!item.effectiveTo || new Date(item.effectiveTo).getTime() >= Date.now())
  );
}

export function getCustomers() {
  return customers;
}

export function getAllTiers() {
  return priceTiers;
}

export function addCustomerAccount(account: CustomerAccount) {
  customers.push(account);
}

export function resolveCatalogItemPrice(customerId: string, productId: string, basePrice: number) {
  const customer = customers.find((item) => item.id === customerId);
  if (!customer) {
    return {
      finalPrice: basePrice,
      tierPrice: basePrice,
      source: 'base' as PriceSource,
    };
  }

  const tierPrice = getTierPrice(basePrice, customer.tierId);
  const override = getActiveOverride(customerId, productId);
  if (override) {
    return { finalPrice: override.price, tierPrice, source: 'override' as PriceSource };
  }
  if (tierPrice !== basePrice) {
    return { finalPrice: tierPrice, tierPrice, source: 'tier' as PriceSource };
  }
  return { finalPrice: basePrice, tierPrice, source: 'base' as PriceSource };
}

export async function getCatalogForCustomer(customerId: string): Promise<CatalogItem[]> {
  const products = await getProducts();
  return products.map((item) => {
    const basePrice = item.storePrice || item.changedPrice || 0;
    const pricing = resolveCatalogItemPrice(customerId, item.id, basePrice);
    const minAllowed = round2(basePrice * 0.85);
    return {
      productId: item.id,
      name: item.details,
      imageUrl: item.imageUrl,
      stock: item.totalQuantity,
      basePrice,
      tierPrice: pricing.tierPrice,
      finalPrice: pricing.finalPrice,
      priceSource: pricing.source,
      minAllowedPrice: minAllowed,
    };
  });
}

export async function getPricingRowsForCustomer(customerId: string) {
  return getCatalogForCustomer(customerId);
}

export function getApprovals() {
  return approvals;
}

export function getAuditLogs() {
  return auditLogs;
}

export async function upsertCustomerProductPrice(params: {
  actorId: string;
  customerId: string;
  productId: string;
  price: number;
  reason: string;
}) {
  const nowIso = new Date().toISOString();
  const products = await getProducts();
  const product = products.find((item) => item.id === params.productId);
  if (!product) {
    throw new Error('Product not found');
  }

  const basePrice = product.storePrice || product.changedPrice || 0;
  const minAllowedPrice = round2(basePrice * 0.85);
  const existing = getActiveOverride(params.customerId, params.productId);

  if (params.price < minAllowedPrice) {
    const approval: PriceApprovalRequest = {
      id: randomUUID(),
      customerId: params.customerId,
      productId: params.productId,
      proposedPrice: params.price,
      minAllowedPrice,
      requestedBy: params.actorId,
      reason: params.reason,
      status: 'pending',
      createdAt: nowIso,
    };
    approvals.push(approval);
    return { ok: true, requiresApproval: true, approval };
  }

  if (existing) {
    existing.price = round2(params.price);
    existing.reason = params.reason;
    existing.updatedBy = params.actorId;
    existing.effectiveFrom = nowIso;
  } else {
    overrides.push({
      customerId: params.customerId,
      productId: params.productId,
      price: round2(params.price),
      reason: params.reason,
      effectiveFrom: nowIso,
      updatedBy: params.actorId,
      status: 'approved',
    });
  }

  const oldPrice = existing?.price ?? resolveCatalogItemPrice(params.customerId, params.productId, basePrice).finalPrice;
  auditLogs.push({
    id: randomUUID(),
    actorId: params.actorId,
    customerId: params.customerId,
    productId: params.productId,
    oldPrice,
    newPrice: round2(params.price),
    reason: params.reason,
    source: 'override',
    timestamp: nowIso,
  });

  return { ok: true, requiresApproval: false };
}

export async function bulkUpdateCustomerPrices(params: {
  actorId: string;
  customerId: string;
  productIds: string[];
  adjustmentType: 'percent' | 'fixed';
  adjustmentValue: number;
  reason: string;
}) {
  const products = await getProducts();
  const results = [];
  for (const productId of params.productIds) {
    const product = products.find((item) => item.id === productId);
    if (!product) {
      results.push({ productId, ok: false, reason: 'Product not found' });
      continue;
    }
    const basePrice = product.storePrice || product.changedPrice || 0;
    const current = resolveCatalogItemPrice(params.customerId, productId, basePrice).finalPrice;
    const nextPrice =
      params.adjustmentType === 'percent'
        ? round2(current * (1 + params.adjustmentValue / 100))
        : round2(current + params.adjustmentValue);
    const result = await upsertCustomerProductPrice({
      actorId: params.actorId,
      customerId: params.customerId,
      productId,
      price: nextPrice,
      reason: params.reason,
    });
    results.push({ productId, ...result });
  }
  return results;
}

export async function approveRequest(params: { approvalId: string; actorId: string }) {
  const request = approvals.find((item) => item.id === params.approvalId);
  if (!request) throw new Error('Approval not found');
  request.status = 'approved';
  return upsertCustomerProductPrice({
    actorId: params.actorId,
    customerId: request.customerId,
    productId: request.productId,
    price: request.proposedPrice,
    reason: `Approved: ${request.reason}`,
  });
}
