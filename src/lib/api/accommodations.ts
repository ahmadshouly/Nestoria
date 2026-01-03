import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase, type Accommodation } from '../supabase';

interface AccommodationFilters {
  cityId?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minGuests?: number;
  maxGuests?: number;
  bedrooms?: number;
  minBedrooms?: number;
  bathrooms?: number;
  minBathrooms?: number;
  propertyType?: string;
  amenities?: string[];
  isSuperhost?: boolean;
  searchQuery?: string;
  featured?: boolean;
}

// Fetch accommodations with filters
export function useAccommodations(filters?: AccommodationFilters) {
  return useQuery({
    queryKey: ['accommodations', filters],
    queryFn: async () => {
      console.log('🏠 Fetching accommodations with filters:', filters);

      let query = supabase
        .from('accommodations')
        .select(`
          *,
          profiles!host_id(id, full_name, avatar_url),
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
        query = query.gte('price_per_night', filters.minPrice);
      }
      if (filters?.maxPrice !== undefined) {
        query = query.lte('price_per_night', filters.maxPrice);
      }

      // Guest capacity filter
      if (filters?.minGuests !== undefined) {
        query = query.gte('max_guests', filters.minGuests);
      }
      if (filters?.maxGuests !== undefined) {
        query = query.lte('max_guests', filters.maxGuests);
      }

      // Property type filter
      if (filters?.propertyType) {
        query = query.eq('property_type', filters.propertyType);
      }

      // Bedroom filter
      if (filters?.bedrooms !== undefined) {
        query = query.eq('bedrooms', filters.bedrooms);
      }
      if (filters?.minBedrooms !== undefined) {
        query = query.gte('bedrooms', filters.minBedrooms);
      }

      // Bathroom filter
      if (filters?.bathrooms !== undefined) {
        query = query.eq('bathrooms', filters.bathrooms);
      }
      if (filters?.minBathrooms !== undefined) {
        query = query.gte('bathrooms', filters.minBathrooms);
      }

      // Superhost filter
      if (filters?.isSuperhost === true) {
        query = query.eq('is_superhost', true);
      }

      // Amenities filter (any of the selected amenities)
      if (filters?.amenities && filters.amenities.length > 0) {
        query = query.overlaps('amenities', filters.amenities);
      }

      // Featured filter
      if (filters?.featured !== undefined) {
        query = query.eq('featured', filters.featured);
      }

      // Search query (title and location)
      if (filters?.searchQuery) {
        query = query.or(`title.ilike.%${filters.searchQuery}%,location.ilike.%${filters.searchQuery}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      console.log('📦 Accommodations response:', { count: data?.length || 0, error });

      if (error) {
        console.error('❌ Accommodations error:', error);
        throw error;
      }

      // Get average ratings for each accommodation
      const accommodationsWithRatings = await Promise.all(
        (data || []).map(async (accommodation) => {
          const { data: reviews } = await supabase
            .from('reviews')
            .select('overall_rating')
            .eq('accommodation_id', accommodation.id);

          const averageRating = reviews && reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length
            : 0;

          // Fetch pricing rules
          const { data: pricingRules } = await supabase
            .from('supplier_pricing_rules')
            .select('*')
            .eq('accommodation_id', accommodation.id)
            .eq('is_active', true)
            .order('priority', { ascending: false });

          // Fetch room data for hotels/resorts
          let lowestRoomPrice = null;
          let hasRooms = false;
          if (accommodation.property_type === 'hotel' || accommodation.property_type === 'resort') {
            const { data: rooms } = await supabase
              .from('rooms')
              .select('price_per_night')
              .eq('accommodation_id', accommodation.id)
              .eq('is_available', true)
              .order('price_per_night', { ascending: true })
              .limit(1);

            if (rooms && rooms.length > 0) {
              lowestRoomPrice = rooms[0].price_per_night;
              hasRooms = true;
            }
          }

          return {
            ...accommodation,
            average_rating: averageRating,
            review_count: reviews?.length || 0,
            pricing_rules: pricingRules || [],
            lowest_room_price: lowestRoomPrice,
            has_rooms: hasRooms,
          };
        })
      );

      return accommodationsWithRatings;
    },
  });
}

// Fetch single accommodation
export function useAccommodation(id: string | undefined) {
  return useQuery({
    queryKey: ['accommodation', id],
    queryFn: async () => {
      if (!id) throw new Error('Accommodation ID is required');

      const { data, error } = await supabase
        .from('accommodations')
        .select(`
          *,
          profiles!host_id(id, full_name, avatar_url, phone, email),
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
        .eq('accommodation_id', id)
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

// Fetch featured accommodations
export function useFeaturedAccommodations() {
  return useAccommodations({ featured: true });
}

// Search accommodations
export function useSearchAccommodations(searchQuery: string) {
  return useAccommodations({ searchQuery });
}

// Check availability
export function useCheckAvailability() {
  return useMutation({
    mutationFn: async ({
      accommodationId,
      roomId,
      checkIn,
      checkOut,
    }: {
      accommodationId: string;
      roomId?: string;
      checkIn: string;
      checkOut: string;
    }) => {
      let query = supabase
        .from('bookings')
        .select('id')
        .eq('accommodation_id', accommodationId)
        .eq('status', 'confirmed')
        .or(`check_in.lte.${checkOut},check_out.gte.${checkIn}`);

      if (roomId) {
        query = query.eq('room_id', roomId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        isAvailable: !data || data.length === 0,
        conflictingBookings: data?.length || 0,
      };
    },
  });
}

// Get accommodation reviews
export function useAccommodationReviews(accommodationId: string) {
  return useQuery({
    queryKey: ['accommodation', accommodationId, 'reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles!user_id(id, full_name, avatar_url),
          review_answers(
            *,
            review_questions(id, question, category)
          )
        `)
        .eq('accommodation_id', accommodationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!accommodationId,
  });
}

// Create accommodation (for suppliers)
export function useCreateAccommodation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accommodation: Partial<Accommodation>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('accommodations')
        .insert({
          ...accommodation,
          host_id: user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
}

// Update accommodation
export function useUpdateAccommodation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Accommodation>;
    }) => {
      const { data, error } = await supabase
        .from('accommodations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['accommodation', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
}

// Delete accommodation
export function useDeleteAccommodation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accommodations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations'] });
    },
  });
}
