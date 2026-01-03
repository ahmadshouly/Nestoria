import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';

// Types for pricing rules
export interface PricingRule {
  id: string;
  supplier_id: string;
  accommodation_id: string | null;
  vehicle_id: string | null;
  room_id: string | null;
  rule_type: 'discount' | 'seasonal' | 'weekend';
  adjustment_type: 'percentage' | 'fixed';
  adjustment_value: number; // Negative for discounts (e.g., -20 for 20% off)
  start_date: string | null;
  end_date: string | null;
  days_of_week: number[] | null; // 0=Sunday, 6=Saturday
  min_nights: number | null;
  max_nights: number | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingResult {
  originalPrice: number;
  adjustedPrice: number;
  discountPercentage: number;
  hasDiscount: boolean;
  appliedRules: PricingRule[];
}

// Fetch pricing rules for an accommodation
export function useAccommodationPricingRules(accommodationId: string | undefined) {
  return useQuery({
    queryKey: ['pricing_rules', 'accommodation', accommodationId],
    queryFn: async () => {
      if (!accommodationId) return [];

      console.log('💰 Fetching pricing rules for accommodation:', accommodationId);

      const { data, error } = await supabase
        .from('supplier_pricing_rules')
        .select('*')
        .eq('is_active', true)
        .eq('accommodation_id', accommodationId)
        .is('room_id', null)
        .order('priority', { ascending: false });

      if (error) {
        console.error('❌ Error fetching accommodation pricing rules:', error);
        return [];
      }

      console.log('✅ Pricing rules loaded:', data?.length || 0, 'rules');
      return (data || []) as PricingRule[];
    },
    enabled: !!accommodationId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

// Fetch pricing rules for a specific room
export function useRoomPricingRules(roomId: string | undefined, accommodationId: string | undefined) {
  return useQuery({
    queryKey: ['pricing_rules', 'room', roomId, accommodationId],
    queryFn: async () => {
      if (!roomId && !accommodationId) return [];

      // Fetch both room-specific and hotel-level rules
      let query = supabase
        .from('supplier_pricing_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (roomId && accommodationId) {
        // Get room-specific rules and accommodation-level rules
        query = query.or(`room_id.eq.${roomId},and(accommodation_id.eq.${accommodationId},room_id.is.null)`);
      } else if (accommodationId) {
        query = query.eq('accommodation_id', accommodationId).is('room_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching room pricing rules:', error);
        return [];
      }

      return (data || []) as PricingRule[];
    },
    enabled: !!(roomId || accommodationId),
    staleTime: 1000 * 60 * 5,
  });
}

// Fetch pricing rules for a vehicle
export function useVehiclePricingRules(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['pricing_rules', 'vehicle', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];

      const { data, error } = await supabase
        .from('supplier_pricing_rules')
        .select('*')
        .eq('is_active', true)
        .eq('vehicle_id', vehicleId)
        .order('priority', { ascending: false });

      if (error) {
        console.error('Error fetching vehicle pricing rules:', error);
        return [];
      }

      return (data || []) as PricingRule[];
    },
    enabled: !!vehicleId,
    staleTime: 1000 * 60 * 5,
  });
}

// Fetch lowest room price for hotels
export function useLowestRoomPrice(accommodationId: string | undefined) {
  return useQuery({
    queryKey: ['lowest_room_price', accommodationId],
    queryFn: async () => {
      if (!accommodationId) return null;

      console.log('🏨 Fetching lowest room price for accommodation:', accommodationId);

      const { data, error } = await supabase
        .from('rooms')
        .select('price_per_night')
        .eq('accommodation_id', accommodationId)
        .eq('is_active', true)
        .order('price_per_night', { ascending: true })
        .limit(1);

      if (error) {
        console.error('❌ Error fetching lowest room price:', error);
        return null;
      }

      if (data && data.length > 0) {
        console.log('✅ Lowest room price:', data[0].price_per_night);
        return {
          hasRooms: true,
          lowestPrice: data[0].price_per_night,
        };
      }

      console.log('ℹ️ No rooms found for this accommodation');
      return { hasRooms: false, lowestPrice: null };
    },
    enabled: !!accommodationId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Filter rules that apply to the given booking context
 */
export function getApplicableRules(
  rules: PricingRule[],
  checkInDate?: Date | null,
  checkOutDate?: Date | null,
  nights?: number
): PricingRule[] {
  return rules.filter((rule) => {
    // 1. Check date range validity
    if (rule.start_date && rule.end_date && checkInDate && checkOutDate) {
      const startDate = new Date(rule.start_date);
      const endDate = new Date(rule.end_date);
      // Rule is valid if booking overlaps with rule period
      if (checkInDate > endDate || checkOutDate < startDate) {
        return false;
      }
    }

    // 2. Check minimum nights requirement
    if (rule.min_nights && nights !== undefined && nights < rule.min_nights) {
      return false;
    }

    // 3. Check maximum nights limit
    if (rule.max_nights && nights !== undefined && nights > rule.max_nights) {
      return false;
    }

    // 4. Check days of week (0 = Sunday, 6 = Saturday)
    if (rule.days_of_week && rule.days_of_week.length > 0 && checkInDate) {
      const checkInDay = checkInDate.getDay();
      if (!rule.days_of_week.includes(checkInDay)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculate adjusted price after applying pricing rules
 * For listing display (without specific dates), we apply rules without date/night constraints
 */
export function calculateDynamicPrice(
  basePrice: number,
  rules: PricingRule[],
  checkInDate?: Date | null,
  checkOutDate?: Date | null,
  nights?: number
): PricingResult {
  // Filter applicable rules
  const applicableRules = getApplicableRules(rules, checkInDate, checkOutDate, nights);

  let finalPrice = basePrice;
  let totalDiscountPercentage = 0;
  const appliedRules: PricingRule[] = [];

  // Sort: room-specific rules first, then by priority
  const sortedRules = [...applicableRules].sort((a, b) => {
    if (a.room_id && !b.room_id) return -1;
    if (!a.room_id && b.room_id) return 1;
    return b.priority - a.priority;
  });

  for (const rule of sortedRules) {
    appliedRules.push(rule);

    if (rule.adjustment_type === 'percentage') {
      if (rule.rule_type === 'discount') {
        // Discount: adjustment_value is negative (e.g., -20 for 20% off)
        const discountAmount = finalPrice * (Math.abs(rule.adjustment_value) / 100);
        finalPrice -= discountAmount;
        totalDiscountPercentage += Math.abs(rule.adjustment_value);
      } else {
        // Seasonal/Weekend markup: adjustment_value is positive
        const markupAmount = finalPrice * (rule.adjustment_value / 100);
        finalPrice += markupAmount;
      }
    } else {
      // Fixed amount adjustment
      if (rule.rule_type === 'discount') {
        finalPrice -= Math.abs(rule.adjustment_value);
        totalDiscountPercentage += (Math.abs(rule.adjustment_value) / basePrice) * 100;
      } else {
        finalPrice += rule.adjustment_value;
      }
    }
  }

  // Ensure price doesn't go below 0
  finalPrice = Math.max(0, finalPrice);

  return {
    originalPrice: basePrice,
    adjustedPrice: Math.round(finalPrice * 100) / 100, // Round to 2 decimal places
    discountPercentage: Math.round(totalDiscountPercentage),
    hasDiscount: totalDiscountPercentage > 0,
    appliedRules,
  };
}

/**
 * Calculate total price for a date range with dynamic pricing
 * This considers per-night pricing adjustments
 */
export function calculateDynamicDateRangePrice(
  baseNightlyPrice: number,
  rules: PricingRule[],
  checkInDate: Date,
  checkOutDate: Date
): {
  totalPrice: number;
  originalTotal: number;
  averageNightlyPrice: number;
  totalDiscount: number;
  hasDiscount: boolean;
} {
  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (nights <= 0) {
    return {
      totalPrice: 0,
      originalTotal: 0,
      averageNightlyPrice: baseNightlyPrice,
      totalDiscount: 0,
      hasDiscount: false,
    };
  }

  // Calculate price for each night
  let totalPrice = 0;
  const originalTotal = baseNightlyPrice * nights;
  const currentDate = new Date(checkInDate);

  for (let i = 0; i < nights; i++) {
    // Get applicable rules for this specific date
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const { adjustedPrice } = calculateDynamicPrice(
      baseNightlyPrice,
      rules,
      currentDate,
      nextDate,
      nights
    );

    totalPrice += adjustedPrice;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const totalDiscount = originalTotal - totalPrice;

  return {
    totalPrice: Math.round(totalPrice * 100) / 100,
    originalTotal,
    averageNightlyPrice: Math.round((totalPrice / nights) * 100) / 100,
    totalDiscount: Math.max(0, totalDiscount),
    hasDiscount: totalDiscount > 0,
  };
}

/**
 * Get display price for listing cards
 * For hotels, returns "From $XX" with lowest room price
 * Applies any active discounts that don't require specific dates
 */
export function getListingDisplayPrice(
  basePrice: number,
  rules: PricingRule[],
  hasRooms: boolean = false,
  lowestRoomPrice: number | null = null
): {
  displayPrice: number;
  originalPrice: number;
  discountPercentage: number;
  hasDiscount: boolean;
  showFromLabel: boolean;
} {
  // Determine base price to use
  const priceToUse = hasRooms && lowestRoomPrice !== null ? lowestRoomPrice : basePrice;

  console.log('💵 getListingDisplayPrice called:', {
    basePrice,
    rulesCount: rules.length,
    hasRooms,
    lowestRoomPrice,
    priceToUse
  });

  // Log ALL rules to see what constraints they have
  if (rules.length > 0) {
    console.log('🔍 All pricing rules details:', rules.map(r => ({
      id: r.id.substring(0, 8),
      type: r.rule_type,
      adjustmentType: r.adjustment_type,
      value: r.adjustment_value,
      startDate: r.start_date,
      endDate: r.end_date,
      daysOfWeek: r.days_of_week,
      minNights: r.min_nights,
      maxNights: r.max_nights,
      priority: r.priority,
    })));
  }

  // CHANGED: Apply ALL discount rules to listing cards to show potential savings
  // Filter to only show discount rules (not seasonal/weekend markups)
  const discountRules = rules.filter((rule) => rule.rule_type === 'discount');

  console.log('📋 Discount rules for display:', discountRules.length);

  // Calculate discount without filtering by date/nights constraints
  // Sort: room-specific rules first, then by priority
  const sortedRules = [...discountRules].sort((a, b) => {
    if (a.room_id && !b.room_id) return -1;
    if (!a.room_id && b.room_id) return 1;
    return b.priority - a.priority;
  });

  let finalPrice = priceToUse;
  let totalDiscountPercentage = 0;

  for (const rule of sortedRules) {
    if (rule.adjustment_type === 'percentage') {
      const discountAmount = finalPrice * (Math.abs(rule.adjustment_value) / 100);
      finalPrice -= discountAmount;
      totalDiscountPercentage += Math.abs(rule.adjustment_value);
    } else {
      // Fixed amount adjustment
      finalPrice -= Math.abs(rule.adjustment_value);
      totalDiscountPercentage += (Math.abs(rule.adjustment_value) / priceToUse) * 100;
    }
  }

  // Ensure price doesn't go below 0
  finalPrice = Math.max(0, finalPrice);

  const adjustedPrice = Math.round(finalPrice * 100) / 100;
  const discountPercentage = Math.round(totalDiscountPercentage);
  const hasDiscount = totalDiscountPercentage > 0;

  console.log('💰 Display price calculated:', {
    adjustedPrice,
    discountPercentage,
    hasDiscount,
    showFromLabel: hasRooms
  });

  return {
    displayPrice: adjustedPrice,
    originalPrice: priceToUse,
    discountPercentage,
    hasDiscount,
    showFromLabel: hasRooms,
  };
}
