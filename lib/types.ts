export interface InventoryItem {
  id: string;
  date: string;
  mainReason: string;
  dataType: string;
  fromLocation: string;
  toLocation: string;
  boxBarcode: string;
  itemBarcode: string;
  countedQuantity: number;
  totalQuantity: number;
  storePrice: number;
  changedPrice: number;
  imageUrl: string;
  expiryImageUrl: string;
  perBoxImageUrl: string;
  imageLinkUrl: string;
  totalScanTime: string;
  countNumber: number;
  ofHowManyItems: number;
  totalPiecesCounted: number;
  details: string;
}

export type UserRole = 'admin' | 'sale' | 'customer';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  customerId?: string;
}

export interface AuthSession {
  token: string;
  user: AppUser;
  createdAt: number;
}

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface CustomerRegistration {
  id: string;
  name: string;
  email: string;
  password: string;
  storeName: string;
  phone: string;
  status: RegistrationStatus;
  tierId?: string;
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export type SortBy = 'date' | 'quantity' | 'price';
export type SortOrder = 'asc' | 'desc';
export type FilterReason = string | null;
export type InventoryStockFilter = 'all' | 'inStock' | 'lowStock' | 'outOfStock';
export type InventoryDateRange = 'all' | 'today' | '7d' | '30d';
export type InventorySortPreset = 'latest' | 'lowStock' | 'highStock' | 'priceHigh' | 'priceLow' | 'nameAsc' | 'nameDesc';

export type InventoryViewMode = 'grid' | 'list';
export type InventoryTabKey = 'inventory' | 'search' | 'settings';

export interface InventoryQuery {
  q?: string;
  reason?: string;
  stock?: InventoryStockFilter;
  dateRange?: InventoryDateRange;
  minQty?: number;
  maxQty?: number;
  minPrice?: number;
  maxPrice?: number;
  from?: string;
  to?: string;
  type?: string;
  sort?: InventorySortPreset;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
}

export interface InventoryFacetOption {
  value: string;
  count: number;
}

export interface InventoryFacetData {
  reasons: InventoryFacetOption[];
  dataTypes: InventoryFacetOption[];
  fromLocations: InventoryFacetOption[];
  toLocations: InventoryFacetOption[];
}

export interface InventoryApiResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
  reasons: string[];
  availableFacets: InventoryFacetData;
}

export type PriceSource = 'base' | 'tier' | 'override';
export type DiscountType = 'percent' | 'fixed';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface PriceTier {
  id: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
}

export interface CustomerAccount {
  id: string;
  name: string;
  tierId: string;
  saleOwnerId: string;
  status: 'active' | 'inactive';
}

export interface CustomerProductOverride {
  customerId: string;
  productId: string;
  price: number;
  reason: string;
  effectiveFrom: string;
  effectiveTo?: string;
  updatedBy: string;
  status: ApprovalStatus;
}

export interface PriceApprovalRequest {
  id: string;
  customerId: string;
  productId: string;
  proposedPrice: number;
  minAllowedPrice: number;
  requestedBy: string;
  reason: string;
  status: ApprovalStatus;
  createdAt: string;
}

export interface PriceAuditLog {
  id: string;
  actorId: string;
  customerId: string;
  productId: string;
  oldPrice: number;
  newPrice: number;
  reason: string;
  source: PriceSource;
  timestamp: string;
}

export interface CatalogItem {
  productId: string;
  name: string;
  imageUrl: string;
  stock: number;
  basePrice: number;
  tierPrice: number;
  finalPrice: number;
  priceSource: PriceSource;
  minAllowedPrice: number;
}
