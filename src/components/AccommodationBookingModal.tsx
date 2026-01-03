import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Calendar,
  Users,
  CreditCard,
  Banknote,
  Minus,
  Plus,
  CheckCircle2,
  Info,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  BedDouble,
  Check,
  Percent,
} from 'lucide-react-native';
import { useTranslation } from '@/lib/i18n';
import {
  useCreateBooking,
  useAdminFees,
  useAccommodationAvailability,
  useRooms,
  calculateBookingFees,
  isDateAvailable,
  isDateRangeAvailable,
  calculateDateRangePrice,
} from '@/lib/api/bookings';
import {
  useAccommodationPricingRules,
  useRoomPricingRules,
  calculateDynamicPrice,
  calculateDynamicDateRangePrice,
} from '@/lib/api/pricing';
import { useAuth } from '@/lib/api/auth';
import type { Room, AvailabilityCalendar } from '@/lib/supabase';

interface AccommodationForBooking {
  id: string;
  title: string;
  location: string;
  price_per_night: number;
  max_guests: number;
  min_stay: number;
  max_stay?: number | null;
  cleaning_fee: number | null;
  offline_payment_enabled?: boolean;
  property_type?: string;
}

interface AccommodationBookingModalProps {
  visible: boolean;
  onClose: () => void;
  accommodation: AccommodationForBooking;
  onSuccess?: (bookingId: string) => void;
}

