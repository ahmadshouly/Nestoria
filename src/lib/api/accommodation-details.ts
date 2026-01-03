import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

export interface AccommodationDetail {
  id: string;
  title: string;
  description: string;
  location: string;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  property_type: string;
  amenities: string[];
  images: string[];
  main_image_url: string | null;
  featured: boolean;
  host_id: string;
  latitude?: number;
  longitude?: number;
  house_rules?: {
    presets: string[];
    notes: string;
  };
  cancellation_policy_id?: string;
  show_exact_location?: boolean;
  min_stay: number;
  max_stay?: number;
  cleaning_fee: number;
  offline_payment_enabled?: boolean;
  status: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    created_at: string;
  };
}

export interface Review {
  id: string;
  overall_rating: number;
  cleanliness_rating?: number;
  accuracy_rating?: number;
  communication_rating?: number;
  location_rating?: number;
  value_rating?: number;
  check_in_rating?: number;
  title?: string;
  comment?: string;
  photos?: string[];
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface CancellationPolicy {
  id: string;
  name: string;
  description: string;
  scope: string;
  rules?: CancellationPolicyRule[];
}

export interface CancellationPolicyRule {
  id: string;
  policy_id: string;
  min_hours_before_checkin: number;
  refund_percentage: number;
  fee_percentage: number;
  fee_flat: number;
  priority: number;
}

// Fetch single accommodation with host details
export function useAccommodationDetail(accommodationId: string | undefined) {
  return useQuery({
    queryKey: ['accommodation', accommodationId],
    queryFn: async (): Promise<AccommodationDetail | null> => {
      if (!accommodationId) return null;

      console.log('🏠 Fetching accommodation:', accommodationId);

      const { data, error } = await supabase
        .from('accommodations')
        .select(`
          *,
          profiles!host_id(id, full_name, avatar_url, created_at)
        `)
        .eq('id', accommodationId)
        .single();

      if (error) {
        console.error('❌ Accommodation fetch error:', error);
        throw error;
      }

      console.log('✅ Accommodation loaded:', data?.title);
      return data;
    },
    enabled: !!accommodationId,
  });
}

// Fetch accommodation reviews
export function useAccommodationReviews(accommodationId: string | undefined) {
  return useQuery({
    queryKey: ['accommodation-reviews', accommodationId],
    queryFn: async (): Promise<Review[]> => {
      if (!accommodationId) return [];

      const { data, error } = await supabase
        .from('property_reviews')
        .select(`
          *,
          profiles!reviewer_id(full_name, avatar_url)
        `)
        .eq('accommodation_id', accommodationId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Reviews fetch error:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!accommodationId,
  });
}

// Fetch cancellation policy with rules
export function useCancellationPolicy(policyId: string | undefined) {
  return useQuery({
    queryKey: ['cancellation-policy', policyId],
    queryFn: async (): Promise<CancellationPolicy | null> => {
      if (!policyId) return null;

      // Fetch the policy
      const { data: policy, error: policyError } = await supabase
        .from('cancellation_policies')
        .select('*')
        .eq('id', policyId)
        .eq('active', true)
        .single();

      if (policyError) {
        console.error('❌ Policy fetch error:', policyError);
        return null;
      }

      // Fetch the rules for this policy
      const { data: rules, error: rulesError } = await supabase
        .from('cancellation_policy_rules')
        .select('*')
        .eq('policy_id', policyId)
        .order('min_hours_before_checkin', { ascending: true });

      if (rulesError) {
        console.error('❌ Policy rules fetch error:', rulesError);
      }

      return {
        ...policy,
        rules: rules || []
      };
    },
    enabled: !!policyId,
  });
}

// Check if accommodation is in wishlist
export function useAccommodationWishlistStatus(
  accommodationId: string | undefined,
  userId: string | undefined
) {
  return useQuery({
    queryKey: ['wishlist-status', 'accommodation', accommodationId, userId],
    queryFn: async (): Promise<boolean> => {
      if (!accommodationId || !userId) return false;

      const { data, error } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', userId)
        .eq('accommodation_id', accommodationId)
        .maybeSingle();

      // PGRST116 = no rows, not an error
      if (error && error.code !== 'PGRST116') {
        console.error('❌ Wishlist check error:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!accommodationId && !!userId,
  });
}

// Toggle accommodation in wishlist
export function useToggleAccommodationWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accommodationId,
      userId,
      isCurrentlyInWishlist
    }: {
      accommodationId: string;
      userId: string;
      isCurrentlyInWishlist: boolean;
    }) => {
      if (isCurrentlyInWishlist) {
        // Remove from wishlist
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', userId)
          .eq('accommodation_id', accommodationId);

        if (error) throw error;
        return false;
      } else {
        // Add to wishlist
        const { error } = await supabase
          .from('wishlists')
          .insert({
            user_id: userId,
            accommodation_id: accommodationId
          });

        if (error) throw error;
        return true;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['wishlist-status', 'accommodation', variables.accommodationId]
      });
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
    },
  });
}

// Calculate average rating from reviews
export function calculateAverageRating(reviews: { overall_rating: number }[]): number | null {
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, review) => sum + review.overall_rating, 0);
  return Number((total / reviews.length).toFixed(1));
}

// Format cancellation rule for display
export function formatCancellationRule(rule: CancellationPolicyRule): string {
  if (rule.min_hours_before_checkin > 0) {
    const hours = rule.min_hours_before_checkin;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    let timeText = '';
    if (days > 0) {
      timeText = `${days} day${days > 1 ? 's' : ''}`;
      if (remainingHours > 0) {
        timeText += ` ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
      }
    } else {
      timeText = `${hours} hour${hours > 1 ? 's' : ''}`;
    }

    let text = `Cancel ${timeText} before check-in: ${rule.refund_percentage}% refund`;

    if (rule.fee_flat > 0 || rule.fee_percentage > 0) {
      text += ` (minus $${rule.fee_flat}`;
      if (rule.fee_percentage > 0) {
        text += ` + ${rule.fee_percentage}% fee`;
      }
      text += ')';
    }

    return text;
  } else {
    return `Cancel after check-in: ${rule.refund_percentage}% refund`;
  }
}

// Get display coordinates (with random offset if exact location is hidden)
export function getDisplayCoordinates(
  latitude: number,
  longitude: number,
  showExactLocation: boolean = false
): { latitude: number; longitude: number } {
  if (showExactLocation) {
    return { latitude, longitude };
  }

  // Add random offset (approximately 200-500 meters)
  const latOffset = (Math.random() - 0.5) * 0.008;
  const lonOffset = (Math.random() - 0.5) * 0.008;

  return {
    latitude: latitude + latOffset,
    longitude: longitude + lonOffset
  };
}
