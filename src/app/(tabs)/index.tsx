import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin, Star, Calendar, Users, X, ChevronDown, Percent, Bell } from 'lucide-react-native';
import { router } from 'expo-router';
import { useHomepageData } from '@/lib/api';
import { useTranslation, useLanguageStore } from '@/lib/i18n';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  useAccommodationPricingRules,
  useVehiclePricingRules,
  useLowestRoomPrice,
  getListingDisplayPrice,
} from '@/lib/api/pricing';
import { useUnreadNotificationCount } from '@/lib/api/notifications';
import AnnouncementBanner from '@/components/AnnouncementBanner';

export default function ExploreScreen() {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchType, setSearchType] = useState<'accommodation' | 'vehicle'>('accommodation');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [showCityDropdown, setShowCityDropdown] = useState<boolean>(false);
  const [checkIn, setCheckIn] = useState<Date>(new Date());
  const [checkOut, setCheckOut] = useState<Date>(new Date(Date.now() + 86400000)); // Tomorrow
  const [showCheckInPicker, setShowCheckInPicker] = useState<boolean>(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState<boolean>(false);
  const [guests, setGuests] = useState<number>(1);
  const { t } = useTranslation();
  const isRTL = useLanguageStore(s => s.isRTL);
  const currentLanguage = useLanguageStore(s => s.language);

  // Fetch homepage data with featured sections
  const { featuredSections, cities, isLoading } = useHomepageData();

  // Get unread notification count
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSearch = () => {
    setShowSearchModal(false);

    if (searchType === 'accommodation') {
      router.push({
        pathname: '/search',
        params: {
          type: 'accommodation',
          location: selectedCity,
          checkIn: formatDate(checkIn),
          checkOut: formatDate(checkOut),
          guests: guests.toString(),
        },
      });
    } else {
      router.push({
        pathname: '/search',
        params: {
          type: 'vehicle',
          location: selectedCity,
          pickupDate: formatDate(checkIn),
          dropoffDate: formatDate(checkOut),
        },
      });
    }
  };

  const PropertyCard = ({ item }: { item: any }) => {
    const isAccommodation = item.type === 'accommodation' || item.price_per_night;
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
        className={`active:opacity-95 ${isRTL ? 'ml-3' : 'mr-3'}`}
        style={{ width: 260 }}
      >
        {/* Image */}
        <View className="relative">
          <Image
            source={{ uri: item.main_image_url || item.images?.[0] }}
            className="w-full h-44 rounded-xl bg-gray-200"
            resizeMode="cover"
          />
          {item.featured && (
            <View className={`absolute top-2 ${isRTL ? 'right-2' : 'left-2'} bg-emerald-600 px-2 py-1 rounded-md`}>
              <Text className="text-white text-xs font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {t('explore.featured')}
              </Text>
            </View>
          )}

          {/* Discount Badge */}
          {hasDiscount && (
            <View className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} bg-red-500/90 px-2 py-1 rounded-md flex-row items-center`}>
              <Percent size={10} color="#fff" />
              <Text className="text-white text-xs font-semibold ml-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                -{discountPercentage}%
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View className="mt-2">
          <Text
            className="text-sm font-bold text-gray-900 mb-0.5"
            numberOfLines={1}
            style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
          >
            {item.title}
          </Text>

          <View className={`flex-row items-center mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <MapPin size={12} color="#9CA3AF" />
            <Text
              className={`text-xs text-gray-500 ${isRTL ? 'mr-1' : 'ml-1'} flex-1`}
              numberOfLines={1}
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {item.location}
            </Text>
          </View>

          <View className={`flex-row items-center justify-between mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <View className={`flex-row items-baseline ${isRTL ? 'flex-row-reverse' : ''}`}>
              {/* From label for hotels */}
              {showFromLabel && (
                <Text className="text-xs text-gray-600 mr-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                  {t('common.from')}
                </Text>
              )}

              {/* Original price (struck through if discounted) */}
              {hasDiscount && (
                <Text className="text-xs text-gray-400 line-through mr-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                  ${originalPrice}
                </Text>
              )}

              {/* Display price */}
              <Text className={`text-base font-bold ${hasDiscount ? 'text-red-600' : 'text-gray-900'}`} style={{ fontFamily: 'Cairo_700Bold' }}>
                ${displayPrice}
              </Text>
              <Text className={`text-xs text-gray-600 ${isRTL ? 'mr-1' : 'ml-1'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                / {priceLabel}
              </Text>
            </View>

            {item.average_rating > 0 && (
              <View className="flex-row items-center bg-gray-100 px-2 py-1 rounded-md">
                <Star size={10} fill="#FFD700" color="#FFD700" />
                <Text className={`text-xs font-bold text-gray-900 ${isRTL ? 'mr-1' : 'ml-1'}`} style={{ fontFamily: 'Cairo_700Bold' }}>
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

  const renderFeaturedSection = (section: any) => {
    if (!section.items || section.items.length === 0) return null;

    // Use Arabic title if language is Arabic and title_ar is available
    const sectionTitle = currentLanguage === 'ar' && section.title_ar ? section.title_ar : section.title;

    return (
      <View key={section.id} className="mb-8">
        <View className="px-4 mb-3">
          <Text
            className="text-xl font-bold text-gray-900"
            style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
          >
            {sectionTitle}
          </Text>
          {section.items.length > 0 && (
            <Text
              className="text-xs text-gray-500 mt-0.5"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
            >
              {section.items.length} {t('explore.properties')}
            </Text>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          style={{ flexGrow: 0 }}
        >
          {section.items.map(renderPropertyCard)}
        </ScrollView>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <SafeAreaView edges={['top']} className="bg-white border-b border-gray-100">
        <View className="px-4 pt-2 pb-4">
          <View className={`flex-row items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <View style={{ width: 40 }} />
            <View className="flex-row items-center">
              <Search size={28} color="#10B981" strokeWidth={2.5} />
              <Text className={`text-2xl font-bold text-emerald-600 ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_700Bold' }}>
                {t('explore.title')}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/notifications')}
              className="w-10 h-10 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
            >
              <Bell size={22} color="#374151" />
              {unreadCount > 0 && (
                <View className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
                  <Text className="text-white text-[10px] font-bold" style={{ fontFamily: 'Cairo_700Bold' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Search Bar - "Where are you going?" */}
          <Pressable
            onPress={() => setShowSearchModal(true)}
            className="border border-gray-300 rounded-full px-4 py-3 flex-row items-center active:bg-gray-50"
          >
            <Search size={20} color="#6B7280" />
            <View className={`flex-1 ${isRTL ? 'mr-3' : 'ml-3'}`}>
              <Text
                className="text-sm font-semibold text-gray-900"
                style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}
              >
                {t('explore.searchTitle')}
              </Text>
              <Text
                className="text-xs text-gray-500 mt-0.5"
                style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
              >
                {t('explore.searchSub')}
              </Text>
            </View>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10B981" />
          <Text className="text-gray-600 mt-4" style={{ fontFamily: 'Cairo_400Regular' }}>
            {t('explore.loading')}
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="py-6">
            {/* Announcements Banner */}
            <AnnouncementBanner showOnHomePage={true} maxAnnouncements={2} />

            {/* Featured Sections from Admin Panel */}
            {featuredSections && featuredSections.length > 0 ? (
              featuredSections.map(renderFeaturedSection)
            ) : (
              <View className="items-center justify-center py-20 px-4">
                <MapPin size={48} color="#D1D5DB" />
                <Text
                  className="text-lg font-bold text-gray-900 mt-4"
                  style={{ fontFamily: 'Cairo_700Bold', textAlign: 'center' }}
                >
                  {t('explore.noSections')}
                </Text>
                <Text
                  className="text-sm text-gray-500 text-center mt-2"
                  style={{ fontFamily: 'Cairo_400Regular', textAlign: 'center' }}
                >
                  {t('explore.noSectionsSub')}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <Pressable onPress={() => setShowSearchModal(false)} className="p-2">
              <X size={24} color="#000" />
            </Pressable>
            <Text className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
              {t('search.title')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView className="flex-1 px-4 pt-6">
            {/* Type Selection */}
            <View className="mb-6">
              <Text
                className="text-base font-bold text-gray-900 mb-3"
                style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
              >
                {t('search.whatLooking')}
              </Text>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setSearchType('accommodation')}
                  className={`flex-1 py-4 rounded-xl border-2 ${
                    searchType === 'accommodation' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-center text-base font-semibold ${
                      searchType === 'accommodation' ? 'text-emerald-600' : 'text-gray-700'
                    }`}
                    style={{ fontFamily: 'Cairo_600SemiBold' }}
                  >
                    {t('search.stays')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSearchType('vehicle')}
                  className={`flex-1 py-4 rounded-xl border-2 ${
                    searchType === 'vehicle' ? 'border-emerald-600 bg-emerald-50' : 'border-gray-200'
                  }`}
                >
                  <Text
                    className={`text-center text-base font-semibold ${
                      searchType === 'vehicle' ? 'text-emerald-600' : 'text-gray-700'
                    }`}
                    style={{ fontFamily: 'Cairo_600SemiBold' }}
                  >
                    {t('search.cars')}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* City Selection */}
            <View className="mb-6">
              <Text
                className="text-base font-bold text-gray-900 mb-3"
                style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
              >
                {t('search.where')}
              </Text>
              <Pressable
                onPress={() => setShowCityDropdown(!showCityDropdown)}
                className="border border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-between"
              >
                <View className="flex-1">
                  <Text
                    className={`text-sm ${selectedCity ? 'text-gray-900' : 'text-gray-400'}`}
                    style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
                  >
                    {selectedCity || t('search.selectCity')}
                  </Text>
                </View>
                <ChevronDown size={20} color="#9CA3AF" />
              </Pressable>

              {/* City List - Only show when dropdown is open */}
              {showCityDropdown && cities && cities.length > 0 && (
                <View className="mt-3 gap-2">
                  {cities.slice(0, 5).map((city: any) => (
                    <Pressable
                      key={city.id}
                      onPress={() => {
                        setSelectedCity(city.name);
                        setShowCityDropdown(false);
                      }}
                      className={`px-4 py-3 rounded-xl ${
                        selectedCity === city.name ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          selectedCity === city.name ? 'text-emerald-700' : 'text-gray-900'
                        }`}
                        style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }}
                      >
                        {city.name}, {city.country}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Dates */}
            <View className="mb-6">
              <Text
                className="text-base font-bold text-gray-900 mb-3"
                style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
              >
                {t('search.when')}
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text
                    className="text-xs text-gray-600 mb-2"
                    style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
                  >
                    {t('search.checkIn')}
                  </Text>
                  <Pressable
                    onPress={() => setShowCheckInPicker(true)}
                    className="border border-gray-300 rounded-xl px-3 py-3 flex-row items-center"
                  >
                    <Calendar size={16} color="#9CA3AF" />
                    <Text
                      className={`flex-1 ${isRTL ? 'mr-2' : 'ml-2'} text-sm text-gray-900`}
                      style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
                    >
                      {formatDisplayDate(checkIn)}
                    </Text>
                  </Pressable>
                  {showCheckInPicker && (
                    <DateTimePicker
                      value={checkIn}
                      mode="date"
                      display="default"
                      minimumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        setShowCheckInPicker(false);
                        if (selectedDate) {
                          setCheckIn(selectedDate);
                          // If check-out is before check-in, update it
                          if (selectedDate >= checkOut) {
                            setCheckOut(new Date(selectedDate.getTime() + 86400000));
                          }
                        }
                      }}
                    />
                  )}
                </View>
                <View className="flex-1">
                  <Text
                    className="text-xs text-gray-600 mb-2"
                    style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
                  >
                    {t('search.checkOut')}
                  </Text>
                  <Pressable
                    onPress={() => setShowCheckOutPicker(true)}
                    className="border border-gray-300 rounded-xl px-3 py-3 flex-row items-center"
                  >
                    <Calendar size={16} color="#9CA3AF" />
                    <Text
                      className={`flex-1 ${isRTL ? 'mr-2' : 'ml-2'} text-sm text-gray-900`}
                      style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
                    >
                      {formatDisplayDate(checkOut)}
                    </Text>
                  </Pressable>
                  {showCheckOutPicker && (
                    <DateTimePicker
                      value={checkOut}
                      mode="date"
                      display="default"
                      minimumDate={checkIn}
                      onChange={(event, selectedDate) => {
                        setShowCheckOutPicker(false);
                        if (selectedDate) {
                          setCheckOut(selectedDate);
                        }
                      }}
                    />
                  )}
                </View>
              </View>
            </View>

            {/* Guests (only for accommodations) */}
            {searchType === 'accommodation' && (
              <View className="mb-6">
                <Text
                  className="text-base font-bold text-gray-900 mb-3"
                  style={{ fontFamily: 'Cairo_700Bold', textAlign: isRTL ? 'right' : 'left' }}
                >
                  {t('search.who')}
                </Text>
                <View className="border border-gray-300 rounded-xl px-4 py-3 flex-row items-center justify-between">
                  <View className={`flex-row items-center flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Users size={18} color="#9CA3AF" />
                    <Text
                      className={`text-sm text-gray-900 ${isRTL ? 'mr-2' : 'ml-2'}`}
                      style={{ fontFamily: 'Cairo_400Regular' }}
                    >
                      {guests} {guests === 1 ? t('search.guest') : t('search.guests')}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <Pressable
                      onPress={() => setGuests(Math.max(1, guests - 1))}
                      className="w-8 h-8 rounded-full border border-gray-300 items-center justify-center"
                    >
                      <Text className="text-lg font-bold text-gray-700">−</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setGuests(guests + 1)}
                      className="w-8 h-8 rounded-full border border-gray-300 items-center justify-center"
                    >
                      <Text className="text-lg font-bold text-gray-700">+</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Search Button */}
          <SafeAreaView edges={['bottom']} className="px-4 py-3 border-t border-gray-200">
            <Pressable
              onPress={handleSearch}
              className="bg-emerald-600 py-4 rounded-xl active:opacity-80"
            >
              <Text
                className="text-white text-center text-base font-bold"
                style={{ fontFamily: 'Cairo_700Bold' }}
              >
                {t('search.searchButton')}
              </Text>
            </Pressable>
          </SafeAreaView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
