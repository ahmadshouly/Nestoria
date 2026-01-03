import { supabase } from '../supabase';
import { NotificationType } from './notifications';

interface SendNotificationParams {
  userId: string;
  title: string;
  content: string;
  type: NotificationType;
  data?: Record<string, any>;
}

export const NotificationService = {
  // Send a single notification
  async sendNotification({
    userId,
    title,
    content,
    type,
    data,
  }: SendNotificationParams): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        title,
        content,
        type,
        data: data || {},
        is_read: false,
      });

      if (error) {
        console.error('❌ Error sending notification:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Notification sent:', title);
      return { success: true };
    } catch (err: any) {
      console.error('❌ Exception sending notification:', err);
      return { success: false, error: err.message };
    }
  },

  // Send bulk notifications
  async sendBulkNotifications(
    notifications: SendNotificationParams[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const records = notifications.map((n) => ({
        user_id: n.userId,
        title: n.title,
        content: n.content,
        type: n.type,
        data: n.data || {},
        is_read: false,
      }));

      const { error } = await supabase.from('notifications').insert(records);

      if (error) {
        console.error('❌ Error sending bulk notifications:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ ${notifications.length} notifications sent`);
      return { success: true };
    } catch (err: any) {
      console.error('❌ Exception sending bulk notifications:', err);
      return { success: false, error: err.message };
    }
  },

  // Booking notifications
  async sendBookingConfirmation(
    userId: string,
    bookingId: string,
    propertyTitle: string,
    confirmationNumber: string
  ) {
    return this.sendNotification({
      userId,
      title: 'Booking Confirmed!',
      content: `Your booking for "${propertyTitle}" has been confirmed. Confirmation #${confirmationNumber}`,
      type: 'booking_confirmed',
      data: { booking_id: bookingId, url: `/booking/${bookingId}` },
    });
  },

  async sendBookingCancellation(
    userId: string,
    bookingId: string,
    propertyTitle: string
  ) {
    return this.sendNotification({
      userId,
      title: 'Booking Cancelled',
      content: `Your booking for "${propertyTitle}" has been cancelled.`,
      type: 'booking_cancelled',
      data: { booking_id: bookingId, url: `/booking/${bookingId}` },
    });
  },

  async sendBookingPending(
    userId: string,
    bookingId: string,
    propertyTitle: string
  ) {
    return this.sendNotification({
      userId,
      title: 'Booking Pending Approval',
      content: `Your booking request for "${propertyTitle}" is pending host approval.`,
      type: 'booking_pending',
      data: { booking_id: bookingId, url: `/booking/${bookingId}` },
    });
  },

  async sendBookingRejected(
    userId: string,
    bookingId: string,
    propertyTitle: string,
    reason?: string
  ) {
    return this.sendNotification({
      userId,
      title: 'Booking Rejected',
      content: reason
        ? `Your booking for "${propertyTitle}" was rejected: ${reason}`
        : `Your booking for "${propertyTitle}" was rejected by the host.`,
      type: 'booking_rejected',
      data: { booking_id: bookingId, url: `/booking/${bookingId}` },
    });
  },

  // Review notifications
  async sendReviewRequest(
    userId: string,
    propertyTitle: string,
    bookingId: string
  ) {
    return this.sendNotification({
      userId,
      title: 'Share Your Experience',
      content: `How was your stay at "${propertyTitle}"? Leave a review to help other travelers.`,
      type: 'review_request',
      data: { booking_id: bookingId, url: `/booking/${bookingId}` },
    });
  },

  async sendReviewReceived(
    hostId: string,
    guestName: string,
    propertyTitle: string,
    rating: number
  ) {
    return this.sendNotification({
      userId: hostId,
      title: 'New Review Received',
      content: `${guestName} left a ${rating}-star review for "${propertyTitle}".`,
      type: 'review_received',
      data: { rating },
    });
  },

  // Message notifications
  async sendMessageReceived(
    userId: string,
    senderName: string,
    conversationId: string,
    propertyTitle?: string
  ) {
    return this.sendNotification({
      userId,
      title: 'New Message',
      content: propertyTitle
        ? `${senderName} sent you a message about "${propertyTitle}".`
        : `${senderName} sent you a new message.`,
      type: 'message_received',
      data: { conversation_id: conversationId, url: `/chat/${conversationId}` },
    });
  },

  // Payment notifications
  async sendPaymentReceived(
    userId: string,
    amount: number,
    bookingId: string,
    propertyTitle: string
  ) {
    return this.sendNotification({
      userId,
      title: 'Payment Received',
      content: `Payment of $${amount.toFixed(2)} received for "${propertyTitle}".`,
      type: 'payment_received',
      data: { booking_id: bookingId, amount },
    });
  },

  async sendPaymentFailed(
    userId: string,
    amount: number,
    bookingId: string,
    propertyTitle: string
  ) {
    return this.sendNotification({
      userId,
      title: 'Payment Failed',
      content: `Payment of $${amount.toFixed(2)} for "${propertyTitle}" failed. Please try again.`,
      type: 'payment_failed',
      data: { booking_id: bookingId, amount, url: `/booking/${bookingId}` },
    });
  },

  // Property notifications
  async sendPropertyApproved(
    userId: string,
    propertyTitle: string,
    propertyId: string,
    propertyType: 'accommodation' | 'vehicle'
  ) {
    return this.sendNotification({
      userId,
      title: 'Property Approved!',
      content: `Your listing "${propertyTitle}" has been approved and is now live.`,
      type: 'property_approved',
      data: {
        property_id: propertyId,
        property_type: propertyType,
        url: `/${propertyType}/${propertyId}`,
      },
    });
  },

  async sendPropertyRejected(
    userId: string,
    propertyTitle: string,
    reason?: string
  ) {
    return this.sendNotification({
      userId,
      title: 'Property Rejected',
      content: reason
        ? `Your listing "${propertyTitle}" was rejected: ${reason}`
        : `Your listing "${propertyTitle}" was rejected. Please review and resubmit.`,
      type: 'property_rejected',
      data: {},
    });
  },

  // Account notifications
  async sendWelcome(userId: string, userName: string) {
    return this.sendNotification({
      userId,
      title: 'Welcome to Nestoria!',
      content: `Hi ${userName}! Welcome to Nestoria. Start exploring amazing stays and rentals.`,
      type: 'welcome',
      data: {},
    });
  },

  async sendAccountVerified(userId: string) {
    return this.sendNotification({
      userId,
      title: 'Account Verified',
      content: 'Your account has been verified. You now have full access to all features.',
      type: 'account_verified',
      data: {},
    });
  },

  async sendSecurityAlert(userId: string, alertType: string, details?: string) {
    return this.sendNotification({
      userId,
      title: 'Security Alert',
      content: details || `Security alert: ${alertType}. Please review your account settings.`,
      type: 'security_alert',
      data: { alert_type: alertType },
    });
  },

  // Promo notifications
  async sendPromoCode(
    userId: string,
    promoCode: string,
    discount: string,
    expiryDate?: string
  ) {
    return this.sendNotification({
      userId,
      title: 'Special Offer!',
      content: expiryDate
        ? `Use code ${promoCode} for ${discount} off your next booking. Expires ${expiryDate}.`
        : `Use code ${promoCode} for ${discount} off your next booking.`,
      type: 'promo_code',
      data: { promo_code: promoCode, discount },
    });
  },

  // System notifications
  async sendSystemMaintenance(
    userIds: string[],
    startTime: string,
    endTime: string
  ) {
    const notifications = userIds.map((userId) => ({
      userId,
      title: 'Scheduled Maintenance',
      content: `Nestoria will be undergoing maintenance from ${startTime} to ${endTime}. Some features may be unavailable.`,
      type: 'system_maintenance' as NotificationType,
      data: { start_time: startTime, end_time: endTime },
    }));

    return this.sendBulkNotifications(notifications);
  },
};
