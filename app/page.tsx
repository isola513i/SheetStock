'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { mockInventory } from '@/lib/mock-data';
import { InventoryItem } from '@/lib/types';
import { 
  Search, 
  List, 
  LayoutGrid, 
  Package, 
  ShoppingCart, 
  ArrowLeftRight, 
  Settings, 
  ChevronLeft, 
  RefreshCw,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Copy,
  Check,
  ScanLine
} from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

const BLUR_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

export default function InventoryDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [activeTab, setActiveTab] = useState<'inventory' | 'search' | 'settings'>('inventory');

  const [sortBy, setSortBy] = useState<'date' | 'quantity' | 'price'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterReason, setFilterReason] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Scroll state for collapsible header
  const [scrollDir, setScrollDir] = useState<'up' | 'down'>('up');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const uniqueReasons = Array.from(new Set(mockInventory.map(item => item.mainReason)));

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    // Add threshold to prevent jitter
    if (Math.abs(currentScrollY - (scrollContainerRef.current?.dataset.lastScrollY ? parseInt(scrollContainerRef.current.dataset.lastScrollY) : 0)) < 10) {
      return;
    }

    const lastScrollY = scrollContainerRef.current?.dataset.lastScrollY ? parseInt(scrollContainerRef.current.dataset.lastScrollY) : 0;

    if (currentScrollY > lastScrollY && currentScrollY > 50) {
      setScrollDir('down');
    } else if (currentScrollY < lastScrollY) {
      setScrollDir('up');
    }
    
    if (scrollContainerRef.current) {
      scrollContainerRef.current.dataset.lastScrollY = currentScrollY.toString();
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  let processedInventory = mockInventory.filter(
    (item) =>
      item.details.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      item.itemBarcode.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  if (filterReason) {
    processedInventory = processedInventory.filter(item => item.mainReason === filterReason);
  }

  processedInventory.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortBy === 'quantity') {
      comparison = a.totalQuantity - b.totalQuantity;
    } else if (sortBy === 'price') {
      comparison = a.storePrice - b.storePrice;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleItemClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsOpen(true);
  };

  const getStockStatus = (qty: number) => {
    if (qty <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700 border-red-200' };
    if (qty < 50) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    return { label: 'In Stock', color: 'bg-green-100 text-green-700 border-green-200' };
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#F2F2F7] font-sans text-gray-900 overflow-hidden overscroll-none">
      {/* Orange Header */}
      <div className={`shrink-0 z-30 bg-[#FF6B00] rounded-b-[1.5rem] px-5 pt-8 text-white shadow-sm transition-all duration-300 ${scrollDir === 'down' ? 'pb-4' : 'pb-5'}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold tracking-tight">รายการสินค้า</h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setViewMode('list')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                viewMode === 'list' ? 'bg-white text-[#FF6B00]' : 'bg-white/20 text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`px-3 h-8 rounded-full flex items-center gap-1.5 text-xs font-medium transition-colors border ${
                viewMode === 'grid' 
                  ? 'bg-white text-[#FF6B00] border-white' 
                  : 'bg-white/20 text-white border-white/40'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> ตาราง
            </button>
          </div>
        </div>
        
        <div className={`overflow-hidden transition-all duration-300 ${scrollDir === 'down' ? 'max-h-0 opacity-0' : 'max-h-[120px] opacity-100'}`}>
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="main-search-input"
              type="text"
              placeholder="ค้นหาสินค้า"
              className="w-full bg-white text-gray-900 rounded-xl pl-10 h-10 border-none focus-visible:ring-0 text-sm shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Horizontal Scroll Chips for Categories */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            <button 
              onClick={() => setFilterReason(null)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${!filterReason ? 'bg-white text-[#FF6B00] shadow-sm' : 'bg-black/15 text-white hover:bg-black/25'}`}
            >
              ทั้งหมด
            </button>
            {uniqueReasons.map(reason => (
              <button 
                key={reason}
                onClick={() => setFilterReason(reason)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${filterReason === reason ? 'bg-white text-[#FF6B00] shadow-sm' : 'bg-black/15 text-white hover:bg-black/25'}`}
              >
                {reason || 'อื่นๆ'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-none pb-24"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Sort & Count */}
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-gray-500 font-medium">พบ {processedInventory.length} รายการ</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsSortOpen(true)}
              className="px-3 h-8 bg-white border border-gray-200 rounded-full flex items-center gap-1.5 text-xs font-medium text-gray-600 shadow-sm active:scale-95 transition-all"
            >
              <ArrowUpDown className="w-3.5 h-3.5" /> เรียงลำดับ
            </button>
          </div>
        </div>

        {/* Inventory Content */}
        <main className="px-5 pb-6">
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            {processedInventory.map((item, idx) => {
              const isOutOfStock = item.totalQuantity <= 0;
              const isLowStock = item.totalQuantity > 0 && item.totalQuantity < 10;
              return (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                key={item.id}
                className={`bg-white rounded-[1.5rem] p-4 flex flex-col cursor-pointer border ${isOutOfStock ? 'border-red-200 bg-red-50/30' : isLowStock ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-200'}`}
                onClick={() => handleItemClick(item)}
              >
                <div className="relative h-32 w-full mb-4">
                  <Image
                    src={item.imageUrl}
                    alt={item.details}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className={`object-contain ${isOutOfStock ? 'grayscale opacity-70' : ''}`}
                    referrerPolicy="no-referrer"
                    priority={idx < 4}
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                  />
                  {isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">สินค้าหมด</span>
                    </div>
                  )}
                </div>
                <div className={`w-full text-center flex flex-col items-center ${isOutOfStock ? 'opacity-70' : ''}`}>
                  <h3 className="font-bold text-sm text-gray-900 truncate w-full">{item.details}</h3>
                  <p className="text-[11px] text-gray-500 mt-1 truncate w-full">กล่อง: {item.boxBarcode}</p>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <p className={`text-[12px] font-bold truncate ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-yellow-600' : 'text-gray-700'}`}>
                      {item.totalQuantity} <span className="text-[10px] font-normal text-gray-500">ชิ้น</span>
                    </p>
                    {isLowStock && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[9px] font-bold rounded-sm">ใกล้หมด</span>}
                  </div>
                </div>
              </motion.div>
            )})}
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-3"
          >
            {processedInventory.map((item, idx) => {
              const isOutOfStock = item.totalQuantity <= 0;
              const isLowStock = item.totalQuantity > 0 && item.totalQuantity < 10;
              return (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                key={item.id}
                className={`bg-white rounded-[1.2rem] p-3 flex items-center gap-4 cursor-pointer border ${isOutOfStock ? 'border-red-200 bg-red-50/30' : isLowStock ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-200'}`}
                onClick={() => handleItemClick(item)}
              >
                <div className="relative h-16 w-16 shrink-0">
                  <Image
                    src={item.imageUrl}
                    alt={item.details}
                    fill
                    sizes="64px"
                    className={`object-contain rounded-lg ${isOutOfStock ? 'grayscale opacity-70' : ''}`}
                    referrerPolicy="no-referrer"
                    priority={idx < 6}
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                  />
                  {isOutOfStock && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className={`flex-1 min-w-0 ${isOutOfStock ? 'opacity-70' : ''}`}>
                  <h3 className="font-bold text-sm text-gray-900 leading-tight">{item.details}</h3>
                  <p className="text-[11px] text-gray-500 mt-1 truncate">รหัส: {item.boxBarcode}</p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end justify-center">
                  <p className={`text-lg font-bold leading-none ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-yellow-600' : 'text-[#FF6B00]'}`}>
                    {item.totalQuantity} <span className="text-[11px] font-medium ml-0.5">ชิ้น</span>
                  </p>
                  {isLowStock && <span className="mt-1.5 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[9px] font-bold rounded-sm">ใกล้หมด</span>}
                  {isOutOfStock && <span className="mt-1.5 px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded-sm">สินค้าหมด</span>}
                </div>
              </motion.div>
            )})}
          </motion.div>
        )}
        </AnimatePresence>
        </main>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-200/60 px-8 py-2 flex justify-between items-center z-40 pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
        <NavItem 
          icon={<LayoutGrid className="w-6 h-6" />} 
          label="สินค้า" 
          active={activeTab === 'inventory'} 
          onClick={() => setActiveTab('inventory')}
        />
        
        {/* Central Action Button (Scan) */}
        <div className="relative -top-5">
          <button className="w-14 h-14 bg-[#FF6B00] rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/30 active:scale-95 transition-transform">
            <ScanLine className="w-7 h-7" />
          </button>
        </div>

        <NavItem 
          icon={<Settings className="w-6 h-6" />} 
          label="ตั้งค่า" 
          active={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
        />
      </nav>

      {/* Product Detail Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="bottom" 
          className="h-[95vh] rounded-t-[2.5rem] px-0 pb-0 bg-[#F2F2F7] border-none focus:outline-none overflow-y-auto hide-scrollbar overscroll-contain touch-pan-y flex-none gap-0"
          showCloseButton={false}
        >
          {selectedItem && (
            <div className="relative min-h-full">
              {/* Sticky Top Bar */}
              <div className="sticky top-0 z-30 bg-[#FF6B00] px-5 py-4 flex items-center justify-between">
                <button onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-white">
                  <ChevronLeft className="w-6 h-6" />
                  <span className="font-medium text-lg">รายละเอียดสินค้า</span>
                </button>
                <div className="flex gap-3">
                  <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Header Image Area */}
              <div className="bg-[#FF6B00] rounded-b-[2.5rem] px-5 pb-12 pt-2 relative">
                <div className="relative h-48 w-full">
                  <Image
                    src={selectedItem.imageUrl}
                    fill
                    sizes="100vw"
                    className="object-contain"
                    alt={selectedItem.details}
                    referrerPolicy="no-referrer"
                    priority
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                  />
                </div>
              </div>

              {/* Detail White Body */}
              <div className="px-5 -mt-8 relative z-10 pb-10">
                <div className="bg-white rounded-[2rem] p-6 border border-gray-200">
                  
                  {/* Title & Status */}
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedItem.details}</h2>
                    <Badge className={`${getStockStatus(selectedItem.totalQuantity).color} border px-2.5 py-0.5 rounded-full font-medium text-xs`}>
                      {getStockStatus(selectedItem.totalQuantity).label}
                    </Badge>
                  </div>

                  {/* Images Section */}
                  <div className="flex gap-3 overflow-x-auto pb-6 mb-6 border-b border-dashed border-gray-200 hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div className="shrink-0 w-24 space-y-2 cursor-pointer" onClick={() => setFullscreenImage(selectedItem.imageUrl)}>
                      <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                        <Image src={selectedItem.imageUrl} fill sizes="96px" className="object-cover" alt="รูป" referrerPolicy="no-referrer" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
                      </div>
                      <p className="text-[10px] text-center text-gray-500 font-medium">รูป</p>
                    </div>
                    <div className="shrink-0 w-24 space-y-2 cursor-pointer" onClick={() => setFullscreenImage(selectedItem.perBoxImageUrl)}>
                      <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                        <Image src={selectedItem.perBoxImageUrl} fill sizes="96px" className="object-cover" alt="รูปต่อลัง" referrerPolicy="no-referrer" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
                      </div>
                      <p className="text-[10px] text-center text-gray-500 font-medium">รูปต่อลัง</p>
                    </div>
                    <div className="shrink-0 w-24 space-y-2 cursor-pointer" onClick={() => setFullscreenImage(selectedItem.expiryImageUrl)}>
                      <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                        <Image src={selectedItem.expiryImageUrl} fill sizes="96px" className="object-cover" alt="รูปวันหมดอายุ" referrerPolicy="no-referrer" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
                      </div>
                      <p className="text-[10px] text-center text-gray-500 font-medium">รูปวันหมดอายุ</p>
                    </div>
                  </div>

                  {/* Group: ข้อมูลทั่วไป */}
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 bg-[#FF6B00] rounded-full"></div>
                      ข้อมูลทั่วไป
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                      <DataRow label="วันที่" value={selectedItem.date} />
                      <DataRow label="เวลาสแกน" value={selectedItem.totalScanTime} />
                      <DataRow label="เหตุผลหลัก" value={selectedItem.mainReason} />
                      <DataRow label="ประเภทข้อมูล" value={selectedItem.dataType} isLast />
                    </div>
                  </div>

                  {/* Group: ตำแหน่งและบาร์โค้ด */}
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 bg-[#FF6B00] rounded-full"></div>
                      ตำแหน่งและบาร์โค้ด
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                      <DataRow label="จากที่ไหน" value={selectedItem.fromLocation} />
                      <DataRow label="ส่งที่ไหน" value={selectedItem.toLocation} />
                      <DataRow label="บาร์โค้ดกล่อง" value={selectedItem.boxBarcode} />
                      <DataRow label="บาร์โค้ดแผ่น" value={selectedItem.itemBarcode} isLast />
                    </div>
                  </div>

                  {/* Group: จำนวนและราคา */}
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 bg-[#FF6B00] rounded-full"></div>
                      จำนวนและราคา
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                      <DataRow label="จำนวนนับ" value={selectedItem.countedQuantity} />
                      <DataRow label="จำนวนรวม" value={selectedItem.totalQuantity} />
                      <DataRow label="ราคาหน้าร้าน" value={`฿${selectedItem.storePrice.toFixed(2)}`} />
                      <DataRow label="ราคาเปลี่ยน" value={`฿${selectedItem.changedPrice.toFixed(2)}`} />
                      <DataRow label="นับครั้งที่" value={selectedItem.countNumber} />
                      <DataRow label="รายการทั้งหมด" value={selectedItem.ofHowManyItems} />
                      <DataRow label="นับรวมชิ้น" value={selectedItem.totalPiecesCounted} isLast />
                    </div>
                  </div>

                  {/* URL Link */}
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <span className="text-sm text-gray-500 font-medium">ลิงก์รูปภาพ</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(selectedItem.imageLinkUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-1.5 text-[#FF6B00] text-sm font-bold bg-orange-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Filter Sheet */}
      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent side="bottom" className="rounded-t-[2.5rem] px-5 pb-10 pt-8 bg-white border-none focus:outline-none">
          <h3 className="text-lg font-bold text-gray-900 mb-6">ตัวกรอง (เหตุผล)</h3>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setFilterReason(null);
                setIsFilterOpen(false);
              }}
              className={`py-3 px-4 rounded-xl text-left font-medium text-sm transition-colors ${
                filterReason === null ? 'bg-[#FF6B00] text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              ทั้งหมด
            </button>
            {uniqueReasons.map(reason => (
              <button
                key={reason}
                onClick={() => {
                  setFilterReason(reason);
                  setIsFilterOpen(false);
                }}
                className={`py-3 px-4 rounded-xl text-left font-medium text-sm transition-colors ${
                  filterReason === reason ? 'bg-[#FF6B00] text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {reason}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sort Sheet */}
      <Sheet open={isSortOpen} onOpenChange={setIsSortOpen}>
        <SheetContent side="bottom" className="rounded-t-[2.5rem] px-5 pb-10 pt-8 bg-white border-none focus:outline-none">
          <h3 className="text-lg font-bold text-gray-900 mb-6">เรียงลำดับ</h3>
          <div className="flex flex-col gap-3">
            {[
              { id: 'date', label: 'วันที่' },
              { id: 'quantity', label: 'จำนวน' },
              { id: 'price', label: 'ราคา' }
            ].map(option => (
              <div key={option.id} className="flex gap-2">
                <button
                  onClick={() => {
                    setSortBy(option.id as any);
                    setSortOrder('desc');
                    setIsSortOpen(false);
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl text-center font-medium text-sm transition-colors ${
                    sortBy === option.id && sortOrder === 'desc' ? 'bg-[#FF6B00] text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {option.label} (มากไปน้อย)
                </button>
                <button
                  onClick={() => {
                    setSortBy(option.id as any);
                    setSortOrder('asc');
                    setIsSortOpen(false);
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl text-center font-medium text-sm transition-colors ${
                    sortBy === option.id && sortOrder === 'asc' ? 'bg-[#FF6B00] text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {option.label} (น้อยไปมาก)
                </button>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Fullscreen Image Viewer */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-200">
          <div className="flex justify-end p-5">
            <button 
              onClick={() => setFullscreenImage(null)}
              className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white active:scale-95 transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 relative w-full h-full pb-10">
            <Image
              src={fullscreenImage}
              fill
              sizes="100vw"
              className="object-contain"
              alt="Fullscreen view"
              referrerPolicy="no-referrer"
              priority
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />
          </div>
        </div>
      )}

      <style jsx global>{`
        html, body {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        ::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
          background: transparent;
        }
        * {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 1rem);
        }
      `}</style>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1.5 cursor-pointer px-6 py-2 rounded-xl transition-colors duration-200 ${active ? 'text-[#FF6B00]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
    >
      {active && (
        <motion.div 
          layoutId="activeTabIndicator"
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-[#FF6B00] rounded-b-full"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
      <motion.div 
        animate={{ scale: active ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {icon}
      </motion.div>
      <span className={`text-[11px] font-medium ${active ? 'font-bold' : ''}`}>{label}</span>
    </div>
  );
}

function DataRow({ label, value, isLast = false }: { label: string; value: string | number; isLast?: boolean }) {
  return (
    <div className={`flex justify-between items-start py-3 ${!isLast ? 'border-b border-dashed border-gray-200' : ''} gap-4`}>
      <span className="text-gray-500 font-medium text-sm shrink-0">{label}</span>
      <span className="text-gray-900 text-sm text-right break-words overflow-hidden">{value}</span>
    </div>
  );
}
