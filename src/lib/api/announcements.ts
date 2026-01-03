import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export type AnnouncementType = 'info' | 'warning' | 'success' | 'error';
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TargetAudience = 'suppliers' | 'clients' | 'all';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  target_audience: TargetAudience;
  is_active: boolean;
  show_on_dashboard: boolean;
  show_on_homepage: boolean;
  starts_at: string;
  expires_at: string | null;
  background_color: string;
  text_color: string;
  border_color: string;
  icon_name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Preset colors by type
export const ANNOUNCEMENT_TYPE_COLORS = {
  info: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },    // Blue
  warning: { bg: '#fef3c7', text: '#d97706', border: '#fcd34d' }, // Yellow
  success: { bg: '#d1fae5', text: '#059669', border: '#6ee7b7' }, // Green
  error: { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },   // Red
};

// Available icons
export const ANNOUNCEMENT_ICONS = [
  'bell',
  'info',
  'alert-triangle',
  'check-circle',
  'x-circle',
  'megaphone',
  'star',
  'heart',
] as const;

// Storage key for dismissed announcements
const DISMISSED_ANNOUNCEMENTS_KEY = 'dismissedAnnouncements';

// Get dismissed announcements from storage
export async function getDismissedAnnouncements(): Promise<string[]> {
  try {
    const dismissed = await AsyncStorage.getItem(DISMISSED_ANNOUNCEMENTS_KEY);
    return dismissed ? JSON.parse(dismissed) : [];
  } catch (error) {
    console.error('Error loading dismissed announcements:', error);
    return [];
  }
}

// Dismiss an announcement
export async function dismissAnnouncement(announcementId: string): Promise<void> {
  try {
    const dismissed = await getDismissedAnnouncements();
    if (!dismissed.includes(announcementId)) {
      dismissed.push(announcementId);
      await AsyncStorage.setItem(DISMISSED_ANNOUNCEMENTS_KEY, JSON.stringify(dismissed));
    }
  } catch (error) {
    console.error('Error dismissing announcement:', error);
  }
}

// Clear all dismissed announcements (useful for testing)
export async function clearDismissedAnnouncements(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DISMISSED_ANNOUNCEMENTS_KEY);
  } catch (error) {
    console.error('Error clearing dismissed announcements:', error);
  }
}

// Fetch homepage announcements (for visitors/clients)
export function useHomepageAnnouncements(maxAnnouncements: number = 2) {
  return useQuery({
    queryKey: ['homepage-announcements', maxAnnouncements],
    queryFn: async (): Promise<Announcement[]> => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .eq('show_on_homepage', true)
        .in('target_audience', ['clients', 'all'])
        .lte('starts_at', now)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(maxAnnouncements);

      if (error) {
        console.error('❌ Error fetching homepage announcements:', error);
        return [];
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Fetch dashboard announcements based on user role
export function useDashboardAnnouncements(
  userRole: 'supplier' | 'user' | 'admin' | null,
  maxAnnouncements: number = 3
) {
  return useQuery({
    queryKey: ['dashboard-announcements', userRole, maxAnnouncements],
    queryFn: async (): Promise<Announcement[]> => {
      const now = new Date().toISOString();

      let query = supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .eq('show_on_dashboard', true)
        .lte('starts_at', now)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      // Filter by role
      if (userRole === 'supplier') {
        query = query.in('target_audience', ['suppliers', 'all']);
      } else if (userRole === 'user') {
        // Regular users/clients
        query = query.in('target_audience', ['clients', 'all']);
      }
      // Admins see all announcements - no additional filter

      const { data, error } = await query.limit(maxAnnouncements);

      if (error) {
        console.error('❌ Error fetching dashboard announcements:', error);
        return [];
      }

      return data || [];
    },
    enabled: userRole !== null,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Get icon color based on type or custom colors
export function getAnnouncementColors(announcement: Announcement): {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
} {
  // If custom colors are set (not defaults), use them
  const hasCustomColors =
    announcement.background_color !== '#f8fafc' ||
    announcement.text_color !== '#334155' ||
    announcement.border_color !== '#e2e8f0';

  if (hasCustomColors) {
    return {
      backgroundColor: announcement.background_color,
      textColor: announcement.text_color,
      borderColor: announcement.border_color,
    };
  }

  // Otherwise, use preset colors based on type
  const preset = ANNOUNCEMENT_TYPE_COLORS[announcement.type];
  return {
    backgroundColor: preset.bg,
    textColor: preset.text,
    borderColor: preset.border,
  };
}

// Get priority badge styling
export function getPriorityBadgeStyle(priority: AnnouncementPriority): {
  backgroundColor: string;
  textColor: string;
} {
  switch (priority) {
    case 'urgent':
      return { backgroundColor: '#fee2e2', textColor: '#dc2626' };
    case 'high':
      return { backgroundColor: '#ffedd5', textColor: '#ea580c' };
    case 'normal':
      return { backgroundColor: '#dbeafe', textColor: '#2563eb' };
    case 'low':
    default:
      return { backgroundColor: '#f3f4f6', textColor: '#6b7280' };
  }
}
