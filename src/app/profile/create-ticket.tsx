import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import {
  useCreateTicket,
  CreateTicketData,
  TicketCategory,
  TicketPriority,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
} from '@/lib/api/support';
import { useUserBookings } from '@/lib/api/bookings';
import { useTranslation } from '@/lib/i18n';

export default function CreateTicketScreen() {
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;

  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<TicketCategory>('general');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [bookingId, setBookingId] = useState<string>('');
  const [showCategoryPicker, setShowCategoryPicker] = useState<boolean>(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState<boolean>(false);
  const [showBookingPicker, setShowBookingPicker] = useState<boolean>(false);

  const createTicket = useCreateTicket();
  const { data: bookings } = useUserBookings();

  const handleCreateTicket = async () => {
    if (!subject.trim()) {
      Alert.alert(
        t('common.error') || 'Error',
        t('support.subjectRequired') || 'Please enter a subject'
      );
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        t('common.error') || 'Error',
        t('support.descriptionRequired') || 'Please enter a description'
      );
      return;
    }

    const ticketData: CreateTicketData = {
      subject: subject.trim(),
      description: description.trim(),
      category,
      priority,
      booking_id: bookingId || undefined,
    };

    try {
      const ticket = await createTicket.mutateAsync(ticketData);
      Alert.alert(
        t('common.success') || 'Success',
        t('support.ticketCreated') || 'Your support ticket has been created successfully',
        [
          {
            text: t('common.ok') || 'OK',
            onPress: () => router.push(`/profile/ticket/${ticket.id}`),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        t('common.error') || 'Error',
        error.message || t('support.createError') || 'Failed to create ticket'
      );
    }
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: t('support.createTicket') || 'Create Ticket',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#000',
        }}
      />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
        {/* Subject */}
        <View className="mb-4">
          <Text
            className="text-sm font-semibold text-gray-700 mb-2"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('support.subject') || 'Subject'} *
          </Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder={t('support.subjectPlaceholder') || 'Brief description of your issue'}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
            style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Category */}
        <View className="mb-4">
          <Text
            className="text-sm font-semibold text-gray-700 mb-2"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('support.category') || 'Category'} *
          </Text>
          <Pressable
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 flex-row items-center justify-between"
          >
            <Text
              className="text-base text-gray-900"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {CATEGORY_LABELS[category]}
            </Text>
            <ChevronDown size={20} color="#6B7280" />
          </Pressable>
          {showCategoryPicker && (
            <View className="border border-gray-200 rounded-xl mt-2 overflow-hidden">
              {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryPicker(false);
                  }}
                  className={`px-4 py-3 ${category === cat ? 'bg-emerald-50' : 'bg-white'} active:bg-gray-50`}
                >
                  <Text
                    className={`text-base ${category === cat ? 'text-emerald-600 font-semibold' : 'text-gray-900'}`}
                    style={{ fontFamily: category === cat ? 'Cairo_600SemiBold' : 'Cairo_400Regular' }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Priority */}
        <View className="mb-4">
          <Text
            className="text-sm font-semibold text-gray-700 mb-2"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('support.priority') || 'Priority'} *
          </Text>
          <Pressable
            onPress={() => setShowPriorityPicker(!showPriorityPicker)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 flex-row items-center justify-between"
          >
            <Text
              className="text-base text-gray-900"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {PRIORITY_LABELS[priority]}
            </Text>
            <ChevronDown size={20} color="#6B7280" />
          </Pressable>
          {showPriorityPicker && (
            <View className="border border-gray-200 rounded-xl mt-2 overflow-hidden">
              {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((pri) => (
                <Pressable
                  key={pri}
                  onPress={() => {
                    setPriority(pri);
                    setShowPriorityPicker(false);
                  }}
                  className={`px-4 py-3 ${priority === pri ? 'bg-emerald-50' : 'bg-white'} active:bg-gray-50`}
                >
                  <Text
                    className={`text-base ${priority === pri ? 'text-emerald-600 font-semibold' : 'text-gray-900'}`}
                    style={{ fontFamily: priority === pri ? 'Cairo_600SemiBold' : 'Cairo_400Regular' }}
                  >
                    {PRIORITY_LABELS[pri]}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Related Booking (Optional) */}
        {bookings && bookings.length > 0 && (
          <View className="mb-4">
            <Text
              className="text-sm font-semibold text-gray-700 mb-2"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('support.relatedBooking') || 'Related Booking'} ({t('common.optional') || 'Optional'})
            </Text>
            <Pressable
              onPress={() => setShowBookingPicker(!showBookingPicker)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 flex-row items-center justify-between"
            >
              <Text
                className="text-base text-gray-900"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                {bookingId
                  ? bookings.find((b) => b.id === bookingId)?.accommodations?.title ||
                    bookings.find((b) => b.id === bookingId)?.vehicles?.title ||
                    bookingId.substring(0, 8)
                  : t('support.selectBooking') || 'Select a booking'}
              </Text>
              <ChevronDown size={20} color="#6B7280" />
            </Pressable>
            {showBookingPicker && (
              <View className="border border-gray-200 rounded-xl mt-2 overflow-hidden">
                <Pressable
                  onPress={() => {
                    setBookingId('');
                    setShowBookingPicker(false);
                  }}
                  className={`px-4 py-3 ${!bookingId ? 'bg-emerald-50' : 'bg-white'} active:bg-gray-50`}
                >
                  <Text
                    className={`text-base ${!bookingId ? 'text-emerald-600 font-semibold' : 'text-gray-900'}`}
                    style={{ fontFamily: !bookingId ? 'Cairo_600SemiBold' : 'Cairo_400Regular' }}
                  >
                    {t('common.none') || 'None'}
                  </Text>
                </Pressable>
                {bookings.map((booking) => (
                  <Pressable
                    key={booking.id}
                    onPress={() => {
                      setBookingId(booking.id);
                      setShowBookingPicker(false);
                    }}
                    className={`px-4 py-3 ${bookingId === booking.id ? 'bg-emerald-50' : 'bg-white'} active:bg-gray-50`}
                  >
                    <Text
                      className={`text-base ${bookingId === booking.id ? 'text-emerald-600 font-semibold' : 'text-gray-900'}`}
                      style={{ fontFamily: bookingId === booking.id ? 'Cairo_600SemiBold' : 'Cairo_400Regular' }}
                      numberOfLines={1}
                    >
                      {booking.accommodations?.title || booking.vehicles?.title || `Booking ${booking.id.substring(0, 8)}`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Description */}
        <View className="mb-6">
          <Text
            className="text-sm font-semibold text-gray-700 mb-2"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('support.description') || 'Description'} *
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t('support.descriptionPlaceholder') || 'Please provide detailed information about your issue'}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
            style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left', minHeight: 120 }}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Submit Button */}
        <Pressable
          onPress={handleCreateTicket}
          disabled={createTicket.isPending}
          className={`bg-emerald-500 rounded-xl py-4 items-center justify-center mb-4 active:opacity-80 ${
            createTicket.isPending ? 'opacity-70' : ''
          }`}
        >
          {createTicket.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text
              className="text-white font-bold text-base"
              style={{ fontFamily: 'Cairo_700Bold' }}
            >
              {t('support.submitTicket') || 'Submit Ticket'}
            </Text>
          )}
        </Pressable>

        <Text
          className="text-gray-500 text-center text-sm"
          style={{ fontFamily: 'Cairo_400Regular' }}
        >
          {t('support.responseTime') || 'Our team will respond within 24 hours'}
        </Text>
      </ScrollView>
    </View>
  );
}
