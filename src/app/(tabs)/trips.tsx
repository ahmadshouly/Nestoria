import React, { useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, MapPin, Clock, CheckCircle, XCircle, Star, AlertCircle, CreditCard } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useUserBookings } from '@/lib/api';
import dayjs from 'dayjs';
import { useTranslation, useLanguageStore } from '@/lib/i18n';
import WriteReviewModal from '@/components/WriteReviewModal';
import CancellationRequestModal from '@/components/CancellationRequestModal';

type FilterTab = 'all' | 'upcoming' | 'current' | 'past' | 'cancelled';

export default function TripsScreen() {
  const [selectedTab, setSelectedTab] = useState<FilterTab>('all');
  const [reviewBooking, setReviewBooking] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const { t } = useTranslation();
  const isRTL = useLanguageStore(s => s.isRTL);

  // Fetch all bookings (includes both accommodations and vehicles)
  const { data: bookings, isLoading, refetch } = useUserBookings();

  // Refetch bookings when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Trips screen focused, refetching bookings...');
      refetch();
    }, [refetch])
  );

  // Filter bookings based on selected tab (using date-based filtering like webapp)
  const filteredBookings = React.useMemo(() => {
    if (!bookings) return [];

    const now = new Date();

    return bookings.filter(booking => {
      const checkIn = new Date(booking.check_in);
      const checkOut = new Date(booking.check_out);

      switch (selectedTab) {
        case 'upcoming':
          // Check-in is in the future AND not cancelled/completed
          return checkIn > now &&
                 booking.status !== 'completed' &&
                 booking.status !== 'cancelled';

        case 'current':
          // Currently staying (between check-in and check-out)
          return checkIn <= now &&
                 checkOut >= now &&
                 booking.status !== 'completed' &&
                 booking.status !== 'cancelled';

        case 'past':
          // Check-out is in the past OR completed
          return (checkOut < now || booking.status === 'completed') &&
                 booking.status !== 'cancelled';

        case 'cancelled':
          // Only cancelled bookings
          return booking.status === 'cancelled';

        default:
          // All non-cancelled bookings
          return booking.status !== 'cancelled';
      }
    });
  }, [bookings, selectedTab]);

  // Get status color based on status
  const getStatusColor = (status: string): { bg: string; text: string } => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return { bg: 'bg-green-100', text: 'text-green-800' };
      case 'pending':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
      case 'approved':
        return { bg: 'bg-orange-100', text: 'text-orange-800' };
      case 'pending_modification':
        return { bg: 'bg-orange-100', text: 'text-orange-800' };
      case 'pending_cancellation':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
      case 'cancellation_rejected':
        return { bg: 'bg-red-100', text: 'text-red-800' };
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

  // Status badge component
  const getStatusBadge = (status: string) => {
    const colors = getStatusColor(status);

    let icon = null;
    let label = status;

    switch (status.toLowerCase()) {
      case 'confirmed':
        icon = <CheckCircle size={12} color="#059669" />;
        label = t('trips.confirmed');
        break;
      case 'pending':
        icon = <Clock size={12} color="#D97706" />;
        label = t('trips.pending');
        break;
      case 'cancelled':
        icon = <XCircle size={12} color="#DC2626" />;
        label = t('trips.cancelled');
        break;
      case 'completed':
        icon = <CheckCircle size={12} color="#2563EB" />;
        label = t('trips.completed');
        break;
      case 'approved':
        icon = <Clock size={12} color="#EA580C" />;
        label = t('trips.approved');
        break;
      case 'pending_cancellation':
        icon = <AlertCircle size={12} color="#D97706" />;
        label = t('trips.pendingCancellation');
        break;
      case 'cancellation_rejected':
        icon = <XCircle size={12} color="#DC2626" />;
        label = t('trips.cancellationRejected');
        break;
      case 'rejected':
        icon = <XCircle size={12} color="#DC2626" />;
        label = t('trips.rejected');
        break;
      default:
        label = status;
    }

    return (
      <View className={`${colors.bg} px-2 py-0.5 rounded-full flex-row items-center ml-2`}>
        {icon && <View className="mr-1">{icon}</View>}
        <Text className={`text-xs font-semibold ${colors.text}`} style={{ fontFamily: 'Cairo_600SemiBold' }}>
          {label}
        </Text>
      </View>
    );
  };

  // Get action buttons based on booking status
  const getActionButtons = (booking: any) => {
    const status = booking.status?.toLowerCase();
    const isOfflinePayment = booking.payment_type === 'offline';
    const needsPayment = status === 'approved' && !isOfflinePayment;
    const isConfirmed = status === 'confirmed';
    const isCompleted = status === 'completed';
    const isPendingCancellation = status === 'pending_cancellation';

    return (
      <View className="flex-row gap-2 mt-3">
        {/* View Details - always shown */}
        <Pressable
          onPress={() => router.push(`/booking/${booking.id}` as any)}
          className="flex-1 bg-gray-100 py-2 rounded-lg items-center active:opacity-80"
        >
          <Text className="text-gray-700 font-semibold text-sm" style={{ fontFamily: 'Cairo_600SemiBold' }}>
            {t('trips.viewDetails')}
          </Text>
        </Pressable>

        {/* Pay Now - for approved online payment bookings */}
        {needsPayment && (
          <Pressable
            onPress={() => router.push(`/booking/${booking.id}` as any)}
            className="flex-1 bg-emerald-500 py-2 rounded-lg items-center flex-row justify-center active:opacity-80"
          >
            <CreditCard size={14} color="#FFF" />
            <Text className="text-white font-semibold text-sm ml-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
              {t('trips.payNow')}
            </Text>
          </Pressable>
        )}

        {/* Cancel - for confirmed bookings */}
        {isConfirmed && (
          <Pressable
            onPress={() => {
              setCancelBookingId(booking.id);
              setShowCancellationModal(true);
            }}
            className="flex-1 bg-red-50 py-2 rounded-lg items-center active:opacity-80"
          >
            <Text className="text-red-600 font-semibold text-sm" style={{ fontFamily: 'Cairo_600SemiBold' }}>
              {t('trips.cancel')}
            </Text>
          </Pressable>
        )}

        {/* Write Review - for completed bookings */}
        {isCompleted && (
          <Pressable
            onPress={() => {
              setReviewBooking(booking);
              setShowReviewModal(true);
            }}
            className="flex-1 bg-amber-50 py-2 rounded-lg items-center flex-row justify-center active:opacity-80"
          >
            <Star size={14} color="#F59E0B" />
            <Text className="text-amber-600 font-semibold text-sm ml-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
              {t('trips.writeReview')}
            </Text>
          </Pressable>
        )}

        {/* Pending Cancellation - show status */}
        {isPendingCancellation && (
          <View className="flex-1 bg-yellow-50 py-2 rounded-lg items-center">
            <Text className="text-yellow-700 font-semibold text-sm" style={{ fontFamily: 'Cairo_600SemiBold' }}>
              {t('trips.awaitingReview')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderBookingCard = (booking: any) => {
    const isAccommodation = !!booking.accommodation_id;
    const listing = isAccommodation ? booking.accommodations : booking.vehicles;
    const title = listing?.title || 'Unnamed Listing';
    const image = listing?.main_image_url || listing?.images?.[0];
    const location = listing?.location || 'Unknown Location';

    // Calculate nights/days
    const checkIn = new Date(booking.check_in);
    const checkOut = new Date(booking.check_out);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    // Check if offline payment
    const isOfflinePayment = booking.payment_type === 'offline';
    const isConfirmedOrApproved = booking.status === 'confirmed' || booking.status === 'approved';

    return (
      <View
        key={booking.id}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden"
        style={{ direction: 'ltr' }}
      >
        <Pressable
          onPress={() => router.push(`/booking/${booking.id}` as any)}
          className="active:opacity-95"
        >
          <View className="flex-row">
            <Image
              source={{ uri: image || 'https://via.placeholder.com/150' }}
              className="w-28 h-28 bg-gray-200"
              resizeMode="cover"
            />
            <View className="flex-1 p-4">
              <View className="flex-row items-center mb-1">
                <Text
                  className="text-xs font-semibold text-gray-500 uppercase"
                  style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}
                >
                  {isAccommodation ? `🏠 ${t('trips.accommodation')}` : `🚗 ${t('trips.vehicle')}`}
                </Text>
                {getStatusBadge(booking.status)}
              </View>
              <Text
                className="text-base font-semibold text-gray-900 mb-1"
                numberOfLines={1}
                style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}
              >
                {title}
              </Text>
              <View className="flex-row items-center mb-1">
                <MapPin size={12} color="#9CA3AF" />
                <Text className="text-sm text-gray-600 ml-1" numberOfLines={1} style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}>
                  {location}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Calendar size={12} color="#9CA3AF" />
                <Text className="text-sm text-gray-600 ml-1" style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}>
                  {dayjs(booking.check_in).format('MMM DD')} - {dayjs(booking.check_out).format('MMM DD, YYYY')}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>

        <View className="px-4 py-3 bg-gray-50">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs text-gray-500" style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}>
                {nights} {nights === 1 ? t('booking.night') : t('booking.nights')}
              </Text>
              <View className="flex-row items-center">
                <Text className="text-sm text-gray-600" style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}>{t('trips.total')}</Text>
                {isOfflinePayment && isConfirmedOrApproved && (
                  <View className="bg-blue-100 px-2 py-0.5 rounded-full ml-2">
                    <Text className="text-xs text-blue-700 font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                      {t('trips.payOnArrival')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <Text className="text-base font-bold text-emerald-600" style={{ fontFamily: 'Cairo_700Bold' }}>
              ${booking.total_price?.toFixed(2) || '0.00'}
            </Text>
          </View>

          {/* Action Buttons */}
          {getActionButtons(booking)}
        </View>
      </View>
    );
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('trips.all') },
    { key: 'upcoming', label: t('trips.upcoming') },
    { key: 'current', label: t('trips.current') },
    { key: 'past', label: t('trips.past') },
    { key: 'cancelled', label: t('trips.cancelled') },
  ];

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <View className="px-6 pt-2 pb-4">
          <Text className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
            {t('trips.title')}
          </Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10B981" />
          <Text className="text-gray-600 mt-4" style={{ fontFamily: 'Cairo_400Regular' }}>
            {t('common.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <View className="px-6 pt-2 pb-4">
        <Text
          className="text-3xl font-bold text-gray-900"
          style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
        >
          {t('trips.title')}
        </Text>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-6 mb-4"
        style={{ flexGrow: 0, direction: 'ltr' }}
      >
        <View className="flex-row gap-2">
          {filterTabs.map(tab => (
            <Pressable
              key={tab.key}
              onPress={() => setSelectedTab(tab.key)}
              className={`px-4 py-2 rounded-full ${
                selectedTab === tab.key
                  ? 'bg-emerald-500'
                  : 'bg-gray-100'
              }`}
            >
              <Text
                className={`font-semibold ${
                  selectedTab === tab.key
                    ? 'text-white'
                    : 'text-gray-700'
                }`}
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {filteredBookings.length > 0 ? (
          <>
            {filteredBookings.map(renderBookingCard)}
            <View className="h-4" />
          </>
        ) : (
          <View className="items-center justify-center py-20">
            <Calendar size={48} color="#D1D5DB" />
            <Text className="text-lg font-semibold text-gray-900 mt-4 text-center" style={{ fontFamily: 'Cairo_600SemiBold' }}>
              {t('trips.noTrips')}
            </Text>
            <Text className="text-sm text-gray-500 mt-2 text-center px-8" style={{ fontFamily: 'Cairo_400Regular' }}>
              {t('trips.noTripsSub')}
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)')}
              className="mt-6 bg-emerald-500 px-6 py-3 rounded-full active:opacity-80"
            >
              <Text className="text-white font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {t('explore.title')}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Write Review Modal */}
      <WriteReviewModal
        visible={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setReviewBooking(null);
          refetch();
        }}
        booking={reviewBooking}
      />

      {/* Cancellation Request Modal */}
      <CancellationRequestModal
        visible={showCancellationModal}
        onClose={() => {
          setShowCancellationModal(false);
          setCancelBookingId(null);
        }}
        bookingId={cancelBookingId}
        onSuccess={() => {
          refetch();
        }}
      />
    </SafeAreaView>
  );
}
