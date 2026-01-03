import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, Pressable, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { X } from 'lucide-react-native';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/api/auth';

interface WebViewPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  amount: number;
  currency: string;
  onPaymentSuccess: (data: any) => void;
}

export default function WebViewPaymentModal({
  visible,
  onClose,
  bookingId,
  amount,
  currency,
  onPaymentSuccess,
}: WebViewPaymentModalProps) {
  const { t } = useTranslation();
  const { data: authData } = useAuth();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      createCheckoutSession();
    }
  }, [visible]);

  const createCheckoutSession = async () => {
    try {
      setIsLoading(true);
      console.log('💳 Creating Stripe Checkout session for booking:', bookingId);

      const { data, error } = await supabase.functions.invoke('process-booking-payment', {
        body: {
          bookingId: bookingId,
          amount: amount,
          currency: currency,
          payment_method_type: 'new_card',
          use_checkout: true,
        },
      });

      if (error || !data?.checkoutUrl) {
        console.error('❌ Checkout error:', error);
        throw new Error('Failed to create checkout session');
      }

      console.log('✅ Checkout session created');
      setCheckoutUrl(data.checkoutUrl);
      setIsLoading(false);
    } catch (error: any) {
      console.error('❌ Error creating checkout session:', error);
      Alert.alert('Error', error.message || 'Failed to initialize payment');
      onClose();
    }
  };

  const handleNavigationStateChange = (navState: any) => {
    console.log('📨 WebView navigation:', navState.url);

    // Check if payment was successful (Stripe redirects to success URL)
    if (navState.url.includes('success') || navState.url.includes('payment_intent')) {
      console.log('✅ Payment successful!');
      Alert.alert(
        t('bookingPaymentModal.paymentSuccessful'),
        t('bookingPaymentModal.bookingConfirmed'),
        [
          {
            text: 'OK',
            onPress: () => {
              onPaymentSuccess({ success: true });
              onClose();
            },
          },
        ]
      );
    } else if (navState.url.includes('cancel')) {
      console.log('❌ Payment cancelled');
      Alert.alert('Payment Cancelled', 'You cancelled the payment');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="px-4 py-4 border-b border-gray-200 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
            Payment
          </Text>
          <Pressable
            onPress={onClose}
            className="w-10 h-10 items-center justify-center"
          >
            <X size={24} color="#000" />
          </Pressable>
        </View>

        {/* Loading State */}
        {isLoading && (
          <View className="flex-1 items-center justify-center bg-white">
            <ActivityIndicator size="large" color="#10B981" />
            <Text className="text-gray-600 mt-4" style={{ fontFamily: 'Cairo_400Regular' }}>
              Loading payment form...
            </Text>
          </View>
        )}

        {/* WebView */}
        {checkoutUrl && !isLoading && (
          <WebView
            ref={webViewRef}
            source={{ uri: checkoutUrl }}
            onNavigationStateChange={handleNavigationStateChange}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </Modal>
  );
}
