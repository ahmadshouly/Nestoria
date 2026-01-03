import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Star,
  CreditCard,
  Home,
  Gift,
  Info,
  Check,
  Trash2,
  Settings,
} from 'lucide-react-native';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useNotificationSubscription,
  Notification,
  NotificationType,
} from '@/lib/api/notifications';
import { useTranslation, useLanguageStore } from '@/lib/i18n';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

type FilterTab = 'all' | 'unread' | 'read';

// Icon component based on notification type
function NotificationIcon({ type }: { type: NotificationType }) {
  const iconProps = { size: 20 };

  switch (type) {
    case 'booking_confirmed':
    case 'property_approved':
    case 'account_verified':
    case 'document_approved':
    case 'kyc_approved':
      return <CheckCircle {...iconProps} color="#10B981" />;

    case 'booking_cancelled':
    case 'booking_rejected':
    case 'property_rejected':
    case 'payment_failed':
    case 'account_suspended':
    case 'document_rejected':
    case 'kyc_rejected':
      return <XCircle {...iconProps} color="#EF4444" />;

    case 'booking_pending':
    case 'security_alert':
    case 'reminder':
      return <AlertTriangle {...iconProps} color="#F59E0B" />;

    case 'message_received':
      return <MessageSquare {...iconProps} color="#3B82F6" />;

    case 'review_request':
    case 'review_received':
    case 'review_submitted':
    case 'rating_received':
      return <Star {...iconProps} color="#F59E0B" />;

    case 'payment_received':
      return <CreditCard {...iconProps} color="#10B981" />;

    case 'property_featured':
      return <Home {...iconProps} color="#8B5CF6" />;

    case 'welcome':
    case 'promo_code':
    case 'new_feature':
      return <Gift {...iconProps} color="#EC4899" />;

    case 'system_maintenance':
    case 'admin_notification':
      return <Info {...iconProps} color="#6B7280" />;

    default:
      return <Bell {...iconProps} color="#6B7280" />;
  }
}

