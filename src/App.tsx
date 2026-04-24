/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Hotel, 
  Calendar, 
  Users, 
  CreditCard, 
  ShoppingCart, 
  CheckCircle2, 
  ChevronRight, 
  X, 
  Info,
  MapPin,
  Star,
  Trash2,
  ArrowRight,
  Globe,
  AlertCircle,
  Plus,
  Minus,
  ClipboardCheck,
  Coffee,
  Utensils,
  WashingMachine,
  MoreHorizontal,
  Fish,
  ConciergeBell,
  Waves,
  Download,
  ShieldCheck,
  User,
  Plane,
  ChevronLeft,
  Filter,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeSVG } from 'qrcode.react';
import { ROOMS, CONSUMPTION_ITEMS } from './constants';
import { Room, CartItem, BookingDetails, ConsumptionItem } from './types';
import { TRANSLATIONS } from './translations';

const PlanningCell = React.memo(({ 
  room, 
  day, 
  status, 
  onClick 
}: { 
  room: Room, 
  day: number, 
  status: 'occupied' | 'reserved' | 'selected' | undefined,
  onClick: (room: Room, day: number) => void
}) => {
  let bgClass = "bg-[#E8F5E9]"; // Pastel green for available
  if (status === 'occupied') bgClass = "bg-[#FF1744]";
  else if (status === 'reserved') bgClass = "bg-[#FFD600]";
  else if (status === 'selected') bgClass = "bg-blue-100 border-2 border-indigo-500 border-dashed";

  return (
    <div 
      onClick={() => onClick(room, day)}
      className={`w-[45px] h-[50px] border-r border-gray-200 flex items-center justify-center transition-colors shrink-0 hover:bg-gray-50/80 cursor-pointer ${bgClass}`}
    />
  );
});

const RoomCard = React.memo(({ room, t, onSelect }: { room: Room, t: any, onSelect: (room: Room) => void }) => (
  <motion.div 
    whileHover={{ y: -8 }}
    className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100"
  >
    <div className="relative h-48 md:h-64 overflow-hidden">
      <img 
        src={room.image} 
        alt={room.name}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        referrerPolicy="no-referrer"
      />
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-electric-blue">
        {t[room.quality.toLowerCase() as keyof typeof t] || room.quality}
      </div>
    </div>
    <div className="p-5 md:p-6">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg md:text-xl">{room.name}</h3>
        <div className="flex items-center gap-1 text-amber-500">
          <Star className="w-4 h-4 fill-current" />
          <span className="text-sm font-bold">4.9</span>
        </div>
      </div>
      <p className="text-gray-500 text-sm mb-6 line-clamp-2">{room.description}</p>
      
      <div className="flex items-center justify-between mt-auto">
        <div>
          <span className="text-xl md:text-2xl font-bold">${room.price}</span>
          <span className="text-gray-400 text-sm"> / {t.night}</span>
        </div>
        <button 
          onClick={() => onSelect(room)}
          className="bg-electric-gradient text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold hover:shadow-electric transition-all flex items-center gap-2 active:scale-95"
        >
          {t.bookNow} <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  </motion.div>
));

type Language = 'en' | 'es';

