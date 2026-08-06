import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Booking, BookingPhoto, Inspection, InspectionSection, InventoryItem, ItemStatus } from '@/types';
import { pushToCloud, pullFromCloud, getSession } from '@/lib/supabase';

const LOCAL_KEYS = [
  'campcheck_bookings',
  'campcheck_inspections',
  'campcheck_inventory',
  'campcheck_inventory_template',
  'campcheck_uid',
] as const;

async function wipeLocalData() {
  await AsyncStorage.multiRemove([...LOCAL_KEYS]);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function isoFromNow(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function makeSampleBookings(): Booking[] {
  return [
    {
      id: '1', guestName: 'Jen Kline',
      campground: 'TBD — Delivery', lotNumber: '',
      checkIn: isoFromNow(0), checkInTime: '3:00 PM',
      checkOut: isoFromNow(3), checkOutTime: '11:00 AM',
      adults: 2, children: 2,
      freshWaterStatus: 'full', propaneStatus: 'full',
      inspectionStatus: 'not_started',
      notes: 'Delivery booking · $500.25. Starts soon — confirm delivery address.',
      rvName: 'Luxury Family Bunkhouse Camper', phone: '', email: '', deliveryAddress: '',
    },
    {
      id: '2', guestName: 'Brad Levine',
      campground: 'TBD — Delivery', lotNumber: '',
      checkIn: isoFromNow(4), checkInTime: '3:00 PM',
      checkOut: isoFromNow(7), checkOutTime: '11:00 AM',
      adults: 2, children: 0,
      freshWaterStatus: 'full', propaneStatus: 'full',
      inspectionStatus: 'not_started',
      notes: 'Delivery booking · $484.35.',
      rvName: 'Luxury Family Bunkhouse Camper', phone: '', email: '', deliveryAddress: '',
    },
    {
      id: '3', guestName: 'Christina Siegel',
      campground: 'TBD — Delivery', lotNumber: '',
      checkIn: isoFromNow(8), checkInTime: '3:00 PM',
      checkOut: isoFromNow(12), checkOutTime: '11:00 AM',
      adults: 2, children: 0,
      freshWaterStatus: 'full', propaneStatus: 'full',
      inspectionStatus: 'not_started',
      notes: 'Delivery booking · $585.30.',
      rvName: 'Luxury Family Bunkhouse Camper', phone: '', email: '', deliveryAddress: '',
    },
    {
      id: '4', guestName: 'Hosn Mhdi',
      campground: 'TBD — Delivery', lotNumber: '',
      checkIn: isoFromNow(26), checkInTime: '3:00 PM',
      checkOut: isoFromNow(29), checkOutTime: '11:00 AM',
      adults: 2, children: 0,
      freshWaterStatus: 'full', propaneStatus: 'full',
      inspectionStatus: 'not_started',
      notes: 'Delivery booking · $499.35.',
      rvName: 'Luxury Family Bunkhouse Camper', phone: '', email: '', deliveryAddress: '',
    },
  ];
}

// ─── Stale check ──────────────────────────────────────────────────────────────
function isStale(saved: Booking[]): boolean {
  if (!saved || saved.length === 0) return true;
  const today = isoFromNow(0);
  return saved.every(b => b.checkOut < today);
}

// ─── Inspection template ──────────────────────────────────────────────────────
const DEFAULT_SECTIONS: InspectionSection[] = [
  { id: 'exterior', title: 'Exterior', icon: 'car-outline', items: [
    { id: 'ext-1', label: 'Body & Paint Condition', checked: false, skipped: false, notes: '' },
    { id: 'ext-2', label: 'Entry Doors & Locks', checked: false, skipped: false, notes: '' },
    { id: 'ext-3', label: 'Windows & Seals', checked: false, skipped: false, notes: '' },
    { id: 'ext-4', label: 'Roof Condition', checked: false, skipped: false, notes: '' },
    { id: 'ext-5', label: 'Exterior Lights', checked: false, skipped: false, notes: '' },
  ]},
  { id: 'interior', title: 'Interior', icon: 'home-outline', items: [
    { id: 'int-1', label: 'Floors & Carpets', checked: false, skipped: false, notes: '' },
    { id: 'int-2', label: 'Walls & Ceiling', checked: false, skipped: false, notes: '' },
    { id: 'int-3', label: 'Kitchen Appliances', checked: false, skipped: false, notes: '' },
    { id: 'int-4', label: 'Furniture & Upholstery', checked: false, skipped: false, notes: '' },
    { id: 'int-5', label: 'Interior Lights', checked: false, skipped: false, notes: '' },
  ]},
  { id: 'slides', title: 'Slides', icon: 'resize-outline', items: [
    { id: 'sl-1', label: 'Slide Extension/Retraction', checked: false, skipped: false, notes: '' },
    { id: 'sl-2', label: 'Slide Seals & Weatherstrip', checked: false, skipped: false, notes: '' },
  ]},
  { id: 'awning', title: 'Awning', icon: 'sunny-outline', items: [
    { id: 'aw-1', label: 'Awning Extension & Retraction', checked: false, skipped: false, notes: '' },
    { id: 'aw-2', label: 'Fabric Condition', checked: false, skipped: false, notes: '' },
    { id: 'aw-3', label: 'Awning Hardware', checked: false, skipped: false, notes: '' },
  ]},
  { id: 'tires', title: 'Tires', icon: 'ellipse-outline', items: [
    { id: 'ti-1', label: 'Tire Pressure (All)', checked: false, skipped: false, notes: '' },
    { id: 'ti-2', label: 'Tread Depth & Wear', checked: false, skipped: false, notes: '' },
    { id: 'ti-3', label: 'Spare Tire', checked: false, skipped: false, notes: '' },
  ]},
  { id: 'propane', title: 'Propane', icon: 'flame-outline', items: [
    { id: 'pr-1', label: 'Tank Level Verified', checked: false, skipped: false, notes: '' },
    { id: 'pr-2', label: 'Hose Connections', checked: false, skipped: false, notes: '' },
    { id: 'pr-3', label: 'Leak Test Passed', checked: false, skipped: false, notes: '' },
  ]},
  { id: 'water', title: 'Water System', icon: 'water-outline', items: [
    { id: 'wa-1', label: 'Fresh Water Tank Level', checked: false, skipped: false, notes: '' },
    { id: 'wa-2', label: 'Grey & Black Tank Status', checked: false, skipped: false, notes: '' },
    { id: 'wa-3', label: 'Water Pump Operation', checked: false, skipped: false, notes: '' },
    { id: 'wa-4', label: 'Hose & Connections', checked: false, skipped: false, notes: '' },
  ]},
  { id: 'battery', title: 'Battery', icon: 'battery-charging-outline', items: [
    { id: 'ba-1', label: 'Charge Level', checked: false, skipped: false, notes: '' },
    { id: 'ba-2', label: 'Terminal Connections', checked: false, skipped: false, notes: '' },
  ]},
  { id: 'safety', title: 'Safety Devices', icon: 'shield-checkmark-outline', items: [
    { id: 'sa-1', label: 'Smoke Detector Test', checked: false, skipped: false, notes: '' },
    { id: 'sa-2', label: 'CO Detector Test', checked: false, skipped: false, notes: '' },
    { id: 'sa-3', label: 'Fire Extinguisher Present', checked: false, skipped: false, notes: '' },
  ]},
];

const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: 'inv-1', name: 'Camping Chairs', quantity: 4, status: 'present', notes: '' },
  { id: 'inv-2', name: 'Outdoor Rug', quantity: 1, status: 'present', notes: '' },
  { id: 'inv-3', name: 'Grill', quantity: 1, status: 'present', notes: '' },
  { id: 'inv-4', name: 'Coffee Maker', quantity: 1, status: 'present', notes: '' },
  { id: 'inv-5', name: 'Kitchen Kit', quantity: 1, status: 'present', notes: '' },
  { id: 'inv-6', name: 'Power Cord (30 amp)', quantity: 1, status: 'present', notes: '' },
  { id: 'inv-7', name: 'Water Hose', quantity: 1, status: 'present', notes: '' },
  { id: 'inv-8', name: 'Sewer Hose Kit', quantity: 1, status: 'present', notes: '' },
  { id: 'inv-9', name: 'Television Remote', quantity: 1, status: 'present', notes: '' },
  { id: 'inv-10', name: 'Level Blocks', quantity: 4, status: 'present', notes: '' },
];

