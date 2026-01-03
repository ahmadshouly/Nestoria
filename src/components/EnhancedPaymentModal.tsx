import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import { X, CreditCard, CheckCircle2, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/api/auth';
import WebViewPaymentModal from './WebViewPaymentModal';

interface PaymentMethod {
  id: string;
  stripe_payment_method_id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  is_default: boolean;
}

interface EnhancedPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  amount: number;
  currency: string;
  onPaymentSuccess: (data: any) => void;
}

export default function EnhancedPaymentModal({
  visible,
  onClose,
  bookingId,
  amount,
  currency,
  onPaymentSuccess,
}: EnhancedPaymentModalProps) {
  const { t } = useTranslation();
  const { data: authData } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<'saved_cards' | 'new_card'>('saved_cards');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMethods, setIsFetchingMethods] = useState(false);
  const [showWebViewPayment, setShowWebViewPayment] = useState(false);

  // Fetch saved payment methods
  useEffect(() => {
    if (visible && authData?.user?.id) {
      console.log('🟢 EnhancedPaymentModal visible, fetching payment methods...');
      fetchPaymentMethods();
    }
  }, [visible, authData?.user?.id]);

  const fetchPaymentMethods = async () => {
    try {
      setIsFetchingMethods(true);
      console.log('💳 Fetching payment methods for user:', authData?.user?.id);

      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', authData?.user?.id)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) {
        console.error('❌ Error fetching payment methods:', error);
        throw error;
      }

      console.log('✅ Payment methods fetched:', data?.length || 0, 'cards found');
      setPaymentMethods(data || []);

      // Auto-select default payment method
      const defaultMethod = data?.find(pm => pm.is_default);
      if (defaultMethod) {
        console.log('✅ Auto-selected default payment method:', defaultMethod.id);
        setSelectedPaymentMethod(defaultMethod.id);
        setSelectedPaymentOption('saved_cards');
      } else if (data && data.length > 0) {
        console.log('✅ Auto-selected first payment method:', data[0].id);
        setSelectedPaymentMethod(data[0].id);
        setSelectedPaymentOption('saved_cards');
      } else {
        console.log('ℹ️ No saved payment methods, defaulting to new card option');
        setSelectedPaymentOption('new_card');
      }
    } catch (error) {
      console.error('❌ Error fetching payment methods:', error);
    } finally {
      setIsFetchingMethods(false);
      console.log('✅ Payment methods fetch complete');
    }
  };

  const handlePayment = async () => {
    try {
      // If new card selected, open WebView payment modal
      if (selectedPaymentOption === 'new_card') {
        console.log('🔄 Opening WebView payment modal for new card');
        onClose(); // Close this modal first
        setTimeout(() => {
          setShowWebViewPayment(true);
        }, 300);
        return;
      }

      // Process with saved card
      setIsLoading(true);

      let paymentData: any = {
        bookingId: bookingId,
        amount: amount,
        currency: currency,
        payment_method_type: 'saved_cards',
        paymentMethodId: selectedPaymentMethod,
      };

      console.log('🔄 Processing payment with saved card:', selectedPaymentMethod);

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke('process-booking-payment', {
        body: paymentData,
      });

      if (error) {
        console.error('❌ Payment error:', error);
        throw error;
      }

      console.log('✅ Payment response:', data);

      // Handle response
      if (data?.checkoutUrl) {
        console.log('🔗 Opening Stripe Checkout URL:', data.checkoutUrl);

        // Open Stripe Checkout in browser
        const supported = await Linking.canOpenURL(data.checkoutUrl);
        if (supported) {
          await Linking.openURL(data.checkoutUrl);

          // Show message that they need to complete payment in browser
          Alert.alert(
            'Complete Payment in Browser',
            'Please complete your payment in the browser that just opened. After completing the payment, your booking will be automatically confirmed.',
            [
              {
                text: 'OK',
                onPress: () => onClose(),
              },
            ]
          );
        } else {
          throw new Error('Cannot open payment URL');
        }
      } else if (data?.success) {
        // In-app payment successful (saved cards)
        console.log('✅ Payment successful!');
        Alert.alert(
          t('bookingPaymentModal.paymentSuccessful'),
          t('bookingPaymentModal.bookingConfirmed')
        );
        onPaymentSuccess(data);
        onClose();
      } else {
        throw new Error('Payment failed');
      }
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      Alert.alert(
        t('common.error'),
        error.message || 'Payment failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getCardBrandIcon = (brand: string) => {
    // You can return different icons for Visa, Mastercard, etc.
    return <CreditCard size={20} color="#10B981" />;
  };

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        console.log('🟠 EnhancedPaymentModal onRequestClose triggered');
        onClose();
      }}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="px-4 py-4 border-b border-gray-200 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
            Payment Method
          </Text>
          <Pressable
            onPress={() => {
              console.log('🟠 EnhancedPaymentModal close button clicked');
              onClose();
            }}
            className="w-10 h-10 items-center justify-center"
          >
            <X size={24} color="#000" />
          </Pressable>
        </View>

        {isFetchingMethods ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#10B981" />
            <Text className="text-gray-600 mt-4" style={{ fontFamily: 'Cairo_400Regular' }}>
              Loading payment methods...
            </Text>
          </View>
        ) : (
          <>
            <ScrollView className="flex-1 px-4 py-6">
              {/* Amount Display */}
              <View className="bg-gray-50 rounded-xl p-4 mb-6">
                <Text className="text-sm text-gray-600 mb-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                  Amount to Pay
                </Text>
                <Text className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
                  ${amount.toFixed(2)}
                </Text>
              </View>

              {/* Saved Cards */}
              {paymentMethods.length > 0 && (
                <>
                  <Text className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: 'Cairo_700Bold' }}>
                    Saved Cards
                  </Text>

                  {paymentMethods.map((method) => (
                    <Pressable
                      key={method.id}
                      onPress={() => {
                        setSelectedPaymentMethod(method.id);
                        setSelectedPaymentOption('saved_cards');
                      }}
                      className={`flex-row items-center justify-between p-4 rounded-xl mb-3 ${
                        selectedPaymentMethod === method.id && selectedPaymentOption === 'saved_cards'
                          ? 'bg-emerald-50 border-2 border-emerald-500'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <View className="flex-row items-center flex-1">
                        {getCardBrandIcon(method.card_brand)}
                        <View className="ml-3 flex-1">
                          <Text className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                            {method.card_brand} •••• {method.card_last4}
                          </Text>
                          <Text className="text-sm text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                            Expires {method.card_exp_month}/{method.card_exp_year}
                          </Text>
                          {method.is_default && (
                            <View className="bg-emerald-100 px-2 py-0.5 rounded-full self-start mt-1">
                              <Text className="text-xs text-emerald-700" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                                Default
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      {selectedPaymentMethod === method.id && selectedPaymentOption === 'saved_cards' && (
                        <CheckCircle2 size={24} color="#10B981" />
                      )}
                    </Pressable>
                  ))}
                </>
              )}

              {/* Add New Card */}
              {paymentMethods.length === 0 ? (
                <>
                  <Text className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: 'Cairo_700Bold' }}>
                    Add Payment Method
                  </Text>

                  <View className="bg-blue-50 rounded-xl p-4 mb-4">
                    <Text className="text-sm text-blue-800 mb-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                      No saved cards found
                    </Text>
                    <Text className="text-sm text-blue-700" style={{ fontFamily: 'Cairo_400Regular' }}>
                      Add a card to complete your payment securely
                    </Text>
                  </View>
                </>
              ) : (
                <Text className="text-lg font-bold text-gray-900 mb-3 mt-4" style={{ fontFamily: 'Cairo_700Bold' }}>
                  Other Payment Options
                </Text>
              )}

              <Pressable
                onPress={() => {
                  setSelectedPaymentOption('new_card');
                  setSelectedPaymentMethod(null);
                }}
                className={`flex-row items-center justify-between p-4 rounded-xl mb-3 ${
                  selectedPaymentOption === 'new_card'
                    ? 'bg-emerald-50 border-2 border-emerald-500'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <View className="flex-row items-center flex-1">
                  <Plus size={20} color="#10B981" />
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                      Add New Card
                    </Text>
                    <Text className="text-sm text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                      Credit or Debit Card
                    </Text>
                  </View>
                </View>
                {selectedPaymentOption === 'new_card' && (
                  <CheckCircle2 size={24} color="#10B981" />
                )}
              </Pressable>

              {/* Payment Security Info */}
              <View className="bg-blue-50 rounded-xl p-4 mt-6">
                <Text className="text-sm text-blue-800" style={{ fontFamily: 'Cairo_400Regular' }}>
                  🔒 Your payment information is secure and encrypted
                </Text>
              </View>
            </ScrollView>

            {/* Pay Button */}
            <View className="px-4 py-4 border-t border-gray-200">
              <Pressable
                onPress={handlePayment}
                disabled={isLoading || (selectedPaymentOption === 'saved_cards' && !selectedPaymentMethod)}
                className={`py-4 rounded-xl flex-row items-center justify-center ${
                  isLoading || (selectedPaymentOption === 'saved_cards' && !selectedPaymentMethod)
                    ? 'bg-gray-300'
                    : 'bg-emerald-500 active:opacity-80'
                }`}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <CreditCard size={20} color="#FFF" />
                    <Text className="text-white text-base font-bold ml-2" style={{ fontFamily: 'Cairo_700Bold' }}>
                      Pay ${amount.toFixed(2)}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>

    {/* WebView Payment Modal for New Cards */}
    <WebViewPaymentModal
      visible={showWebViewPayment}
      onClose={() => setShowWebViewPayment(false)}
      bookingId={bookingId}
      amount={amount}
      currency={currency}
      onPaymentSuccess={(data) => {
        setShowWebViewPayment(false);
        onPaymentSuccess(data);
      }}
    />
    </>
  );
}
