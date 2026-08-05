export type InspectionStatus = 'not_started' | 'in_progress' | 'completed';
export type ItemStatus = 'present' | 'missing' | 'damaged';
export type TankStatus = 'empty' | 'low' | 'half' | 'full';
export type PropaneStatus = 'empty' | 'low' | 'half' | 'full';
export type PhotoType = 'before' | 'after';

export interface BookingPhoto {
  id: string;
  uri: string;
  type: PhotoType;
  takenAt: string;
  caption?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  notes: string;
  photoUri?: string;
}

export interface InspectionSection {
  id: string;
  title: string;
  icon: string;
  items: ChecklistItem[];
}

export interface Inspection {
  bookingId: string;
  status: InspectionStatus;
  sections: InspectionSection[];
  notes: string;
  signatureCaptured: boolean;
  completedAt?: string;
  type: 'pre' | 'post';
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  status: ItemStatus;
  notes: string;
}

export interface Booking {
  id: string;
  guestName: string;
  campground: string;
  lotNumber: string;
  checkIn: string;
  checkInTime: string;
  checkOut: string;
  checkOutTime: string;
  adults: number;
  children: number;
  freshWaterStatus: TankStatus;
  propaneStatus: PropaneStatus;
  inspectionStatus: InspectionStatus;
  notes: string;
  rvName: string;
  phone?: string;
  email?: string;
  deliveryAddress?: string;
  photos?: BookingPhoto[];
}
