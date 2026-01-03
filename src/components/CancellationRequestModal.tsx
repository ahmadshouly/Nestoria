import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, AlertCircle, ChevronRight, Check } from 'lucide-react-native';
import { useSubmitCancellation, CANCELLATION_REASONS } from '@/lib/api/reviews';
import { useTranslation, useLanguageStore } from '@/lib/i18n';

interface CancellationRequestModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string | null;
  onSuccess?: () => void;
}

export default function CancellationRequestModal({
  visible,
  onClose,
  bookingId,
  onSuccess,
}: CancellationRequestModalProps) {
  const { t } = useTranslation();
  const isRTL = useLanguageStore(s => s.isRTL);

  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [step, setStep] = useState<'reason' | 'confirm' | 'success'>('reason');

  const submitCancellation = useSubmitCancellation();

  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    setStep('reason');
    onClose();
  };

  const handleSelectReason = (reason: string) => {
    setSelectedReason(reason);
    if (reason !== 'Other') {
      setCustomReason('');
    }
  };

  const handleContinue = () => {
    if (selectedReason === 'Other' && !customReason.trim()) {
      Alert.alert(t('common.error'), t('cancellation.pleaseSpecifyReason'));
      return;
    }
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!bookingId) return;

    try {
      await submitCancellation.mutateAsync({
        bookingId,
        reason: selectedReason,
        customReason: customReason.trim() || undefined,
      });

      setStep('success');
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting cancellation:', error);
      Alert.alert(
        t('common.error'),
        t('cancellation.submitError')
      );
    }
  };

  const canContinue = selectedReason && (selectedReason !== 'Other' || customReason.trim());

  const renderReasonStep = () => (
    <>
      <View className="mb-6">
        <Text
          className="text-xl font-bold text-gray-900 mb-1"
          style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
        >
          {t('cancellation.whyCancel')}
        </Text>
        <Text
          className="text-sm text-gray-500"
          style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
        >
          {t('cancellation.selectReason')}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {CANCELLATION_REASONS.map((reason) => (
          <Pressable
            key={reason}
            onPress={() => handleSelectReason(reason)}
            className={`flex-row items-center justify-between p-4 rounded-xl mb-2 ${
              selectedReason === reason ? 'bg-emerald-50 border border-emerald-500' : 'bg-gray-50'
            }`}
          >
            <Text
              className={`text-base ${selectedReason === reason ? 'text-emerald-700' : 'text-gray-700'}`}
              style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}
            >
              {t(`cancellation.reasons.${reason.toLowerCase().replace(/ /g, '_')}`) || reason}
            </Text>
            {selectedReason === reason && (
              <View className="w-6 h-6 rounded-full bg-emerald-500 items-center justify-center">
                <Check size={14} color="#FFF" />
              </View>
            )}
          </Pressable>
        ))}

        {/* Custom reason input */}
        {selectedReason === 'Other' && (
          <View className="mt-4">
            <Text
              className="text-sm font-semibold text-gray-700 mb-2"
              style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}
            >
              {t('cancellation.specifyReason')}
            </Text>
            <TextInput
              value={customReason}
              onChangeText={setCustomReason}
              placeholder={t('cancellation.reasonPlaceholder')}
              multiline
              numberOfLines={3}
              className="bg-gray-100 rounded-xl p-4 text-base text-gray-900"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left', minHeight: 80 }}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )}
      </ScrollView>
    </>
  );

  const renderConfirmStep = () => (
    <View className="flex-1">
      <View className="items-center py-6">
        <View className="w-16 h-16 rounded-full bg-orange-100 items-center justify-center mb-4">
          <AlertCircle size={32} color="#F59E0B" />
        </View>
        <Text
          className="text-xl font-bold text-gray-900 mb-2 text-center"
          style={{ fontFamily: 'Cairo_700Bold' }}
        >
          {t('cancellation.confirmTitle')}
        </Text>
        <Text
          className="text-base text-gray-600 text-center px-6"
          style={{ fontFamily: 'Cairo_400Regular' }}
        >
          {t('cancellation.confirmMessage')}
        </Text>
      </View>

      <View className="bg-gray-50 rounded-xl p-4 mt-4">
        <Text
          className="text-sm font-semibold text-gray-700 mb-2"
          style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}
        >
          {t('cancellation.yourReason')}
        </Text>
        <Text
          className="text-base text-gray-900"
          style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
        >
          {selectedReason === 'Other' ? customReason : selectedReason}
        </Text>
      </View>

      <View className="bg-orange-50 rounded-xl p-4 mt-4">
        <Text
          className="text-sm text-orange-800"
          style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
        >
          {t('cancellation.refundInfo')}
        </Text>
      </View>
    </View>
  );

  const renderSuccessStep = () => (
    <View className="flex-1 items-center justify-center py-12">
      <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center mb-6">
        <Check size={40} color="#10B981" />
      </View>
      <Text
        className="text-2xl font-bold text-gray-900 mb-2 text-center"
        style={{ fontFamily: 'Cairo_700Bold' }}
      >
        {t('cancellation.requestSubmitted')}
      </Text>
      <Text
        className="text-base text-gray-600 text-center px-6"
        style={{ fontFamily: 'Cairo_400Regular' }}
      >
        {t('cancellation.submittedMessage')}
      </Text>
      <Pressable
        onPress={handleClose}
        className="mt-8 bg-emerald-500 px-8 py-3 rounded-full active:opacity-80"
      >
        <Text className="text-white font-semibold text-base" style={{ fontFamily: 'Cairo_600SemiBold' }}>
          {t('common.done')}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="px-4 py-4 border-b border-gray-200">
          <View className={`flex-row items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Text className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
              {t('cancellation.cancelBooking')}
            </Text>
            <Pressable onPress={handleClose} className="p-2 rounded-full bg-gray-100">
              <X size={20} color="#374151" />
            </Pressable>
          </View>
        </View>

        {/* Content */}
        <View className="flex-1 px-6 py-4">
          {step === 'reason' && renderReasonStep()}
          {step === 'confirm' && renderConfirmStep()}
          {step === 'success' && renderSuccessStep()}
        </View>

        {/* Footer buttons */}
        {step !== 'success' && (
          <View className="px-6 pb-8 pt-4 border-t border-gray-200">
            <View className={`flex-row gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {step === 'confirm' && (
                <Pressable
                  onPress={() => setStep('reason')}
                  className="flex-1 bg-gray-100 py-4 rounded-xl items-center active:opacity-80"
                >
                  <Text className="text-gray-700 font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    {t('common.back')}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={step === 'reason' ? handleContinue : handleSubmit}
                disabled={step === 'reason' ? !canContinue : submitCancellation.isPending}
                className={`flex-1 py-4 rounded-xl items-center flex-row justify-center active:opacity-80 ${
                  (step === 'reason' ? canContinue : !submitCancellation.isPending)
                    ? step === 'confirm' ? 'bg-red-500' : 'bg-emerald-500'
                    : 'bg-gray-300'
                }`}
              >
                {submitCancellation.isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Text className="text-white font-semibold mr-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                      {step === 'reason' ? t('common.continue') : t('cancellation.confirmCancel')}
                    </Text>
                    {step === 'reason' && (
                      <ChevronRight size={20} color="#FFF" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
                    )}
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
