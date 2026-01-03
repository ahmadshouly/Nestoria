import React, { useState, useEffect } from 'react';
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
import { X, Star, ChevronRight, ChevronLeft, Check } from 'lucide-react-native';
import { useReviewQuestions, useExistingReview, useSubmitReview, ReviewResponse } from '@/lib/api/reviews';
import { useTranslation, useLanguageStore } from '@/lib/i18n';

interface Booking {
  id: string;
  accommodation_id?: string | null;
  vehicle_id?: string | null;
  accommodations?: { host_id?: string } | null;
  vehicles?: { owner_id?: string } | null;
}

interface WriteReviewModalProps {
  visible: boolean;
  onClose: () => void;
  booking: Booking | null;
}

type Step = 'property' | 'host' | 'platform' | 'complete';

export default function WriteReviewModal({ visible, onClose, booking }: WriteReviewModalProps) {
  const { t } = useTranslation();
  const isRTL = useLanguageStore(s => s.isRTL);

  const [currentStep, setCurrentStep] = useState<Step>('property');
  const [responses, setResponses] = useState<Record<string, ReviewResponse>>({});
  const [propertyComment, setPropertyComment] = useState('');
  const [hostComment, setHostComment] = useState('');
  const [platformComment, setPlatformComment] = useState('');

  const { data: questions = [], isLoading: questionsLoading } = useReviewQuestions();
  const { data: existingReview } = useExistingReview(booking?.id);
  const submitReview = useSubmitReview();

  const hostId = booking?.accommodations?.host_id || booking?.vehicles?.owner_id || null;

  // Filter questions by step
  const propertyQuestions = questions.filter(q => q.target_type === 'property');
  const hostQuestions = questions.filter(q => q.target_type === 'host');
  const platformQuestions = questions.filter(q => q.target_type === 'platform');

  // Check if already reviewed
  const hasPropertyReview = !!existingReview?.propertyReview;
  const hasHostReview = !!existingReview?.hostReview;
  const hasPlatformReview = !!existingReview?.platformReview;

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentStep('property');
      setResponses({});
      setPropertyComment('');
      setHostComment('');
      setPlatformComment('');
    }
  }, [visible]);

  const handleRating = (questionId: string, rating: number) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], value: rating },
    }));
  };

  const handleTextResponse = (questionId: string, text: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], text },
    }));
  };

  const canProceed = () => {
    let currentQuestions: typeof questions = [];
    switch (currentStep) {
      case 'property':
        currentQuestions = propertyQuestions;
        break;
      case 'host':
        currentQuestions = hostQuestions;
        break;
      case 'platform':
        currentQuestions = platformQuestions;
        break;
    }

    const requiredQuestions = currentQuestions.filter(q => q.is_required);
    return requiredQuestions.every(q => {
      const response = responses[q.id];
      if (q.question_type === 'rating' || q.question_type === 'scale') {
        return response?.value !== undefined;
      }
      return response?.text?.trim();
    });
  };

  const handleNext = () => {
    if (currentStep === 'property') {
      if (hostId && hostQuestions.length > 0 && !hasHostReview) {
        setCurrentStep('host');
      } else if (platformQuestions.length > 0 && !hasPlatformReview) {
        setCurrentStep('platform');
      } else {
        handleSubmit();
      }
    } else if (currentStep === 'host') {
      if (platformQuestions.length > 0 && !hasPlatformReview) {
        setCurrentStep('platform');
      } else {
        handleSubmit();
      }
    } else if (currentStep === 'platform') {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep === 'host') {
      setCurrentStep('property');
    } else if (currentStep === 'platform') {
      if (hostId && hostQuestions.length > 0 && !hasHostReview) {
        setCurrentStep('host');
      } else {
        setCurrentStep('property');
      }
    }
  };

  const handleSubmit = async () => {
    if (!booking) return;

    try {
      await submitReview.mutateAsync({
        bookingId: booking.id,
        accommodationId: booking.accommodation_id,
        vehicleId: booking.vehicle_id,
        hostId,
        responses,
        propertyComment,
        hostComment,
        platformComment,
      });

      setCurrentStep('complete');
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert(
        t('common.error'),
        t('reviews.submitError')
      );
    }
  };

  const renderStars = (questionId: string, currentRating: number = 0) => {
    return (
      <View className="flex-row gap-2">
        {[1, 2, 3, 4, 5].map(star => (
          <Pressable
            key={star}
            onPress={() => handleRating(questionId, star)}
            className="p-1"
          >
            <Star
              size={32}
              color={star <= currentRating ? '#F59E0B' : '#D1D5DB'}
              fill={star <= currentRating ? '#F59E0B' : 'none'}
            />
          </Pressable>
        ))}
      </View>
    );
  };

  const renderQuestion = (question: typeof questions[0]) => {
    const response = responses[question.id];

    return (
      <View key={question.id} className="mb-6">
        <Text
          className="text-base font-semibold text-gray-900 mb-3"
          style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}
        >
          {question.question_text}
          {question.is_required && <Text className="text-red-500"> *</Text>}
        </Text>

        {question.question_type === 'rating' && (
          <View className="items-center">
            {renderStars(question.id, response?.value)}
          </View>
        )}

        {question.question_type === 'scale' && (
          <View className="flex-row justify-between items-center">
            {Array.from(
              { length: (question.scale_max || 10) - (question.scale_min || 1) + 1 },
              (_, i) => (question.scale_min || 1) + i
            ).map(num => (
              <Pressable
                key={num}
                onPress={() => handleRating(question.id, num)}
                className={`w-9 h-9 rounded-full items-center justify-center ${
                  response?.value === num ? 'bg-emerald-500' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    response?.value === num ? 'text-white' : 'text-gray-700'
                  }`}
                  style={{ fontFamily: 'Cairo_600SemiBold' }}
                >
                  {num}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {question.question_type === 'text' && (
          <TextInput
            value={response?.text || ''}
            onChangeText={(text) => handleTextResponse(question.id, text)}
            placeholder={t('reviews.typeHere')}
            multiline
            numberOfLines={3}
            className="bg-gray-100 rounded-xl p-4 text-base text-gray-900"
            style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left', minHeight: 80 }}
            placeholderTextColor="#9CA3AF"
          />
        )}
      </View>
    );
  };

  const renderStep = () => {
    if (currentStep === 'complete') {
      return (
        <View className="flex-1 items-center justify-center py-12">
          <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center mb-6">
            <Check size={40} color="#10B981" />
          </View>
          <Text
            className="text-2xl font-bold text-gray-900 mb-2 text-center"
            style={{ fontFamily: 'Cairo_700Bold' }}
          >
            {t('reviews.thankYou')}
          </Text>
          <Text
            className="text-base text-gray-600 text-center px-6"
            style={{ fontFamily: 'Cairo_400Regular' }}
          >
            {t('reviews.submittedMessage')}
          </Text>
          <Pressable
            onPress={onClose}
            className="mt-8 bg-emerald-500 px-8 py-3 rounded-full active:opacity-80"
          >
            <Text className="text-white font-semibold text-base" style={{ fontFamily: 'Cairo_600SemiBold' }}>
              {t('common.done')}
            </Text>
          </Pressable>
        </View>
      );
    }

    let currentQuestions: typeof questions = [];
    let title = '';
    let subtitle = '';
    let comment = '';
    let setComment: (text: string) => void = () => {};

    switch (currentStep) {
      case 'property':
        currentQuestions = propertyQuestions;
        title = booking?.accommodation_id ? t('reviews.rateProperty') : t('reviews.rateVehicle');
        subtitle = t('reviews.propertySubtitle');
        comment = propertyComment;
        setComment = setPropertyComment;
        break;
      case 'host':
        currentQuestions = hostQuestions;
        title = t('reviews.rateHost');
        subtitle = t('reviews.hostSubtitle');
        comment = hostComment;
        setComment = setHostComment;
        break;
      case 'platform':
        currentQuestions = platformQuestions;
        title = t('reviews.ratePlatform');
        subtitle = t('reviews.platformSubtitle');
        comment = platformComment;
        setComment = setPlatformComment;
        break;
    }

    return (
      <>
        <View className="mb-6">
          <Text
            className="text-xl font-bold text-gray-900 mb-1"
            style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
          >
            {title}
          </Text>
          <Text
            className="text-sm text-gray-500"
            style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
          >
            {subtitle}
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          {currentQuestions.map(renderQuestion)}

          {/* Comment section */}
          <View className="mb-6">
            <Text
              className="text-base font-semibold text-gray-900 mb-3"
              style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}
            >
              {t('reviews.additionalComments')}
            </Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={t('reviews.commentPlaceholder')}
              multiline
              numberOfLines={4}
              className="bg-gray-100 rounded-xl p-4 text-base text-gray-900"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left', minHeight: 100 }}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </ScrollView>
      </>
    );
  };

  const getStepIndicator = () => {
    const steps: Step[] = ['property'];
    if (hostId && hostQuestions.length > 0 && !hasHostReview) steps.push('host');
    if (platformQuestions.length > 0 && !hasPlatformReview) steps.push('platform');

    const currentIndex = steps.indexOf(currentStep);

    return (
      <View className="flex-row items-center justify-center mb-4">
        {steps.map((step, index) => (
          <View key={step} className="flex-row items-center">
            <View
              className={`w-8 h-8 rounded-full items-center justify-center ${
                index <= currentIndex ? 'bg-emerald-500' : 'bg-gray-200'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  index <= currentIndex ? 'text-white' : 'text-gray-500'
                }`}
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                {index + 1}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                className={`w-8 h-1 ${
                  index < currentIndex ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  if (hasPropertyReview && hasHostReview && hasPlatformReview) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white p-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
              {t('reviews.writeReview')}
            </Text>
            <Pressable onPress={onClose} className="p-2 rounded-full bg-gray-100">
              <X size={20} color="#374151" />
            </Pressable>
          </View>
          <View className="flex-1 items-center justify-center">
            <Check size={48} color="#10B981" />
            <Text className="text-lg font-semibold text-gray-900 mt-4 text-center" style={{ fontFamily: 'Cairo_600SemiBold' }}>
              {t('reviews.alreadyReviewed')}
            </Text>
            <Text className="text-sm text-gray-500 mt-2 text-center" style={{ fontFamily: 'Cairo_400Regular' }}>
              {t('reviews.alreadyReviewedMessage')}
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="px-4 py-4 border-b border-gray-200">
          <View className={`flex-row items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Text className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
              {t('reviews.writeReview')}
            </Text>
            <Pressable onPress={onClose} className="p-2 rounded-full bg-gray-100">
              <X size={20} color="#374151" />
            </Pressable>
          </View>
        </View>

        {questionsLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        ) : (
          <View className="flex-1 px-6 py-4">
            {currentStep !== 'complete' && getStepIndicator()}
            {renderStep()}
          </View>
        )}

        {/* Footer buttons */}
        {currentStep !== 'complete' && (
          <View className="px-6 pb-8 pt-4 border-t border-gray-200">
            <View className={`flex-row gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {currentStep !== 'property' && (
                <Pressable
                  onPress={handleBack}
                  className="flex-1 bg-gray-100 py-4 rounded-xl items-center flex-row justify-center active:opacity-80"
                >
                  <ChevronLeft size={20} color="#374151" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
                  <Text className="text-gray-700 font-semibold ml-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    {t('common.back')}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleNext}
                disabled={!canProceed() || submitReview.isPending}
                className={`flex-1 py-4 rounded-xl items-center flex-row justify-center active:opacity-80 ${
                  canProceed() && !submitReview.isPending ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                {submitReview.isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Text className="text-white font-semibold mr-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                      {currentStep === 'platform' ||
                      (currentStep === 'property' && (!hostId || !hostQuestions.length) && !platformQuestions.length) ||
                      (currentStep === 'host' && !platformQuestions.length)
                        ? t('reviews.submit')
                        : t('common.next')}
                    </Text>
                    <ChevronRight size={20} color="#FFF" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
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