function makeInspection(bookingId: string): Inspection {
  return {
    bookingId, status: 'not_started',
    sections: DEFAULT_SECTIONS.map(s => ({ ...s, items: s.items.map(i => ({ ...i })) })),
    notes: '', signatureCaptured: false, type: 'pre',
  };
}

// ─── Context types ────────────────────────────────────────────────────────────
interface BookingsContextValue {
  bookings: Booking[];
  inspections: Record<string, Inspection>;
  inventory: Record<string, InventoryItem[]>;
  inventoryTemplate: InventoryItem[];
  clearLocalData: () => Promise<void>;
  getBooking: (id: string) => Booking | undefined;
  getInspection: (bookingId: string) => Inspection;
  addTemplateItem: (name: string, quantity: number) => void;
  updateTemplateItem: (id: string, name: string, quantity: number) => void;
  removeTemplateItem: (id: string) => void;
  toggleChecklistItem: (bookingId: string, sectionId: string, itemId: string) => void;
  skipChecklistItem: (bookingId: string, sectionId: string, itemId: string) => void;
  updateItemPhoto: (bookingId: string, sectionId: string, itemId: string, uri: string) => void;
  removeItemPhoto: (bookingId: string, sectionId: string, itemId: string) => void;
  updateItemNotes: (bookingId: string, sectionId: string, itemId: string, notes: string) => void;
  completeInspection: (bookingId: string) => void;
  getInventory: (bookingId: string) => InventoryItem[];
  updateInventoryStatus: (bookingId: string, itemId: string, status: ItemStatus) => void;
  updateInventoryItem: (bookingId: string, itemId: string, name: string, quantity: number) => void;
  addInventoryItem: (bookingId: string, name: string, quantity: number) => void;
  deleteInventoryItem: (bookingId: string, itemId: string) => void;
  updateBookingAddress: (bookingId: string, address: string) => void;
  addBookingPhoto: (bookingId: string, photo: Omit<BookingPhoto, 'id'>) => void;
  removeBookingPhoto: (bookingId: string, photoId: string) => void;
  addBooking: (data: Omit<Booking, 'id' | 'inspectionStatus'>) => string;
  updateBooking: (id: string, data: Partial<Booking>) => void;
  deleteBooking: (id: string) => void;
  inspectionProgress: (bookingId: string) => number;
}

