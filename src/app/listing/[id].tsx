import React, { useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Heart,
  Share2,
  Star,
  MapPin,
  Users,
  Bed,
  Bath,
  Wifi,
  Car,
  Calendar,
  Award,
  Percent
} from 'lucide-react-native';
import { useAccommodation, useVehicle } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import {
  useAccommodationPricingRules,
  useVehiclePricingRules,
  useLowestRoomPrice,
  getListingDisplayPrice,
} from '@/lib/api/pricing';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { t } = useTranslation();
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();

  // Fetch based on type (default to accommodation if not specified)
  const { data: accommodation, isLoading: isLoadingAccommodation } = useAccommodation(
    type === 'accommodation' || !type ? id : undefined
  );
  const { data: vehicle, isLoading: isLoadingVehicle } = useVehicle(
    type === 'vehicle' ? id : undefined
  );

  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isWishlisted, setIsWishlisted] = useState<boolean>(false);

  const isLoading = isLoadingAccommodation || isLoadingVehicle;
  const listing = accommodation || vehicle;
  const isAccommodation = !!accommodation;

  // Check if it's a hotel type that might have rooms
  const isHotel = accommodation?.property_type === 'hotel' || accommodation?.property_type === 'resort';

  // Fetch pricing rules
  const { data: accommodationRules = [] } = useAccommodationPricingRules(
    isAccommodation ? listing?.id : undefined
  );
  const { data: vehicleRules = [] } = useVehiclePricingRules(
    !isAccommodation && listing ? listing.id : undefined
  );

  // Fetch lowest room price for hotels
  const { data: roomPriceData } = useLowestRoomPrice(
    isAccommodation && isHotel ? listing?.id : undefined
  );

  // Calculate dynamic pricing
  const rules = isAccommodation ? accommodationRules : vehicleRules;
  const hasRooms = roomPriceData?.hasRooms ?? false;
  const lowestRoomPrice = roomPriceData?.lowestPrice ?? null;
  const basePrice = isAccommodation ? accommodation?.price_per_night : vehicle?.price_per_day;

  const pricingInfo = getListingDisplayPrice(
    basePrice || 0,
    rules,
    hasRooms,
    lowestRoomPrice
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#10B981" />
        <Text className="text-gray-600 mt-4" style={{ fontFamily: 'Cairo_400Regular' }}>
          Loading listing...
        </Text>
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
          Listing not found
        </Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-6 py-3 bg-emerald-500 rounded-full active:opacity-80">
          <Text className="text-white font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
            Go Back
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const images = listing.images || [];
  const location = listing.location || (listing.cities ? `${listing.cities.name}, ${listing.cities.country}` : 'Unknown');
  const host = listing.profiles;
  const rating = listing.average_rating || 0;
  const reviewCount = listing.review_count || 0;

  return (
    <View className="flex-1 bg-white">
      {/* Image Gallery */}
      <View className="relative">
        {images.length > 0 ? (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setActiveImageIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {images.map((image: string, index: number) => (
                <Image
                  key={index}
                  source={{ uri: image }}
                  style={{ width, height: 400 }}
                  className="bg-gray-200"
                  resizeMode="cover"
                />
              ))}
            </ScrollView>

            {/* Image Indicators */}
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center">
              {images.map((_: string, index: number) => (
                <View
                  key={index}
                  className={`w-2 h-2 rounded-full mx-1 ${
                    index === activeImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={{ width, height: 400 }} className="bg-gray-200 items-center justify-center">
            <Text className="text-gray-500" style={{ fontFamily: 'Cairo_400Regular' }}>No images available</Text>
          </View>
        )}

        {/* Header Buttons */}
        <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0">
          <View className="flex-row items-center justify-between px-4 pt-2">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/90 items-center justify-center active:bg-white"
            >
              <ArrowLeft size={24} color="#000" />
            </Pressable>
            <View className="flex-row">
              <Pressable className="w-10 h-10 rounded-full bg-white/90 items-center justify-center active:bg-white mr-2">
                <Share2 size={20} color="#000" />
              </Pressable>
              <Pressable
                onPress={() => setIsWishlisted(!isWishlisted)}
                className="w-10 h-10 rounded-full bg-white/90 items-center justify-center active:bg-white"
              >
                <Heart size={20} color="#10B981" fill={isWishlisted ? '#10B981' : 'transparent'} />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-6">
          {/* Title & Location */}
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1">
              <Text className="text-xs font-semibold text-emerald-600 uppercase mb-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {isAccommodation ? '🏠 Accommodation' : '🚗 Car Rental'}
              </Text>
              <Text className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Cairo_700Bold' }}>
                {listing.title}
              </Text>
              <View className="flex-row items-center">
                <MapPin size={16} color="#9CA3AF" />
                <Text className="text-sm text-gray-600 ml-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                  {location}
                </Text>
              </View>
            </View>
          </View>

          {/* Rating & Reviews */}
          {reviewCount > 0 && (
            <View className="flex-row items-center mt-3 pb-6 border-b border-gray-200">
              <Star size={18} fill="#FFD700" color="#FFD700" />
              <Text className="text-lg font-bold text-gray-900 ml-1" style={{ fontFamily: 'Cairo_700Bold' }}>
                {rating.toFixed(1)}
              </Text>
              <Text className="text-sm text-gray-600 ml-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
              </Text>
            </View>
          )}

          {/* Host Info */}
          {host && (
            <View className="py-6 border-b border-gray-200">
              <View className="flex-row items-center">
                <Image
                  source={{ uri: host.avatar_url || 'https://via.placeholder.com/150' }}
                  className="w-14 h-14 rounded-full bg-gray-200"
                />
                <View className="flex-1 ml-3">
                  <View className="flex-row items-center">
                    <Text className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
                      Hosted by {host.full_name || 'Unknown Host'}
                    </Text>
                    {host.is_verified && (
                      <View className="ml-2 bg-emerald-100 px-2 py-1 rounded-full flex-row items-center">
                        <Award size={12} color="#10B981" />
                        <Text className="text-xs font-semibold text-emerald-700 ml-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                          Verified
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Details */}
          <View className="py-6 border-b border-gray-200">
            {isAccommodation ? (
              <>
                {accommodation.max_guests && (
                  <View className="flex-row items-center mb-4">
                    <Users size={20} color="#10B981" />
                    <Text className="text-base text-gray-900 ml-3" style={{ fontFamily: 'Cairo_400Regular' }}>
                      Up to {accommodation.max_guests} guests
                    </Text>
                  </View>
                )}
                {accommodation.bedrooms && (
                  <View className="flex-row items-center mb-4">
                    <Bed size={20} color="#10B981" />
                    <Text className="text-base text-gray-900 ml-3" style={{ fontFamily: 'Cairo_400Regular' }}>
                      {accommodation.bedrooms} {accommodation.bedrooms === 1 ? 'bedroom' : 'bedrooms'}
                    </Text>
                  </View>
                )}
                {accommodation.bathrooms && (
                  <View className="flex-row items-center">
                    <Bath size={20} color="#10B981" />
                    <Text className="text-base text-gray-900 ml-3" style={{ fontFamily: 'Cairo_400Regular' }}>
                      {accommodation.bathrooms} {accommodation.bathrooms === 1 ? 'bathroom' : 'bathrooms'}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {vehicle.vehicle_type && (
                  <View className="flex-row items-center mb-4">
                    <Car size={20} color="#10B981" />
                    <Text className="text-base text-gray-900 ml-3" style={{ fontFamily: 'Cairo_400Regular' }}>
                      {vehicle.vehicle_type}
                    </Text>
                  </View>
                )}
                {vehicle.year && (
                  <View className="flex-row items-center mb-4">
                    <Calendar size={20} color="#10B981" />
                    <Text className="text-base text-gray-900 ml-3" style={{ fontFamily: 'Cairo_400Regular' }}>
                      Year: {vehicle.year}
                    </Text>
                  </View>
                )}
                {vehicle.transmission && (
                  <View className="flex-row items-center mb-4">
                    <Text className="text-base text-gray-900" style={{ fontFamily: 'Cairo_400Regular' }}>
                      Transmission: {vehicle.transmission}
                    </Text>
                  </View>
                )}
                {vehicle.seats && (
                  <View className="flex-row items-center">
                    <Users size={20} color="#10B981" />
                    <Text className="text-base text-gray-900 ml-3" style={{ fontFamily: 'Cairo_400Regular' }}>
                      {vehicle.seats} seats
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Amenities */}
          {listing.amenities && Array.isArray(listing.amenities) && listing.amenities.length > 0 && (
            <View className="py-6 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Cairo_700Bold' }}>
                What this place offers
              </Text>
              {listing.amenities.map((amenity: string, index: number) => (
                <View key={index} className="flex-row items-center mb-3">
                  <Wifi size={20} color="#10B981" />
                  <Text className="text-base text-gray-900 ml-3" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {amenity}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Description */}
          {listing.description && (
            <View className="py-6 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Cairo_700Bold' }}>
                About this place
              </Text>
              <Text className="text-base text-gray-700 leading-6" style={{ fontFamily: 'Cairo_400Regular' }}>
                {listing.description}
              </Text>
            </View>
          )}
        </View>

        <View className="h-24" />
      </ScrollView>

      {/* Bottom Booking Bar */}
      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View>
            <View className="flex-row items-center">
              {/* From label for hotels */}
              {pricingInfo.showFromLabel && (
                <Text className="text-sm text-gray-600 mr-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                  {t('common.from')}
                </Text>
              )}
              {/* Original price (struck through if discounted) */}
              {pricingInfo.hasDiscount && (
                <Text className="text-lg text-gray-400 line-through mr-2" style={{ fontFamily: 'Cairo_400Regular' }}>
                  ${pricingInfo.originalPrice}
                </Text>
              )}
              <Text className={`text-2xl font-bold ${pricingInfo.hasDiscount ? 'text-red-600' : 'text-gray-900'}`} style={{ fontFamily: 'Cairo_700Bold' }}>
                ${pricingInfo.displayPrice}
              </Text>
              <Text className="text-sm text-gray-600 ml-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                / {isAccommodation ? t('explore.night') : t('explore.day')}
              </Text>
            </View>
            <View className="flex-row items-center mt-1">
              {pricingInfo.hasDiscount && (
                <View className="flex-row items-center bg-red-100 px-2 py-0.5 rounded-full mr-2">
                  <Percent size={10} color="#DC2626" />
                  <Text className="text-xs font-semibold text-red-600 ml-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    -{pricingInfo.discountPercentage}%
                  </Text>
                </View>
              )}
              {reviewCount > 0 && (
                <View className="flex-row items-center">
                  <Star size={12} fill="#FFD700" color="#FFD700" />
                  <Text className="text-xs font-semibold text-gray-900 ml-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    {rating.toFixed(1)}
                  </Text>
                  <Text className="text-xs text-gray-500 ml-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                    ({reviewCount})
                  </Text>
                </View>
              )}
            </View>
          </View>
          <Pressable className="bg-emerald-500 px-8 py-3.5 rounded-xl active:opacity-80">
            <Text className="text-white text-base font-bold" style={{ fontFamily: 'Cairo_700Bold' }}>
              {t('accommodation.reserve')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
