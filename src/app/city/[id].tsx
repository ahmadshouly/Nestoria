import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, Star } from 'lucide-react-native';
import { useAccommodations, useVehicles, useCities } from '@/lib/api';

export default function CityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedType, setSelectedType] = useState<'all' | 'accommodations' | 'vehicles'>('all');

  const { data: cities } = useCities();
  const city = cities?.find((c) => c.id === id);

  const { data: accommodations, isLoading: isLoadingAccommodations } = useAccommodations({
    cityId: id,
  });

  const { data: vehicles, isLoading: isLoadingVehicles } = useVehicles({
    cityId: id,
  });

  const isLoading = isLoadingAccommodations || isLoadingVehicles;

  const getAllItems = () => {
    const accoms = (accommodations || []).map((a) => ({ ...a, type: 'accommodation' }));
    const vehs = (vehicles || []).map((v) => ({ ...v, type: 'vehicle' }));

    if (selectedType === 'all') return [...accoms, ...vehs];
    if (selectedType === 'accommodations') return accoms;
    return vehs;
  };

  const renderPropertyCard = (item: any) => {
    const isAccommodation = item.type === 'accommodation' || item.price_per_night;
    const price = isAccommodation ? item.price_per_night : item.price_per_day;
    const priceLabel = isAccommodation ? 'night' : 'day';

    return (
      <Pressable
        key={item.id}
        onPress={() =>
          router.push({
            pathname: '/listing/[id]',
            params: { id: item.id, type: item.type },
          })
        }
        className="mb-4 active:opacity-95"
      >
        <View className="relative">
          <Image
            source={{ uri: item.main_image_url || item.images?.[0] }}
            className="w-full h-56 rounded-2xl bg-gray-200"
            resizeMode="cover"
          />
          {item.featured && (
            <View className="absolute top-3 left-3 bg-black/80 px-3 py-1.5 rounded-full">
              <Text
                className="text-white text-xs font-semibold"
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                Featured
              </Text>
            </View>
          )}
        </View>

        <View className="mt-3">
          <Text
            className="text-base font-semibold text-gray-900 mb-1"
            numberOfLines={1}
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {item.title}
          </Text>

          <View className="flex-row items-center mb-1">
            <MapPin size={14} color="#9CA3AF" />
            <Text
              className="text-sm text-gray-600 ml-1"
              numberOfLines={1}
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {item.location}
            </Text>
          </View>

          {isAccommodation && (
            <Text
              className="text-sm text-gray-600 mb-1"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {item.max_guests} guests · {item.bedrooms} bedrooms
            </Text>
          )}

          {!isAccommodation && (
            <Text
              className="text-sm text-gray-600 mb-1"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {item.brand} {item.model} · {item.year}
            </Text>
          )}

          <View className="flex-row items-center justify-between mt-1">
            <View className="flex-row items-baseline">
              <Text
                className="text-lg font-bold text-emerald-600"
                style={{ fontFamily: 'Cairo_700Bold' }}
              >
                ${price}
              </Text>
              <Text
                className="text-sm text-gray-600 ml-1"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                / {priceLabel}
              </Text>
            </View>

            {item.average_rating > 0 && (
              <View className="flex-row items-center">
                <Star size={14} fill="#FFD700" color="#FFD700" />
                <Text
                  className="text-sm font-semibold text-gray-900 ml-1"
                  style={{ fontFamily: 'Cairo_600SemiBold' }}
                >
                  {item.average_rating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  if (!city) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <Text
            className="text-gray-600"
            style={{ fontFamily: 'Cairo_400Regular' }}
          >
            City not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Hero Image */}
      <View className="relative">
        {city.image_url ? (
          <Image
            source={{ uri: city.image_url }}
            className="w-full h-64 bg-gray-200"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-64 bg-gradient-to-b from-emerald-400 to-emerald-600" />
        )}

        {/* Header */}
        <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0">
          <View className="px-4 pt-2">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/90 items-center justify-center active:bg-white"
            >
              <ArrowLeft size={24} color="#000" />
            </Pressable>
          </View>
        </SafeAreaView>

        {/* City Info Overlay */}
        <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-6">
          <Text
            className="text-4xl font-bold text-white mb-1"
            style={{ fontFamily: 'Cairo_700Bold' }}
          >
            {city.name}
          </Text>
          <Text
            className="text-lg text-white/90"
            style={{ fontFamily: 'Cairo_400Regular' }}
          >
            {city.country}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View className="flex-1">
        <View className="px-4 pt-4">
          {/* Type Toggle */}
          <View className="flex-row bg-gray-100 rounded-xl p-1 mb-4">
            <Pressable
              onPress={() => setSelectedType('all')}
              className={`flex-1 py-2.5 rounded-lg ${
                selectedType === 'all' ? 'bg-white' : ''
              }`}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  selectedType === 'all' ? 'text-gray-900' : 'text-gray-600'
                }`}
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                All
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSelectedType('accommodations')}
              className={`flex-1 py-2.5 rounded-lg ${
                selectedType === 'accommodations' ? 'bg-white' : ''
              }`}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  selectedType === 'accommodations'
                    ? 'text-gray-900'
                    : 'text-gray-600'
                }`}
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                🏠 Stays
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSelectedType('vehicles')}
              className={`flex-1 py-2.5 rounded-lg ${
                selectedType === 'vehicles' ? 'bg-white' : ''
              }`}
            >
              <Text
                className={`text-center text-sm font-semibold ${
                  selectedType === 'vehicles' ? 'text-gray-900' : 'text-gray-600'
                }`}
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                🚗 Cars
              </Text>
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#10B981" />
            <Text
              className="text-gray-600 mt-4"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              Loading...
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
            <Text
              className="text-sm text-gray-600 mb-4"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {getAllItems().length} {selectedType === 'all' ? 'listings' : selectedType}{' '}
              available
            </Text>

            {getAllItems().length > 0 ? (
              getAllItems().map(renderPropertyCard)
            ) : (
              <View className="items-center justify-center py-20">
                <MapPin size={48} color="#D1D5DB" />
                <Text
                  className="text-lg font-semibold text-gray-900 mt-4"
                  style={{ fontFamily: 'Cairo_600SemiBold' }}
                >
                  No listings found
                </Text>
                <Text
                  className="text-sm text-gray-500 mt-2 text-center"
                  style={{ fontFamily: 'Cairo_400Regular' }}
                >
                  Check back soon for new listings in {city.name}
                </Text>
              </View>
            )}

            <View className="h-4" />
          </ScrollView>
        )}
      </View>
    </View>
  );
}
