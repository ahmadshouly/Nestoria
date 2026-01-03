import React, { useState, useMemo } from 'react';
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
  MapPin,
  CreditCard,
  Banknote,
  User,
  FileText,
  CheckCircle2,
  Info,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { useTranslation } from '@/lib/i18n';
import {
  useAdminFees,
  useVehicleAvailability,
  useCreateVehicleBooking,
  calculateBookingFees,
  isDateAvailable,
  isDateRangeAvailable,
  calculateDateRangePrice,
} from '@/lib/api/bookings';
import { useAuth } from '@/lib/api/auth';

interface VehicleForBooking {
  id: string;
  title: string;
  location: string;
  price_per_day: number;
  brand?: string;
  model?: string;
  year: number;
  insurance_included?: boolean;
  min_driver_age?: number;
  cleaning_fee?: number;
  offline_payment_enabled?: boolean;
}

interface VehicleBookingModalProps {
  visible: boolean;
  onClose: () => void;
  vehicle: VehicleForBooking;
  onSuccess?: (bookingId: string) => void;
}

export default function VehicleBookingModal({
  visible,
  onClose,
  vehicle,
  onSuccess,
}: VehicleBookingModalProps) {
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const { data: authData } = useAuth();
  const createVehicleBooking = useCreateVehicleBooking();

  // Fetch data from database
  const { data: adminFees = [] } = useAdminFees('vehicle');
  const { data: availability = [], isLoading: availabilityLoading } = useVehicleAvailability(
    visible ? vehicle.id : undefined
  );

  // Log admin fees for debugging
  React.useEffect(() => {
    if (adminFees && adminFees.length > 0) {
      console.log('📊 Admin fees loaded for vehicle:', adminFees);
    } else if (adminFees && adminFees.length === 0) {
      console.log('⚠️ No admin fees found in database');
    }
  }, [adminFees]);

  // Payment type is determined by the vehicle's offline_payment_enabled setting
  const paymentType = vehicle.offline_payment_enabled ? 'offline' : 'online';

  // Form state
  const [pickupDate, setPickupDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [pickupLocation, setPickupLocation] = useState<string>(vehicle.location || '');
  const [returnLocation, setReturnLocation] = useState<string>(vehicle.location || '');
  const [driverName, setDriverName] = useState<string>('');
  const [driverLicense, setDriverLicense] = useState<string>('');
  const [specialRequests, setSpecialRequests] = useState<string>('');

  // Calendar navigation state
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectingReturn, setSelectingReturn] = useState<boolean>(false);

  // Booking success state
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Calculate days
  const days = useMemo(() => {
    if (!pickupDate || !returnDate) return 0;
    const diffTime = Math.abs(returnDate.getTime() - pickupDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [pickupDate, returnDate]);

  // Calculate pricing with dynamic pricing from availability calendar
  const pricing = useMemo(() => {
    if (!pickupDate || !returnDate || days === 0) {
      return { basePrice: 0, serviceFee: 0, cleaningFee: 0, insuranceFee: 0, taxes: 0, total: 0 };
    }

    // Use dynamic pricing from calendar if available
    const basePrice = calculateDateRangePrice(pickupDate, returnDate, vehicle.price_per_day, availability);
    const cleaningFee = vehicle.cleaning_fee || 0;
    const insuranceFee = vehicle.insurance_included ? 0 : Math.round(basePrice * 0.15);

    const { serviceFee, taxes, total } = calculateBookingFees(basePrice + insuranceFee, cleaningFee, adminFees);

    return { basePrice, serviceFee, cleaningFee, insuranceFee, taxes, total };
  }, [pickupDate, returnDate, days, vehicle, availability, adminFees]);

  // Check if selected dates are available
  // CRITICAL: Missing data = UNAVAILABLE (consistent with web app)
  const datesAvailable = useMemo(() => {
    if (!pickupDate || !returnDate) return true;
    return isDateRangeAvailable(pickupDate, returnDate, availability);
  }, [pickupDate, returnDate, availability]);

  // Validation
  const isFormValid = driverName.trim().length > 0 &&
                      driverLicense.trim().length > 0 &&
                      pickupDate &&
                      returnDate &&
                      days >= 1 &&
                      datesAvailable;

  // Reset form when modal opens
  React.useEffect(() => {
    if (visible) {
      setBookingSuccess(false);
      setPickupDate(null);
      setReturnDate(null);
      setPickupLocation(vehicle.location || '');
      setReturnLocation(vehicle.location || '');
      setDriverName('');
      setDriverLicense('');
      setSpecialRequests('');
      setSelectingReturn(false);
      setCurrentMonth(new Date());
    }
  }, [visible, vehicle.location]);

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
    if (!pickupDate || !returnDate) return false;
    return date > pickupDate && date < returnDate;
  };

  const isPickupDate = (date: Date) => {
    if (!pickupDate) return false;
    return date.toDateString() === pickupDate.toDateString();
  };

  const isReturnDateCheck = (date: Date) => {
    if (!returnDate) return false;
    return date.toDateString() === returnDate.toDateString();
  };

  const handleDateSelect = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return;
    if (!isDateAvailable(date, availability)) return;

    if (!selectingReturn || !pickupDate) {
      // Selecting pickup
      setPickupDate(date);
      setReturnDate(null);
      setSelectingReturn(true);
    } else {
      // Selecting return
      if (date <= pickupDate) {
        // If selected date is before or same as pickup, reset
        setPickupDate(date);
        setReturnDate(null);
      } else {
        // Check if all dates in range are available
        if (isDateRangeAvailable(pickupDate, date, availability)) {
          setReturnDate(date);
          setSelectingReturn(false);
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

  // Helper function to format date to YYYY-MM-DD in local timezone
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleBook = async () => {
    if (!authData?.user || !pickupDate || !returnDate) return;

    setIsSubmitting(true);
    try {
      const booking = await createVehicleBooking.mutateAsync({
        vehicle_id: vehicle.id,
        check_in: formatDateForAPI(pickupDate),
        check_out: formatDateForAPI(returnDate),
        pickup_location: pickupLocation,
        guests: 1, // Vehicles typically don't have guest count, default to 1
        total_price: pricing.total,
        base_price: pricing.basePrice,
        service_fee: pricing.serviceFee,
        cleaning_fee: pricing.cleaningFee,
        special_requests: specialRequests || undefined,
        selected_extras: [], // Add extras if you have them
      });

      setBookingSuccess(true);
      onSuccess?.(booking.id);
    } catch (error) {
      console.error('Vehicle booking error:', error);
      // Show error to user
      alert(error instanceof Error ? error.message : 'Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
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
            {t('booking.vehicleTitle')}
          </Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Vehicle Summary */}
          <View className="px-4 py-4 border-b border-gray-100">
            <Text
              className="text-xl font-bold text-gray-900 mb-1"
              style={{ fontFamily: 'Cairo_700Bold' }}
            >
              {vehicle.title}
            </Text>
            <Text
              className="text-sm text-gray-500"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {vehicle.brand} {vehicle.model} {vehicle.year}
            </Text>
          </View>

          {/* Calendar */}
          <View className="px-4 py-4 border-b border-gray-100">
            <Text
              className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {selectingReturn ? t('booking.selectReturnDate') || 'Select return date' : t('booking.selectPickupDate') || 'Select pickup date'}
            </Text>

            {/* Selected dates display */}
            <View className="flex-row gap-3 mb-4">
              <View className={`flex-1 p-3 rounded-xl border ${pickupDate ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                <Text className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                  {t('booking.pickupDate')}
                </Text>
                <Text className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {formatDate(pickupDate)}
                </Text>
              </View>
              <View className={`flex-1 p-3 rounded-xl border ${returnDate ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
                <Text className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                  {t('booking.returnDate')}
                </Text>
                <Text className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {formatDate(returnDate)}
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
                  // CRITICAL: Missing data = UNAVAILABLE (fixed from original bug)
                  const available = isDateAvailable(date, availability);
                  const isInRange = isDateInRange(date);
                  const isStart = isPickupDate(date);
                  const isEnd = isReturnDateCheck(date);
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
            {pickupDate && returnDate && !datesAvailable && (
              <View className="flex-row items-center mt-4 p-3 bg-red-50 rounded-lg">
                <AlertCircle size={16} color="#EF4444" />
                <Text className={`text-sm text-red-700 flex-1 ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                  {t('booking.datesUnavailable') || 'Some dates in your selection are not available'}
                </Text>
              </View>
            )}
          </View>

          {/* Locations */}
          <View className="px-4 py-4 border-b border-gray-100">
            <Text
              className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('booking.locations')}
            </Text>

            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <MapPin size={16} color="#10B981" />
                <Text
                  className={`text-sm text-gray-700 ${isRTL ? 'mr-2' : 'ml-2'}`}
                  style={{ fontFamily: 'Cairo_600SemiBold' }}
                >
                  {t('booking.pickupLocation')}
                </Text>
              </View>
              <TextInput
                value={pickupLocation}
                onChangeText={setPickupLocation}
                placeholder={t('booking.enterPickupLocation')}
                placeholderTextColor="#9CA3AF"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
              />
            </View>

            <View>
              <View className="flex-row items-center mb-2">
                <MapPin size={16} color="#EF4444" />
                <Text
                  className={`text-sm text-gray-700 ${isRTL ? 'mr-2' : 'ml-2'}`}
                  style={{ fontFamily: 'Cairo_600SemiBold' }}
                >
                  {t('booking.returnLocation')}
                </Text>
              </View>
              <TextInput
                value={returnLocation}
                onChangeText={setReturnLocation}
                placeholder={t('booking.enterReturnLocation')}
                placeholderTextColor="#9CA3AF"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
              />
            </View>
          </View>

          {/* Driver Information */}
          <View className="px-4 py-4 border-b border-gray-100">
            <Text
              className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('booking.driverInfo')}
            </Text>

            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <User size={16} color="#6B7280" />
                <Text
                  className={`text-sm text-gray-700 ${isRTL ? 'mr-2' : 'ml-2'}`}
                  style={{ fontFamily: 'Cairo_600SemiBold' }}
                >
                  {t('booking.driverName')} *
                </Text>
              </View>
              <TextInput
                value={driverName}
                onChangeText={setDriverName}
                placeholder={t('booking.enterDriverName')}
                placeholderTextColor="#9CA3AF"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
              />
            </View>

            <View>
              <View className="flex-row items-center mb-2">
                <FileText size={16} color="#6B7280" />
                <Text
                  className={`text-sm text-gray-700 ${isRTL ? 'mr-2' : 'ml-2'}`}
                  style={{ fontFamily: 'Cairo_600SemiBold' }}
                >
                  {t('booking.driverLicense')} *
                </Text>
              </View>
              <TextInput
                value={driverLicense}
                onChangeText={setDriverLicense}
                placeholder={t('booking.enterDriverLicense')}
                placeholderTextColor="#9CA3AF"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
              />
            </View>

            {vehicle.min_driver_age && (
              <Text
                className="text-xs text-gray-500 mt-3"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                {t('booking.minDriverAge')?.replace('{{age}}', String(vehicle.min_driver_age))}
              </Text>
            )}
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
                  ? t('booking.onlinePaymentInfoModal') || 'You will be able to complete payment after the owner approves your booking request.'
                  : t('booking.offlinePaymentInfo') || 'You will pay the owner directly when you pick up the vehicle.'}
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
              placeholder={t('booking.vehicleSpecialRequestsPlaceholder')}
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
          {days > 0 && (
            <View className="px-4 py-4">
              <Text
                className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4"
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                {t('booking.priceDetails')}
              </Text>

              <View className="space-y-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                    ${vehicle.price_per_day} x {days} {days === 1 ? t('booking.day') : t('booking.days')}
                  </Text>
                  <Text className="text-base text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    ${pricing.basePrice}
                  </Text>
                </View>

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

                {!vehicle.insurance_included && pricing.insuranceFee > 0 && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                      {t('booking.insuranceFee')}
                    </Text>
                    <Text className="text-base text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                      ${pricing.insuranceFee}
                    </Text>
                  </View>
                )}

                {vehicle.insurance_included && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base text-emerald-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                      {t('booking.insuranceIncluded')}
                    </Text>
                    <Text className="text-base text-emerald-600" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                      {t('booking.free')}
                    </Text>
                  </View>
                )}

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
              </View>
            </View>
          )}

          <View className="h-8" />
        </ScrollView>

        {/* Book Button */}
        <SafeAreaView edges={['bottom']} className="px-4 py-3 border-t border-gray-200 bg-white">
          <Pressable
            onPress={handleBook}
            disabled={isSubmitting || !isFormValid}
            className={`py-4 rounded-xl items-center ${
              isSubmitting || !isFormValid
                ? 'bg-gray-300'
                : 'bg-emerald-500 active:opacity-80'
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text className="text-white text-base font-bold" style={{ fontFamily: 'Cairo_700Bold' }}>
                {paymentType === 'online' ? t('booking.requestToBook') : t('booking.sendBookingRequest')}
              </Text>
            )}
          </Pressable>

          {!isFormValid && (pickupDate && returnDate) && (
            <Text className="text-center text-sm text-gray-500 mt-2" style={{ fontFamily: 'Cairo_400Regular' }}>
              {!datesAvailable
                ? t('booking.datesUnavailable') || 'Selected dates are not available'
                : t('booking.fillRequiredFields')}
            </Text>
          )}
        </SafeAreaView>
      </SafeAreaView>
    </Modal>
  );
}
