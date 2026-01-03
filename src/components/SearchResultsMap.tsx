import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image, I18nManager } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { MapPin, Star } from 'lucide-react-native';
import { calculateMapBounds } from '@/lib/maps';
import { router } from 'expo-router';
import { useTranslation } from '@/lib/i18n';
import { getListingDisplayPrice } from '@/lib/api/pricing';

interface SearchResultsMapProps {
  results: any[];
  searchType: 'accommodation' | 'vehicle';
  className?: string;
}

export default function SearchResultsMap({
  results,
  searchType,
  className = '',
}: SearchResultsMapProps) {
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;

  // Calculate bounds for all results
  const mapBounds = useMemo(() => {
    return calculateMapBounds(results);
  }, [results]);

  // Filter results with valid coordinates
  const validResults = useMemo(() => {
    return results.filter(
      (item) => item.latitude !== null && item.longitude !== null
    );
  }, [results]);

  if (validResults.length === 0) {
    return (
      <View className={`bg-gray-100 flex-1 items-center justify-center ${className}`}>
        <MapPin size={48} color="#9CA3AF" />
        <Text
          className="text-gray-600 mt-4 text-center px-8"
          style={{ fontFamily: 'Cairo_400Regular' }}
        >
          {t('search.noLocationData')}
        </Text>
      </View>
    );
  }

  // Default region or use bounds
  const initialRegion = mapBounds
    ? {
        latitude: mapBounds.center.latitude,
        longitude: mapBounds.center.longitude,
        latitudeDelta:
          Math.abs(mapBounds.northeast.latitude - mapBounds.southwest.latitude) *
          1.5, // Add padding
        longitudeDelta:
          Math.abs(mapBounds.northeast.longitude - mapBounds.southwest.longitude) *
          1.5,
      }
    : {
        latitude: validResults[0].latitude,
        longitude: validResults[0].longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };

  const handleMarkerPress = (item: any) => {
    if (searchType === 'accommodation') {
      router.push(`/accommodation/${item.id}`);
    } else {
      router.push(`/vehicle/${item.id}`);
    }
  };

  return (
    <View className={className}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={initialRegion}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={false}
        rotateEnabled={true}
      >
        {validResults.map((item) => {
          // Calculate display price with dynamic pricing
          const basePrice =
            searchType === 'accommodation'
              ? item.price_per_night
              : item.price_per_day;
          const pricingRules = item.pricing_rules || [];
          const isHotel =
            searchType === 'accommodation' &&
            (item.property_type === 'hotel' || item.property_type === 'resort');
          const lowestRoomPrice = item.lowest_room_price || null;
          const hasRooms = item.has_rooms || false;

          const pricingInfo = getListingDisplayPrice(
            basePrice,
            pricingRules,
            hasRooms,
            lowestRoomPrice
          );

          const displayPrice = pricingInfo.displayPrice;
          const hasDiscount = pricingInfo.hasDiscount;

          return (
            <Marker
              key={item.id}
              coordinate={{
                latitude: item.latitude,
                longitude: item.longitude,
              }}
              pinColor="#10B981"
              onPress={() => handleMarkerPress(item)}
            >
              <View className="items-center">
                <View
                  className={`px-3 py-1.5 rounded-full shadow-md ${
                    hasDiscount ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                >
                  <Text
                    className="text-white text-xs font-bold"
                    style={{ fontFamily: 'Cairo_700Bold' }}
                  >
                    ${Math.round(displayPrice)}
                  </Text>
                </View>
                <View
                  style={{
                    width: 0,
                    height: 0,
                    backgroundColor: 'transparent',
                    borderStyle: 'solid',
                    borderTopWidth: 8,
                    borderRightWidth: 6,
                    borderBottomWidth: 0,
                    borderLeftWidth: 6,
                    borderTopColor: hasDiscount ? '#EF4444' : '#10B981',
                    borderRightColor: 'transparent',
                    borderBottomColor: 'transparent',
                    borderLeftColor: 'transparent',
                  }}
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Stats overlay */}
      <View className={`absolute top-4 ${isRTL ? 'right-4 left-4' : 'left-4 right-4'}`}>
        <View className="bg-white rounded-xl px-4 py-3 shadow-lg">
          <Text
            className="text-sm font-semibold text-gray-900"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {validResults.length}{' '}
            {searchType === 'accommodation' ? t('search.staysOnMap') : t('search.carsOnMap')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
});