const BookingsContext = createContext<BookingsContextValue | null>(null);

export function BookingsProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>(() => makeSampleBookings());
  const [inspections, setInspections] = useState<Record<string, Inspection>>({});
  const [inventory, setInventory] = useState<Record<string, InventoryItem[]>>({});
  const [inventoryTemplate, setInventoryTemplate] = useState<InventoryItem[]>(DEFAULT_INVENTORY);
  const syncTimer = useRef<ReturnType<typeof setTimeout>>();
  const initialized = useRef(false);

  // ── Load local then merge from cloud ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      // 0. Check if the signed-in user matches what's cached locally.
      //    If not (different account or fresh sign-in), wipe local data first
      //    so no user ever sees another user's bookings.
      const session = await getSession();
      const currentUid = session?.user.id ?? null;
      const storedUid = await AsyncStorage.getItem('campcheck_uid');

      if (currentUid && storedUid && currentUid !== storedUid) {
        await wipeLocalData();
      }
      if (currentUid) {
        await AsyncStorage.setItem('campcheck_uid', currentUid);
      }

      // 1. Load from AsyncStorage first (instant)
      const [rawB, rawI, rawInv, rawTpl] = await Promise.all([
        AsyncStorage.getItem('campcheck_bookings'),
        AsyncStorage.getItem('campcheck_inspections'),
        AsyncStorage.getItem('campcheck_inventory'),
        AsyncStorage.getItem('campcheck_inventory_template'),
      ]);
      if (rawTpl) setInventoryTemplate(JSON.parse(rawTpl));
      let localBookings: Booking[] | null = null;
      let localInspections: Record<string, Inspection> = {};
      let localInventory: Record<string, InventoryItem[]> = {};

      if (rawB) {
        const saved: Booking[] = JSON.parse(rawB);
        if (!isStale(saved)) {
          localBookings = saved;
          if (rawI) localInspections = JSON.parse(rawI);
          if (rawInv) localInventory = JSON.parse(rawInv);
        }
      }

      // 2. Pull from cloud and prefer it if it has real data
      const remote = await pullFromCloud();
      if (remote && remote.bookings?.length > 0 && !isStale(remote.bookings)) {
        // Cloud has real, fresh data — use it
        setBookings(remote.bookings);
        setInspections(remote.inspections ?? {});
        setInventory(remote.inventory ?? {});
        await Promise.all([
          AsyncStorage.setItem('campcheck_bookings', JSON.stringify(remote.bookings)),
          AsyncStorage.setItem('campcheck_inspections', JSON.stringify(remote.inspections ?? {})),
          AsyncStorage.setItem('campcheck_inventory', JSON.stringify(remote.inventory ?? {})),
        ]);
      } else if (localBookings) {
        // No cloud data yet — use local
        setBookings(localBookings);
        setInspections(localInspections);
        setInventory(localInventory);
      } else if (currentUid) {
        // Authenticated but no data anywhere — start fresh (no sample bookings)
        setBookings([]);
        setInspections({});
        setInventory({});
      }
      // else: no auth yet, keep sample data so the screen isn't empty

      initialized.current = true;
    })();
  }, []);

  // ── Debounced cloud sync on any state change ─────────────────────────────────
  useEffect(() => {
    if (!initialized.current) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      pushToCloud({
        bookings,
        inspections,
        inventory,
        updatedAt: new Date().toISOString(),
      });
    }, 1500);
    return () => clearTimeout(syncTimer.current);
  }, [bookings, inspections, inventory]);

  const saveBookings = useCallback((next: Booking[]) => {
    setBookings(next);
    AsyncStorage.setItem('campcheck_bookings', JSON.stringify(next));
  }, []);
  const saveInspections = useCallback((next: Record<string, Inspection>) => {
    setInspections(next);
    AsyncStorage.setItem('campcheck_inspections', JSON.stringify(next));
  }, []);
  const saveInventory = useCallback((next: Record<string, InventoryItem[]>) => {
    setInventory(next);
    AsyncStorage.setItem('campcheck_inventory', JSON.stringify(next));
  }, []);
  const saveInventoryTemplate = useCallback((next: InventoryItem[]) => {
    setInventoryTemplate(next);
    AsyncStorage.setItem('campcheck_inventory_template', JSON.stringify(next));
  }, []);

  const getBooking = useCallback((id: string) => bookings.find(b => b.id === id), [bookings]);
  const getInspection = useCallback((id: string) => inspections[id] ?? makeInspection(id), [inspections]);

  const toggleChecklistItem = useCallback((bId: string, sId: string, iId: string) => {
    const cur = inspections[bId] ?? makeInspection(bId);
    saveInspections({ ...inspections, [bId]: { ...cur, status: 'in_progress', sections: cur.sections.map(s => s.id !== sId ? s : { ...s, items: s.items.map(i => i.id !== iId ? i : { ...i, checked: !i.checked }) }) } });
  }, [inspections, saveInspections]);

  const skipChecklistItem = useCallback((bId: string, sId: string, iId: string) => {
    const cur = inspections[bId] ?? makeInspection(bId);
    saveInspections({ ...inspections, [bId]: { ...cur, status: 'in_progress', sections: cur.sections.map(s => s.id !== sId ? s : { ...s, items: s.items.map(i => i.id !== iId ? i : { ...i, skipped: !i.skipped, checked: false }) }) } });
  }, [inspections, saveInspections]);

  const updateItemPhoto = useCallback((bId: string, sId: string, iId: string, uri: string) => {
    const cur = inspections[bId] ?? makeInspection(bId);
    saveInspections({ ...inspections, [bId]: { ...cur, sections: cur.sections.map(s => s.id !== sId ? s : { ...s, items: s.items.map(i => i.id !== iId ? i : { ...i, photoUri: uri }) }) } });
  }, [inspections, saveInspections]);

  const removeItemPhoto = useCallback((bId: string, sId: string, iId: string) => {
    const cur = inspections[bId] ?? makeInspection(bId);
    saveInspections({ ...inspections, [bId]: { ...cur, sections: cur.sections.map(s => s.id !== sId ? s : { ...s, items: s.items.map(i => i.id !== iId ? i : { ...i, photoUri: undefined }) }) } });
  }, [inspections, saveInspections]);

  const updateItemNotes = useCallback((bId: string, sId: string, iId: string, notes: string) => {
    const cur = inspections[bId] ?? makeInspection(bId);
    saveInspections({ ...inspections, [bId]: { ...cur, sections: cur.sections.map(s => s.id !== sId ? s : { ...s, items: s.items.map(i => i.id !== iId ? i : { ...i, notes }) }) } });
  }, [inspections, saveInspections]);

  const completeInspection = useCallback((bId: string) => {
    const cur = inspections[bId] ?? makeInspection(bId);
    saveInspections({ ...inspections, [bId]: { ...cur, status: 'completed', signatureCaptured: true, completedAt: new Date().toISOString() } });
  }, [inspections, saveInspections]);

  const getInventory = useCallback((bId: string) => inventory[bId] ?? inventoryTemplate.map(i => ({ ...i, status: 'present' as const })), [inventory, inventoryTemplate]);

  const addTemplateItem = useCallback((name: string, quantity: number) => {
    const next = [...inventoryTemplate, { id: `inv-tpl-${Date.now()}`, name, quantity, status: 'present' as const, notes: '' }];
    saveInventoryTemplate(next);
  }, [inventoryTemplate, saveInventoryTemplate]);

  const updateTemplateItem = useCallback((id: string, name: string, quantity: number) => {
    saveInventoryTemplate(inventoryTemplate.map(i => i.id !== id ? i : { ...i, name, quantity }));
  }, [inventoryTemplate, saveInventoryTemplate]);

  const removeTemplateItem = useCallback((id: string) => {
    saveInventoryTemplate(inventoryTemplate.filter(i => i.id !== id));
  }, [inventoryTemplate, saveInventoryTemplate]);

  const updateInventoryStatus = useCallback((bId: string, iId: string, status: ItemStatus) => {
    const cur = inventory[bId] ?? DEFAULT_INVENTORY.map(i => ({ ...i }));
    saveInventory({ ...inventory, [bId]: cur.map(i => i.id !== iId ? i : { ...i, status }) });
  }, [inventory, saveInventory]);

  const updateInventoryItem = useCallback((bId: string, iId: string, name: string, quantity: number) => {
    const cur = inventory[bId] ?? DEFAULT_INVENTORY.map(i => ({ ...i }));
    saveInventory({ ...inventory, [bId]: cur.map(i => i.id !== iId ? i : { ...i, name, quantity }) });
  }, [inventory, saveInventory]);

  const addInventoryItem = useCallback((bId: string, name: string, quantity: number) => {
    const cur = inventory[bId] ?? DEFAULT_INVENTORY.map(i => ({ ...i }));
    saveInventory({ ...inventory, [bId]: [...cur, { id: `inv-custom-${Date.now()}`, name, quantity, status: 'present', notes: '' }] });
  }, [inventory, saveInventory]);

  const deleteInventoryItem = useCallback((bId: string, iId: string) => {
    const cur = inventory[bId] ?? DEFAULT_INVENTORY.map(i => ({ ...i }));
    saveInventory({ ...inventory, [bId]: cur.filter(i => i.id !== iId) });
  }, [inventory, saveInventory]);

  const updateBookingAddress = useCallback((bId: string, address: string) => {
    saveBookings(bookings.map(b => b.id !== bId ? b : { ...b, deliveryAddress: address }));
  }, [bookings, saveBookings]);

  const addBookingPhoto = useCallback((bId: string, photo: Omit<BookingPhoto, 'id'>) => {
    const newPhoto: BookingPhoto = { ...photo, id: `photo-${Date.now()}` };
    saveBookings(bookings.map(b => b.id !== bId ? b : { ...b, photos: [...(b.photos ?? []), newPhoto] }));
  }, [bookings, saveBookings]);

  const removeBookingPhoto = useCallback((bId: string, photoId: string) => {
    saveBookings(bookings.map(b => b.id !== bId ? b : { ...b, photos: (b.photos ?? []).filter(p => p.id !== photoId) }));
  }, [bookings, saveBookings]);

  const addBooking = useCallback((data: Omit<Booking, 'id' | 'inspectionStatus'>): string => {
    const id = `booking-${Date.now()}`;
    const newBooking: Booking = { ...data, id, inspectionStatus: 'not_started' };
    saveBookings([...bookings, newBooking].sort((a, b) => a.checkIn.localeCompare(b.checkIn)));
    return id;
  }, [bookings, saveBookings]);

  const updateBooking = useCallback((id: string, data: Partial<Booking>) => {
    saveBookings(bookings.map(b => b.id !== id ? b : { ...b, ...data }).sort((a, b) => a.checkIn.localeCompare(b.checkIn)));
  }, [bookings, saveBookings]);

  const deleteBooking = useCallback((id: string) => {
    saveBookings(bookings.filter(b => b.id !== id));
    const { [id]: _i, ...restI } = inspections;
    const { [id]: _inv, ...restInv } = inventory;
    saveInspections(restI);
    saveInventory(restInv);
  }, [bookings, inspections, inventory, saveBookings, saveInspections, saveInventory]);

  const inspectionProgress = useCallback((bId: string) => {
    const insp = inspections[bId];
    if (!insp) return 0;
    const all = insp.sections.flatMap(s => s.items).filter(i => !i.skipped);
    return all.length === 0 ? 0 : all.filter(i => i.checked).length / all.length;
  }, [inspections]);

  const clearLocalData = useCallback(async () => {
    await wipeLocalData();
    setBookings([]);
    setInspections({});
    setInventory({});
    setInventoryTemplate(DEFAULT_INVENTORY);
    initialized.current = false;
  }, []);

  return (
    <BookingsContext.Provider value={{
      bookings, inspections, inventory, inventoryTemplate,
      clearLocalData,
      getBooking, getInspection,
      addTemplateItem, updateTemplateItem, removeTemplateItem,
      toggleChecklistItem, skipChecklistItem, updateItemPhoto, removeItemPhoto, updateItemNotes, completeInspection,
      getInventory, updateInventoryStatus, updateInventoryItem, addInventoryItem, deleteInventoryItem,
      updateBookingAddress, addBookingPhoto, removeBookingPhoto, addBooking, updateBooking, deleteBooking,
      inspectionProgress,
    }}>
      {children}
    </BookingsContext.Provider>
  );
}

export function useBookings() {
  const ctx = useContext(BookingsContext);
  if (!ctx) throw new Error('useBookings must be used inside BookingsProvider');
  return ctx;
}