// Get background color based on notification type
function getNotificationBgColor(type: NotificationType): string {
  switch (type) {
    case 'booking_confirmed':
    case 'property_approved':
    case 'account_verified':
    case 'payment_received':
      return 'bg-emerald-50';

    case 'booking_cancelled':
    case 'booking_rejected':
    case 'property_rejected':
    case 'payment_failed':
      return 'bg-red-50';

    case 'booking_pending':
    case 'security_alert':
    case 'reminder':
    case 'review_request':
    case 'review_received':
      return 'bg-amber-50';

    case 'message_received':
      return 'bg-blue-50';

    case 'property_featured':
      return 'bg-purple-50';

    case 'welcome':
    case 'promo_code':
    case 'new_feature':
      return 'bg-pink-50';

    default:
      return 'bg-gray-50';
  }
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const isRTL = useLanguageStore(s => s.isRTL);
  const [selectedTab, setSelectedTab] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: notifications = [], isLoading, refetch } = useNotifications();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();

  // Set up real-time subscription
  useNotificationSubscription();

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    switch (selectedTab) {
      case 'unread':
        return !n.is_read;
      case 'read':
        return n.is_read;
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await markAsRead.mutateAsync(notification.id);
    }

    // Navigate based on notification type and data
    const data = notification.data || {};

    switch (notification.type) {
      case 'booking_confirmed':
      case 'booking_pending':
      case 'booking_cancelled':
      case 'booking_rejected':
        if (data.booking_id) {
          router.push(`/booking/${data.booking_id}` as any);
        } else {
          router.push('/(tabs)/trips');
        }
        break;

      case 'message_received':
        if (data.conversation_id) {
          router.push(`/chat/${data.conversation_id}` as any);
        } else {
          router.push('/(tabs)/inbox');
        }
        break;

      case 'review_request':
      case 'review_received':
        if (data.booking_id) {
          router.push(`/booking/${data.booking_id}` as any);
        }
        break;

      case 'property_approved':
      case 'property_featured':
        if (data.property_id && data.property_type) {
          router.push(`/${data.property_type}/${data.property_id}` as any);
        }
        break;

      default:
        if (data.url) {
          router.push(data.url as any);
        }
        break;
    }
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) return;

    Alert.alert(
      t('notifications.markAllRead'),
      t('notifications.markAllReadConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: () => markAllAsRead.mutate(),
        },
      ]
    );
  };

  const handleDeleteNotification = (id: string) => {
    Alert.alert(
      t('notifications.delete'),
      t('notifications.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteNotification.mutate(id),
        },
      ]
    );
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('notifications.all') },
    { key: 'unread', label: `${t('notifications.unread')} (${unreadCount})` },
    { key: 'read', label: t('notifications.read') },
  ];

  const renderNotification = (notification: Notification) => {
    const bgColor = notification.is_read ? 'bg-white' : getNotificationBgColor(notification.type);

    return (
      <Pressable
        key={notification.id}
        onPress={() => handleNotificationPress(notification)}
        onLongPress={() => handleDeleteNotification(notification.id)}
        className={`${bgColor} rounded-xl p-4 mb-3 border border-gray-100 active:opacity-80`}
      >
        <View className="flex-row">
          {/* Icon */}
          <View
            className={`w-10 h-10 rounded-full items-center justify-center ${
              notification.is_read ? 'bg-gray-100' : 'bg-white'
            }`}
          >
            <NotificationIcon type={notification.type} />
          </View>

          {/* Content */}
          <View className="flex-1 ml-3">
            <View className="flex-row items-start justify-between">
              <Text
                className={`text-base flex-1 ${notification.is_read ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}
                style={{ fontFamily: notification.is_read ? 'Cairo_400Regular' : 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}
                numberOfLines={2}
              >
                {notification.title}
              </Text>
              {!notification.is_read && (
                <View className="w-2 h-2 rounded-full bg-emerald-500 ml-2 mt-2" />
              )}
            </View>

            <Text
              className="text-sm text-gray-600 mt-1"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
              numberOfLines={2}
            >
              {notification.content}
            </Text>

            <Text
              className="text-xs text-gray-400 mt-2"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
            >
              {dayjs(notification.created_at).fromNow()}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        {/* Header */}
        <View className="px-4 py-3 border-b border-gray-200">
          <View className="flex-row items-center justify-between">
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
                {t('notifications.title')}
              </Text>
            </View>

            <View className="flex-row items-center">
              {unreadCount > 0 && (
                <Pressable
                  onPress={handleMarkAllAsRead}
                  className="p-2 active:opacity-60 mr-2"
                  disabled={markAllAsRead.isPending}
                >
                  {markAllAsRead.isPending ? (
                    <ActivityIndicator size="small" color="#10B981" />
                  ) : (
                    <Check size={22} color="#10B981" />
                  )}
                </Pressable>
              )}
              <Pressable
                onPress={() => router.push('/notification-settings' as any)}
                className="p-2 active:opacity-60"
              >
                <Settings size={22} color="#6B7280" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4 py-3 border-b border-gray-100"
          style={{ flexGrow: 0 }}
        >
          <View className="flex-row gap-2">
            {filterTabs.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setSelectedTab(tab.key)}
                className={`px-4 py-2 rounded-full ${
                  selectedTab === tab.key ? 'bg-emerald-500' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`font-semibold ${
                    selectedTab === tab.key ? 'text-white' : 'text-gray-700'
                  }`}
                  style={{ fontFamily: 'Cairo_600SemiBold' }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

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
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {filteredNotifications.length > 0 ? (
              <>
                {filteredNotifications.map(renderNotification)}
                <View className="h-4" />
              </>
            ) : (
              <View className="items-center justify-center py-20">
                <Bell size={48} color="#D1D5DB" />
                <Text
                  className="text-lg font-semibold text-gray-900 mt-4 text-center"
                  style={{ fontFamily: 'Cairo_600SemiBold' }}
                >
                  {t('notifications.noNotifications')}
                </Text>
                <Text
                  className="text-sm text-gray-500 mt-2 text-center px-8"
                  style={{ fontFamily: 'Cairo_400Regular' }}
                >
                  {t('notifications.noNotificationsSub')}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}
