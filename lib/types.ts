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
