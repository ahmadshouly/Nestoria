import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Star, Percent } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslation, useLanguageStore } from '@/lib/i18n';
import {
  useAccommodationPricingRules,
  useVehiclePricingRules,
  useLowestRoomPrice,
  getListingDisplayPrice,
} from '@/lib/api/pricing';

interface ListingCardProps {
  listing: any; // Can be either Accommodation or Vehicle from API
  type?: 'accommodation' | 'vehicle';
}

export function ListingCard({ listing, type }: ListingCardProps) {
  const { t } = useTranslation();
  const isRTL = useLanguageStore(s => s.isRTL);
  const isAccommodation = type === 'accommodation' || !!listing.max_guests;
  const images = listing.images || [];
  const basePrice = isAccommodation ? listing.price_per_night : listing.price_per_day;
  const location = listing.location || (listing.cities ? `${listing.cities.name}, ${listing.cities.country}` : '');
  const rating = listing.average_rating || 0;
  const reviewCount = listing.review_count || 0;

  // Check if it's a hotel type that might have rooms
  const isHotel = listing.property_type === 'hotel' || listing.property_type === 'resort';

  // Fetch pricing rules
  const { data: accommodationRules = [] } = useAccommodationPricingRules(
    isAccommodation ? listing.id : undefined
  );
  const { data: vehicleRules = [] } = useVehiclePricingRules(
    !isAccommodation ? listing.id : undefined
  );

  // Fetch lowest room price for hotels
  const { data: roomPriceData } = useLowestRoomPrice(
    isAccommodation && isHotel ? listing.id : undefined
  );

  // Get display price with dynamic pricing applied
  const rules = isAccommodation ? accommodationRules : vehicleRules;
  const hasRooms = roomPriceData?.hasRooms ?? false;
  const lowestRoomPrice = roomPriceData?.lowestPrice ?? null;

  console.log('🎴 ListingCard pricing data:', {
    listingId: listing.id,
    listingTitle: listing.title,
    isAccommodation,
    isHotel,
    basePrice,
    rulesCount: rules.length,
    hasRooms,
    lowestRoomPrice,
  });

  const {
    displayPrice,
    originalPrice,
    discountPercentage,
    hasDiscount,
    showFromLabel,
  } = getListingDisplayPrice(basePrice, rules, hasRooms, lowestRoomPrice);

  console.log('🎴 ListingCard display price:', {
    listingId: listing.id,
    displayPrice,
    originalPrice,
    discountPercentage,
    hasDiscount,
    showFromLabel,
  });

  return (
    <Pressable
      onPress={() => router.push(`/listing/${listing.id}?type=${isAccommodation ? 'accommodation' : 'vehicle'}`)}
      className="mb-6 active:opacity-95"
    >
      <View className="relative" style={{ direction: 'ltr' }}>
        <Image
          source={{ uri: images[0] || 'https://via.placeholder.com/400x300' }}
          className="w-full h-72 rounded-2xl bg-gray-200"
          resizeMode="cover"
        />
        {listing.featured && (
          <View className="absolute top-4 left-4 bg-emerald-500/90 px-3 py-1.5 rounded-full">
            <Text className="text-white text-xs font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
              {t('explore.featured')}
            </Text>
          </View>
        )}

        {/* Discount Badge */}
        {hasDiscount && (
          <View className="absolute top-4 right-14 bg-red-500/90 px-2.5 py-1.5 rounded-full flex-row items-center">
            <Percent size={12} color="#fff" />
            <Text className="text-white text-xs font-semibold ml-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
              -{discountPercentage}%
            </Text>
          </View>
        )}

        <View className="absolute top-4 right-4 bg-white/90 px-2.5 py-1.5 rounded-full flex-row items-center">
          <Text className="text-xs font-semibold text-gray-900 mr-1">
            {isAccommodation ? '🏠' : '🚗'}
          </Text>
        </View>
      </View>

      <View className="mt-3 px-1">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-base font-semibold text-gray-900 flex-1" numberOfLines={1} style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}>
            {listing.title}
          </Text>
          {reviewCount > 0 && (
            <View className="flex-row items-center ml-2">
              <Star size={14} fill="#FFD700" color="#FFD700" />
              <Text className="text-sm font-semibold text-gray-900 ml-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {rating.toFixed(1)}
              </Text>
              <Text className="text-sm text-gray-500 ml-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                ({reviewCount})
              </Text>
            </View>
          )}
        </View>

        {location && (
          <Text className="text-sm text-gray-600 mb-1" numberOfLines={1} style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}>
            {location}
          </Text>
        )}

        {isAccommodation && listing.max_guests && (
          <Text className="text-sm text-gray-600 mb-1" style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}>
            {listing.max_guests} {t('accommodation.guests')}
            {listing.bedrooms && ` · ${listing.bedrooms} ${t('accommodation.bedrooms')}`}
            {listing.bathrooms && ` · ${listing.bathrooms} ${t('accommodation.bathrooms')}`}
          </Text>
        )}

        {!isAccommodation && (
          <Text className="text-sm text-gray-600 mb-1" style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}>
            {listing.vehicle_type || 'Vehicle'}
            {listing.year && ` · ${listing.year}`}
            {listing.transmission && ` · ${listing.transmission}`}
          </Text>
        )}

        <View className="flex-row items-center mt-1" style={{ direction: 'ltr' }}>
          {/* From label for hotels */}
          {showFromLabel && (
            <Text className="text-sm text-gray-600 mr-1" style={{ fontFamily: 'Cairo_400Regular' }}>
              {t('common.from')}
            </Text>
          )}

          {/* Original price (struck through if discounted) */}
          {hasDiscount && (
            <Text className="text-sm text-gray-400 line-through mr-2" style={{ fontFamily: 'Cairo_400Regular' }}>
              ${originalPrice}
            </Text>
          )}

          {/* Display price */}
          <Text className={`text-base font-bold ${hasDiscount ? 'text-red-600' : 'text-gray-900'}`} style={{ fontFamily: 'Cairo_700Bold' }}>
            ${displayPrice}
          </Text>
          <Text className="text-sm text-gray-600 ml-1" style={{ fontFamily: 'Cairo_400Regular' }}>
            / {isAccommodation ? t('explore.night') : t('explore.day')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
