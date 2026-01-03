import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  Layout,
} from 'react-native-reanimated';
import {
  Bell,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Megaphone,
  Star,
  Heart,
  X,
} from 'lucide-react-native';
import {
  Announcement,
  useHomepageAnnouncements,
  getAnnouncementColors,
  getPriorityBadgeStyle,
  getDismissedAnnouncements,
  dismissAnnouncement,
} from '@/lib/api/announcements';
import { useTranslation, useLanguageStore } from '@/lib/i18n';

interface AnnouncementBannerProps {
  showOnHomePage?: boolean;
  maxAnnouncements?: number;
}

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  bell: Bell,
  info: Info,
  'alert-triangle': AlertTriangle,
  'check-circle': CheckCircle,
  'x-circle': XCircle,
  megaphone: Megaphone,
  star: Star,
  heart: Heart,
};

function AnnouncementCard({
  announcement,
  onDismiss,
  isRTL,
  t,
}: {
  announcement: Announcement;
  onDismiss: (id: string) => void;
  isRTL: boolean;
  t: (key: string) => string;
}) {
  const colors = getAnnouncementColors(announcement);
  const priorityStyle = getPriorityBadgeStyle(announcement.priority);
  const IconComponent = ICON_MAP[announcement.icon_name] || Bell;

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      exiting={FadeOutUp.duration(200)}
      layout={Layout.springify()}
      style={{
        backgroundColor: colors.backgroundColor,
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
      }}
    >
      {/* Header */}
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center flex-1">
          {/* Icon */}
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.borderColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconComponent size={18} color={colors.textColor} />
          </View>

          {/* Title & Priority */}
          <View className="flex-1 ml-3">
            <View className="flex-row items-center">
              <Text
                className="text-sm font-bold flex-1"
                style={{
                  fontFamily: 'Cairo_700Bold',
                  color: colors.textColor,
                  textAlign: isRTL ? 'right' : 'left',
                }}
                numberOfLines={1}
              >
                {announcement.title}
              </Text>
              {announcement.priority !== 'normal' && (
                <View
                  style={{
                    backgroundColor: priorityStyle.backgroundColor,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    marginLeft: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Cairo_600SemiBold',
                      fontSize: 10,
                      color: priorityStyle.textColor,
                    }}
                  >
                    {t(`announcements.${announcement.priority}`)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Dismiss button */}
        <Pressable
          onPress={() => onDismiss(announcement.id)}
          className="p-1 -mr-1 active:opacity-60"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={18} color={colors.textColor} />
        </Pressable>
      </View>

      {/* Content */}
      <Text
        className="text-sm mt-2 ml-11"
        style={{
          fontFamily: 'Cairo_400Regular',
          color: colors.textColor,
          textAlign: isRTL ? 'right' : 'left',
          lineHeight: 20,
        }}
        numberOfLines={3}
      >
        {announcement.content}
      </Text>

      {/* Footer - Date info */}
      <View className="flex-row items-center mt-2 ml-11">
        <Text
          style={{
            fontFamily: 'Cairo_400Regular',
            fontSize: 11,
            color: colors.textColor,
            opacity: 0.7,
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {t('announcements.posted')} {formatDate(announcement.created_at)}
        </Text>
        {announcement.expires_at && (
          <Text
            style={{
              fontFamily: 'Cairo_400Regular',
              fontSize: 11,
              color: colors.textColor,
              opacity: 0.7,
              marginLeft: 12,
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            • {t('announcements.expires')} {formatDate(announcement.expires_at)}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

export default function AnnouncementBanner({
  showOnHomePage = true,
  maxAnnouncements = 2,
}: AnnouncementBannerProps) {
  const { t } = useTranslation();
  const isRTL = useLanguageStore(s => s.isRTL);

  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Fetch announcements
  const { data: announcements = [], isLoading } = useHomepageAnnouncements(maxAnnouncements + 5); // Fetch extra to account for dismissed

  // Load dismissed announcements on mount
  useEffect(() => {
    getDismissedAnnouncements().then(setDismissedIds);
  }, []);

  // Handle dismiss
  const handleDismiss = useCallback(async (id: string) => {
    await dismissAnnouncement(id);
    setDismissedIds(prev => [...prev, id]);
  }, []);

  // Filter out dismissed announcements
  const visibleAnnouncements = announcements
    .filter(a => !dismissedIds.includes(a.id))
    .slice(0, maxAnnouncements);

  // Don't render if loading or no announcements
  if (isLoading || visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <View className="px-4 mb-4">
      {visibleAnnouncements.map(announcement => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
          onDismiss={handleDismiss}
          isRTL={isRTL}
          t={t}
        />
      ))}
    </View>
  );
}
