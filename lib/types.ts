export interface InventoryItem {
  id: string;
  barcode: string;
  name: string;
  category: string;
  brand: string;
  series: string;
  price: number;
  vipPrice: number;
  vvipPrice: number;
  quantity: number;
  expiryDate: string;
  quantityPerBox: string;
  notes: string;
  imageUrl: string;
  favorite: boolean;
}

export type AccessTier = 'public' | 'vip' | 'vvip';

export type UserRole = 'admin' | 'sale' | 'customer';

export interface AppUser {
  id: string;
  email?: string;
  phone?: string;
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

export type SortBy = 'name' | 'quantity' | 'price' | 'category' | 'brand';
export type SortOrder = 'asc' | 'desc';
export type InventoryStockFilter = 'all' | 'inStock' | 'lowStock' | 'outOfStock';
export type InventorySortPreset = 'lowStock' | 'highStock' | 'priceHigh' | 'priceLow' | 'nameAsc' | 'nameDesc' | 'expiryAsc' | 'expiryDesc';

export type InventoryViewMode = 'grid' | 'list';
export type InventoryTabKey = 'inventory' | 'search' | 'settings';

export interface InventoryQuery {
  q?: string;
  stock?: InventoryStockFilter;
  category?: string;
  brand?: string;
  series?: string;
  minQty?: number;
  maxQty?: number;
  minPrice?: number;
  maxPrice?: number;
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
  categories: InventoryFacetOption[];
  brands: InventoryFacetOption[];
  series: InventoryFacetOption[];
}

export interface InventoryApiResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
  availableFacets: InventoryFacetData;
}

export interface CatalogItem {
  productId: string;
  barcode: string;
  name: string;
  category: string;
  brand: string;
  series: string;
  imageUrl: string;
  stock: number;
  quantityPerBox: string;
  expiryDate: string;
  price: number;
  vipPrice?: number;
  vvipPrice?: number;
}