export default function AccommodationBookingModal({
  visible,
  onClose,
  accommodation,
}: AccommodationBookingModalProps) {
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const { data: authData } = useAuth();
  const createBooking = useCreateBooking();

  // Fetch data from database
  const { data: adminFees = [] } = useAdminFees('accommodation');
  const { data: availability = [], isLoading: availabilityLoading, refetch: refetchAvailability } = useAccommodationAvailability(
    visible ? accommodation.id : undefined
  );
  const { data: rooms = [] } = useRooms(
    visible && (accommodation.property_type === 'hotel' || accommodation.property_type === 'resort')
      ? accommodation.id
      : undefined
  );

  // Fetch pricing rules
  const { data: pricingRules = [] } = useAccommodationPricingRules(
    visible ? accommodation.id : undefined
  );

  // Log admin fees for debugging
  React.useEffect(() => {
    if (adminFees && adminFees.length > 0) {
      console.log('📊 Admin fees loaded for accommodation:', adminFees);
    } else if (adminFees && adminFees.length === 0) {
      console.log('⚠️ No admin fees found in database');
    }
  }, [adminFees]);

  // Payment type is determined by the accommodation's offline_payment_enabled setting
  const paymentType = accommodation.offline_payment_enabled ? 'offline' : 'online';

  // Form state
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [guests, setGuests] = useState<number>(1);
  const [specialRequests, setSpecialRequests] = useState<string>('');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);

  // Calendar navigation state
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectingCheckOut, setSelectingCheckOut] = useState<boolean>(false);

  // Booking success state
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);

  // Check if this is a hotel with rooms
  const hasRooms = rooms.length > 0;

  // Calculate nights
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [checkIn, checkOut]);

  // Calculate pricing with dynamic pricing from availability calendar and pricing rules
  const pricing = useMemo(() => {
    if (!checkIn || !checkOut || nights === 0) {
      return {
        basePrice: 0,
        originalBasePrice: 0,
        serviceFee: 0,
        cleaningFee: 0,
        taxes: 0,
        total: 0,
        discountAmount: 0,
        discountPercentage: 0,
        hasDiscount: false
      };
    }

    let basePrice = 0;
    let originalBasePrice = 0;
    let discountAmount = 0;
    let discountPercentage = 0;
    let hasDiscount = false;

    if (hasRooms && selectedRooms.length > 0) {
      // Calculate price based on selected rooms
      selectedRooms.forEach(roomId => {
        const room = rooms.find(r => r.id === roomId);
        if (room) {
          originalBasePrice += room.price_per_night * nights;
          // For rooms, we use the base room price for now
          // Room-specific pricing rules could be added here
          basePrice += room.price_per_night * nights;
        }
      });
    } else {
      // Use accommodation price with dynamic pricing from calendar first
      const calendarPrice = calculateDateRangePrice(checkIn, checkOut, accommodation.price_per_night, availability);
      originalBasePrice = accommodation.price_per_night * nights;

      // Apply dynamic pricing rules on top of calendar pricing
      if (pricingRules.length > 0) {
        const dynamicPricing = calculateDynamicDateRangePrice(
          accommodation.price_per_night,
          pricingRules,
          checkIn,
          checkOut
        );

        // Use the lower of calendar price or dynamic price
        if (dynamicPricing.hasDiscount) {
          basePrice = Math.min(calendarPrice, dynamicPricing.totalPrice);
          discountAmount = originalBasePrice - basePrice;
          discountPercentage = Math.round((discountAmount / originalBasePrice) * 100);
          hasDiscount = discountAmount > 0;
        } else {
          basePrice = calendarPrice;
          discountAmount = originalBasePrice - basePrice;
          discountPercentage = discountAmount > 0 ? Math.round((discountAmount / originalBasePrice) * 100) : 0;
          hasDiscount = discountAmount > 0;
        }
      } else {
        basePrice = calendarPrice;
        discountAmount = originalBasePrice - basePrice;
        discountPercentage = discountAmount > 0 ? Math.round((discountAmount / originalBasePrice) * 100) : 0;
        hasDiscount = discountAmount > 0;
      }
    }

    const cleaningFee = accommodation.cleaning_fee || 0;
    const { serviceFee, taxes, total } = calculateBookingFees(basePrice, cleaningFee, adminFees);

    console.log('💰 Pricing breakdown:', {
      originalBasePrice,
      basePrice,
      discountAmount,
      discountPercentage,
      hasDiscount,
      cleaningFee,
      serviceFee,
      taxes,
      total,
      adminFeesCount: adminFees.length,
      pricingRulesCount: pricingRules.length
    });

    return {
      basePrice,
      originalBasePrice,
      serviceFee,
      cleaningFee,
      taxes,
      total,
      discountAmount,
      discountPercentage,
      hasDiscount
    };
  }, [checkIn, checkOut, nights, hasRooms, selectedRooms, rooms, accommodation, availability, adminFees, pricingRules]);

  // Check if selected dates are available
  const datesAvailable = useMemo(() => {
    if (!checkIn || !checkOut) return true;
    return isDateRangeAvailable(checkIn, checkOut, availability);
  }, [checkIn, checkOut, availability]);

  // Validation
  const minStayMet = nights >= (accommodation.min_stay || 1);
  const maxStayMet = !accommodation.max_stay || nights <= accommodation.max_stay;
  const roomsSelected = !hasRooms || selectedRooms.length > 0;
  const canBook = checkIn && checkOut && nights > 0 && datesAvailable && minStayMet && maxStayMet && roomsSelected;

  // Reset form when modal opens
  React.useEffect(() => {
    if (visible) {
      setBookingSuccess(false);
      setCheckIn(null);
      setCheckOut(null);
      setGuests(1);
      setSpecialRequests('');
      setSelectedRooms([]);
      setSelectingCheckOut(false);
      setCurrentMonth(new Date());
    }
  }, [visible]);

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const isDateInRange = (date: Date) => {
    if (!checkIn || !checkOut) return false;
    return date > checkIn && date < checkOut;
  };

  const isCheckInDate = (date: Date) => {
    if (!checkIn) return false;
    return date.toDateString() === checkIn.toDateString();
  };

  const isCheckOutDate = (date: Date) => {
    if (!checkOut) return false;
    return date.toDateString() === checkOut.toDateString();
  };

  const handleDateSelect = (date: Date) => {
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) return;
    if (!isDateAvailable(date, availability)) return;

    if (!selectingCheckOut || !checkIn) {
      // Selecting check-in
      setCheckIn(date);
      setCheckOut(null);
      setSelectingCheckOut(true);
    } else {
      // Selecting check-out
      if (date <= checkIn) {
        // If selected date is before or same as check-in, reset
        setCheckIn(date);
        setCheckOut(null);
      } else {
        // Check if all dates in range are available
        if (isDateRangeAvailable(checkIn, date, availability)) {
          setCheckOut(date);
          setSelectingCheckOut(false);
        }
      }
    }
  };

  const prevMonth = () => {
    const prev = new Date(currentMonth);
    prev.setMonth(prev.getMonth() - 1);
    if (prev >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)) {
      setCurrentMonth(prev);
    }
  };

  const nextMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    setCurrentMonth(next);
  };

  const toggleRoom = (roomId: string) => {
    setSelectedRooms(prev =>
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  };

  // Helper function to format date to YYYY-MM-DD in local timezone
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleBook = async () => {
    if (!authData?.user || !checkIn || !checkOut) return;

    try {
      const booking = await createBooking.mutateAsync({
        accommodation_id: accommodation.id,
        room_id: selectedRooms.length === 1 ? selectedRooms[0] : undefined,
        check_in: formatDateForAPI(checkIn),
        check_out: formatDateForAPI(checkOut),
        guests,
        total_price: pricing.total,
        base_price: pricing.basePrice,
        service_fee: pricing.serviceFee,
        cleaning_fee: pricing.cleaningFee,
        special_requests: specialRequests || undefined,
        payment_method: paymentType,
      });

      setBookingSuccess(true);
    } catch (error) {
      console.error('Booking error:', error);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return t('booking.selectDate') || 'Select date';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Success screen
  if (bookingSuccess) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-1 items-center justify-center px-6">
            <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center mb-6">
              <CheckCircle2 size={48} color="#10B981" />
            </View>
            <Text
              className="text-2xl font-bold text-gray-900 text-center mb-3"
              style={{ fontFamily: 'Cairo_700Bold' }}
            >
              {t('booking.requestSent')}
            </Text>
            <Text
              className="text-base text-gray-600 text-center mb-2"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {paymentType === 'online'
                ? t('booking.awaitingApprovalOnline')
                : t('booking.awaitingApprovalOffline')}
            </Text>
            <Text
              className="text-sm text-gray-500 text-center mb-8"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {t('booking.hostWillRespond')}
            </Text>
            <Pressable
              onPress={onClose}
              className="w-full bg-emerald-500 rounded-xl py-4 items-center"
            >
              <Text
                className="text-white font-bold text-base"
                style={{ fontFamily: 'Cairo_700Bold' }}
              >
                {t('common.done')}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
          <Pressable
            onPress={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <X size={20} color="#000" />
          </Pressable>
          <Text
            className="text-lg font-bold text-gray-900"
            style={{ fontFamily: 'Cairo_700Bold' }}
          >
            {t('booking.title')}
          </Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Property Summary */}
          <View className="px-4 py-4 border-b border-gray-100">
            <Text
              className="text-xl font-bold text-gray-900 mb-1"
              style={{ fontFamily: 'Cairo_700Bold' }}
            >
              {accommodation.title}
            </Text>
            <Text
              className="text-sm text-gray-500"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {accommodation.location}
            </Text>
          </View>

          {/* Calendar */}
          <View className="px-4 py-4 border-b border-gray-100">
            <Text
              className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {selectingCheckOut ? t('booking.selectCheckOut') || 'Select check-out' : t('booking.selectCheckIn') || 'Select check-in'}
            </Text>

            {/* Selected dates display */}
            <View className="flex-row gap-3 mb-4">
              <View className={`flex-1 p-3 rounded-xl border ${checkIn ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                <Text className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                  {t('booking.checkIn')}
                </Text>
                <Text className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {formatDate(checkIn)}
                </Text>
              </View>
              <View className={`flex-1 p-3 rounded-xl border ${checkOut ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                <Text className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                  {t('booking.checkOut')}
                </Text>
                <Text className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {formatDate(checkOut)}
                </Text>
              </View>
            </View>

            {/* Month navigation */}
            <View className="flex-row items-center justify-between mb-4">
              <Pressable onPress={prevMonth} className="p-2">
                <ChevronLeft size={24} color="#374151" />
              </Pressable>
              <Text className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {formatMonthYear(currentMonth)}
              </Text>
              <Pressable onPress={nextMonth} className="p-2">
                <ChevronRight size={24} color="#374151" />
              </Pressable>
            </View>

            {/* Day headers */}
            <View className="flex-row mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <View key={day} className="flex-1 items-center">
                  <Text className="text-xs text-gray-500" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            {availabilityLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="small" color="#10B981" />
              </View>
            ) : (
              <View className="flex-row flex-wrap">
                {/* Empty cells for days before the 1st */}
                {Array.from({ length: startingDay }).map((_, i) => (
                  <View key={`empty-${i}`} className="w-[14.28%] h-10" />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  const isPast = date < today;
                  const available = isDateAvailable(date, availability);
                  const isInRange = isDateInRange(date);
                  const isStart = isCheckInDate(date);
                  const isEnd = isCheckOutDate(date);
                  const isDisabled = isPast || !available;

                  return (
                    <Pressable
                      key={day}
                      onPress={() => handleDateSelect(date)}
                      disabled={isDisabled}
                      className={`w-[14.28%] h-10 items-center justify-center ${
                        isStart || isEnd
                          ? 'bg-emerald-500 rounded-full'
                          : isInRange
                          ? 'bg-emerald-100'
                          : ''
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          isStart || isEnd
                            ? 'text-white font-bold'
                            : isDisabled
                            ? 'text-gray-300'
                            : isInRange
                            ? 'text-emerald-700'
                            : 'text-gray-900'
                        }`}
                        style={{ fontFamily: isStart || isEnd ? 'Cairo_700Bold' : 'Cairo_400Regular' }}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Availability warning */}
            {checkIn && checkOut && !datesAvailable && (
              <View className="flex-row items-center mt-4 p-3 bg-red-50 rounded-lg">
                <AlertCircle size={16} color="#EF4444" />
                <Text className={`text-sm text-red-700 flex-1 ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                  {t('booking.datesUnavailable') || 'Some dates in your selection are not available'}
                </Text>
              </View>
            )}
          </View>

          {/* Rooms Selection (for hotels) */}
          {hasRooms && (
            <View className="px-4 py-4 border-b border-gray-100">
              <Text
                className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4"
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                {t('booking.selectRooms') || 'Select Rooms'}
              </Text>

              {rooms.map(room => (
                <Pressable
                  key={room.id}
                  onPress={() => toggleRoom(room.id)}
                  className={`flex-row items-center p-4 rounded-xl border mb-3 ${
                    selectedRooms.includes(room.id)
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <View className="w-12 h-12 rounded-lg bg-gray-200 items-center justify-center">
                    <BedDouble size={24} color="#6B7280" />
                  </View>
                  <View className={`flex-1 ${isRTL ? 'mr-3' : 'ml-3'}`}>
                    <Text className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                      {room.room_name || room.room_type}
                    </Text>
                    <Text className="text-sm text-gray-500" style={{ fontFamily: 'Cairo_400Regular' }}>
                      {t('booking.upToGuests')?.replace('{{max}}', String(room.max_guests)) || `Up to ${room.max_guests} guests`}
                    </Text>
                    <Text className="text-sm font-semibold text-emerald-600 mt-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                      ${room.price_per_night}/{t('booking.night') || 'night'}
                    </Text>
                  </View>
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    selectedRooms.includes(room.id) ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                  }`}>
                    {selectedRooms.includes(room.id) && <Check size={14} color="#fff" />}
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* Guests */}
          <View className="px-4 py-4 border-b border-gray-100">
            <Text
              className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('booking.guests')}
            </Text>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Users size={20} color="#6B7280" />
                <Text
                  className={`text-base text-gray-700 ${isRTL ? 'mr-3' : 'ml-3'}`}
                  style={{ fontFamily: 'Cairo_400Regular' }}
                >
                  {guests} {guests === 1 ? t('booking.guest') : t('booking.guestsLabel')}
                </Text>
              </View>

              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={() => guests > 1 && setGuests(guests - 1)}
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    guests <= 1 ? 'bg-gray-100' : 'bg-emerald-100'
                  }`}
                  disabled={guests <= 1}
                >
                  <Minus size={18} color={guests <= 1 ? '#9CA3AF' : '#10B981'} />
                </Pressable>
                <Text className="text-lg font-semibold text-gray-900 w-8 text-center" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {guests}
                </Text>
                <Pressable
                  onPress={() => guests < accommodation.max_guests && setGuests(guests + 1)}
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    guests >= accommodation.max_guests ? 'bg-gray-100' : 'bg-emerald-100'
                  }`}
                  disabled={guests >= accommodation.max_guests}
                >
                  <Plus size={18} color={guests >= accommodation.max_guests ? '#9CA3AF' : '#10B981'} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Payment Info */}
          <View className="px-4 py-4 border-b border-gray-100">
            <Text
              className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('booking.paymentType')}
            </Text>

            <View className="flex-row items-center p-4 rounded-xl border border-emerald-500 bg-emerald-50">
              <View className="w-12 h-12 rounded-full items-center justify-center bg-emerald-500">
                {paymentType === 'online' ? (
                  <CreditCard size={24} color="#fff" />
                ) : (
                  <Banknote size={24} color="#fff" />
                )}
              </View>
              <View className={`flex-1 ${isRTL ? 'mr-4' : 'ml-4'}`}>
                <Text className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {paymentType === 'online' ? t('booking.onlinePayment') : t('booking.offlinePayment')}
                </Text>
                <Text className="text-sm text-gray-500" style={{ fontFamily: 'Cairo_400Regular' }}>
                  {paymentType === 'online' ? t('booking.onlinePaymentDesc') : t('booking.offlinePaymentDesc')}
                </Text>
              </View>
            </View>

            <View className="flex-row items-start mt-3 bg-blue-50 p-3 rounded-lg">
              <Info size={16} color="#3B82F6" />
              <Text className={`text-xs text-blue-700 flex-1 ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                {paymentType === 'online'
                  ? t('booking.onlinePaymentInfoModal') || 'You will be able to complete payment after the host approves your booking request.'
                  : t('booking.offlinePaymentInfo') || 'You will pay the host directly upon check-in.'}
              </Text>
            </View>
          </View>

          {/* Special Requests */}
          <View className="px-4 py-4 border-b border-gray-100">
            <Text
              className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('booking.specialRequests')}
            </Text>
            <TextInput
              value={specialRequests}
              onChangeText={setSpecialRequests}
              placeholder={t('booking.specialRequestsPlaceholder')}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
              style={{
                fontFamily: 'Cairo_400Regular',
                textAlign: isRTL ? 'right' : 'left',
                textAlignVertical: 'top',
                minHeight: 80,
              }}
            />
          </View>

          {/* Price Breakdown */}
          {nights > 0 && (
            <View className="px-4 py-4">
              <Text
                className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4"
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                {t('booking.priceDetails')}
              </Text>

              <View className="space-y-3">
                {/* Original price row */}
                <View className="flex-row items-center justify-between">
                  <Text className="text-base text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {hasRooms && selectedRooms.length > 0
                      ? `${selectedRooms.length} ${t('booking.rooms') || 'rooms'} x ${nights} ${nights === 1 ? t('booking.night') : t('booking.nights')}`
                      : `$${accommodation.price_per_night} x ${nights} ${nights === 1 ? t('booking.night') : t('booking.nights')}`}
                  </Text>
                  <View className="flex-row items-center">
                    {pricing.hasDiscount && (
                      <Text className="text-base text-gray-400 line-through mr-2" style={{ fontFamily: 'Cairo_400Regular' }}>
                        ${pricing.originalBasePrice}
                      </Text>
                    )}
                    <Text className={`text-base ${pricing.hasDiscount ? 'text-emerald-600' : 'text-gray-900'}`} style={{ fontFamily: 'Cairo_600SemiBold' }}>
                      ${pricing.basePrice}
                    </Text>
                  </View>
                </View>

                {/* Discount badge */}
                {pricing.hasDiscount && (
                  <View className="flex-row items-center justify-between bg-emerald-50 p-3 rounded-lg">
                    <View className="flex-row items-center">
                      <Percent size={16} color="#10B981" />
                      <Text className={`text-base text-emerald-700 ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_600SemiBold' }}>
                        {t('booking.discount') || 'Discount'} ({pricing.discountPercentage}%)
                      </Text>
                    </View>
                    <Text className="text-base text-emerald-700" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                      -${pricing.discountAmount.toFixed(2)}
                    </Text>
                  </View>
                )}

                {pricing.cleaningFee > 0 && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                      {t('booking.cleaningFee')}
                    </Text>
                    <Text className="text-base text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                      ${pricing.cleaningFee}
                    </Text>
                  </View>
                )}

                {/* Always show service fee and taxes for transparency, even if 0 */}
                <View className="flex-row items-center justify-between">
                  <Text className="text-base text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {t('booking.serviceFee')}
                  </Text>
                  <Text className="text-base text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    ${pricing.serviceFee.toFixed(2)}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-base text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {t('booking.taxes') || 'Taxes'}
                  </Text>
                  <Text className="text-base text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    ${pricing.taxes.toFixed(2)}
                  </Text>
                </View>

                <View className="h-px bg-gray-200 my-2" />

                <View className="flex-row items-center justify-between">
                  <Text className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
                    {t('booking.total')}
                  </Text>
                  <Text className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
                    ${pricing.total}
                  </Text>
                </View>

                {/* Savings message */}
                {pricing.hasDiscount && (
                  <View className="mt-2 pt-2 border-t border-emerald-100">
                    <Text className="text-center text-emerald-600 text-sm" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                      {t('booking.youSave') || 'You save'} ${pricing.discountAmount.toFixed(2)}!
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View className="h-8" />
        </ScrollView>

        {/* Book Button */}
        <SafeAreaView edges={['bottom']} className="px-4 py-3 border-t border-gray-200 bg-white">
          <Pressable
            onPress={handleBook}
            disabled={createBooking.isPending || !canBook}
            className={`py-4 rounded-xl items-center ${
              createBooking.isPending || !canBook
                ? 'bg-gray-300'
                : 'bg-emerald-500 active:opacity-80'
            }`}
          >
            {createBooking.isPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text className="text-white text-base font-bold" style={{ fontFamily: 'Cairo_700Bold' }}>
                {paymentType === 'online' ? t('booking.requestToBook') : t('booking.sendBookingRequest')}
              </Text>
            )}
          </Pressable>

          {!minStayMet && nights > 0 && (
            <Text className="text-center text-sm text-red-500 mt-2" style={{ fontFamily: 'Cairo_400Regular' }}>
              {t('booking.minStayError')?.replace('{{min}}', String(accommodation.min_stay || 1))}
            </Text>
          )}

          {hasRooms && selectedRooms.length === 0 && checkIn && checkOut && (
            <Text className="text-center text-sm text-red-500 mt-2" style={{ fontFamily: 'Cairo_400Regular' }}>
              {t('booking.selectAtLeastOneRoom') || 'Please select at least one room'}
            </Text>
          )}
        </SafeAreaView>
      </SafeAreaView>
    </Modal>
  );
}
