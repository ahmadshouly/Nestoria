import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  MapPin,
  Star,
  X,
  Map,
  List,
  Percent,
} from 'lucide-react-native';
import { useAccommodations, useVehicles, useCities } from '@/lib/api';
import SearchResultsMap from '@/components/SearchResultsMap';
import { useTranslation, useLanguageStore } from '@/lib/i18n';
import {
  useAccommodationPricingRules,
  useVehiclePricingRules,
  useLowestRoomPrice,
  getListingDisplayPrice,
} from '@/lib/api/pricing';

export default function SearchScreen() {
  const params = useLocalSearchParams<{
    type?: 'accommodation' | 'vehicle';
    location?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: string;
    pickupDate?: string;
    dropoffDate?: string;
  }>();

  const { t } = useTranslation();
  const isRTL = useLanguageStore(s => s.isRTL);

  const [searchType, setSearchType] = useState<'accommodation' | 'vehicle'>(
    params.type || 'accommodation'
  );
  const [searchQuery, setSearchQuery] = useState<string>(params.location || '');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Filter states
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [selectedPropertyType, setSelectedPropertyType] = useState<string | undefined>();
  const [selectedVehicleType, setSelectedVehicleType] = useState<string | undefined>();
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [superhostOnly, setSuperhostOnly] = useState<boolean>(false);
  const [minBedrooms, setMinBedrooms] = useState<number>(0);
  const [minBathrooms, setMinBathrooms] = useState<number>(0);
  const [minGuests, setMinGuests] = useState<number>(0);
  const [instantBookOnly, setInstantBookOnly] = useState<boolean>(false);

  // Fetch data
  const { data: cities } = useCities();
  const { data: accommodations, isLoading: isLoadingAccommodations } = useAccommodations({
    searchQuery: searchQuery || undefined,
    minPrice,
    maxPrice,
    propertyType: selectedPropertyType,
    amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
    isSuperhost: superhostOnly || undefined,
    minBedrooms: minBedrooms > 0 ? minBedrooms : undefined,
    minBathrooms: minBathrooms > 0 ? minBathrooms : undefined,
    minGuests: minGuests > 0 ? minGuests : undefined,
  });
  const { data: vehicles, isLoading: isLoadingVehicles } = useVehicles({
    searchQuery: searchQuery || undefined,
    minPrice,
    maxPrice,
    vehicleType: selectedVehicleType,
    features: selectedAmenities.length > 0 ? selectedAmenities : undefined,
    isVerified: superhostOnly || undefined,
  });

  const isLoading =
    searchType === 'accommodation' ? isLoadingAccommodations : isLoadingVehicles;
  const results =
    searchType === 'accommodation' ? accommodations || [] : vehicles || [];

  // Amenity options - comprehensive lists
  const accommodationAmenities = [
    'WiFi',
    'Parking',
    'Kitchen',
    'Pool',
    'Gym',
    'Air Conditioning',
    'Heating',
    'TV',
    'Washing Machine',
    'Dryer',
    'Mountain View',
    'Garden',
    'City View',
    'Ocean View',
    'Sea View',
    'Lake View',
    'Balcony',
    'Patio',
    'Pet Friendly',
    'Fireplace',
    'Fire Pit',
    'Game Room',
    'Entertainment',
    'Piano',
    'BBQ',
    'Grill',
    'Beach Access',
    'Hot Tub',
    'Spa',
    'Coffee Maker',
  ];

  const vehicleFeatures = [
    'GPS Navigation',
    'Bluetooth',
    'USB Charging',
    'Automatic Transmission',
    'Manual Transmission',
    'ABS Brakes',
    'Airbags',
    'Cruise Control',
    'Parking Sensors',
    'Backup Camera',
    'Sunroof',
    'Leather Seats',
    'Heated Seats',
    'Keyless Entry',
    'Push Start',
    'Remote Start',
    'Air Conditioning',
    'Apple CarPlay',
    'Android Auto',
    'WiFi Hotspot',
  ];

  const propertyTypes = [
    { value: 'apartment', label: t('search.apartment') },
    { value: 'house', label: t('search.house') },
    { value: 'villa', label: t('search.villa') },
    { value: 'hotel', label: t('search.hotel') },
    { value: 'studio', label: 'Studio' },
    { value: 'loft', label: 'Loft' },
    { value: 'condo', label: 'Condo' },
    { value: 'townhouse', label: 'Townhouse' },
    { value: 'cabin', label: 'Cabin' },
    { value: 'chalet', label: 'Chalet' },
    { value: 'cottage', label: 'Cottage' },
    { value: 'bungalow', label: 'Bungalow' },
    { value: 'resort', label: 'Resort' },
    { value: 'hostel', label: 'Hostel' },
    { value: 'guesthouse', label: 'Guest House' },
  ];

  const vehicleTypes = [
    { value: 'economy', label: t('search.economy') },
    { value: 'compact', label: t('search.compact') },
    { value: 'suv', label: t('search.suv') },
    { value: 'luxury', label: t('search.luxury') },
    { value: 'van', label: t('search.van') },
    { value: 'sedan', label: 'Sedan' },
    { value: 'sports', label: 'Sports Car' },
    { value: 'convertible', label: 'Convertible' },
    { value: 'truck', label: 'Truck' },
    { value: 'minivan', label: 'Minivan' },
    { value: 'crossover', label: 'Crossover' },
    { value: 'electric', label: 'Electric' },
    { value: 'hybrid', label: 'Hybrid' },
  ];

  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  const clearFilters = () => {
    setMinPrice(0);
    setMaxPrice(1000);
    setSelectedPropertyType(undefined);
    setSelectedVehicleType(undefined);
    setSelectedAmenities([]);
    setSuperhostOnly(false);
    setMinBedrooms(0);
    setMinBathrooms(0);
    setMinGuests(0);
    setInstantBookOnly(false);
  };

  const PropertyCard = ({ item }: { item: any }) => {
    const isAccommodation = searchType === 'accommodation';
    const basePrice = isAccommodation ? item.price_per_night : item.price_per_day;
    const priceLabel = isAccommodation ? t('explore.night') : t('explore.day');
    const isHotel = item.property_type === 'hotel' || item.property_type === 'resort';

    // Fetch pricing rules
    const { data: accommodationRules = [] } = useAccommodationPricingRules(
      isAccommodation ? item.id : undefined
    );
    const { data: vehicleRules = [] } = useVehiclePricingRules(
      !isAccommodation ? item.id : undefined
    );

    // Fetch lowest room price for hotels
    const { data: roomPriceData } = useLowestRoomPrice(
      isAccommodation && isHotel ? item.id : undefined
    );

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
        router.push(`/accommodation/${item.id}`);
      } else {
        router.push(`/vehicle/${item.id}`);
      }
    };

    return (
      <Pressable
        key={item.id}
        onPress={handlePress}
        className="mb-4 active:opacity-95"
      >
        <View className="relative">
          <Image
            source={{ uri: item.main_image_url || item.images?.[0] }}
            className="w-full h-56 rounded-2xl bg-gray-200"
            resizeMode="cover"
          />
          {item.featured && (
            <View className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} bg-black/80 px-3 py-1.5 rounded-full`}>
              <Text
                className="text-white text-xs font-semibold"
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                {t('explore.featured')}
              </Text>
            </View>
          )}

          {/* Discount Badge */}
          {hasDiscount && (
            <View className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} bg-red-500/90 px-2.5 py-1.5 rounded-full flex-row items-center`}>
              <Percent size={12} color="#fff" />
              <Text className="text-white text-xs font-semibold ml-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                -{discountPercentage}%
              </Text>
            </View>
          )}
        </View>

        <View className="mt-3">
          <Text
            className="text-base font-semibold text-gray-900 mb-1"
            numberOfLines={1}
            style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}
          >
            {item.title}
          </Text>

          <View className={`flex-row items-center mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <MapPin size={14} color="#9CA3AF" />
            <Text
              className={`text-sm text-gray-600 ${isRTL ? 'mr-1' : 'ml-1'}`}
              numberOfLines={1}
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {item.location}
            </Text>
          </View>

          {isAccommodation && (
            <Text
              className="text-sm text-gray-600 mb-1"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
            >
              {item.max_guests} {t('accommodation.guests')} · {item.bedrooms} {t('accommodation.bedrooms')}
            </Text>
          )}

          {!isAccommodation && (
            <Text
              className="text-sm text-gray-600 mb-1"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
            >
              {item.brand} {item.model} · {item.year}
            </Text>
          )}

          <View className={`flex-row items-center justify-between mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <View className={`flex-row items-baseline ${isRTL ? 'flex-row-reverse' : ''}`}>
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
              <Text
                className={`text-lg font-bold ${hasDiscount ? 'text-red-600' : 'text-emerald-600'}`}
                style={{ fontFamily: 'Cairo_700Bold' }}
              >
                ${displayPrice}
              </Text>
              <Text
                className={`text-sm text-gray-600 ${isRTL ? 'mr-1' : 'ml-1'}`}
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                / {priceLabel}
              </Text>
            </View>

            {item.average_rating > 0 && (
              <View className="flex-row items-center">
                <Star size={14} fill="#FFD700" color="#FFD700" />
                <Text
                  className={`text-sm font-semibold text-gray-900 ${isRTL ? 'mr-1' : 'ml-1'}`}
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

  const renderPropertyCard = (item: any) => {
    return <PropertyCard key={item.id} item={item} />;
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 pt-2 pb-4 border-b border-gray-200">
        <View className="flex-row items-center mb-4">
          <Pressable
            onPress={() => router.back()}
            className={`w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200 ${isRTL ? 'ml-3' : 'mr-3'}`}
          >
            <ArrowLeft size={20} color="#000" />
          </Pressable>

          <View className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 flex-row items-center">
            <Search size={18} color="#717171" />
            <TextInput
              placeholder={t('search.searchLocation')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className={`flex-1 ${isRTL ? 'mr-3' : 'ml-3'} text-base text-gray-900`}
              placeholderTextColor="#717171"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
            />
            {searchQuery !== '' && (
              <Pressable onPress={() => setSearchQuery('')}>
                <X size={18} color="#717171" />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            className={`w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200 ${isRTL ? 'mr-2' : 'ml-2'}`}
          >
            {viewMode === 'list' ? (
              <Map size={18} color="#000" />
            ) : (
              <List size={18} color="#000" />
            )}
          </Pressable>

          <Pressable
            onPress={() => setShowFilters(true)}
            className={`w-10 h-10 rounded-full bg-emerald-500 items-center justify-center active:opacity-80 ${isRTL ? 'mr-2' : 'ml-2'}`}
          >
            <SlidersHorizontal size={18} color="#FFF" />
          </Pressable>
        </View>

        {/* Type Toggle */}
        <View className="flex-row bg-gray-100 rounded-xl p-1">
          <Pressable
            onPress={() => setSearchType('accommodation')}
            className={`flex-1 py-2.5 rounded-lg ${
              searchType === 'accommodation' ? 'bg-white' : ''
            }`}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                searchType === 'accommodation' ? 'text-gray-900' : 'text-gray-600'
              }`}
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('search.stays')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSearchType('vehicle')}
            className={`flex-1 py-2.5 rounded-lg ${
              searchType === 'vehicle' ? 'bg-white' : ''
            }`}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                searchType === 'vehicle' ? 'text-gray-900' : 'text-gray-600'
              }`}
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('search.cars')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Quick Filters */}
      {(selectedPropertyType || selectedVehicleType || selectedAmenities.length > 0 || superhostOnly || minPrice > 0 || maxPrice < 1000 || minBedrooms > 0 || minBathrooms > 0 || minGuests > 0 || instantBookOnly) && (
        <View className="px-4 pt-2 pb-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {/* Property/Vehicle Type Filter Chip */}
            {(selectedPropertyType || selectedVehicleType) && (
              <Pressable
                onPress={() => {
                  setSelectedPropertyType(undefined);
                  setSelectedVehicleType(undefined);
                }}
                className="flex-row items-center bg-emerald-500 rounded-full px-4 py-2"
              >
                <Text className="text-white text-sm font-semibold mr-2" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {searchType === 'accommodation'
                    ? propertyTypes.find(t => t.value === selectedPropertyType)?.label
                    : vehicleTypes.find(t => t.value === selectedVehicleType)?.label
                  }
                </Text>
                <X size={14} color="#FFF" />
              </Pressable>
            )}

            {/* Price Range Filter Chip */}
            {(minPrice > 0 || maxPrice < 1000) && (
              <Pressable
                onPress={() => {
                  setMinPrice(0);
                  setMaxPrice(1000);
                }}
                className="flex-row items-center bg-emerald-500 rounded-full px-4 py-2"
              >
                <Text className="text-white text-sm font-semibold mr-2" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  ${minPrice} - ${maxPrice}
                </Text>
                <X size={14} color="#FFF" />
              </Pressable>
            )}

            {/* Amenities/Features Filter Chips */}
            {selectedAmenities.slice(0, 2).map((amenity) => (
              <Pressable
                key={amenity}
                onPress={() => toggleAmenity(amenity)}
                className="flex-row items-center bg-emerald-500 rounded-full px-4 py-2"
              >
                <Text className="text-white text-sm font-semibold mr-2" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {amenity}
                </Text>
                <X size={14} color="#FFF" />
              </Pressable>
            ))}

            {/* More Amenities Indicator */}
            {selectedAmenities.length > 2 && (
              <Pressable
                onPress={() => setShowFilters(true)}
                className="flex-row items-center bg-gray-200 rounded-full px-4 py-2"
              >
                <Text className="text-gray-700 text-sm font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  +{selectedAmenities.length - 2} more
                </Text>
              </Pressable>
            )}

            {/* Superhost/Verified Filter Chip */}
            {superhostOnly && (
              <Pressable
                onPress={() => setSuperhostOnly(false)}
                className="flex-row items-center bg-emerald-500 rounded-full px-4 py-2"
              >
                <Text className="text-white text-sm font-semibold mr-2" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {searchType === 'accommodation' ? t('search.superhostOnly') : t('search.verifiedOnly')}
                </Text>
                <X size={14} color="#FFF" />
              </Pressable>
            )}

            {/* Clear All Filters */}
            <Pressable
              onPress={clearFilters}
              className="flex-row items-center bg-gray-200 rounded-full px-4 py-2"
            >
              <Text className="text-gray-700 text-sm font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {t('search.clear')}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {/* Results */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10B981" />
          <Text
            className="text-gray-600 mt-4"
            style={{ fontFamily: 'Cairo_400Regular' }}
          >
            {t('search.searching')}
          </Text>
        </View>
      ) : viewMode === 'map' ? (
        <SearchResultsMap results={results} searchType={searchType} className="flex-1" />
      ) : (
        <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
          <Text
            className="text-sm text-gray-600 mb-4"
            style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
          >
            {results.length} {searchType === 'accommodation' ? t('search.staysFound') : t('search.carsFound')}
          </Text>

          {results.length > 0 ? (
            results.map(renderPropertyCard)
          ) : (
            <View className="items-center justify-center py-20">
              <Search size={48} color="#D1D5DB" />
              <Text
                className="text-lg font-semibold text-gray-900 mt-4"
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                {t('search.noResults')}
              </Text>
              <Text
                className="text-sm text-gray-500 mt-2 text-center"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                {t('search.noResultsSub')}
              </Text>
            </View>
          )}

          <View className="h-4" />
        </ScrollView>
      )}

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <Pressable onPress={() => setShowFilters(false)}>
              <X size={24} color="#000" />
            </Pressable>
            <Text
              className="text-xl font-bold text-gray-900"
              style={{ fontFamily: 'Cairo_700Bold' }}
            >
              {t('search.filters')}
            </Text>
            <Pressable onPress={clearFilters}>
              <Text
                className="text-emerald-600 font-semibold"
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                {t('search.clear')}
              </Text>
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
            {/* Price Range */}
            <View className="mb-8">
              <Text
                className="text-lg font-bold text-gray-900 mb-4"
                style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
              >
                {t('search.priceRange')}
              </Text>
              <View className="flex-row items-center justify-between">
                <View className={`flex-1 ${isRTL ? 'ml-2' : 'mr-2'}`}>
                  <Text
                    className="text-sm text-gray-600 mb-2"
                    style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
                  >
                    {t('search.minPrice')}
                  </Text>
                  <TextInput
                    value={minPrice.toString()}
                    onChangeText={(text) => setMinPrice(Number(text) || 0)}
                    keyboardType="number-pad"
                    className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900"
                    style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
                  />
                </View>
                <View className={`flex-1 ${isRTL ? 'mr-2' : 'ml-2'}`}>
                  <Text
                    className="text-sm text-gray-600 mb-2"
                    style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
                  >
                    {t('search.maxPrice')}
                  </Text>
                  <TextInput
                    value={maxPrice.toString()}
                    onChangeText={(text) => setMaxPrice(Number(text) || 1000)}
                    keyboardType="number-pad"
                    className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900"
                    style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
                  />
                </View>
              </View>
            </View>

            {/* Property/Vehicle Type */}
            <View className="mb-8">
              <Text
                className="text-lg font-bold text-gray-900 mb-4"
                style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
              >
                {searchType === 'accommodation' ? t('search.propertyType') : t('search.vehicleType')}
              </Text>
              <View className={`flex-row flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                {(searchType === 'accommodation' ? propertyTypes : vehicleTypes).map(
                  (type) => (
                    <Pressable
                      key={type.value}
                      onPress={() =>
                        searchType === 'accommodation'
                          ? setSelectedPropertyType(
                              selectedPropertyType === type.value
                                ? undefined
                                : type.value
                            )
                          : setSelectedVehicleType(
                              selectedVehicleType === type.value
                                ? undefined
                                : type.value
                            )
                      }
                      className={`${isRTL ? 'ml-2' : 'mr-2'} mb-2 px-4 py-2.5 rounded-full ${
                        (searchType === 'accommodation'
                          ? selectedPropertyType === type.value
                          : selectedVehicleType === type.value)
                          ? 'bg-emerald-500'
                          : 'bg-gray-100'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          (searchType === 'accommodation'
                            ? selectedPropertyType === type.value
                            : selectedVehicleType === type.value)
                            ? 'text-white'
                            : 'text-gray-700'
                        }`}
                        style={{ fontFamily: 'Cairo_600SemiBold' }}
                      >
                        {type.label}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>
            </View>

            {/* Amenities/Features */}
            <View className="mb-8">
              <Text
                className="text-lg font-bold text-gray-900 mb-4"
                style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
              >
                {searchType === 'accommodation' ? t('search.amenities') : t('search.features')}
              </Text>
              <View className={`flex-row flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                {(searchType === 'accommodation'
                  ? accommodationAmenities
                  : vehicleFeatures
                ).map((amenity) => (
                  <Pressable
                    key={amenity}
                    onPress={() => toggleAmenity(amenity)}
                    className={`${isRTL ? 'ml-2' : 'mr-2'} mb-2 px-4 py-2.5 rounded-full ${
                      selectedAmenities.includes(amenity)
                        ? 'bg-emerald-500'
                        : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        selectedAmenities.includes(amenity)
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                      style={{ fontFamily: 'Cairo_600SemiBold' }}
                    >
                      {amenity}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Accommodation-specific filters */}
            {searchType === 'accommodation' && (
              <>
                {/* Bedrooms */}
                <View className="mb-8">
                  <Text
                    className="text-lg font-bold text-gray-900 mb-4"
                    style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
                  >
                    Bedrooms
                  </Text>
                  <View className={`flex-row flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {[0, 1, 2, 3, 4, 5].map((num) => (
                      <Pressable
                        key={num}
                        onPress={() => setMinBedrooms(num)}
                        className={`${isRTL ? 'ml-2' : 'mr-2'} mb-2 px-5 py-3 rounded-full ${
                          minBedrooms === num ? 'bg-emerald-500' : 'bg-gray-100'
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            minBedrooms === num ? 'text-white' : 'text-gray-700'
                          }`}
                          style={{ fontFamily: 'Cairo_600SemiBold' }}
                        >
                          {num === 0 ? 'Any' : num === 5 ? '5+' : num.toString()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Bathrooms */}
                <View className="mb-8">
                  <Text
                    className="text-lg font-bold text-gray-900 mb-4"
                    style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
                  >
                    Bathrooms
                  </Text>
                  <View className={`flex-row flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {[0, 1, 2, 3, 4].map((num) => (
                      <Pressable
                        key={num}
                        onPress={() => setMinBathrooms(num)}
                        className={`${isRTL ? 'ml-2' : 'mr-2'} mb-2 px-5 py-3 rounded-full ${
                          minBathrooms === num ? 'bg-emerald-500' : 'bg-gray-100'
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            minBathrooms === num ? 'text-white' : 'text-gray-700'
                          }`}
                          style={{ fontFamily: 'Cairo_600SemiBold' }}
                        >
                          {num === 0 ? 'Any' : num === 4 ? '4+' : num.toString()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Guests */}
                <View className="mb-8">
                  <Text
                    className="text-lg font-bold text-gray-900 mb-4"
                    style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
                  >
                    Guests
                  </Text>
                  <View className={`flex-row flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {[0, 1, 2, 4, 6, 8, 10].map((num) => (
                      <Pressable
                        key={num}
                        onPress={() => setMinGuests(num)}
                        className={`${isRTL ? 'ml-2' : 'mr-2'} mb-2 px-5 py-3 rounded-full ${
                          minGuests === num ? 'bg-emerald-500' : 'bg-gray-100'
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            minGuests === num ? 'text-white' : 'text-gray-700'
                          }`}
                          style={{ fontFamily: 'Cairo_600SemiBold' }}
                        >
                          {num === 0 ? 'Any' : num === 10 ? '10+' : num.toString()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* Instant Book */}
            {searchType === 'accommodation' && (
              <View className="mb-8">
                <Pressable
                  onPress={() => setInstantBookOnly(!instantBookOnly)}
                  className={`flex-row items-center justify-between p-4 rounded-xl border-2 ${
                    instantBookOnly ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                  }`}
                >
                  <View>
                    <Text
                      className={`text-base font-semibold mb-1 ${
                        instantBookOnly ? 'text-emerald-700' : 'text-gray-900'
                      }`}
                      style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}
                    >
                      Instant Book
                    </Text>
                    <Text
                      className="text-sm text-gray-600"
                      style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
                    >
                      Book without waiting for host approval
                    </Text>
                  </View>
                  <View
                    className={`w-12 h-7 rounded-full ${
                      instantBookOnly ? 'bg-emerald-500' : 'bg-gray-300'
                    } items-${instantBookOnly ? (isRTL ? 'start' : 'end') : (isRTL ? 'end' : 'start')} justify-center px-1`}
                  >
                    <View className="w-5 h-5 rounded-full bg-white" />
                  </View>
                </Pressable>
              </View>
            )}

            {/* Superhost/Verified Filter */}
            <View className="mb-8">
              <Text
                className="text-lg font-bold text-gray-900 mb-4"
                style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
              >
                {t('search.qualityFilters')}
              </Text>
              <Pressable
                onPress={() => setSuperhostOnly(!superhostOnly)}
                className={`flex-row items-center justify-between p-4 rounded-xl border-2 ${
                  superhostOnly ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                }`}
              >
                <View>
                  <Text
                    className={`text-base font-semibold mb-1 ${
                      superhostOnly ? 'text-emerald-700' : 'text-gray-900'
                    }`}
                    style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}
                  >
                    {searchType === 'accommodation' ? t('search.superhostOnly') : t('search.verifiedOnly')}
                  </Text>
                  <Text
                    className="text-sm text-gray-600"
                    style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
                  >
                    {searchType === 'accommodation' ? t('search.superhostDesc') : t('search.verifiedDesc')}
                  </Text>
                </View>
                <View
                  className={`w-12 h-7 rounded-full ${
                    superhostOnly ? 'bg-emerald-500' : 'bg-gray-300'
                  } items-${superhostOnly ? (isRTL ? 'start' : 'end') : (isRTL ? 'end' : 'start')} justify-center px-1`}
                >
                  <View className="w-5 h-5 rounded-full bg-white" />
                </View>
              </Pressable>
            </View>
          </ScrollView>

          <SafeAreaView edges={['bottom']} className="px-4 py-3 border-t border-gray-200">
            <Pressable
              onPress={() => setShowFilters(false)}
              className="bg-emerald-500 py-4 rounded-xl active:opacity-80"
            >
              <Text
                className="text-white text-center text-base font-bold"
                style={{ fontFamily: 'Cairo_700Bold' }}
              >
                {t('search.showResults').replace('{count}', results.length.toString())}
              </Text>
            </Pressable>
          </SafeAreaView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
