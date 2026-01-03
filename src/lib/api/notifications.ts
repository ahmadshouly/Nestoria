import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

// Types
export type NotificationType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_pending'
  | 'booking_rejected'
  | 'review_request'
  | 'review_received'
  | 'review_submitted'
  | 'message_received'
  | 'payment_received'
  | 'payment_failed'
  | 'property_approved'
  | 'property_rejected'
  | 'property_featured'
  | 'account_verified'
  | 'account_suspended'
  | 'welcome'
  | 'document_uploaded'
  | 'document_approved'
  | 'document_rejected'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'promo_code'
  | 'system_maintenance'
  | 'new_feature'
  | 'security_alert'
  | 'reminder'
  | 'rating_received'
  | 'admin_notification';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: {
    booking_id?: string;
    property_id?: string;
    conversation_id?: string;
    url?: string;
    [key: string]: any;
  };
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_bookings: boolean;
  email_messages: boolean;
  email_reviews: boolean;
  email_promotions: boolean;
  push_bookings: boolean;
  push_messages: boolean;
  push_reviews: boolean;
  push_promotions: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch user notifications
export function useNotifications(limit: number = 50) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications', limit],
    queryFn: async (): Promise<Notification[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching notifications:', error);
        throw error;
      }

      return data || [];
    },
  });

  // Real-time subscription for notifications
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🔔 Setting up real-time subscription for notifications...');

      // Subscribe to changes in notifications table for this user
      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('🔔 Notification change detected:', payload);
            // Refetch notifications and unread count immediately
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
          }
        )
        .subscribe();

      return channel;
    };

    let channelPromise = setupSubscription();

    return () => {
      console.log('🔔 Cleaning up notifications subscription');
      channelPromise.then((channel) => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
    };
  }, [queryClient]);

  return query;
}

// Fetch unread count
export function useUnreadNotificationCount() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async (): Promise<number> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('❌ Error fetching unread count:', error);
        return 0;
      }

      return count || 0;
    },
  });

  // Real-time subscription for unread count updates
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🔔 Setting up real-time subscription for unread count...');

      // Subscribe to notification changes to update unread count
      const channel = supabase
        .channel('notifications-unread-count')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('🔔 Unread count change detected:', payload);
            // Refetch unread count immediately
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
          }
        )
        .subscribe();

      return channel;
    };

    let channelPromise = setupSubscription();

    return () => {
      console.log('🔔 Cleaning up unread count subscription');
      channelPromise.then((channel) => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
    };
  }, [queryClient]);

  return query;
}

// Mark single notification as read
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

// Mark all notifications as read
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

// Delete notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

// Fetch notification preferences
export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async (): Promise<NotificationPreferences | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching notification preferences:', error);
        return null;
      }

      return data;
    },
  });
}

// Update notification preference
export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      value,
    }: {
      key: keyof Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
      value: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if preferences exist
      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('notification_preferences')
          .update({ [key]: value, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new with default values
        const { error } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            email_bookings: true,
            email_messages: true,
            email_reviews: true,
            email_promotions: false,
            push_bookings: true,
            push_messages: true,
            push_reviews: true,
            push_promotions: false,
            [key]: value,
          });

        if (error) throw error;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}

// Real-time subscription hook
export function useNotificationSubscription(
  onNewNotification?: (notification: Notification) => void
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            console.log('🔔 New notification received:', newNotification.title);

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });

            // Call callback if provided
            onNewNotification?.(newNotification);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient, onNewNotification]);
}

// Helper to get notification icon and color based on type
export function getNotificationStyle(type: NotificationType): {
  iconName: string;
  color: string;
  bgColor: string;
} {
  switch (type) {
    // Success
    case 'booking_confirmed':
    case 'property_approved':
    case 'account_verified':
    case 'document_approved':
    case 'kyc_approved':
      return { iconName: 'check-circle', color: '#10B981', bgColor: '#D1FAE5' };

    // Error
    case 'booking_cancelled':
    case 'booking_rejected':
    case 'property_rejected':
    case 'payment_failed':
    case 'account_suspended':
    case 'document_rejected':
    case 'kyc_rejected':
      return { iconName: 'x-circle', color: '#EF4444', bgColor: '#FEE2E2' };

    // Warning
    case 'booking_pending':
    case 'security_alert':
    case 'reminder':
      return { iconName: 'alert-triangle', color: '#F59E0B', bgColor: '#FEF3C7' };

    // Messages
    case 'message_received':
      return { iconName: 'message-square', color: '#3B82F6', bgColor: '#DBEAFE' };

    // Reviews
    case 'review_request':
    case 'review_received':
    case 'review_submitted':
    case 'rating_received':
      return { iconName: 'star', color: '#F59E0B', bgColor: '#FEF3C7' };

    // Payments
    case 'payment_received':
      return { iconName: 'credit-card', color: '#10B981', bgColor: '#D1FAE5' };

    // Property
    case 'property_featured':
      return { iconName: 'home', color: '#8B5CF6', bgColor: '#EDE9FE' };

    // Welcome/Promo
    case 'welcome':
    case 'promo_code':
    case 'new_feature':
      return { iconName: 'gift', color: '#EC4899', bgColor: '#FCE7F3' };

    // System
    case 'system_maintenance':
    case 'admin_notification':
      return { iconName: 'info', color: '#6B7280', bgColor: '#F3F4F6' };

    default:
      return { iconName: 'bell', color: '#6B7280', bgColor: '#F3F4F6' };
  }
}
