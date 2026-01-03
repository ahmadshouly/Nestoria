import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { ArrowLeft, Bell, MessageSquare, Calendar, Star, Gift } from 'lucide-react-native';
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
  NotificationPreferences,
} from '@/lib/api/notifications';
import { useTranslation, useLanguageStore } from '@/lib/i18n';

type PreferenceKey = keyof Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

interface PreferenceCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  emailKey: PreferenceKey;
  pushKey: PreferenceKey;
}

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const isRTL = useLanguageStore(s => s.isRTL);

  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreference = useUpdateNotificationPreference();

  // Define preference categories
  const categories: PreferenceCategory[] = [
    {
      id: 'bookings',
      title: t('notifications.settings.bookings'),
      description: t('notifications.settings.bookingsDesc'),
      icon: <Calendar size={22} color="#10B981" />,
      emailKey: 'email_bookings',
      pushKey: 'push_bookings',
    },
    {
      id: 'messages',
      title: t('notifications.settings.messages'),
      description: t('notifications.settings.messagesDesc'),
      icon: <MessageSquare size={22} color="#3B82F6" />,
      emailKey: 'email_messages',
      pushKey: 'push_messages',
    },
    {
      id: 'reviews',
      title: t('notifications.settings.reviews'),
      description: t('notifications.settings.reviewsDesc'),
      icon: <Star size={22} color="#F59E0B" />,
      emailKey: 'email_reviews',
      pushKey: 'push_reviews',
    },
    {
      id: 'promotions',
      title: t('notifications.settings.promotions'),
      description: t('notifications.settings.promotionsDesc'),
      icon: <Gift size={22} color="#EC4899" />,
      emailKey: 'email_promotions',
      pushKey: 'push_promotions',
    },
  ];

  // Get value for a preference key
  const getPreferenceValue = (key: PreferenceKey): boolean => {
    if (!preferences) return true; // Default to enabled
    return preferences[key] ?? true;
  };

  // Toggle a preference
  const togglePreference = async (key: PreferenceKey, value: boolean) => {
    try {
      await updatePreference.mutateAsync({ key, value });
    } catch (error) {
      console.error('Failed to update preference:', error);
    }
  };

  const renderCategory = (category: PreferenceCategory) => {
    const emailEnabled = getPreferenceValue(category.emailKey);
    const pushEnabled = getPreferenceValue(category.pushKey);

    return (
      <View
        key={category.id}
        className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
      >
        <View className="flex-row items-start">
          {/* Icon */}
          <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
            {category.icon}
          </View>

          {/* Content */}
          <View className="flex-1 ml-3">
            <Text
              className="text-base font-semibold text-gray-900"
              style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}
            >
              {category.title}
            </Text>
            <Text
              className="text-sm text-gray-500 mt-0.5"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
            >
              {category.description}
            </Text>

            {/* Toggle Switches */}
            <View className="mt-4 gap-3">
              {/* Push Notifications */}
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-sm text-gray-600"
                  style={{ fontFamily: 'Cairo_400Regular' }}
                >
                  {t('notifications.settings.push')}
                </Text>
                <Switch
                  value={pushEnabled}
                  onValueChange={(value) => togglePreference(category.pushKey, value)}
                  trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                  thumbColor="#fff"
                  disabled={updatePreference.isPending}
                />
              </View>

              {/* Email Notifications */}
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-sm text-gray-600"
                  style={{ fontFamily: 'Cairo_400Regular' }}
                >
                  {t('notifications.settings.email')}
                </Text>
                <Switch
                  value={emailEnabled}
                  onValueChange={(value) => togglePreference(category.emailKey, value)}
                  trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                  thumbColor="#fff"
                  disabled={updatePreference.isPending}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="px-4 py-3 bg-white border-b border-gray-200">
          <View className="flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="p-2 -ml-2 active:opacity-60"
            >
              <ArrowLeft size={24} color="#000" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
            </Pressable>
            <Text
              className="text-xl font-bold text-gray-900 ml-3"
              style={{ fontFamily: 'Cairo_700Bold' }}
            >
              {t('notifications.settings.title')}
            </Text>
          </View>
        </View>

        {/* Content */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#10B981" />
            <Text className="text-gray-600 mt-4" style={{ fontFamily: 'Cairo_400Regular' }}>
              {t('common.loading')}
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-4 pt-4"
            showsVerticalScrollIndicator={false}
          >
            {/* Info Banner */}
            <View className="bg-emerald-50 rounded-xl p-4 mb-4 border border-emerald-100">
              <View className="flex-row items-center">
                <Bell size={20} color="#10B981" />
                <Text
                  className="text-sm text-emerald-800 flex-1 ml-3"
                  style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
                >
                  {t('notifications.settings.info')}
                </Text>
              </View>
            </View>

            {/* Categories */}
            {categories.map(renderCategory)}

            <View className="h-6" />
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}
