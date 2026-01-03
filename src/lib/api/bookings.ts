import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase, type Booking, type VehicleBooking, type AdminFee, type AvailabilityCalendar, type Room } from '../supabase';

// Fetch admin fees for booking calculations
export function useAdminFees(appliesTo?: 'accommodation' | 'vehicle' | 'both') {
  return useQuery({
    queryKey: ['admin_fees', appliesTo],
    queryFn: async () => {
      let query = supabase
        .from('admin_fees')
        .select('*')
        .eq('is_active', true)
        .eq('calculation_type', 'booking');

      if (appliesTo && appliesTo !== 'both') {
        query = query.in('applies_to', ['both', appliesTo]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching admin fees:', error);
        return [];
      }

      return (data || []) as AdminFee[];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

// Fetch availability calendar for accommodations
export function useAccommodationAvailability(accommodationId: string | undefined, monthsAhead: number = 3) {
  return useQuery({
    queryKey: ['availability', 'accommodation', accommodationId, monthsAhead],
    queryFn: async () => {
      if (!accommodationId) return [];

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + monthsAhead);

      const { data, error } = await supabase
        .from('availability_calendar')
        .select('id, date, is_available, price_override, minimum_stay, maximum_stay')
        .eq('accommodation_id', accommodationId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date');

      if (error) {
        console.error('Error fetching accommodation availability:', error);
        return [];
      }

      return (data || []) as AvailabilityCalendar[];
    },
    enabled: !!accommodationId,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always', // Refetch when component mounts
  });
}

// Fetch availability calendar for vehicles
export function useVehicleAvailability(vehicleId: string | undefined, monthsAhead: number = 3) {
  return useQuery({
    queryKey: ['availability', 'vehicle', vehicleId, monthsAhead],
    queryFn: async () => {
      if (!vehicleId) return [];

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + monthsAhead);

      const { data, error } = await supabase
        .from('availability_calendar')
        .select('id, date, is_available, price_override, minimum_stay, maximum_stay')
        .eq('vehicle_id', vehicleId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date');

      if (error) {
        console.error('Error fetching vehicle availability:', error);
        return [];
      }

      return (data || []) as AvailabilityCalendar[];
    },
    enabled: !!vehicleId,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always', // Refetch when component mounts
  });
}

// Fetch availability calendar for a specific room
export function useRoomAvailability(roomId: string | undefined, monthsAhead: number = 3) {
  return useQuery({
    queryKey: ['availability', 'room', roomId, monthsAhead],
    queryFn: async () => {
      if (!roomId) return [];

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + monthsAhead);

      const { data, error } = await supabase
        .from('availability_calendar')
        .select('id, date, is_available, price_override, minimum_stay, maximum_stay')
        .eq('room_id', roomId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date');

      if (error) {
        console.error('Error fetching room availability:', error);
        return [];
      }

      return (data || []) as AvailabilityCalendar[];
    },
    enabled: !!roomId,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always', // Refetch when component mounts
  });
}

// Fetch rooms for a hotel/accommodation
export function useRooms(accommodationId: string | undefined) {
  return useQuery({
    queryKey: ['rooms', accommodationId],
    queryFn: async () => {
      if (!accommodationId) return [];

      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('accommodation_id', accommodationId)
        .eq('is_active', true)
        .order('room_number');

      if (error) {
        console.error('Error fetching rooms:', error);
        return [];
      }

      return (data || []) as Room[];
    },
    enabled: !!accommodationId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

// Helper function to check if a date is available
// IMPORTANT: Default behavior is that all dates are AVAILABLE
// Suppliers can explicitly mark specific dates as unavailable in the availability_calendar table
export function isDateAvailable(
  date: Date,
  availability: AvailabilityCalendar[]
): boolean {
  // If no availability calendar data exists at all, all dates are AVAILABLE by default
  if (availability.length === 0) {
    return true;
  }

  // If availability calendar exists, check if this specific date is marked
  // Use local date format to avoid timezone shifts
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const availData = availability.find(a => a.date === dateStr);

  // If date is not in calendar, it's AVAILABLE by default
  // If date is in calendar, use the is_available value
  return availData ? availData.is_available : true;
}

// Helper function to get price for a specific date (with override support)
export function getDatePrice(
  date: Date,
  basePrice: number,
  availability: AvailabilityCalendar[]
): number {
  // Use local date format to avoid timezone shifts
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const availData = availability.find(a => a.date === dateStr);
  return availData?.price_override ?? basePrice;
}

// Helper function to check if a date range is available
export function isDateRangeAvailable(
  startDate: Date,
  endDate: Date,
  availability: AvailabilityCalendar[]
): boolean {
  const currentDate = new Date(startDate);
  while (currentDate < endDate) {
    if (!isDateAvailable(currentDate, availability)) {
      return false;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return true;
}

// Helper function to calculate total price for a date range (with dynamic pricing)
export function calculateDateRangePrice(
  startDate: Date,
  endDate: Date,
  basePrice: number,
  availability: AvailabilityCalendar[]
): number {
  let total = 0;
  const currentDate = new Date(startDate);
  while (currentDate < endDate) {
    total += getDatePrice(currentDate, basePrice, availability);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return total;
}

// Helper function to calculate fees from admin_fees data
export function calculateBookingFees(
  basePrice: number,
  cleaningFee: number,
  adminFees: AdminFee[]
): { serviceFee: number; taxes: number; total: number } {
  // Get service fee rate (defaults to 0 if not found)
  const serviceFeeData = adminFees.find(fee => fee.name === 'Service Fee');
  const serviceFeeRate = serviceFeeData?.fee_type === 'percentage'
    ? serviceFeeData.amount / 100
    : 0;

  // Get tax rate (defaults to 0 if not found)
  const taxesData = adminFees.find(fee => fee.name === 'Taxes');
  const taxRate = taxesData?.fee_type === 'percentage'
    ? taxesData.amount / 100
    : 0;

  // Calculate service fee on base price
  const serviceFee = Math.round(basePrice * serviceFeeRate);

  // Calculate taxes on subtotal (base + service fee + cleaning)
  const subtotalBeforeTax = basePrice + serviceFee + cleaningFee;
  const taxes = Math.round(subtotalBeforeTax * taxRate);

  // Calculate total
  const total = basePrice + cleaningFee + serviceFee + taxes;

  return { serviceFee, taxes, total };
}

// Fetch user bookings (accommodations AND vehicles - both in same table)
export function useUserBookings(status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'approved' | 'rejected') {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['bookings', 'user', status],
    queryFn: async () => {
      console.log('📅 Fetching user bookings...');

      const { data: { user } } = await supabase.auth.getUser();

      console.log('👤 Current user:', user ? user.id : 'Not authenticated');

      if (!user) {
        console.log('⚠️ User not authenticated, returning empty array');
        return [];
      }

      // CRITICAL: Get user's profile ID (NOT auth.users.id!)
      // bookings.user_id references profiles.id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ Profile not found:', profileError);
        return [];
      }

      console.log('✅ Using profile ID:', profile.id);

      // Fetch bookings using profiles.id
      let bookingsQuery = supabase
        .from('bookings')
        .select(`
          id,
          check_in,
          check_out,
          guests,
          total_price,
          base_price,
          fees,
          taxes,
          status,
          created_at,
          confirmation_number,
          pin,
          payment_type,
          accommodation_id,
          vehicle_id,
          special_requests
        `)
        .eq('user_id', profile.id);  // Use profiles.id, NOT auth.uid!

      if (status) {
        bookingsQuery = bookingsQuery.eq('status', status);
      }

      bookingsQuery = bookingsQuery.order('created_at', { ascending: false });

      const { data: bookings, error } = await bookingsQuery;

      console.log('📦 Bookings response:', { count: bookings?.length || 0, error });

      if (error) {
        console.error('❌ Bookings error:', error);
        throw error;
      }

      if (!bookings || bookings.length === 0) {
        return [];
      }

      // Get all unique accommodation IDs and vehicle IDs
      const accommodationIds = [...new Set(bookings.map(b => b.accommodation_id).filter(Boolean))];
      const vehicleIds = [...new Set(bookings.map(b => b.vehicle_id).filter(Boolean))];

      // Fetch accommodations and vehicles in parallel
      const [accommodationsResult, vehiclesResult] = await Promise.all([
        accommodationIds.length > 0
          ? supabase
              .from('accommodations')
              .select('id, title, main_image_url, images, location, host_id')
              .in('id', accommodationIds)
          : Promise.resolve({ data: [] }),
        vehicleIds.length > 0
          ? supabase
              .from('vehicles')
              .select('id, title, location, brand, model, images, owner_id')
              .in('id', vehicleIds)
          : Promise.resolve({ data: [] })
      ]);

      // Create maps for quick lookup
      const accommodationMap = new Map(accommodationsResult.data?.map(a => [a.id, a]) || []);
      const vehicleMap = new Map(vehiclesResult.data?.map(v => [v.id, v]) || []);

      // Add accommodation and vehicle data to each booking
      const bookingsWithData = bookings.map(booking => ({
        ...booking,
        accommodations: booking.accommodation_id ? accommodationMap.get(booking.accommodation_id) : undefined,
        vehicles: booking.vehicle_id ? vehicleMap.get(booking.vehicle_id) : undefined,
      }));

      console.log('✅ Processed bookings with property data');

      return bookingsWithData;
    },
  });

  // Real-time subscription for bookings
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      console.log('🔴 Setting up real-time subscription for bookings...');

      // Subscribe to changes in bookings table for this user
      const channel = supabase
        .channel('bookings-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'bookings',
            filter: `user_id=eq.${profile.id}`,
          },
          (payload) => {
            console.log('🔴 Booking change detected:', payload);
            // Refetch bookings immediately
            queryClient.invalidateQueries({ queryKey: ['bookings', 'user'] });
          }
        )
        .subscribe();

      return channel;
    };

    let channelPromise = setupSubscription();

    return () => {
      console.log('🔴 Cleaning up bookings subscription');
      channelPromise.then((channel) => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
    };
  }, [queryClient]);

  return query;
}

// Remove the old separate vehicle bookings function since they're in the same table
export function useUserVehicleBookings(status?: 'pending' | 'confirmed' | 'cancelled' | 'completed') {
  // This function is deprecated - all bookings (accommodation AND vehicle) are in the bookings table
  // Keeping for backward compatibility but returning empty array
  return useQuery({
    queryKey: ['vehicle_bookings', 'user', status],
    queryFn: async () => {
      console.log('⚠️ useUserVehicleBookings is deprecated - use useUserBookings instead');
      return [];
    },
  });
}

// Fetch single booking
export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      if (!id) throw new Error('Booking ID is required');

      console.log('📖 Fetching booking details for ID:', id);

      // First, get the booking without joins
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single();

      if (bookingError) {
        console.error('❌ Booking fetch error:', bookingError);
        throw bookingError;
      }

      if (!booking) {
        console.error('❌ Booking not found');
        throw new Error('Booking not found');
      }

      console.log('✅ Booking found:', booking);

      // Fetch accommodation or vehicle based on what's set
      let accommodationData = null;
      let vehicleData = null;
      let hostProfile = null;

      if (booking.accommodation_id) {
        const { data: accom } = await supabase
          .from('accommodations')
          .select('id, title, main_image_url, images, location, host_id')
          .eq('id', booking.accommodation_id)
          .single();

        accommodationData = accom;

        // Fetch host profile if we have accommodation
        if (accom?.host_id) {
          const { data: host } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, phone, email')
            .eq('id', accom.host_id)
            .single();

          hostProfile = host;
        }
      }

      if (booking.vehicle_id) {
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('id, title, location, brand, model, images, owner_id')
          .eq('id', booking.vehicle_id)
          .single();

        vehicleData = vehicle;

        // Fetch owner profile if we have vehicle
        if (vehicle?.owner_id) {
          const { data: owner } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, phone, email')
            .eq('id', vehicle.owner_id)
            .single();

          hostProfile = owner;
        }
      }

      // Return combined data
      return {
        ...booking,
        accommodations: accommodationData,
        vehicles: vehicleData,
        profiles: hostProfile
      };
    },
    enabled: !!id,
  });
}

// Create accommodation booking
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (booking: {
      accommodation_id: string;
      room_id?: string;
      check_in: string;
      check_out: string;
      guests: number;
      total_price: number;
      base_price: number;
      service_fee?: number;
      cleaning_fee?: number;
      special_requests?: string;
      payment_method?: string;
    }) => {
      // First ensure we have a valid session by refreshing it
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          throw new Error('Not authenticated. Please sign in again.');
        }
      }

      // Get the current user after ensuring session is valid
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated. Please sign in again.');
      }

      console.log('Creating booking for auth user:', user.id);

      // CRITICAL: Get user's profile ID (NOT auth.users.id!)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError);
        throw new Error('User profile not found. Please complete your profile.');
      }

      console.log('Using profile ID for booking:', profile.id);

      // Get host_id from accommodation
      const { data: accommodation, error: accError } = await supabase
        .from('accommodations')
        .select('host_id, offline_payment_enabled')
        .eq('id', booking.accommodation_id)
        .single();

      if (accError) {
        console.error('Error fetching accommodation:', accError);
        throw new Error('Accommodation not found');
      }

      // Determine payment type based on accommodation setting
      const payment_type = accommodation?.offline_payment_enabled ? 'offline' : 'online';

      // Store service fee - cleaning fee is included in fees or base_price
      const service_fee = booking.service_fee || 0;
      const cleaning_fee_value = booking.cleaning_fee || 0;
      // fees column stores service fee + cleaning fee combined
      const fees = service_fee + cleaning_fee_value;
      const taxes = booking.total_price - booking.base_price - fees;

      // Remove fields that don't exist in the bookings table schema
      const { cleaning_fee, payment_method, service_fee: _, ...bookingData } = booking;

      const finalBookingData = {
        ...bookingData,
        user_id: profile.id, // CRITICAL: Use profiles.id NOT auth.users.id!
        host_id: accommodation?.host_id,
        fees: fees,
        taxes: taxes > 0 ? taxes : 0,
        status: 'pending',
        payment_type: payment_type,
      };

      console.log('Inserting booking with data:', finalBookingData);

      const { data, error } = await supabase
        .from('bookings')
        .insert(finalBookingData)
        .select()
        .single();

      if (error) {
        console.error('Booking insert error:', error);
        throw error;
      }

      console.log('Booking created successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

// Create vehicle booking
export function useCreateVehicleBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (booking: {
      vehicle_id: string;
      check_in: string; // Using check_in/check_out for consistency with accommodations
      check_out: string;
      pickup_location: string;
      guests?: number;
      total_price: number;
      base_price: number;
      service_fee?: number;
      cleaning_fee?: number;
      special_requests?: string;
      selected_extras?: string[];
      payment_method?: string;
    }) => {
      // First ensure we have a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          throw new Error('Not authenticated. Please sign in again.');
        }
      }

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated. Please sign in again.');
      }

      console.log('Creating vehicle booking for auth user:', user.id);

      // CRITICAL: Get user's profile ID (NOT auth.users.id!)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError);
        throw new Error('User profile not found. Please complete your profile.');
      }

      console.log('Using profile ID for vehicle booking:', profile.id);

      // Get owner_id from vehicle
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('owner_id, offline_payment_enabled')
        .eq('id', booking.vehicle_id)
        .single();

      if (vehicleError) {
        console.error('Error fetching vehicle:', vehicleError);
        throw new Error('Vehicle not found');
      }

      // Determine payment type based on vehicle setting
      const payment_type = vehicle?.offline_payment_enabled ? 'offline' : 'online';

      // Store service fee - cleaning fee is included in fees
      const service_fee = booking.service_fee || 0;
      const cleaning_fee_value = booking.cleaning_fee || 0;
      // fees column stores service fee + cleaning fee combined
      const fees = service_fee + cleaning_fee_value;
      const taxes = booking.total_price - booking.base_price - fees;

      // Remove fields that don't exist in the bookings table schema
      const { cleaning_fee, payment_method, service_fee: _, ...bookingData } = booking;

      const finalBookingData = {
        ...bookingData,
        user_id: profile.id, // CRITICAL: Use profiles.id NOT auth.users.id!
        host_id: vehicle?.owner_id,
        fees: fees,
        taxes: taxes > 0 ? taxes : 0,
        status: 'pending',
        payment_type: payment_type,
        guests: booking.guests || 1,
      };

      console.log('Inserting vehicle booking with data:', finalBookingData);

      const { data, error } = await supabase
        .from('bookings')
        .insert(finalBookingData)
        .select()
        .single();

      if (error) {
        console.error('Vehicle booking insert error:', error);
        throw error;
      }

      console.log('Vehicle booking created successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

// Update booking status
export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      cancellationReason,
    }: {
      id: string;
      status: 'confirmed' | 'cancelled' | 'completed';
      cancellationReason?: string;
    }) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({
          status,
          cancellation_reason: cancellationReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

// Cancel booking
export function useCancelBooking() {
  const updateStatus = useUpdateBookingStatus();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return updateStatus.mutateAsync({
        id,
        status: 'cancelled',
        cancellationReason: reason,
      });
    },
  });
}

// Process booking payment
export function useProcessBookingPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      paymentMethodId,
    }: {
      bookingId: string;
      paymentMethodId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('process-booking-payment', {
        body: {
          booking_id: bookingId,
          payment_method_id: paymentMethodId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

// Fetch host bookings (for suppliers)
export function useHostBookings() {
  return useQuery({
    queryKey: ['bookings', 'host'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          accommodations(id, title, main_image_url),
          profiles!user_id(id, full_name, avatar_url, email, phone)
        `)
        .eq('host_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

// Get booking stats
export function useBookingStats() {
  return useQuery({
    queryKey: ['bookings', 'stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: bookings } = await supabase
        .from('bookings')
        .select('status, total_price')
        .eq('user_id', user.id);

      // Vehicle bookings table doesn't exist yet, so we skip it
      const allBookings = bookings || [];

      return {
        total: allBookings.length,
        upcoming: allBookings.filter(b => b.status === 'confirmed').length,
        completed: allBookings.filter(b => b.status === 'completed').length,
        cancelled: allBookings.filter(b => b.status === 'cancelled').length,
        totalSpent: allBookings.reduce((sum, b) => sum + (b.total_price || 0), 0),
      };
    },
  });
}
