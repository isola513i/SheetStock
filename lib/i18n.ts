export type Locale = 'th' | 'en';

const translations = {
  // Login page
  'login.welcome': { th: 'ยินดีต้อนรับกลับ', en: 'Welcome Back' },
  'login.subtitle': { th: 'เข้าสู่ระบบเพื่อใช้งาน SheetStock ต่อ', en: 'Sign in to continue using SheetStock' },
  'login.email': { th: 'อีเมล', en: 'Email' },
  'login.emailPlaceholder': { th: 'กรอกอีเมล', en: 'Enter email' },
  'login.phone': { th: 'เบอร์โทรศัพท์', en: 'Phone Number' },
  'login.phonePlaceholder': { th: 'กรอกเบอร์โทร', en: 'Enter phone number' },
  'login.phoneRequired': { th: 'กรุณากรอกเบอร์โทร', en: 'Please enter your phone number' },
  'login.password': { th: 'รหัสผ่าน', en: 'Password' },
  'login.passwordPlaceholder': { th: 'กรอกรหัสผ่าน', en: 'Enter password' },
  'login.submit': { th: 'เข้าสู่ระบบ', en: 'Sign In' },
  'login.loading': { th: 'กำลังเข้าสู่ระบบ...', en: 'Signing in...' },
  'login.register': { th: 'สมัครสมาชิก', en: 'Register' },
  'login.success': { th: 'เข้าสู่ระบบสำเร็จ', en: 'Signed in successfully' },
  'login.emailRequired': { th: 'กรุณากรอกอีเมล', en: 'Please enter your email' },
  'login.passwordRequired': { th: 'กรุณากรอกรหัสผ่าน', en: 'Please enter your password' },
  'login.failed': { th: 'เข้าสู่ระบบไม่สำเร็จ', en: 'Sign in failed' },
  'login.demo': { th: 'บัญชีทดสอบ (Demo)', en: 'Demo Accounts' },

  // Settings page
  'settings.darkMode': { th: 'โหมดมืด', en: 'Dark Mode' },
  'settings.darkModeDesc': { th: 'ปรับสีหน้าจอให้ถนอมสายตา', en: 'Reduce eye strain with dark colors' },
  'settings.haptics': { th: 'การสั่น', en: 'Haptics' },
  'settings.hapticsDesc': { th: 'สั่นเบาเมื่อกดปุ่มหรือสแกน', en: 'Light vibration on button press or scan' },
  'settings.viewMode': { th: 'มุมมองสินค้า', en: 'Product View' },
  'settings.viewModeList': { th: 'แสดงแบบรายการ', en: 'List view' },
  'settings.viewModeGrid': { th: 'แสดงแบบตาราง', en: 'Grid view' },
  'settings.language': { th: 'ภาษา', en: 'Language' },
  'settings.languageDesc': { th: 'เปลี่ยนภาษาของแอป', en: 'Change app language' },
  'settings.refreshData': { th: 'รีเฟรชข้อมูล', en: 'Refresh Data' },
  'settings.refreshDataDesc': { th: 'โหลดข้อมูลสินค้าใหม่จากเซิร์ฟเวอร์', en: 'Reload product data from server' },
  'settings.resetPrefs': { th: 'รีเซ็ตการตั้งค่า', en: 'Reset Settings' },
  'settings.resetPrefsDesc': { th: 'คืนค่าทั้งหมดกลับเป็นค่าเริ่มต้น', en: 'Restore all settings to defaults' },
  'settings.logout': { th: 'ออกจากระบบ', en: 'Sign Out' },
  'settings.recentScans': { th: 'สแกนล่าสุด', en: 'Recent Scans' },
  'settings.clearAll': { th: 'ล้างทั้งหมด', en: 'Clear All' },
  'settings.unknown': { th: 'ไม่ทราบ', en: 'Unknown' },
  'settings.resetTitle': { th: 'รีเซ็ตการตั้งค่าทั้งหมด?', en: 'Reset all settings?' },
  'settings.resetDesc': { th: 'ระบบจะคืนค่าโหมดแสดงผล, ตัวกรอง, และการตั้งค่าทั้งหมดกลับเป็นค่าเริ่มต้น', en: 'This will restore display mode, filters, and all settings to defaults' },
  'settings.resetConfirm': { th: 'รีเซ็ต', en: 'Reset' },
  'settings.clearScansTitle': { th: 'ล้างประวัติสแกนทั้งหมด?', en: 'Clear all scan history?' },
  'settings.clearScansDesc': { th: 'ข้อมูลบาร์โค้ดที่สแกนล่าสุดจะถูกลบ', en: 'Recently scanned barcodes will be removed' },
  'settings.clearScansConfirm': { th: 'ล้าง', en: 'Clear' },

  // Roles
  'role.admin': { th: 'Admin', en: 'Admin' },
  'role.sale': { th: 'Sale', en: 'Sale' },
  'role.customer': { th: 'Customer', en: 'Customer' },
  'role.guest': { th: 'Guest', en: 'Guest' },

  // Product detail
  'product.detail': { th: 'รายละเอียดสินค้า', en: 'Product Detail' },
  'product.barcode': { th: 'บาร์โค้ด', en: 'Barcode' },
  'product.name': { th: 'ชื่อสินค้า', en: 'Product Name' },
  'product.category': { th: 'หมวดหมู่', en: 'Category' },
  'product.brand': { th: 'แบรนด์', en: 'Brand' },
  'product.series': { th: 'ซีรีส์', en: 'Series' },
  'product.price': { th: 'ราคา', en: 'Price' },
  'product.quantity': { th: 'จำนวน', en: 'Quantity' },
  'product.expiryDate': { th: 'วันหมดอายุ', en: 'Expiry Date' },
  'product.quantityPerBox': { th: 'จำนวนต่อลัง', en: 'Qty per Box' },
  'product.notes': { th: 'หมายเหตุ', en: 'Notes' },
  'product.productInfo': { th: 'ข้อมูลสินค้า', en: 'Product Info' },
  'product.qtyPrice': { th: 'จำนวนและราคา', en: 'Quantity & Price' },
  'product.copied': { th: 'คัดลอกแล้ว', en: 'Copied' },
  'product.close': { th: 'ปิดหน้ารายละเอียด', en: 'Close Detail' },
  'product.copyBarcode': { th: 'คัดลอก', en: 'Copy' },
  'product.barcodeCopied': { th: 'คัดลอกบาร์โค้ดแล้ว', en: 'Barcode copied' },
  'product.notSpecified': { th: 'ไม่ระบุ', en: 'N/A' },
  'product.photo': { th: 'รูป', en: 'Photo' },
  'product.outOfStock': { th: 'Out of Stock', en: 'Out of Stock' },
  'product.lowStock': { th: 'Low Stock', en: 'Low Stock' },
  'product.inStock': { th: 'In Stock', en: 'In Stock' },
  'product.pieces': { th: 'ชิ้น', en: 'pcs' },
} as const;

type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, locale: Locale): string {
  return translations[key]?.[locale] ?? key;
}

export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'th';
  return (window.localStorage.getItem('sheetstock-locale') as Locale) || 'th';
}

export function setLocale(locale: Locale) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('sheetstock-locale', locale);
  }
}
