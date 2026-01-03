import React, { useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { ArrowLeft, MapPin, Calendar, Users, CreditCard, Phone, Mail, CheckCircle, Clock, XCircle, Home, Car } from 'lucide-react-native';
import { useBooking } from '@/lib/api';
import dayjs from 'dayjs';
import { useTranslation, useLanguageStore } from '@/lib/i18n';
import EnhancedPaymentModal from '@/components/EnhancedPaymentModal';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const isRTL = useLanguageStore(s => s.isRTL);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  console.log('🔍 Booking Detail Screen - ID from params:', id);

  const { data: booking, isLoading, error, refetch } = useBooking(id);

  console.log('📊 Booking Detail Screen - State:', {
    hasBooking: !!booking,
    isLoading,
    hasError: !!error,
    errorMessage: error?.message
  });

  // Get status color based on status
  const getStatusColor = (status: string): { bg: string; text: string } => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return { bg: 'bg-green-100', text: 'text-green-800' };
      case 'pending':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
      case 'approved':
        return { bg: 'bg-orange-100', text: 'text-orange-800' };
      case 'cancelled':
        return { bg: 'bg-red-100', text: 'text-red-800' };
      case 'completed':
        return { bg: 'bg-blue-100', text: 'text-blue-800' };
      case 'rejected':
        return { bg: 'bg-red-100', text: 'text-red-800' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return <CheckCircle size={16} color="#059669" />;
      case 'pending':
        return <Clock size={16} color="#D97706" />;
      case 'cancelled':
      case 'rejected':
        return <XCircle size={16} color="#DC2626" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return t('trips.confirmed');
      case 'pending':
        return t('trips.pending');
      case 'cancelled':
        return t('trips.cancelled');
      case 'completed':
        return t('trips.completed');
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return status || 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#10B981" />
            <Text className="text-gray-600 mt-4" style={{ fontFamily: 'Cairo_400Regular' }}>
              {t('common.loading')}
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (error || !booking) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-1 items-center justify-center px-6">
            <XCircle size={48} color="#DC2626" />
            <Text className="text-lg font-semibold text-gray-900 mt-4 text-center" style={{ fontFamily: 'Cairo_600SemiBold' }}>
              Booking Not Found
            </Text>
            <Text className="text-sm text-gray-500 mt-2 text-center" style={{ fontFamily: 'Cairo_400Regular' }}>
              This booking could not be found or you don't have access to it.
            </Text>
            <Pressable
              onPress={() => router.back()}
              className="mt-6 bg-emerald-500 px-6 py-3 rounded-full active:opacity-80"
            >
              <Text className="text-white font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                Go Back
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const isAccommodation = !!booking.accommodation_id;
  const listing = isAccommodation ? booking.accommodations : booking.vehicles;
  const title = listing?.title || 'Unnamed Listing';
  const image = listing?.main_image_url || listing?.images?.[0];
  const location = listing?.location || 'Unknown Location';

  // Calculate nights/days
  const checkIn = new Date(booking.check_in);
  const checkOut = new Date(booking.check_out);
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  const statusColors = getStatusColor(booking.status);
  const statusIcon = getStatusIcon(booking.status);
  const statusLabel = getStatusLabel(booking.status);

  // Check if payment is needed
  const needsPayment = booking.status === 'approved' && booking.payment_type === 'online';
  const isOfflinePayment = booking.payment_type === 'offline';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        {/* Header */}
        <View className="px-4 py-3 border-b border-gray-200">
          <View className={`flex-row items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Pressable
              onPress={() => router.back()}
              className="p-2 -ml-2 active:opacity-60"
            >
              <ArrowLeft size={24} color="#000" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
            </Pressable>
            <Text
              className="text-xl font-bold text-gray-900 ml-3"
              style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
            >
              Booking Details
            </Text>
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Property Image */}
          <Image
            source={{ uri: image || 'https://via.placeholder.com/400x200' }}
            className="w-full h-48 bg-gray-200"
            resizeMode="cover"
          />

          {/* Content */}
          <View className="px-6 py-6">
            {/* Status Badge */}
            <View className={`flex-row items-center mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <View className={`${statusColors.bg} px-3 py-1.5 rounded-full flex-row items-center`}>
                {statusIcon && <View className={isRTL ? 'ml-1.5' : 'mr-1.5'}>{statusIcon}</View>}
                <Text className={`text-sm font-semibold ${statusColors.text}`} style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {statusLabel}
                </Text>
              </View>
              {isOfflinePayment && booking.status === 'confirmed' && (
                <View className={`bg-blue-100 px-3 py-1.5 rounded-full ${isRTL ? 'mr-2' : 'ml-2'}`}>
                  <Text className="text-sm font-semibold text-blue-800" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    Pay on Arrival
                  </Text>
                </View>
              )}
            </View>

            {/* Property Type */}
            <View className={`flex-row items-center mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {isAccommodation ? (
                <Home size={20} color="#6B7280" />
              ) : (
                <Car size={20} color="#6B7280" />
              )}
              <Text className={`text-sm text-gray-500 uppercase ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {isAccommodation ? t('trips.accommodation') : t('trips.vehicle')}
              </Text>
            </View>

            {/* Title */}
            <Text
              className="text-2xl font-bold text-gray-900 mb-2"
              style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
            >
              {title}
            </Text>

            {/* Location */}
            <View className={`flex-row items-center mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <MapPin size={16} color="#6B7280" />
              <Text className={`text-base text-gray-600 ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                {location}
              </Text>
            </View>

            {/* Confirmation Details */}
            {booking.confirmation_number && (
              <View className="bg-emerald-50 p-4 rounded-xl mb-6">
                <Text className="text-sm font-semibold text-emerald-900 mb-1" style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}>
                  Confirmation Number
                </Text>
                <Text className="text-lg font-bold text-emerald-700" style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}>
                  {booking.confirmation_number}
                </Text>
                {booking.pin && (
                  <>
                    <Text className="text-sm font-semibold text-emerald-900 mb-1 mt-3" style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}>
                      Security PIN
                    </Text>
                    <Text className="text-lg font-bold text-emerald-700" style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}>
                      {booking.pin}
                    </Text>
                  </>
                )}
              </View>
            )}

            {/* Booking Details */}
            <View className="bg-gray-50 p-4 rounded-xl mb-6">
              <Text className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}>
                Booking Details
              </Text>

              {/* Dates */}
              <View className={`flex-row items-center mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Calendar size={20} color="#6B7280" />
                <View className={isRTL ? 'mr-3' : 'ml-3'}>
                  <Text className="text-sm text-gray-500" style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}>
                    {t('booking.checkIn')}
                  </Text>
                  <Text className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}>
                    {dayjs(booking.check_in).format('MMM DD, YYYY')}
                  </Text>
                </View>
              </View>

              <View className={`flex-row items-center mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Calendar size={20} color="#6B7280" />
                <View className={isRTL ? 'mr-3' : 'ml-3'}>
                  <Text className="text-sm text-gray-500" style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}>
                    {t('booking.checkOut')}
                  </Text>
                  <Text className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}>
                    {dayjs(booking.check_out).format('MMM DD, YYYY')}
                  </Text>
                </View>
              </View>

              {/* Guests */}
              {booking.guests && (
                <View className={`flex-row items-center mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Users size={20} color="#6B7280" />
                  <View className={isRTL ? 'mr-3' : 'ml-3'}>
                    <Text className="text-sm text-gray-500" style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}>
                      {t('booking.guests')}
                    </Text>
                    <Text className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}>
                      {booking.guests} {booking.guests === 1 ? t('trips.guest') : t('trips.guests')}
                    </Text>
                  </View>
                </View>
              )}

              {/* Nights */}
              <View className="pt-3 border-t border-gray-200">
                <Text className="text-sm text-gray-500" style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}>
                  {nights} {nights === 1 ? t('booking.night') : t('booking.nights')}
                </Text>
              </View>
            </View>

            {/* Price Breakdown */}
            <View className="bg-gray-50 p-4 rounded-xl mb-6">
              <Text className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}>
                {t('booking.priceDetails')}
              </Text>

              {booking.base_price && (
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-base text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                    Base Price
                  </Text>
                  <Text className="text-base text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    ${booking.base_price.toFixed(2)}
                  </Text>
                </View>
              )}

              {booking.fees !== null && booking.fees !== undefined && booking.fees > 0 && (
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-base text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                    Fees (Service + Cleaning)
                  </Text>
                  <Text className="text-base text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    ${booking.fees.toFixed(2)}
                  </Text>
                </View>
              )}

              {booking.taxes !== null && booking.taxes !== undefined && booking.taxes > 0 && (
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-base text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {t('booking.taxes')}
                  </Text>
                  <Text className="text-base text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    ${booking.taxes.toFixed(2)}
                  </Text>
                </View>
              )}

              <View className="pt-3 border-t border-gray-200 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
                  {t('booking.total')}
                </Text>
                <Text className="text-xl font-bold text-emerald-600" style={{ fontFamily: 'Cairo_700Bold' }}>
                  ${booking.total_price.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Special Requests */}
            {booking.special_requests && (
              <View className="bg-gray-50 p-4 rounded-xl mb-6">
                <Text className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}>
                  {t('booking.specialRequests')}
                </Text>
                <Text className="text-base text-gray-700" style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}>
                  {booking.special_requests}
                </Text>
              </View>
            )}

            {/* Host Contact (if confirmed) */}
            {booking.status === 'confirmed' && booking.profiles && (
              <View className="bg-gray-50 p-4 rounded-xl mb-6">
                <Text className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}>
                  Host Contact
                </Text>

                <Text className="text-base font-semibold text-gray-900 mb-3" style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}>
                  {booking.profiles.full_name || 'Host'}
                </Text>

                {booking.profiles.phone && (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${booking.profiles.phone}`)}
                    className={`flex-row items-center mb-2 active:opacity-60 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Phone size={16} color="#059669" />
                    <Text className={`text-base text-emerald-600 ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                      {booking.profiles.phone}
                    </Text>
                  </Pressable>
                )}

                {booking.profiles.email && (
                  <Pressable
                    onPress={() => Linking.openURL(`mailto:${booking.profiles.email}`)}
                    className={`flex-row items-center active:opacity-60 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Mail size={16} color="#059669" />
                    <Text className={`text-base text-emerald-600 ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                      {booking.profiles.email}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Payment Info Messages */}
            {needsPayment && (
              <View className="bg-orange-50 p-4 rounded-xl mb-6">
                <Text className="text-sm text-orange-800" style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}>
                  {t('booking.onlinePaymentInfo')}
                </Text>

                {/* Pay Now Button */}
                <Pressable
                  onPress={() => {
                    console.log('🔴 Pay Now button clicked!');
                    console.log('🔴 Booking ID:', booking.id);
                    console.log('🔴 Total Price:', booking.total_price);
                    setShowPaymentModal(true);
                  }}
                  className="bg-emerald-500 py-3 rounded-xl flex-row items-center justify-center mt-4 active:opacity-80"
                >
                  <CreditCard size={18} color="#FFF" />
                  <Text className="text-white font-bold ml-2" style={{ fontFamily: 'Cairo_700Bold' }}>
                    {t('trips.payNow')}
                  </Text>
                </Pressable>
              </View>
            )}

            {isOfflinePayment && (booking.status === 'confirmed' || booking.status === 'approved') && (
              <View className="bg-blue-50 p-4 rounded-xl mb-6">
                <Text className="text-sm text-blue-800" style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}>
                  {t('booking.offlinePaymentInfo')}
                </Text>
              </View>
            )}

            {/* Booked Date */}
            <Text className="text-sm text-gray-400 text-center mt-4" style={{ fontFamily: 'Cairo_400Regular' }}>
              Booked on {dayjs(booking.created_at).format('MMM DD, YYYY')}
            </Text>
          </View>
        </ScrollView>

        {/* Payment Modal */}
        {booking && (
          <EnhancedPaymentModal
            visible={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            bookingId={booking.id}
            amount={booking.total_price}
            currency="usd"
            onPaymentSuccess={() => {
              refetch();
              setShowPaymentModal(false);
            }}
          />
        )}
      </SafeAreaView>
    </>
  );
}
