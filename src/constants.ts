import { Room, RoomQuality, ConsumptionItem } from './types';

export const CONSUMPTION_ITEMS: ConsumptionItem[] = [
  { id: 'b1', name: 'Minibar - Soda', price: 5, category: 'bar' },
  { id: 'b2', name: 'Minibar - Beer', price: 8, category: 'bar' },
  { id: 'b3', name: 'Minibar - Wine', price: 25, category: 'bar' },
  { id: 'm1', name: 'Breakfast Buffet', price: 15, category: 'meal' },
  { id: 'm2', name: 'Room Service Dinner', price: 35, category: 'meal' },
  { id: 'l1', name: 'Laundry - Shirt', price: 10, category: 'laundry' },
  { id: 'l2', name: 'Laundry - Suit', price: 25, category: 'laundry' },
  { id: 'o1', name: 'Spa Access', price: 45, category: 'other' },
];

export const ROOMS: Room[] = [
  {
    id: '1',
    name: 'Standard Cozy Room',
    quality: RoomQuality.STANDARD,
    price: 85,
    description: 'A comfortable room with all basic amenities for a pleasant stay.',
    capacity: 2,
    amenities: ['Free Wi-Fi', 'Air Conditioning', 'TV', 'Coffee Maker'],
    image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '2',
    name: 'Deluxe Ocean View',
    quality: RoomQuality.DELUXE,
    price: 150,
    description: 'Spacious room with a stunning view of the ocean and premium furniture.',
    capacity: 2,
    amenities: ['Ocean View', 'Mini Bar', 'King Size Bed', 'Room Service'],
    image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '3',
    name: 'Executive Family Suite',
    quality: RoomQuality.SUITE,
    price: 280,
    description: 'Perfect for families, featuring two separate bedrooms and a living area.',
    capacity: 4,
    amenities: ['Kitchenette', 'Living Room', '2 Bathrooms', 'Safe Box'],
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '4',
    name: 'Royal Penthouse',
    quality: RoomQuality.PENTHOUSE,
    price: 550,
    description: 'The ultimate luxury experience with a private terrace and jacuzzi.',
    capacity: 2,
    amenities: ['Private Jacuzzi', 'Terrace', 'Personal Butler', 'Premium Bar'],
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80'
  }
];
