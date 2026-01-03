import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { Review } from './accommodation-details';

export interface VehicleDetail {
  id: string;
  title: string;
  description: string;
  location: string;
  price_per_day: number;
  vehicle_type: string;
  brand: string;
  model: string;
  year: number;
  fuel_type: string;
  transmission: string;
  seats: number;
  doors?: number;
  luggage_capacity?: number;
  features: string[];
  images: string[];
  main_image_url: string | null;
  featured: boolean;
  owner_id: string;
  latitude?: number;
  longitude?: number;
  show_exact_location?: boolean;
  insurance_included?: boolean;
  mileage_limit?: number;
  extra_mileage_rate?: number;
  min_driver_age?: number;
  license_requirements?: string;
  cleaning_fee?: number;
  status: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    created_at: string;
  };
}

// Fetch single vehicle with owner details
export function useVehicleDetail(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: async (): Promise<VehicleDetail | null> => {
      if (!vehicleId) return null;

      console.log('🚗 Fetching vehicle:', vehicleId);

      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          profiles!owner_id(id, full_name, avatar_url, created_at)
        `)
        .eq('id', vehicleId)
        .single();

      if (error) {
        console.error('❌ Vehicle fetch error:', error);
        throw error;
      }

      console.log('✅ Vehicle loaded:', data?.title);
      return data;
    },
    enabled: !!vehicleId,
  });
}

// Fetch vehicle reviews
export function useVehicleReviews(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle-reviews', vehicleId],
    queryFn: async (): Promise<Review[]> => {
      if (!vehicleId) return [];

      const { data, error } = await supabase
        .from('property_reviews')
        .select(`
          *,
          profiles!reviewer_id(full_name, avatar_url)
        `)
        .eq('vehicle_id', vehicleId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Reviews fetch error:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!vehicleId,
  });
}

// Check if vehicle is in wishlist
export function useVehicleWishlistStatus(
  vehicleId: string | undefined,
  userId: string | undefined
) {
  return useQuery({
    queryKey: ['wishlist-status', 'vehicle', vehicleId, userId],
    queryFn: async (): Promise<boolean> => {
      if (!vehicleId || !userId) return false;

      const { data, error } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', userId)
        .eq('vehicle_id', vehicleId)
        .maybeSingle();

      // PGRST116 = no rows, not an error
      if (error && error.code !== 'PGRST116') {
        console.error('❌ Wishlist check error:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!vehicleId && !!userId,
  });
}

// Toggle vehicle in wishlist
export function useToggleVehicleWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vehicleId,
      userId,
      isCurrentlyInWishlist
    }: {
      vehicleId: string;
      userId: string;
      isCurrentlyInWishlist: boolean;
    }) => {
      if (isCurrentlyInWishlist) {
        // Remove from wishlist
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', userId)
          .eq('vehicle_id', vehicleId);

        if (error) throw error;
        return false;
      } else {
        // Add to wishlist
        const { error } = await supabase
          .from('wishlists')
          .insert({
            user_id: userId,
            vehicle_id: vehicleId
          });

        if (error) throw error;
        return true;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['wishlist-status', 'vehicle', variables.vehicleId]
      });
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
    },
  });
}
