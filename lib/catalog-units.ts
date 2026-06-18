export function getCheckoutUnitLabel(item: { quantityPerBox: string }) {
  return item.quantityPerBox.trim() ? 'ลัง' : 'รายการ';
}
