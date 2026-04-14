export enum RoomQuality {
  STANDARD = 'Standard',
  DELUXE = 'Deluxe',
  SUITE = 'Suite',
  PENTHOUSE = 'Penthouse'
}

export interface Room {
  id: string;
  name: string;
  quality: RoomQuality;
  price: number;
  description: string;
  capacity: number;
  amenities: string[];
  image: string;
}

export interface ConsumptionItem {
  id: string;
  name: string;
  price: number;
  category: 'bar' | 'meal' | 'laundry' | 'other';
}

export interface BookingDetails {
  guestName: string;
  email: string;
  phone: string;
  idNumber: string;
  idType: 'passport' | 'cedula' | 'ruc';
  checkInDate: string;
  checkOutDate: string;
  guestsCount: number;
  allergies: string;
  specialRequests: string;
  arrivalTime: string;
  paymentMethod: string;
  idImage?: string;
  roomType: string;
  totalPrice: number;
  roomStatus?: 'clean' | 'dirty' | 'maintenance';
  consumptions: ConsumptionItem[];
}

export interface CartItem {
  id: string;
  room: Room;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  consumptions: ConsumptionItem[];
  idImage?: string;
  roomStatus?: 'clean' | 'dirty' | 'maintenance';
}
