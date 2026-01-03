import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, type Vehicle } from '../supabase';

interface VehicleFilters {
  cityId?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  vehicleType?: string;
  brand?: string;
  model?: string;
  minYear?: number;
  maxYear?: number;
  transmission?: string;
  fuelType?: string;
  minSeats?: number;
  maxSeats?: number;
  features?: string[];
  isVerified?: boolean;
  insuranceIncluded?: boolean;
  searchQuery?: string;
  featured?: boolean;
}

// Fetch vehicles with filters
export function useVehicles(filters?: VehicleFilters) {
  return useQuery({
    queryKey: ['vehicles', filters],
    queryFn: async () => {
      let query = supabase
        .from('vehicles')
        .select(`
          *,
          profiles!owner_id(id, full_name, avatar_url),
          cities(id, name, country)
        `)
        .eq('status', 'approved');

      // City filter
      if (filters?.cityId) query = query.eq('city_id', filters.cityId);

      // Location text search
      if (filters?.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      // Price range filter
      if (filters?.minPrice !== undefined) {
        query = query.gte('price_per_day', filters.minPrice);
      }
      if (filters?.maxPrice !== undefined) {
        query = query.lte('price_per_day', filters.maxPrice);
      }

      // Vehicle type filter
      if (filters?.vehicleType) {
        query = query.eq('vehicle_type', filters.vehicleType);
      }

      // Brand filter
      if (filters?.brand) {
        query = query.ilike('brand', `%${filters.brand}%`);
      }

      // Model filter
      if (filters?.model) {
        query = query.ilike('model', `%${filters.model}%`);
      }

      // Year range filter
      if (filters?.minYear !== undefined) {
        query = query.gte('year', filters.minYear);
      }
      if (filters?.maxYear !== undefined) {
        query = query.lte('year', filters.maxYear);
      }

      // Transmission filter
      if (filters?.transmission) {
        query = query.eq('transmission', filters.transmission);
      }

      // Fuel type filter
      if (filters?.fuelType) {
        query = query.eq('fuel_type', filters.fuelType);
      }

      // Seats filter
      if (filters?.minSeats !== undefined) {
        query = query.gte('seats', filters.minSeats);
      }
      if (filters?.maxSeats !== undefined) {
        query = query.lte('seats', filters.maxSeats);
      }

      // Verified owner filter
      if (filters?.isVerified === true) {
        query = query.eq('is_verified', true);
      }

      // Insurance included filter
      if (filters?.insuranceIncluded === true) {
        query = query.eq('insurance_included', true);
      }

      // Features filter (any of the selected features)
      if (filters?.features && filters.features.length > 0) {
        query = query.overlaps('features', filters.features);
      }

      // Featured filter
      if (filters?.featured !== undefined) {
        query = query.eq('featured', filters.featured);
      }

      // Search query (title, brand, model, and location)
      if (filters?.searchQuery) {
        query = query.or(`title.ilike.%${filters.searchQuery}%,brand.ilike.%${filters.searchQuery}%,model.ilike.%${filters.searchQuery}%,location.ilike.%${filters.searchQuery}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Get average ratings for each vehicle
      const vehiclesWithRatings = await Promise.all(
        (data || []).map(async (vehicle) => {
          const { data: reviews } = await supabase
            .from('reviews')
            .select('overall_rating')
            .eq('vehicle_id', vehicle.id);

          const averageRating = reviews && reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length
            : 0;

          // Fetch pricing rules
          const { data: pricingRules } = await supabase
            .from('supplier_pricing_rules')
            .select('*')
            .eq('vehicle_id', vehicle.id)
            .eq('is_active', true)
            .order('priority', { ascending: false });

          return {
            ...vehicle,
            average_rating: averageRating,
            review_count: reviews?.length || 0,
            pricing_rules: pricingRules || [],
          };
        })
      );

      return vehiclesWithRatings;
    },
  });
}

// Fetch single vehicle
export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      if (!id) throw new Error('Vehicle ID is required');

      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          profiles!owner_id(id, full_name, avatar_url, phone, email),
          cities(id, name, country)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Get reviews and average rating
      const { data: reviews } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles!user_id(id, full_name, avatar_url)
        `)
        .eq('vehicle_id', id)
        .order('created_at', { ascending: false });

      const averageRating = reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length
        : 0;

      return {
        ...data,
        average_rating: averageRating,
        review_count: reviews?.length || 0,
        reviews,
      };
    },
    enabled: !!id,
  });
}

// Fetch featured vehicles
export function useFeaturedVehicles() {
  return useVehicles({ featured: true });
}

// Check vehicle availability
export function useCheckVehicleAvailability() {
  return useMutation({
    mutationFn: async ({
      vehicleId,
      pickupDate,
      returnDate,
    }: {
      vehicleId: string;
      pickupDate: string;
      returnDate: string;
    }) => {
      const { data, error } = await supabase
        .from('vehicle_bookings')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .eq('status', 'confirmed')
        .or(`pickup_date.lte.${returnDate},return_date.gte.${pickupDate}`);

      if (error) throw error;

      return {
        isAvailable: !data || data.length === 0,
        conflictingBookings: data?.length || 0,
      };
    },
  });
}

// Get vehicle reviews
export function useVehicleReviews(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle', vehicleId, 'reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles!user_id(id, full_name, avatar_url)
        `)
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!vehicleId,
  });
}

// Create vehicle (for suppliers)
export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicle: Partial<Vehicle>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          ...vehicle,
          owner_id: user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

// Update vehicle
export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Vehicle>;
    }) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

// Delete vehicle
export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}
