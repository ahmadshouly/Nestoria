import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { X, CreditCard, Calendar, Users, MapPin } from 'lucide-react-native';
import { useTranslation } from '@/lib/i18n';
import EnhancedPaymentModal from './EnhancedPaymentModal';
import dayjs from 'dayjs';

interface BookingPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  booking: {
    id: string;
    confirmation_number: string;
    total_price: number;
    check_in: string;
    check_out: string;
    guests: number;
    status: string;
    accommodations?: {
      title: string;
      city?: string;
    };
    vehicles?: {
      title: string;
      location?: string;
    };
  };
  onPaymentComplete: () => void;
}

export default function BookingPaymentModal({
  visible,
  onClose,
  booking,
  onPaymentComplete,
}: BookingPaymentModalProps) {
  const { t } = useTranslation();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(true);

  console.log('🔵 BookingPaymentModal rendered:', { visible, bookingId: booking.id });

  const propertyTitle = booking.accommodations?.title || booking.vehicles?.title || 'Property';
  const location = booking.accommodations?.city || booking.vehicles?.location || '';
  const isAccommodation = !!booking.accommodations;

  const handlePaymentSuccess = () => {
    console.log('✅ Payment successful!');
    setShowPaymentModal(false);
    onPaymentComplete();
    onClose();
  };

  const handleClose = () => {
    console.log('🔴 BookingPaymentModal closing...');
    setShowPaymentModal(false);
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <View className="flex-1 bg-white">
          {/* Header */}
          <View className="px-4 py-4 border-b border-gray-200 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
              {t('bookingPaymentModal.paymentRequired')}
            </Text>
            <Pressable onPress={handleClose} className="w-10 h-10 items-center justify-center">
              <X size={24} color="#000" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-4 py-6">
            {/* Booking Summary */}
            <View className="bg-gray-50 rounded-xl p-4 mb-6">
              <Text className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: 'Cairo_700Bold' }}>
                {propertyTitle}
              </Text>

              {location && (
                <View className="flex-row items-center mb-2">
                  <MapPin size={16} color="#6B7280" />
                  <Text className="text-sm text-gray-600 ml-2" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {location}
                  </Text>
                </View>
              )}

              <View className="flex-row items-center mb-2">
                <Calendar size={16} color="#6B7280" />
                <Text className="text-sm text-gray-600 ml-2" style={{ fontFamily: 'Cairo_400Regular' }}>
                  {dayjs(booking.check_in).format('MMM DD')} - {dayjs(booking.check_out).format('MMM DD, YYYY')}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Users size={16} color="#6B7280" />
                <Text className="text-sm text-gray-600 ml-2" style={{ fontFamily: 'Cairo_400Regular' }}>
                  {booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}
                </Text>
              </View>

              <View className="h-px bg-gray-200 my-3" />

              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                  Confirmation Number:
                </Text>
                <Text className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {booking.confirmation_number}
                </Text>
              </View>
            </View>

            {/* Payment Amount */}
            <View className="bg-emerald-50 rounded-xl p-4 mb-6">
              <View className="flex-row items-center justify-between">
                <Text className="text-base text-gray-700" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  Total Amount
                </Text>
                <Text className="text-2xl font-bold text-emerald-600" style={{ fontFamily: 'Cairo_700Bold' }}>
                  ${booking.total_price.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Payment Info */}
            <View className="bg-blue-50 rounded-xl p-4 mb-6">
              <Text className="text-sm text-blue-800" style={{ fontFamily: 'Cairo_400Regular' }}>
                {t('bookingPaymentModal.paymentRequiredMsg')}
              </Text>
            </View>
          </ScrollView>

          {/* Pay Now Button */}
          <View className="px-4 py-4 border-t border-gray-200">
            <Pressable
              onPress={() => {
                console.log('🟡 Pay Now button clicked inside BookingPaymentModal');
                // Close this modal first
                onClose();
                // Then open payment modal after a short delay
                setTimeout(() => {
                  setShowPaymentModal(true);
                }, 300);
              }}
              className="bg-emerald-500 py-4 rounded-xl flex-row items-center justify-center active:opacity-80"
            >
              <CreditCard size={20} color="#FFF" />
              <Text className="text-white text-base font-bold ml-2" style={{ fontFamily: 'Cairo_700Bold' }}>
                {t('bookingPaymentModal.payNow')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Enhanced Payment Modal */}
      <EnhancedPaymentModal
        visible={showPaymentModal}
        onClose={() => {
          console.log('🟣 EnhancedPaymentModal closing...');
          setShowPaymentModal(false);
        }}
        bookingId={booking.id}
        amount={booking.total_price}
        currency="usd"
        onPaymentSuccess={handlePaymentSuccess}
      />
    </>
  );
}
