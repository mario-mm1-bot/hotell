/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
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
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ROOMS, CONSUMPTION_ITEMS } from './constants';
import { Room, CartItem, BookingDetails, ConsumptionItem } from './types';
import { TRANSLATIONS } from './translations';

type Language = 'en' | 'es';

export default function App() {
  const [lang, setLang] = useState<Language>('es');
  const t = TRANSLATIONS[lang];

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSeafoodMenuOpen, setIsSeafoodMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isAboutUsOpen, setIsAboutUsOpen] = useState(false);
  const [isBookingComplete, setIsBookingComplete] = useState(false);
  const [lastBooking, setLastBooking] = useState<{
    cart: CartItem[];
    details: Partial<BookingDetails>;
    id: string;
  } | null>(null);
  const [step, setStep] = useState<'welcome' | 'selection' | 'form' | 'summary'>('welcome');

  // Form State
  const [formData, setFormData] = useState<Partial<BookingDetails>>({
    guestName: '',
    email: '',
    phone: '',
    idType: 'passport',
    idNumber: '',
    checkInDate: '',
    checkOutDate: '',
    guestsCount: 1,
    allergies: '',
    specialRequests: '',
    arrivalTime: '14:00',
    paymentMethod: 'Credit Card',
    idImage: '',
    roomStatus: 'clean',
    consumptions: []
  });

  const [isDragging, setIsDragging] = useState(false);

  const handleAddToCart = (room: Room) => {
    setSelectedRoom(room);
    setFormData(prev => ({
      ...prev,
      roomStatus: 'clean',
      consumptions: []
    }));
    setStep('form');
  };

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
      totalPrice: roomPrice,
      roomStatus: formData.roomStatus || 'clean',
      consumptions: formData.consumptions || [],
      idImage: formData.idImage
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
      id: bookingId
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

  const resetApp = () => {
    setIsBookingComplete(false);
    setStep('welcome');
    setFormData({
      guestName: '',
      email: '',
      phone: '',
      idNumber: '',
      checkInDate: '',
      checkOutDate: '',
      guestsCount: 1,
      allergies: '',
      specialRequests: '',
      arrivalTime: '14:00',
      paymentMethod: 'Credit Card'
    });
  };

  if (isBookingComplete) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-3xl shadow-2xl max-w-md w-full text-center border border-gray-100"
        >
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <CheckCircle2 className="w-12 h-12 text-electric-blue" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{t.bookingConfirmed}</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            {t.confirmationDesc}
          </p>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl text-left border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t.reservationId}</p>
              <p className="font-mono text-gray-900 font-bold">{lastBooking?.id}</p>
            </div>
            
            <button 
              onClick={downloadInvoice}
              className="w-full bg-white text-electric-blue border-2 border-electric-blue py-4 rounded-xl font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> {t.downloadInvoice}
            </button>

            <button 
              onClick={resetApp}
              className="w-full bg-electric-gradient text-white py-4 rounded-xl font-bold hover:shadow-electric transition-all flex items-center justify-center gap-2"
            >
              {t.backHome} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-gray-900 font-sans selection:bg-electric-blue selection:text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 glass-effect px-4 md:px-6 py-4 flex justify-between items-center">
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

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
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
                <motion.div 
                  key={room.id}
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
                        onClick={() => handleAddToCart(room)}
                        className="bg-electric-gradient text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold hover:shadow-electric transition-all flex items-center gap-2 active:scale-95"
                      >
                        {t.bookNow} <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
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
                  <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.fullName}</label>
                        <input 
                          required
                          type="text" 
                          placeholder="John Doe"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all"
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
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all"
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
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all"
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.idNumber}</label>
                        <div className="flex gap-2">
                          <select 
                            className="w-[100px] px-2 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all appearance-none bg-white text-sm"
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
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all"
                            value={formData.idNumber}
                            onChange={e => setFormData({...formData, idNumber: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.checkIn}</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input 
                            required
                            type="date" 
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all"
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
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all"
                            value={formData.checkOutDate}
                            onChange={e => setFormData({...formData, checkOutDate: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex justify-between">
                          <span>{t.guests}</span>
                          <span className="text-electric-blue">{t.maxGuests}</span>
                        </label>
                        <div className="relative">
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <select 
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all appearance-none bg-white"
                            value={formData.guestsCount}
                            onChange={e => setFormData({...formData, guestsCount: parseInt(e.target.value)})}
                          >
                            {Array.from({ length: Math.min(selectedRoom.capacity, 4) }, (_, i) => i + 1).map(n => (
                              <option key={n} value={n}>{n} {n === 1 ? t.guest : t.guestsPlural}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.arrivalTime}</label>
                        <input 
                          type="time" 
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all"
                          value={formData.arrivalTime}
                          onChange={e => setFormData({...formData, arrivalTime: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-500" /> {t.allergies}
                      </label>
                      <input 
                        type="text" 
                        placeholder={t.allergiesPlaceholder}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all"
                        value={formData.allergies}
                        onChange={e => setFormData({...formData, allergies: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400">{t.specialRequests}</label>
                      <textarea 
                        rows={3}
                        placeholder={t.specialRequestsPlaceholder}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue outline-none transition-all resize-none"
                        value={formData.specialRequests}
                        onChange={e => setFormData({...formData, specialRequests: e.target.value})}
                      />
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
                                : 'border-gray-200 hover:border-gray-400'
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
                        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
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

      </main>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-electric-gradient text-white">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  <h2 className="text-xl font-bold">{t.bookingSummary}</h2>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                      <ShoppingCart className="w-8 h-8 text-electric-blue" />
                    </div>
                    <p className="font-medium">{t.emptySummary}</p>
                    <p className="text-sm">{t.startSelecting}</p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const statusPrice = item.roomStatus === 'dirty' ? 25 : item.roomStatus === 'maintenance' ? 50 : 0;
                    const finalItemPrice = item.totalPrice + statusPrice;

                    return (
                      <div key={item.id} className="bg-white rounded-2xl p-4 border border-gray-100 relative group shadow-sm hover:shadow-md transition-all font-mono">
                        <button 
                          onClick={() => setCart(cart.filter(c => c.id !== item.id))}
                          className="absolute -top-2 -right-2 bg-white text-red-500 p-1.5 rounded-full shadow-md border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="flex flex-col gap-4">
                          <div className="flex gap-4">
                            <img src={item.room.image} className="w-20 h-20 rounded-xl object-cover shadow-sm" alt="" referrerPolicy="no-referrer" />
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 font-sans">{item.room.name}</h4>
                              <p className="text-[10px] font-bold text-electric-blue uppercase tracking-wider mb-2 font-sans">
                                {t[item.room.quality.toLowerCase() as keyof typeof t] || item.room.quality} {t.roomLabel}
                              </p>
                              <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                <Calendar className="w-3 h-3" /> {item.checkIn}
                                <ArrowRight className="w-2 h-2" />
                                {item.checkOut}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg text-electric-blue">${finalItemPrice}</p>
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest">{t.total}</p>
                            </div>
                          </div>

                          {/* Room Status & Consumptions (Check-out Simulation) */}
                          <div className="space-y-4 pt-4 border-t border-dashed border-gray-200">
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                                  <div className="w-1 h-1 bg-electric-blue rounded-full" /> {t.roomStatus}
                                </div>
                                {statusPrice > 0 && (
                                  <span className="text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                    +${statusPrice}.00
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {(['clean', 'dirty', 'maintenance'] as const).map(status => (
                                  <button
                                    key={status}
                                    onClick={() => updateCartItemStatus(item.id, status)}
                                    className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase transition-all border flex items-center gap-1.5 ${
                                      item.roomStatus === status 
                                        ? 'bg-ink text-white border-ink' 
                                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                                    }`}
                                  >
                                    {t[status]}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1">
                                <ShoppingCart className="w-3 h-3 text-electric-blue" /> {t.consumption}
                              </p>
                              <div className="grid grid-cols-1 gap-2">
                                {CONSUMPTION_ITEMS.map(cItem => {
                                  const count = item.consumptions?.filter(c => c.name === cItem.name).length || 0;
                                  const Icon = cItem.category === 'bar' ? Coffee : 
                                               cItem.category === 'meal' ? Utensils : 
                                               cItem.category === 'laundry' ? WashingMachine : MoreHorizontal;
                                  
                                  return (
                                    <div key={cItem.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-xl border border-gray-100">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                          <Icon className="w-3.5 h-3.5 text-electric-blue" />
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-bold leading-none text-gray-700">{cItem.name}</p>
                                          <p className="text-[9px] text-gray-400 font-medium">${cItem.price}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 p-0.5">
                                        <button 
                                          onClick={() => updateCartItemConsumption(item.id, cItem, 'remove')}
                                          className="p-1 hover:bg-gray-50 rounded-md text-gray-400 transition-colors"
                                        >
                                          <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="text-[10px] font-bold w-4 text-center text-gray-700">{count}</span>
                                        <button 
                                          onClick={() => updateCartItemConsumption(item.id, cItem, 'add')}
                                          className="p-1 hover:bg-gray-50 rounded-md text-electric-blue transition-colors"
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
                      </div>
                    );
                  })
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-gray-100 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{t.subtotal}</span>
                      <span className="font-semibold text-gray-900">
                        ${cart.reduce((acc, item) => {
                          const statusPrice = item.roomStatus === 'dirty' ? 25 : item.roomStatus === 'maintenance' ? 50 : 0;
                          return acc + item.totalPrice + statusPrice;
                        }, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{t.serviceFee}</span>
                      <span className="font-semibold text-gray-900">
                        ${(cart.reduce((acc, item) => {
                          const statusPrice = item.roomStatus === 'dirty' ? 25 : item.roomStatus === 'maintenance' ? 50 : 0;
                          return acc + item.totalPrice + statusPrice;
                        }, 0) * 0.05).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-200 text-electric-blue">
                      <span>{t.total}</span>
                      <span>
                        ${(cart.reduce((acc, item) => {
                          const statusPrice = item.roomStatus === 'dirty' ? 25 : item.roomStatus === 'maintenance' ? 50 : 0;
                          return acc + item.totalPrice + statusPrice;
                        }, 0) * 1.05).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={handleFinalCheckout}
                    className="w-full bg-electric-gradient text-white py-4 rounded-xl font-bold text-lg hover:shadow-electric transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    {t.completeCheckout} <CreditCard className="w-5 h-5" />
                  </button>
                  <p className="text-center text-[10px] text-gray-400 mt-4 flex items-center justify-center gap-1">
                    <Info className="w-3 h-3" /> {t.securePayment}
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12 px-4 md:px-6">
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
                <span>123 Luxury Avenue, Paradise City</span>
              </li>
              <li>+1 (555) 123-4567</li>
              <li>concierge@andre-hotel.com</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] md:text-xs text-gray-400">© 2026 {t.hotelName} & Spa. {t.rights}</p>
          <div className="flex gap-6 text-[10px] md:text-xs text-gray-400">
            <a href="#" className="hover:text-electric-blue transition-colors">{t.privacy}</a>
            <a href="#" className="hover:text-electric-blue transition-colors">{t.terms}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
