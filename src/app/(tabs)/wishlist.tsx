import React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Percent } from 'lucide-react-native';
import { router } from 'expo-router';
import { useWishlist } from '@/lib/api';
import { useTranslation, useLanguageStore } from '@/lib/i18n';
import {
  useAccommodationPricingRules,
  useVehiclePricingRules,
  useLowestRoomPrice,
  getListingDisplayPrice,
} from '@/lib/api/pricing';

export default function WishlistScreen() {
  const { data: wishlist, isLoading } = useWishlist();
  const { t } = useTranslation();
  const isRTL = useLanguageStore(s => s.isRTL);

  const WishlistCard = ({ item }: { item: any }) => {
    const listing = item.accommodations || item.vehicles;

    const isAccommodation = !!item.accommodations;
    const basePrice = isAccommodation ? (listing?.price_per_night || 0) : (listing?.price_per_day || 0);
    const priceLabel = isAccommodation ? t('wishlist.night') : t('wishlist.day');
    const isHotel = listing?.property_type === 'hotel' || listing?.property_type === 'resort';

    // Fetch pricing rules (hooks must be called unconditionally)
    const { data: accommodationRules = [] } = useAccommodationPricingRules(
      isAccommodation ? listing?.id : undefined
    );
    const { data: vehicleRules = [] } = useVehiclePricingRules(
      !isAccommodation ? listing?.id : undefined
    );

    // Fetch lowest room price for hotels
    const { data: roomPriceData } = useLowestRoomPrice(
      isAccommodation && isHotel ? listing?.id : undefined
    );

    // Early return after all hooks are called
    if (!listing) return null;

    // Get display price with dynamic pricing applied
    const rules = isAccommodation ? accommodationRules : vehicleRules;
    const hasRooms = roomPriceData?.hasRooms ?? false;
    const lowestRoomPrice = roomPriceData?.lowestPrice ?? null;

    const {
      displayPrice,
      originalPrice,
      discountPercentage,
      hasDiscount,
      showFromLabel,
    } = getListingDisplayPrice(basePrice, rules, hasRooms, lowestRoomPrice);

    // Navigate to the correct detail page based on type
    const handlePress = () => {
      if (isAccommodation) {
        router.push(`/accommodation/${listing.id}`);
      } else {
        router.push(`/vehicle/${listing.id}`);
      }
    };

    return (
      <Pressable
        key={item.id}
        onPress={handlePress}
        className="mb-6 active:opacity-95"
      >
        <View className="relative" style={{ direction: 'ltr' }}>
          <Image
            source={{ uri: listing.main_image_url || listing.images?.[0] }}
            className="w-full h-72 rounded-2xl bg-gray-200"
            resizeMode="cover"
          />
          <View className="absolute top-4 right-4 bg-white/90 px-2.5 py-1.5 rounded-full">
            <Heart size={20} color="#FF385C" fill="#FF385C" />
          </View>

          {/* Discount Badge */}
          {hasDiscount && (
            <View className="absolute top-4 left-4 bg-red-500/90 px-2.5 py-1.5 rounded-full flex-row items-center">
              <Percent size={12} color="#fff" />
              <Text className="text-white text-xs font-semibold ml-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                -{discountPercentage}%
              </Text>
            </View>
          )}
        </View>

        <View className="mt-3 px-1">
          <Text
            className="text-base font-semibold text-gray-900 mb-1"
            numberOfLines={1}
            style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}
          >
            {listing.title}
          </Text>

          <Text
            className="text-sm text-gray-600 mb-1"
            numberOfLines={1}
            style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
          >
            {listing.location}
          </Text>

          {isAccommodation && (
            <Text
              className="text-sm text-gray-600 mb-1"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
            >
              {listing.max_guests} {t('wishlist.guests')} · {listing.bedrooms} {t('wishlist.bedrooms')}
            </Text>
          )}

          {!isAccommodation && (
            <Text
              className="text-sm text-gray-600 mb-1"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
            >
              {listing.brand} {listing.model} · {listing.year}
            </Text>
          )}

          <View className="flex-row items-baseline mt-1" style={{ direction: 'ltr' }}>
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
            <Text className={`text-base font-bold ${hasDiscount ? 'text-red-600' : 'text-emerald-600'}`} style={{ fontFamily: 'Cairo_700Bold' }}>
              ${displayPrice}
            </Text>
            <Text className="text-sm text-gray-600 ml-1" style={{ fontFamily: 'Cairo_400Regular' }}>
              / {priceLabel}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderWishlistCard = (item: any) => {
    return <WishlistCard key={item.id} item={item} />;
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <View className="px-6 pt-2 pb-4">
          <Text className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
            {t('wishlist.title')}
          </Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10B981" />
          <Text className="text-gray-600 mt-4" style={{ fontFamily: 'Cairo_400Regular' }}>
            {t('wishlist.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <View className="px-6 pt-2 pb-4">
        <Text
          className="text-3xl font-bold text-gray-900"
          style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
        >
          {t('wishlist.title')}
        </Text>
        {wishlist && wishlist.length > 0 && (
          <Text
            className="text-sm text-gray-600 mt-1"
            style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
          >
            {wishlist.length} {t('wishlist.saved')} {wishlist.length === 1 ? t('wishlist.listing') : t('wishlist.listings')}
          </Text>
        )}
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {wishlist && wishlist.length > 0 ? (
          wishlist.map(renderWishlistCard)
        ) : (
          <View className="items-center justify-center py-20">
            <View className="w-20 h-20 rounded-full bg-pink-100 items-center justify-center mb-4">
              <Heart size={36} color="#FF385C" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 text-center" style={{ fontFamily: 'Cairo_600SemiBold' }}>
              {t('wishlist.empty')}
            </Text>
            <Text className="text-sm text-gray-500 mt-2 text-center px-8" style={{ fontFamily: 'Cairo_400Regular' }}>
              {t('wishlist.emptySub')}
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)')}
              className="mt-6 bg-emerald-500 px-6 py-3 rounded-full active:opacity-80"
            >
              <Text className="text-white font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {t('wishlist.startExploring')}
              </Text>
            </Pressable>
          </View>
        )}
        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