export default function App() {
  const [lang, setLang] = useState<Language>('es');
  const t = TRANSLATIONS[lang];

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSeafoodMenuOpen, setIsSeafoodMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isPlanningOpen, setIsPlanningOpen] = useState(false);
  const [planningDate, setPlanningDate] = useState(() => new Date());
  const [isAboutUsOpen, setIsAboutUsOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isBookingComplete, setIsBookingComplete] = useState(false);
  const [lastBooking, setLastBooking] = useState<{
    cart: CartItem[];
    details: Partial<BookingDetails>;
    id: string;
    status: 'booked' | 'completed';
  } | null>(null);
  const [step, setStep] = useState<'welcome' | 'selection' | 'form' | 'summary'>('welcome');

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const [planningForm, setPlanningForm] = useState({
    guestName: '',
    roomId: ROOMS[0].id,
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });

  const handleCreateStayFromPlanning = () => {
    if (!planningForm.guestName) return;
    
    const room = ROOMS.find(r => r.id === planningForm.roomId);
    if (!room) return;

    // Calculate days
    const start = new Date(planningForm.checkIn);
    const end = new Date(planningForm.checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const totalPrice = room.price * diffDays;
    const advancePayment = totalPrice * 0.5; // 50% deposit requested by user

    setCart(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      room,
      checkIn: planningForm.checkIn,
      checkOut: planningForm.checkOut,
      guestName: planningForm.guestName,
      roomStatus: 'clean',
      totalPrice,
      advancePayment // Store the 50% info
    }]);

    // Reset form
    setPlanningForm(prev => ({
      ...prev,
      guestName: ''
    }));
  };

  // Optimization: Pre-calculate occupied/reserved dates for the current view
  const roomStatusLookup = useMemo(() => {
    const lookup: Record<string, 'occupied' | 'reserved' | 'selected'> = {};
    const year = planningDate.getFullYear();
    const month = planningDate.getMonth();
    const days = getDaysInMonth(year, month);

    ROOMS.forEach(room => {
      for (let i = 1; i <= days; i++) {
        const monthStr = String(month + 1).padStart(2, '0');
        const dayStr = String(i).padStart(2, '0');
        const dateStr = `${year}-${monthStr}-${dayStr}`;
        const key = `${room.id}-${dateStr}`;

        const isOccupied = lastBooking?.cart.some(c => c.room.id === room.id && c.checkIn <= dateStr && (c.checkOut >= dateStr || !c.checkOut)) && lastBooking.status === 'completed';
        const isReserved = (cart.some(c => c.room.id === room.id && c.checkIn <= dateStr && (c.checkOut >= dateStr || !c.checkOut))) || (lastBooking?.cart.some(c => c.room.id === room.id && c.checkIn <= dateStr && (c.checkOut >= dateStr || !c.checkOut)) && lastBooking.status === 'booked');
        
        if (isOccupied) lookup[key] = 'occupied';
        else if (isReserved) lookup[key] = 'reserved';
      }
    });

    return lookup;
  }, [planningDate, lastBooking, cart]);

  const handlePrevMonth = useCallback(() => {
    setPlanningDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);
  
  const handleNextMonth = useCallback(() => {
    setPlanningDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const toggleDateSelection = useCallback((room: Room, day: number) => {
    const monthStr = String(planningDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${planningDate.getFullYear()}-${monthStr}-${dayStr}`;
    
    // Check if this date is already booked/completed in lastBooking
    const isOccupied = lastBooking?.cart.some(c => c.room.id === room.id && c.checkIn <= dateStr && (c.checkOut >= dateStr || !c.checkOut)) && lastBooking.status === 'completed';
    const isReserved = lastBooking?.cart.some(c => c.room.id === room.id && c.checkIn <= dateStr && (c.checkOut >= dateStr || !c.checkOut)) && lastBooking.status === 'booked';

    if (isOccupied || isReserved) return;

    const existingItemIndex = cart.findIndex(c => c.room.id === room.id && c.checkIn <= dateStr && (c.checkOut >= dateStr || c.checkIn === dateStr || !c.checkOut));

    if (existingItemIndex > -1) {
      setCart(prev => prev.filter((_, i) => i !== existingItemIndex));
    } else {
      setCart(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        room,
        checkIn: dateStr,
        checkOut: dateStr,
        guests: 1,
        totalPrice: room.price,
        roomStatus: 'clean'
      }]);
    }
  }, [planningDate, lastBooking, cart]);

  const planningHeaderDays = useMemo(() => {
    const days = getDaysInMonth(planningDate.getFullYear(), planningDate.getMonth());
    const today = new Date();
    const tDate = today.getDate();
    const tMonth = today.getMonth();
    const tYear = today.getFullYear();
    const isSameMonth = planningDate.getMonth() === tMonth && planningDate.getFullYear() === tYear;

    return Array.from({ length: days }).map((_, i) => {
      const d = new Date(planningDate.getFullYear(), planningDate.getMonth(), i + 1);
      const dayName = d.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'short' }).toUpperCase();
      const isToday = isSameMonth && (i + 1) === tDate;
      
      return {
        day: i + 1,
        dayName,
        isToday
      };
    });
  }, [planningDate, lang]);

  const [formData, setFormData] = useState<Partial<BookingDetails>>({
    guestName: '',
    email: '',
    phone: '',
    emergencyNumber: '',
    nationality: '',
    birthDate: '',
    residenceAddress: '',
    idType: 'passport',
    idNumber: '',
    checkInDate: '',
    checkOutDate: '',
    guestsCount: 1,
    companionName: '',
    companionDocument: '',
    tripReason: '',
    allergies: '',
    specialRequests: '',
    arrivalTime: '14:00',
    paymentMethod: 'Credit Card',
    idImage: '',
    roomStatus: 'clean',
    consumptions: []
  });

  const [isDragging, setIsDragging] = useState(false);

  const handleAddToCart = useCallback((room: Room) => {
    setSelectedRoom(room);
    setFormData(prev => ({
      ...prev,
      roomStatus: 'clean',
      consumptions: []
    }));
    setStep('form');
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    const days = calculateDays(formData.checkInDate || '', formData.checkOutDate || '');
    const roomPrice = selectedRoom.price * (days || 1);

    const newItem: CartItem = {
      id: Math.random().toString(36).substr(2, 9),
      room: selectedRoom,
      checkIn: formData.checkInDate || '',
      checkOut: formData.checkOutDate || '',
      nights: days,
      totalPrice: roomPrice,
      roomStatus: formData.roomStatus || 'clean',
      consumptions: formData.consumptions || [],
      idImage: formData.idImage,
      details: { ...formData }
    };

    setCart([...cart, newItem]);
    setSelectedRoom(null);
    setStep('selection');
    setIsCartOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, idImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, idImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const updateCartItemConsumption = (itemId: string, consumption: ConsumptionItem, action: 'add' | 'remove') => {
    setCart(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      
      let newConsumptions = [...(item.consumptions || [])];
      if (action === 'add') {
        newConsumptions.push({ ...consumption, id: Math.random().toString(36).substr(2, 9) });
      } else {
        const index = newConsumptions.findIndex(c => c.name === consumption.name);
        if (index > -1) newConsumptions.splice(index, 1);
      }

      const days = calculateDays(item.checkIn, item.checkOut);
      const roomBasePrice = item.room.price * (days || 1);
      const consumptionsTotal = newConsumptions.reduce((acc, c) => acc + c.price, 0);

      return {
        ...item,
        consumptions: newConsumptions,
        totalPrice: roomBasePrice + consumptionsTotal
      };
    }));
  };

  const updateCartItemStatus = (itemId: string, status: 'clean' | 'dirty' | 'maintenance') => {
    setCart(prev => prev.map(item => 
      item.id === itemId ? { ...item, roomStatus: status } : item
    ));
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)));
  };

  const totalCartPrice = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [cart]);

  const handleFinalCheckout = () => {
    const bookingId = `AH-${Math.floor(100000 + Math.random() * 900000)}`;
    setLastBooking({
      cart: [...cart],
      details: { ...formData },
      id: bookingId,
      status: 'completed' // Change to completed when checkout is finished
    });
    setIsBookingComplete(true);
    setCart([]);
  };

  const downloadInvoice = () => {
    if (!lastBooking) return;

    const doc = new jsPDF() as any;
    const { cart: items, details, id } = lastBooking;

    // Header
    doc.setFillColor(15, 98, 254); // Electric Blue
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text(t.hotelName, 20, 25);
    doc.setFontSize(10);
    doc.text(t.tagline, 20, 32);

    // Invoice Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`${t.invoiceNumber}: ${id}`, 20, 55);
    doc.text(`${t.date}: ${new Date().toLocaleDateString()}`, 20, 62);
    doc.text(`${t.customer}: ${details.guestName}`, 20, 69);
    doc.text(`${t.email}: ${details.email}`, 20, 76);

    // Table
    const tableData = items.map(item => {
      const statusPrice = item.roomStatus === 'dirty' ? 25 : item.roomStatus === 'maintenance' ? 50 : 0;
      const days = calculateDays(item.checkIn, item.checkOut);
      return [
        `${item.room.name} (${days} ${t.night}${days > 1 ? 's' : ''})`,
        `$${item.room.price.toFixed(2)}`,
        `$${(item.room.price * days).toFixed(2)}`
      ];
    });

    // Add consumptions to table
    items.forEach(item => {
      if (item.consumptions && item.consumptions.length > 0) {
        const counts = item.consumptions.reduce((acc: any, c) => {
          acc[c.name] = (acc[c.name] || 0) + 1;
          acc[`${c.name}_price`] = c.price;
          return acc;
        }, {});

        Object.keys(counts).forEach(name => {
          if (!name.endsWith('_price')) {
            tableData.push([
              `  - ${name} (x${counts[name]})`,
              `$${counts[`${name}_price`].toFixed(2)}`,
              `$${(counts[name] * counts[`${name}_price`]).toFixed(2)}`
            ]);
          }
        });
      }
      
      if (item.roomStatus !== 'clean') {
        const statusPrice = item.roomStatus === 'dirty' ? 25 : item.roomStatus === 'maintenance' ? 50 : 0;
        tableData.push([
          `  - ${t.roomStatus}: ${t[item.roomStatus]}`,
          `$${statusPrice.toFixed(2)}`,
          `$${statusPrice.toFixed(2)}`
        ]);
      }
    });

    autoTable(doc, {
      startY: 85,
      head: [[t.description, t.basePrice, t.amount]],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [15, 98, 254] }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const subtotal = items.reduce((acc, item) => {
      const statusPrice = item.roomStatus === 'dirty' ? 25 : item.roomStatus === 'maintenance' ? 50 : 0;
      return acc + item.totalPrice + statusPrice;
    }, 0);
    const fee = subtotal * 0.05;
    const total = subtotal + fee;

    doc.setFontSize(10);
    doc.text(`${t.subtotal}: $${subtotal.toFixed(2)}`, 140, finalY);
    doc.text(`${t.serviceFee}: $${fee.toFixed(2)}`, 140, finalY + 7);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`${t.total}: $${total.toFixed(2)}`, 140, finalY + 17);

    try {
      // Attempt to save the file
      doc.save(`Invoice_${id}.pdf`);
    } catch (error) {
      console.error("Download failed, attempting fallback:", error);
      // Fallback: Open in new tab if save is blocked
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById('booking-qr-code');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      // Create a beautifully designed card
      const padding = 80;
      const titleHeight = 160;
      const footerHeight = 120;
      
      const width = img.width + (padding * 2);
      const height = img.height + titleHeight + footerHeight;

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        // Base Background
        ctx.fillStyle = "#FAFAFA";
        ctx.fillRect(0, 0, width, height);

        // Header Background (Electric Blue)
        ctx.fillStyle = "#0f62fe";
        ctx.fillRect(0, 0, width, titleHeight);

        // Header Text
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        
        ctx.font = "bold 42px sans-serif";
        ctx.fillText("ANDRE HOTEL & SPA", width / 2, 80);
        
        ctx.font = "24px sans-serif";
        ctx.fillText("Official Entry Pass", width / 2, 125);

        // QR Code Shadow
        ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
        ctx.shadowBlur = 30;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 15;

        // White card background for QR
        ctx.fillStyle = "#ffffff";
        const cardX = padding - 20;
        const cardY = titleHeight - 40;
        const cardW = img.width + 40;
        const cardH = img.height + 40;
        
        // Custom rounded rect implementation to ensure compatibility
        ctx.beginPath();
        const radius = 24;
        ctx.moveTo(cardX + radius, cardY);
        ctx.lineTo(cardX + cardW - radius, cardY);
        ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
        ctx.lineTo(cardX + cardW, cardY + cardH - radius);
        ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH);
        ctx.lineTo(cardX + radius, cardY + cardH);
        ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius);
        ctx.lineTo(cardX, cardY + radius);
        ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
        ctx.closePath();
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw the high resolution QR image
        ctx.drawImage(img, padding, titleHeight - 20);

        // Footer Text
        ctx.fillStyle = "#111827"; // gray-900
        ctx.font = "bold 28px monospace";
        ctx.fillText(`${lastBooking?.id || ''}`, width / 2, height - 70);
        
        ctx.fillStyle = "#6B7280"; // gray-500
        ctx.font = "18px sans-serif";
        ctx.fillText("Please present this QR code at the front desk", width / 2, height - 35);
      }

      const pngFile = canvas.toDataURL("image/png", 1.0);
      const downloadLink = document.createElement("a");
      downloadLink.download = `EntryPass_${lastBooking?.id || 'QR'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    // Proper Base64 encoding for Unicode
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  const resetApp = () => {
    setIsBookingComplete(false);
    setStep('welcome');
    setFormData({
      guestName: '',
      email: '',
      phone: '',
      emergencyNumber: '',
      nationality: '',
      birthDate: '',
      residenceAddress: '',
      idNumber: '',
      idType: 'passport',
      checkInDate: '',
      checkOutDate: '',
      guestsCount: 1,
      companionName: '',
      companionDocument: '',
      tripReason: '',
      allergies: '',
      specialRequests: '',
      arrivalTime: '14:00',
      paymentMethod: 'Credit Card'
    });
  };

  if (isBookingComplete && lastBooking) {
    const bookingSubtotal = lastBooking.cart.reduce((acc, item) => {
      const statusPrice = item.roomStatus === 'dirty' ? 25 : item.roomStatus === 'maintenance' ? 50 : 0;
      return acc + item.totalPrice + statusPrice;
    }, 0);
    const bookingFee = bookingSubtotal * 0.05;
    const bookingTotal = bookingSubtotal + bookingFee;
    const advancePaid = bookingTotal * 0.5;
    const remainingBalance = bookingTotal - advancePaid;

    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 font-sans py-12">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl max-w-md w-full text-center border border-gray-100"
        >
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle2 className="w-12 h-12 text-electric-blue" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {lastBooking.status === 'completed' ? (t as any).stayCompleted || 'Stay Completed' : t.bookingConfirmed}
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed text-sm">
            {lastBooking.status === 'completed' ? (t as any).paymentSuccess || 'Success' : t.confirmationDesc}
          </p>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl text-left border border-gray-100 flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t.reservationId}</p>
                <p className="font-mono text-gray-900 font-bold">{lastBooking.id}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t.total}</p>
                <p className="font-bold text-gray-900">${bookingTotal.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-blue-50/50 p-4 rounded-xl text-left border border-blue-100/50 space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-blue-100">
                <p className="text-sm font-semibold text-gray-600">{(t as any).advancePayment || 'Advance Payment (50%)'}</p>
                <p className="font-bold text-green-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> ${advancePaid.toFixed(2)}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm font-semibold text-gray-600">{(t as any).remainingBalance || 'Remaining Balance'}</p>
                <p className={`font-bold ${lastBooking.status === 'completed' ? 'text-green-600' : 'text-amber-500'}`}>
                  {lastBooking.status === 'completed' ? <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> $0.00</span> : `$${remainingBalance.toFixed(2)}`}
                </p>
              </div>
            </div>

            <div className="py-6 flex flex-col items-center border border-gray-100 rounded-2xl bg-white shadow-sm mt-4 hover:shadow-md transition-shadow">
              <QRCodeSVG 
                id="booking-qr-code"
                value={`🏨 ANDRE HOTEL & SPA 🏨\n\n📌 Reservation ID: ${lastBooking.id}\n👤 Guest Name: ${lastBooking.details.guestName}\n🛂 ID/Document: ${lastBooking.details.idNumber}\n\n📅 Check-in: ${lastBooking.cart[0]?.checkIn || ''}\n📅 Check-out: ${lastBooking.cart[0]?.checkOut || ''}\n🛏️ Rooms: ${lastBooking.cart.length}\n👤 Guests: ${lastBooking.details.guestsCount}\n\n💳 Status: ${lastBooking.status.toUpperCase()}\n💰 Advance Paid: $${advancePaid.toFixed(2)}\n\n✨ Welcome to your luxury stay! ✨`}
                size={512} 
                level={"H"} 
                includeMargin={true}
                style={{ width: "160px", height: "160px" }}
              />
              <p className="text-xs text-gray-500 mt-3 uppercase tracking-widest font-bold">Official Entry Pass QR</p>
            </div>

            {lastBooking.status === 'booked' && (
              <button 
                onClick={() => setLastBooking({...lastBooking, status: 'completed'})}
                className="w-full bg-amber-500 text-white py-4 rounded-xl font-bold hover:bg-amber-600 transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-amber-500/20"
              >
                {(t as any).finalizeStay || 'Finalize Stay'} <ArrowRight className="w-5 h-5" />
              </button>
            )}
            
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button 
                onClick={downloadQR}
                className="w-full bg-white text-electric-blue border-2 border-electric-blue py-3 rounded-xl font-bold hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-1 text-xs"
              >
                <Download className="w-4 h-4" /> {(t as any).downloadQR || 'Download QR'}
              </button>
              <button 
                onClick={downloadInvoice}
                className="w-full bg-white text-electric-blue border-2 border-electric-blue py-3 rounded-xl font-bold hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-1 text-xs"
              >
                <Download className="w-4 h-4" /> {t.downloadInvoice}
              </button>
            </div>

            <button 
              onClick={resetApp}
              className="w-full bg-electric-gradient text-white py-4 rounded-xl font-bold hover:shadow-electric transition-all flex items-center justify-center gap-2 mt-2"
            >
              {t.backHome} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F5F5F7] text-gray-900 font-sans selection:bg-electric-blue selection:text-white flex flex-col overflow-hidden">
      {/* Navigation */}
      <nav className="glass-effect px-4 md:px-6 py-4 flex justify-between items-center z-40 shrink-0 border-b border-gray-100">
        <div 
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => setStep('welcome')}
        >
          <div className="w-10 h-10 bg-electric-blue rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
            <Hotel className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight group-hover:text-electric-blue transition-colors">{t.hotelName}</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">{t.tagline}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 md:gap-4">
          <button 
            onClick={() => setIsPlanningOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors text-xs font-bold text-gray-700"
          >
            <Calendar className="w-4 h-4 text-electric-blue" />
            <span className="hidden md:inline">{(t as any).roomPlanning || "Planning"}</span>
          </button>

          <button 
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors text-[10px] md:text-sm font-bold uppercase tracking-tight"
          >
            <Globe className="w-3 h-3 md:w-4 h-4 text-electric-blue" />
            <span>{lang === 'en' ? 'ES' : 'EN'}</span>
          </button>
          
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 hover:bg-blue-50 rounded-full transition-colors group"
          >
            <ShoppingCart className="w-5 h-5 md:w-6 h-6 text-gray-700 group-hover:text-electric-blue transition-colors" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-electric-gradient text-white text-[9px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </nav>

        <div className="flex flex-1 overflow-hidden relative">
          <main className={`flex-1 overflow-y-auto transition-all duration-500 ease-in-out ${isCartOpen ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
            <div className={`mx-auto px-4 md:px-6 py-8 md:py-12 transition-all duration-500 ${isCartOpen ? 'max-w-none' : 'max-w-7xl'}`}>
        {step === 'welcome' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-16 md:space-y-24"
          >
            {/* Editorial Hero Section */}
            <div className="relative h-[80vh] flex items-center justify-center overflow-hidden rounded-[40px] bg-ink">
              <motion.img 
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse' }}
                src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1920&q=80" 
                className="absolute inset-0 w-full h-full object-cover opacity-60"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />
              
              <div className="relative text-center px-6">
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-white/60 uppercase tracking-[0.3em] text-xs md:text-sm font-bold mb-6"
                >
                  {t.tagline}
                </motion.p>
                <motion.h2 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-white text-6xl md:text-9xl editorial-title mb-8"
                >
                  {t.findStay}
                </motion.h2>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex justify-center"
                >
                  <button 
                    onClick={() => setStep('selection')}
                    className="group bg-white text-ink px-12 py-5 rounded-full font-bold text-lg flex items-center gap-3 hover:bg-electric-blue hover:text-white transition-all shadow-2xl"
                  >
                    {t.bookNow} <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'selection' && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="space-y-12"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="max-w-2xl">
                <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">{t.roomsSuites}</h2>
                <p className="text-lg md:text-xl text-gray-500">{t.findStayDesc}</p>
              </div>
              <button 
                onClick={() => setStep('welcome')}
                className="text-sm font-bold text-gray-400 hover:text-electric-blue flex items-center gap-2 transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" /> {t.backHome}
              </button>
            </div>

            <div id="rooms-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {ROOMS.map((room) => (
                <RoomCard key={room.id} room={room} t={t} onSelect={handleAddToCart} />
              ))}
            </div>
          </motion.div>
        )}

        {step === 'form' && selectedRoom && (
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="max-w-4xl mx-auto"
          >            <button 
              onClick={() => setStep('selection')}
              className="flex items-center gap-2 text-gray-500 hover:text-electric-blue mb-6 md:mb-8 transition-colors font-medium"
            >
              <X className="w-4 h-4" /> {t.cancel}
            </button>

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
              <div className="grid grid-cols-1 lg:grid-cols-3">
                {/* Sidebar Info */}
                <div className="bg-gray-50 p-6 md:p-8 border-r border-gray-100">
                  <div className="aspect-video rounded-2xl overflow-hidden mb-6 shadow-md">
                    <img src={selectedRoom.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2">{selectedRoom.name}</h3>
                  <div className="flex items-center gap-2 text-gray-500 mb-6">
                    <MapPin className="w-4 h-4 text-electric-blue" />
                    <span className="text-sm">{t.location}</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t.basePrice}</span>
                      <span className="font-bold text-electric-blue">${selectedRoom.price}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t.maxCapacity}</span>
                      <span className="font-bold">{selectedRoom.capacity} {t.guestsPlural}</span>
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">{t.includedAmenities}</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedRoom.amenities.map(a => (
                        <span key={a} className="bg-white px-3 py-1.5 rounded-full text-[10px] md:text-xs border border-gray-200 font-semibold text-gray-600 shadow-sm">
                          {(t.amenitiesList as any)[a] || a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Main Form */}
                <div className="lg:col-span-2 p-6 md:p-8">
                  <h2 className="text-2xl md:text-3xl font-bold mb-8">{t.reservationDetails}</h2>
                  <form onSubmit={handleFormSubmit} className="space-y-8">
                    
                    {/* Personal Information */}
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3 mb-6 border-b border-gray-200 pb-4">
                        <User className="w-5 h-5 text-electric-blue" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900">{t.personalInfo}</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.fullName}</label>
                          <input 
                            required
                            type="text" 
                            placeholder="John Doe"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all shadow-sm"
                            value={formData.guestName}
                            onChange={e => setFormData({...formData, guestName: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.email}</label>
                          <input 
                            required
                            type="email" 
                            placeholder="john@example.com"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all shadow-sm"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.phone}</label>
                          <input 
                            required
                            type="tel" 
                            placeholder="+1 (555) 000-0000"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all shadow-sm"
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.emergencyNumber}</label>
                          <input 
                            required
                            type="tel" 
                            placeholder="+1 (555) 111-2222"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all shadow-sm"
                            value={formData.emergencyNumber}
                            onChange={e => setFormData({...formData, emergencyNumber: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.nationality}</label>
                          <input 
                            required
                            type="text" 
                            placeholder="e.g. Ecuadorian"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all shadow-sm"
                            value={formData.nationality}
                            onChange={e => setFormData({...formData, nationality: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.birthDate}</label>
                          <input 
                            required
                            type="date" 
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all shadow-sm"
                            value={formData.birthDate}
                            onChange={e => setFormData({...formData, birthDate: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.residenceAddress}</label>
                          <input 
                            required
                            type="text" 
                            placeholder="Street, City, Country"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all shadow-sm"
                            value={formData.residenceAddress}
                            onChange={e => setFormData({...formData, residenceAddress: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2 text-left">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.idNumber}</label>
                          <div className="flex gap-2">
                            <select 
                              className="w-[120px] px-2 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all appearance-none bg-white text-sm shadow-sm"
                              value={formData.idType}
                              onChange={e => setFormData({...formData, idType: e.target.value as any})}
                            >
                              <option value="passport">{t.passport}</option>
                              <option value="cedula">{t.cedula}</option>
                              <option value="ruc">{t.ruc}</option>
                            </select>
                            <input 
                              required
                              type="text" 
                              placeholder="ABC123456"
                              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all shadow-sm"
                              value={formData.idNumber}
                              onChange={e => setFormData({...formData, idNumber: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Trip Details */}
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mt-8">
                      <div className="flex items-center gap-3 mb-6 border-b border-gray-200 pb-4">
                        <Plane className="w-5 h-5 text-electric-blue" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900">{t.tripDetails}</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.checkIn}</label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                              required
                              type="date" 
                              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all shadow-sm"
                              value={formData.checkInDate}
                              onChange={e => setFormData({...formData, checkInDate: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.checkOut}</label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                              required
                              type="date" 
                              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all shadow-sm"
                              value={formData.checkOutDate}
                              onChange={e => setFormData({...formData, checkOutDate: e.target.value})}
                            />
                          </div>
                          {formData.checkInDate && formData.checkOutDate && (
                            <p className="text-[10px] font-bold text-electric-blue mt-1 uppercase">
                              {t.nightsCount}: {calculateDays(formData.checkInDate, formData.checkOutDate)}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.tripReason}</label>
                          <select 
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all appearance-none bg-white shadow-sm"
                            value={formData.tripReason}
                            onChange={e => setFormData({...formData, tripReason: e.target.value})}
                          >
                            <option value="">{t.tripReason}...</option>
                            <option value="Tourism">Tourism</option>
                            <option value="Business">Business</option>
                            <option value="Family">Family</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex justify-between">
                            <span>{t.guests}</span>
                            <span className="text-electric-blue">{t.maxGuests}</span>
                          </label>
                          <div className="relative">
                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select 
                              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all appearance-none bg-white shadow-sm"
                              value={formData.guestsCount}
                              onChange={e => setFormData({...formData, guestsCount: parseInt(e.target.value)})}
                            >
                              {Array.from({ length: Math.min(selectedRoom.capacity, 4) }, (_, i) => i + 1).map(n => (
                                <option key={n} value={n}>{n} {n === 1 ? t.guest : t.guestsPlural}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {formData.guestsCount && formData.guestsCount > 1 && (
                          <>
                            <div className="md:col-span-2 pt-4 border-t border-gray-200 mt-2">
                              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">{t.companionData}</h3>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.companionName}</label>
                              <input 
                                type="text" 
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all shadow-sm"
                                value={formData.companionName}
                                onChange={e => setFormData({...formData, companionName: e.target.value})}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.companionDocument}</label>
                              <input 
                                type="text" 
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all shadow-sm"
                                value={formData.companionDocument}
                                onChange={e => setFormData({...formData, companionDocument: e.target.value})}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mt-8">
                      <div className="flex items-center gap-3 mb-6 border-b border-gray-200 pb-4">
                        <ConciergeBell className="w-5 h-5 text-electric-blue" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900">{t.additionalData}</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.arrivalTime}</label>
                          <input 
                            type="time" 
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all shadow-sm"
                            value={formData.arrivalTime}
                            onChange={e => setFormData({...formData, arrivalTime: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-500" /> {t.allergies}
                          </label>
                          <input 
                            type="text" 
                            placeholder={t.allergiesPlaceholder}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all shadow-sm"
                            value={formData.allergies}
                            onChange={e => setFormData({...formData, allergies: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.specialRequests}</label>
                          <textarea 
                            rows={3}
                            placeholder={t.specialRequestsPlaceholder}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all resize-none shadow-sm"
                            value={formData.specialRequests}
                            onChange={e => setFormData({...formData, specialRequests: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mt-8 space-y-6">
                      <div className="flex items-center gap-3 mb-6 border-b border-gray-200 pb-4">
                        <ShieldCheck className="w-5 h-5 text-electric-blue" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900">{(t as any).verificationBilling || 'Verification & Billing'}</h3>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.paymentMethod}</label>
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { id: 'Credit Card', label: t.creditCard },
                            { id: 'PayPal', label: t.payPal }
                          ].map(method => (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => setFormData({...formData, paymentMethod: method.id})}
                              className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                                formData.paymentMethod === method.id 
                                  ? 'border-electric-blue bg-electric-blue text-white shadow-lg shadow-blue-100' 
                                  : 'border-gray-200 hover:border-gray-400 bg-white'
                              }`}
                            >
                              <CreditCard className="w-4 h-4" />
                              <span className="font-semibold text-sm">{method.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* File Upload Section */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.idUpload}</label>
                        <div 
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all bg-white ${
                            isDragging ? 'border-electric-blue bg-blue-50' : 'border-gray-200 hover:border-electric-blue'
                          }`}
                        >
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          {formData.idImage ? (
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-20 h-20 rounded-xl overflow-hidden shadow-md">
                                <img src={formData.idImage} className="w-full h-full object-cover" alt="" />
                              </div>
                              <p className="text-sm font-bold text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> {t.idUploaded}
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                                <Plus className="w-6 h-6 text-gray-400" />
                              </div>
                              <p className="font-bold text-gray-700">{t.idUpload}</p>
                              <p className="text-xs text-gray-400">{t.idUploadDesc}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Hotel Policies */}
                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4">
                      <div className="flex items-center gap-2 text-electric-blue">
                        <ClipboardCheck className="w-5 h-5" />
                        <h4 className="font-bold text-sm uppercase tracking-wider">{t.hotelPolicies}</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="font-bold text-gray-700">{t.checkInTime}</p>
                          <p className="font-bold text-gray-700">{t.checkOutTime}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-electric-blue">{t.cancellationPolicyTitle}</p>
                          <p className="text-gray-500 leading-relaxed">{t.cancellationPolicyDesc}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-electric-blue">{t.hotelRulesTitle}</p>
                          <p className="text-gray-500 leading-relaxed">{t.hotelRulesDesc}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-electric-blue">{t.facilityUsageTitle}</p>
                          <p className="text-gray-500 leading-relaxed">{t.facilityUsageDesc}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 pt-2 border-t border-blue-100/50">
                        * {(t as any).termsContent ? ((t as any).termsContent as string).split('.')[0] : "By completing this reservation you agree to our policies."}. <button type="button" onClick={() => setIsTermsOpen(true)} className="text-electric-blue hover:underline">Read full terms</button>.
                      </p>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-electric-gradient text-white py-4 rounded-xl font-bold text-lg hover:shadow-electric transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      {t.addToSummary} <Plus className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </motion.div>
        )}

              
              {/* Footer moved inside scrollable main */}
              <footer className="bg-white border-t border-gray-200 py-12 px-4 md:px-6 mt-16">
                <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">
                  <div className="col-span-1 sm:col-span-2">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-8 h-8 bg-electric-blue rounded-lg flex items-center justify-center">
                        <Hotel className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-bold text-xl">{t.hotelName}</span>
                    </div>
                    <p className="text-gray-500 max-w-sm text-sm leading-relaxed">
                      {t.footerDesc}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-gray-900">{t.quickLinks}</h4>
                    <ul className="space-y-4 text-gray-500 text-sm">
                      <li><a href="#" onClick={(e) => { e.preventDefault(); setIsAboutUsOpen(true); }} className="hover:text-electric-blue transition-colors">{t.aboutUs}</a></li>
                      <li><a href="#" onClick={(e) => { e.preventDefault(); setStep('selection'); }} className="hover:text-electric-blue transition-colors">{t.roomsSuites}</a></li>
                      <li><a href="#" onClick={(e) => { e.preventDefault(); setIsSeafoodMenuOpen(true); }} className="hover:text-electric-blue transition-colors">{t.seafoodMenu}</a></li>
                      <li><a href="#" onClick={(e) => { e.preventDefault(); setIsServicesOpen(true); }} className="hover:text-electric-blue transition-colors">{t.allServices}</a></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-gray-900">{t.contact}</h4>
                    <ul className="space-y-4 text-gray-500 text-sm">
                      <li className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-electric-blue shrink-0" />
                        <span>Vía Cununyacu, Tercera y Calle El Viñedo s/n, 170910 Quito</span>
                      </li>
                      <li>0983945994</li>
                      <li>bravo.nohemi@colegiosuyana.com</li>
                    </ul>
                  </div>
                </div>
                <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                  <p className="text-[10px] md:text-xs text-gray-400">© 2026 {t.hotelName} & Spa. {t.rights}</p>
                  <div className="flex gap-6 text-[10px] md:text-xs text-gray-400">
                    <button onClick={() => setIsPrivacyOpen(true)} className="hover:text-electric-blue transition-colors text-left">{t.privacy}</button>
                    <button onClick={() => setIsTermsOpen(true)} className="hover:text-electric-blue transition-colors text-left">{t.terms}</button>
                  </div>
                </div>
              </footer>
            </div>
          </main>

          {/* Cart Section - Side Panel */}
          <AnimatePresence>
            {isCartOpen && (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '100%', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="h-full bg-white border-l border-gray-200 shadow-2xl flex flex-col relative z-20 overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-600 text-white shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                      <ShoppingCart className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl font-black uppercase tracking-tight">{t.bookingSummary}</h2>
                  </div>
                  <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                    <X className="w-7 h-7" />
                  </button>
                </div>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-gray-50/50">
                  {/* Left Side: Cart Items */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-12 space-y-8 border-r border-gray-100">
                    <div className="max-w-3xl mx-auto space-y-8">
                      {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-8">
                          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 animate-bounce">
                            <ShoppingCart className="w-8 h-8 text-blue-500" />
                          </div>
                          <p className="font-bold text-lg text-gray-600 mb-1">{t.emptySummary}</p>
                          <p className="text-sm max-w-[180px]">{t.startSelecting}</p>
                        </div>
                      ) : (
                        cart.map((item) => {
                          const statusPrice = item.roomStatus === 'dirty' ? 25 : item.roomStatus === 'maintenance' ? 50 : 0;
                          const finalItemPrice = item.totalPrice + statusPrice;

                          return (
                            <div key={item.id} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 relative group shadow-sm hover:shadow-xl transition-all font-sans overflow-hidden">
                              <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />
                              
                              <button 
                                onClick={() => setCart(cart.filter(c => c.id !== item.id))}
                                className="absolute top-6 right-6 bg-red-50 text-red-500 p-3 rounded-2xl shadow-sm border border-red-100 hover:bg-red-500 hover:text-white transition-all z-10"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                              
                              <div className="flex flex-col gap-8">
                                {/* Header section */}
                                <div className="flex items-center gap-8">
                                  <div className="relative shrink-0">
                                    <img src={item.room.image} className="w-32 h-32 rounded-[2rem] object-cover shadow-xl border-4 border-white ring-1 ring-gray-100" alt="" referrerPolicy="no-referrer" />
                                    <div className="absolute -bottom-3 -left-3 bg-blue-600 text-white text-[10px] font-black px-4 py-2 rounded-xl shadow-lg uppercase tracking-tighter">
                                      ROOM {item.room.id}
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-gray-900 text-3xl leading-tight mb-2 truncate">{item.room.name}</h4>
                                    <p className="text-xs font-bold text-blue-500 uppercase tracking-[0.3em] mb-4">
                                      {t[item.room.quality.toLowerCase() as keyof typeof t] || item.room.quality} {t.roomLabel}
                                    </p>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs font-black text-blue-600 bg-blue-50/50 px-5 py-2 rounded-2xl border border-blue-100 shadow-sm">
                                        {item.nights} {item.nights === 1 ? t.night : (lang === 'es' ? 'noches' : 'nights')}
                                      </span>
                                      <span className="text-2xl font-black text-blue-700 ml-auto">${finalItemPrice}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                                  {/* Dates column */}
                                  <div className="bg-blue-50/30 p-6 rounded-[2rem] border border-blue-100/50 space-y-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Check-in</span>
                                        <span className="text-lg font-black text-gray-800">{item.checkIn}</span>
                                      </div>
                                      <div className="bg-blue-600 p-2 rounded-full shadow-lg">
                                        <ArrowRight className="w-4 h-4 text-white" />
                                      </div>
                                      <div className="flex flex-col text-right gap-1">
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Check-out</span>
                                        <span className="text-lg font-black text-gray-800">{item.checkOut}</span>
                                      </div>
                                    </div>
                                    {item.advancePayment && (
                                      <div className="pt-3 border-t border-blue-100/50 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Abono 50% Especial</span>
                                        <span className="text-sm font-black text-amber-700">${item.advancePayment.toFixed(2)}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Status Column */}
                                  <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{t.roomStatus}</p>
                                    <div className="grid grid-cols-3 gap-2">
                                      {(['clean', 'dirty', 'maintenance'] as const).map(status => (
                                        <button
                                          key={status}
                                          onClick={() => updateCartItemStatus(item.id, status)}
                                          className={`py-3 px-2 rounded-2xl text-[9px] font-black uppercase transition-all border-2 flex flex-col items-center gap-1 shadow-sm ${
                                            item.roomStatus === status 
                                              ? 'bg-blue-600 text-white border-blue-700 ring-4 ring-blue-100' 
                                              : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                                          }`}
                                        >
                                          <span className="truncate">{t[status]}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* Consumption Section */}
                                <div className="space-y-4">
                                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> {t.consumption}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {CONSUMPTION_ITEMS.map(cItem => {
                                      const count = item.consumptions?.filter(c => c.name === cItem.name).length || 0;
                                      const Icon = cItem.category === 'bar' ? Coffee : 
                                                   cItem.category === 'meal' ? Utensils : 
                                                   cItem.category === 'laundry' ? WashingMachine : MoreHorizontal;
                                      
                                      return (
                                        <div key={cItem.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between gap-4 shadow-sm hover:border-blue-100 transition-colors">
                                          <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                                              <Icon className="w-5 h-5 text-blue-500" />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-[11px] font-black text-gray-900 truncate leading-none mb-1">{cItem.name}</p>
                                              <p className="text-[10px] text-gray-500 font-bold leading-tight">${cItem.price}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                                            <button 
                                              onClick={() => updateCartItemConsumption(item.id, cItem, 'remove')}
                                              className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-red-500 transition-all"
                                            >
                                              <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="text-xs font-black w-4 text-center text-gray-800">{count}</span>
                                            <button 
                                              onClick={() => updateCartItemConsumption(item.id, cItem, 'add')}
                                              className="p-1.5 hover:bg-white rounded-lg text-blue-600 transition-all"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Side: Total Summary */}
                  {cart.length > 0 && (
                    <div className="w-full md:w-[450px] shrink-0 bg-white p-8 md:p-12 flex flex-col justify-center border-l border-gray-100 shadow-[-20px_0_40px_rgba(0,0,0,0.02)] relative">
                      <div className="absolute top-0 right-0 w-2 h-full bg-blue-600 opacity-5" />
                      
                      {(() => {
                        const cartSubtotal = cart.reduce((acc, item) => {
                          const statusPrice = item.roomStatus === 'dirty' ? 25 : item.roomStatus === 'maintenance' ? 50 : 0;
                          const itemConsumptions = item.consumptions?.reduce((cSum, c) => cSum + c.price, 0) || 0;
                          return acc + item.totalPrice + statusPrice + itemConsumptions;
                        }, 0);
                        const cartFee = cartSubtotal * 0.05;
                        const cartTotal = cartSubtotal + cartFee;
                        const totalAdvance = cart.reduce((acc, item) => acc + (item.advancePayment || 0), 0);
                        const advancePaid = totalAdvance > 0 ? totalAdvance : cartTotal * 0.5;

                        return (
                          <div className="max-w-md mx-auto w-full space-y-10">
                            <div className="space-y-6">
                              <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-4">
                                {lang === 'es' ? 'Recibo Detallado' : 'Detailed Receipt'}
                                <div className="h-1 flex-1 bg-gray-100 rounded-full" />
                              </h3>
                              
                              <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm font-bold uppercase tracking-widest text-gray-500">
                                  <span>{t.subtotal}</span>
                                  <span className="text-gray-900 text-lg">${cartSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold uppercase tracking-widest text-gray-500">
                                  <span>{t.serviceFee} (5%)</span>
                                  <span className="text-gray-900 text-lg">${cartFee.toFixed(2)}</span>
                                </div>
                                
                                {totalAdvance > 0 && (
                                  <div className="flex justify-between text-sm text-amber-700 bg-amber-50 p-4 rounded-2xl border border-amber-100/50 mt-4">
                                    <span className="font-black uppercase tracking-tight">TOTAL ABONO PAGADO</span>
                                    <span className="font-black text-lg">${totalAdvance.toFixed(2)}</span>
                                  </div>
                                )}
                              </div>

                              <div className="pt-8 border-t-4 border-gray-900">
                                <div className="flex justify-between items-end mb-8">
                                  <div>
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{t.totalToPay || 'TOTAL A PAGAR'}</p>
                                    <p className="text-5xl font-black text-gray-900 tracking-tighter leading-none">${cartTotal.toFixed(2)}</p>
                                  </div>
                                </div>

                                <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-2xl shadow-blue-200 text-white space-y-6 relative overflow-hidden group">
                                  <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
                                  <div className="flex justify-between items-center relative z-10">
                                    <span className="text-sm font-black uppercase tracking-widest opacity-80">{t.advancePayment || 'Abono Requerido'} (50%)</span>
                                    <span className="text-3xl font-black tracking-tighter">${advancePaid.toFixed(2)}</span>
                                  </div>
                                  
                                  <button 
                                    onClick={handleFinalCheckout}
                                    className="w-full bg-white text-blue-600 py-5 rounded-2xl font-black text-xl shadow-xl hover:shadow-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 relative z-10"
                                  >
                                    {t.completeCheckout || 'PAGAR AHORA'} <CreditCard className="w-7 h-7" />
                                  </button>
                                  
                                  <div className="flex flex-col items-center gap-2 relative z-10">
                                    <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest text-center">
                                      * {lang === 'es' ? 'Solo se cobrará el abono ahora.' : 'Only the deposit will be charged now.'}
                                    </p>
                                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md">
                                      <Lock className="w-3 h-3 text-white" />
                                      <span className="text-[9px] text-white font-black uppercase tracking-widest">{t.securePayment || 'PAGO SEGURO SSL'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Seafood Menu Modal */}
      <AnimatePresence>
        {isSeafoodMenuOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSeafoodMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="bg-electric-gradient p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Fish className="w-6 h-6" />
                  <h2 className="text-2xl font-bold">{t.seafoodMenu}</h2>
                </div>
                <button onClick={() => setIsSeafoodMenuOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
                {[
                  { name: "Lobster Thermidor", price: 45, image: "https://images.unsplash.com/photo-1559742811-822873691df8?auto=format&fit=crop&w=800&q=80" },
                  { name: "Grilled Sea Bass", price: 32, image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80" },
                  { name: "Shrimp Scampi", price: 28, image: "https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=800&q=80" },
                  { name: "Oysters Rockefeller", price: 24, image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80" },
                ].map((item, idx) => (
                  <div key={idx} className="group relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <img src={item.image} alt={item.name} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                    <div className="p-3 bg-white">
                      <h3 className="font-bold text-gray-900">{item.name}</h3>
                      <p className="text-electric-blue font-bold">${item.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* All Services Modal */}
      <AnimatePresence>
        {isServicesOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsServicesOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="bg-electric-gradient p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <ConciergeBell className="w-6 h-6" />
                  <h2 className="text-2xl font-bold">{t.allServices}</h2>
                </div>
                <button onClick={() => setIsServicesOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 grid grid-cols-2 gap-6">
                {[
                  { name: "24/7 Concierge", icon: Users },
                  { name: "Spa & Massage", icon: Star },
                  { name: "Airport Transfer", icon: MapPin },
                  { name: "Gourmet Restaurant", icon: Utensils },
                  { name: "Laundry Service", icon: WashingMachine },
                  { name: "Private Pool", icon: Waves },
                ].map((service, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                      <service.icon className="w-6 h-6 text-electric-blue" />
                    </div>
                    <span className="font-bold text-gray-900 text-sm">{service.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Planning Modal */}
      <AnimatePresence>
        {isPlanningOpen && (
          <div className="fixed inset-0 z-[70] bg-white flex flex-col font-sans overflow-hidden">
            {/* Header */}
            <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-electric-blue rounded-lg flex items-center justify-center">
                  <Hotel className="text-white w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{(t as any).roomPlanning}</h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select className="bg-transparent text-sm font-medium focus:outline-none pr-4">
                    <option>{(t as any).allRooms}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-1">
                  <button 
                    onClick={handlePrevMonth}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <span className="text-sm font-bold text-gray-900 px-4 min-w-[120px] text-center capitalize">
                    {planningDate.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button 
                    onClick={handleNextMonth}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <button 
                  onClick={() => setIsPlanningOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Left Sidebar */}
              <div className="w-[300px] border-r border-gray-300 p-6 flex flex-col gap-6 bg-white overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Calendar className="w-5 h-5" />
                    <h3 className="font-bold uppercase tracking-tight">{(t as any).newReservation}</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-700">{(t as any).guestName}</label>
                      <input 
                        type="text" 
                        value={planningForm.guestName}
                        onChange={(e) => setPlanningForm(prev => ({...prev, guestName: e.target.value}))}
                        placeholder={t.fullName || "Full Name"}
                        className="w-full px-4 py-3 rounded-xl border border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-700">{t.room}</label>
                      <select 
                        value={planningForm.roomId}
                        onChange={(e) => setPlanningForm(prev => ({...prev, roomId: parseInt(e.target.value)}))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm bg-white"
                      >
                        {ROOMS.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700">{t.checkIn || "Check-In"}</label>
                        <div className="relative">
                          <input 
                            type="date" 
                            value={planningForm.checkIn}
                            onChange={(e) => setPlanningForm(prev => ({...prev, checkIn: e.target.value}))}
                            className="w-full px-3 py-3 rounded-xl border border-gray-400 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700">{t.checkOut || "Check-Out"}</label>
                        <div className="relative">
                          <input 
                            type="date" 
                            value={planningForm.checkOut}
                            onChange={(e) => setPlanningForm(prev => ({...prev, checkOut: e.target.value}))}
                            className="w-full px-3 py-3 rounded-xl border border-gray-400 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        handleCreateStayFromPlanning();
                        setIsPlanningOpen(false);
                        setIsCartOpen(true);
                      }}
                      disabled={!planningForm.guestName}
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-[0.98] shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {(t as any).createStay}
                    </button>
                  </div>
                </div>

                <div className="mt-auto space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 tracking-widest">{(t as any).legend}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-sm bg-[#E8F5E9]"></div>
                      <span className="text-sm font-medium text-gray-700">{(t as any).available}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-sm bg-[#FFD600]"></div>
                      <span className="text-sm font-medium text-gray-700">{(t as any).reserved}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-sm bg-[#FF1744]"></div>
                      <span className="text-sm font-medium text-gray-700">{(t as any).occupied}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid content */}
              <div className="flex-1 overflow-x-auto bg-[#E8F5E9]/30">
                <div className="min-w-max h-full flex flex-col">
                  {/* Days Header */}
                  <div className="flex bg-gray-50 border-b border-gray-200">
                    <div className="w-[120px] shrink-0 border-r border-gray-300 bg-gray-100 flex items-center justify-center font-bold text-[10px] text-gray-500 uppercase tracking-wider">
                      {t.room}
                    </div>
                    <div className="flex shrink-0">
                      {planningHeaderDays.map((dayInfo, i) => (
                        <div key={i} className={`w-[45px] border-r border-gray-200 flex flex-col items-center justify-center py-1 bg-white ${dayInfo.isToday ? 'bg-indigo-50' : ''}`}>
                          <span className="text-[9px] font-bold text-gray-400 leading-tight">{dayInfo.dayName}</span>
                          <span className={`text-xs font-black ${dayInfo.isToday ? 'text-indigo-600' : 'text-gray-800'}`}>{dayInfo.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                    {/* Rooms Grid */}
                    <div className="flex-1 overflow-y-auto">
                      {ROOMS.map(room => (
                        <div key={room.id} className="flex border-b border-gray-200 h-[50px] group">
                          <div className="w-[120px] shrink-0 border-r border-gray-300 bg-gray-50 flex items-center px-3 font-bold text-xs text-gray-700 bg-white group-hover:bg-indigo-50 transition-colors sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                            {room.name}
                          </div>
                          <div className="flex">
                            {Array.from({ length: getDaysInMonth(planningDate.getFullYear(), planningDate.getMonth()) }).map((_, i) => {
                              const monthStr = String(planningDate.getMonth() + 1).padStart(2, '0');
                              const dayStr = String(i + 1).padStart(2, '0');
                              const dateStr = `${planningDate.getFullYear()}-${monthStr}-${dayStr}`;
                              const status = roomStatusLookup[`${room.id}-${dateStr}`];
                              
                              return (
                                <PlanningCell
                                  key={i}
                                  room={room}
                                  day={i + 1}
                                  status={status}
                                  onClick={toggleDateSelection}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* About Us Modal */}
      <AnimatePresence>
        {isAboutUsOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAboutUsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="bg-electric-gradient p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Info className="w-6 h-6" />
                  <h2 className="text-2xl font-bold">{t.aboutUs}</h2>
                </div>
                <button onClick={() => setIsAboutUsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-electric-blue">
                    <Star className="w-6 h-6 fill-current" />
                    <h3 className="text-xl font-bold uppercase tracking-wider">{(t as any).missionTitle}</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed text-lg italic">
                    "{(t as any).mission}"
                  </p>
                </div>
                
                <div className="h-px bg-gray-100" />

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-electric-blue">
                    <Globe className="w-6 h-6" />
                    <h3 className="text-xl font-bold uppercase tracking-wider">{(t as any).visionTitle}</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed text-lg italic">
                    "{(t as any).vision}"
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Terms Modal */}
      <AnimatePresence>
        {isTermsOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTermsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="bg-electric-gradient p-6 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="w-6 h-6" />
                  <h3 className="font-bold text-xl">{(t as any).termsTitle || t.terms}</h3>
                </div>
                <button onClick={() => setIsTermsOpen(false)} className="text-white/80 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto space-y-4">
                {((t as any).termsContent || '').split('. ').map((sentence: string, idx: number) => (
                  sentence ? <p key={idx} className="text-gray-600 leading-relaxed text-sm md:text-base mb-2">{sentence}.</p> : null
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Privacy Modal */}
      <AnimatePresence>
        {isPrivacyOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPrivacyOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="bg-electric-gradient p-6 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6" />
                  <h3 className="font-bold text-xl">{(t as any).privacyTitle || t.privacy}</h3>
                </div>
                <button onClick={() => setIsPrivacyOpen(false)} className="text-white/80 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto space-y-4">
                {((t as any).privacyContent || '').split('. ').map((sentence: string, idx: number) => (
                  sentence ? <p key={idx} className="text-gray-600 leading-relaxed text-sm md:text-base mb-2">{sentence}.</p> : null
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
