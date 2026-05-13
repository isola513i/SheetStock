export type CartLine = {
  productId: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  series: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  stock: number;
  quantityPerBox: string;
};

export type PurchaseOrderCustomer = {
  name: string;
  phone?: string | null;
};

export type PurchaseOrderSeller = {
  name: string;
  address: string;
  taxId?: string;
  phone?: string;
};
