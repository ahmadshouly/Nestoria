import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  Dimensions,
  ActivityIndicator,
  I18nManager,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Heart, MapPin, Star, ChevronLeft, Share2, Users, Car as CarIcon, Fuel, Settings as SettingsIcon, Percent } from 'lucide-react-native';
import { useVehicleDetail, useVehicleReviews, useVehicleWishlistStatus, useToggleVehicleWishlist } from '@/lib/api/vehicle-details';
import { calculateAverageRating } from '@/lib/api/accommodation-details';
import { supabase } from '@/lib/supabase';
import { getAmenityIcon, formatAmenityName } from '@/lib/amenities';
import PropertyMap from '@/components/PropertyMap';
import VehicleBookingModal from '@/components/VehicleBookingModal';
import HostProfileModal from '@/components/HostProfileModal';
import ContactHostModal from '@/components/ContactHostModal';
import PhotoGallery from '@/components/PhotoGallery';
import { TranslatableContent } from '@/components/TranslateButton';
import { useTranslation } from '@/lib/i18n';
import {
  useVehiclePricingRules,
  getListingDisplayPrice,
} from '@/lib/api/pricing';

const { width } = Dimensions.get('window');

type Tab = 'overview' | 'features' | 'reviews' | 'location';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showBookingModal, setShowBookingModal] = useState<boolean>(false);
  const [showHostProfile, setShowHostProfile] = useState<boolean>(false);
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;

  // Get current user
  const [userId, setUserId] = useState<string | undefined>(undefined);
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id);
    });
  }, []);

  // Fetch data
  const { data: vehicle, isLoading } = useVehicleDetail(id);
  const { data: reviews = [] } = useVehicleReviews(id);
  const { data: isInWishlist = false } = useVehicleWishlistStatus(id, userId);
  const toggleWishlist = useToggleVehicleWishlist();

  // Fetch dynamic pricing
  const { data: pricingRules = [] } = useVehiclePricingRules(vehicle?.id);

  // Calculate display price
  const basePrice = vehicle?.price_per_day || 0;

  const pricingInfo = getListingDisplayPrice(
    basePrice,
    pricingRules,
    false, // vehicles don't have rooms
    null
  );

  const averageRating = calculateAverageRating(reviews);

  const handleToggleWishlist = () => {
    if (!userId) {
      router.push('/auth/login');
      return;
    }
    if (!id) return;

    toggleWishlist.mutate({
      vehicleId: id,
      userId,
      isCurrentlyInWishlist: isInWishlist,
    });
  };

  const handleShare = async () => {
    try {
      const url = `https://nestoria-travel.com/vehicle/${id}`;
      const message = `I found this amazing ride on Nestoria! 🚗✨\n\n${vehicle?.title || 'Check out this vehicle'}\n\n${url}`;

      await Share.share({
        message,
        url,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleReservePress = () => {
    if (!userId) {
      Alert.alert(
        t('vehicle.signInRequired') || 'Sign In Required',
        t('vehicle.signInToBook') || 'Please sign in to make a booking request. You can create an account or sign in to continue.',
        [
          {
            text: t('common.cancel') || 'Cancel',
            style: 'cancel',
          },
          {
            text: t('auth.signIn') || 'Sign In',
            onPress: () => router.push('/auth/sign-in'),
          },
        ]
      );
      return;
    }
    setShowBookingModal(true);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-lg text-gray-900 font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
          {t('vehicle.notFound')}
        </Text>
      </View>
    );
  }

  const images = vehicle.images || [];
  const mainImage = vehicle.main_image_url || images[0] || 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800';

  const renderOverview = () => (
    <View className="px-4 py-4 space-y-6">
      {/* Owner Card */}
      {vehicle.profiles && (
        <View className="bg-gray-50 rounded-2xl p-4">
          <View className="flex-row items-center mb-3">
            <Image
              source={{ uri: vehicle.profiles.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(vehicle.profiles.full_name) }}
              className="w-14 h-14 rounded-full"
            />
            <View className={`flex-1 ${isRTL ? 'mr-3' : 'ml-3'}`}>
              <Text className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {vehicle.profiles.full_name}
              </Text>
              <Text className="text-sm text-gray-500" style={{ fontFamily: 'Cairo_400Regular' }}>
                {t('vehicle.owner')}
              </Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              className="flex-1 bg-emerald-500 rounded-xl py-3 items-center"
              onPress={() => setShowHostProfile(true)}
            >
              <Text className="text-white font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {t('vehicle.viewProfile')}
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 bg-white border border-gray-200 rounded-xl py-3 items-center"
              onPress={() => setShowContactModal(true)}
            >
              <Text className="text-gray-700 font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {t('vehicle.contact')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Vehicle Details */}
      <View>
        <Text className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: 'Cairo_700Bold' }}>
          {t('vehicle.vehicleDetails')}
        </Text>
        <View className="flex-row flex-wrap">
          <View className="w-1/2 mb-4">
            <View className="flex-row items-center">
              <CarIcon size={20} color="#10B981" />
              <Text className={`text-gray-700 capitalize ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                {vehicle.vehicle_type}
              </Text>
            </View>
          </View>
          <View className="w-1/2 mb-4">
            <View className="flex-row items-center">
              <Users size={20} color="#10B981" />
              <Text className={`text-gray-700 ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                {vehicle.seats} {t('vehicle.seats')}
              </Text>
            </View>
          </View>
          <View className="w-1/2 mb-4">
            <View className="flex-row items-center">
              <Fuel size={20} color="#10B981" />
              <Text className={`text-gray-700 capitalize ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                {vehicle.fuel_type}
              </Text>
            </View>
          </View>
          <View className="w-1/2 mb-4">
            <View className="flex-row items-center">
              <SettingsIcon size={20} color="#10B981" />
              <Text className={`text-gray-700 capitalize ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                {vehicle.transmission}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Make/Model/Year */}
      <View className="bg-emerald-50 rounded-xl p-4">
        <Text className="text-base font-semibold text-gray-900 mb-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
          {vehicle.brand} {vehicle.model}
        </Text>
        <Text className="text-sm text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
          {t('vehicle.year')} {vehicle.year}
        </Text>
      </View>

      {/* Description */}
      <View>
        <Text className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Cairo_700Bold' }}>
          {t('vehicle.aboutVehicle')}
        </Text>
        <TranslatableContent content={vehicle.description} contentType="description">
          <Text className="text-gray-600 leading-6" style={{ fontFamily: 'Cairo_400Regular' }}>
            {vehicle.description}
          </Text>
        </TranslatableContent>
      </View>

      {/* Insurance & Protection */}
      {vehicle.insurance_included && (
        <View>
          <Text className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Cairo_700Bold' }}>
            {t('vehicle.insurance')}
          </Text>
          <View className="bg-green-50 border border-green-200 rounded-xl p-4">
            <Text className="text-green-800 font-semibold mb-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
              {t('vehicle.insuranceIncluded')}
            </Text>
            <Text className="text-green-700 text-sm" style={{ fontFamily: 'Cairo_400Regular' }}>
              {t('vehicle.insuranceText')}
            </Text>
          </View>
        </View>
      )}

      {/* Rental Terms */}
      <View>
        <Text className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: 'Cairo_700Bold' }}>
          {t('vehicle.rentalTerms')}
        </Text>
        <View className="space-y-2">
          {vehicle.mileage_limit && (
            <View className="bg-gray-50 rounded-xl p-3">
              <Text className="text-sm text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                <Text className="font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {t('vehicle.mileageIncluded')}
                </Text> {vehicle.mileage_limit} km/day
              </Text>
              {vehicle.extra_mileage_rate && (
                <Text className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                  <Text className="font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    {t('vehicle.extraMileage')}
                  </Text> ${vehicle.extra_mileage_rate}/km
                </Text>
              )}
            </View>
          )}
          {vehicle.min_driver_age && (
            <View className="bg-gray-50 rounded-xl p-3">
              <Text className="text-sm text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                <Text className="font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {t('vehicle.minDriverAge')}
                </Text> {vehicle.min_driver_age} {t('vehicle.years')}
              </Text>
            </View>
          )}
          {vehicle.license_requirements && (
            <View className="bg-gray-50 rounded-xl p-3">
              <Text className="text-sm text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                <Text className="font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {t('vehicle.licenseRequirements')}
                </Text> {vehicle.license_requirements}
              </Text>
            </View>
          )}
          {vehicle.cleaning_fee && vehicle.cleaning_fee > 0 && (
            <View className="bg-gray-50 rounded-xl p-3">
              <Text className="text-sm text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                <Text className="font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {t('vehicle.cleaningFee')}
                </Text> ${vehicle.cleaning_fee}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderFeatures = () => (
    <View className="px-4 py-4">
      <Text className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'Cairo_700Bold' }}>
        {t('vehicle.availableFeatures')}
      </Text>
      <View className="flex-row flex-wrap">
        {vehicle.features.map((feature, index) => {
          const Icon = getAmenityIcon(feature);
          return (
            <View key={index} className="w-1/2 mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center">
                  <Icon size={20} color="#10B981" />
                </View>
                <Text className={`text-gray-700 flex-1 ${isRTL ? 'mr-3' : 'ml-3'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                  {formatAmenityName(feature)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderReviews = () => (
    <View className="px-4 py-4">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
          {t('vehicle.reviews')} ({reviews.length})
        </Text>
        {averageRating && (
          <View className="flex-row items-center">
            <Star size={18} color="#F59E0B" fill="#F59E0B" />
            <Text className={`text-base font-semibold text-gray-900 ${isRTL ? 'mr-1' : 'ml-1'}`} style={{ fontFamily: 'Cairo_600SemiBold' }}>
              {averageRating}
            </Text>
          </View>
        )}
      </View>

      {reviews.length === 0 ? (
        <Text className="text-gray-500 text-center py-8" style={{ fontFamily: 'Cairo_400Regular' }}>
          {t('vehicle.noReviews')}
        </Text>
      ) : (
        <View className="space-y-4">
          {reviews.map((review) => (
            <View key={review.id} className="bg-gray-50 rounded-xl p-4">
              <View className="flex-row items-center mb-2">
                {review.profiles && (
                  <>
                    <Image
                      source={{ uri: review.profiles.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(review.profiles.full_name) }}
                      className="w-10 h-10 rounded-full"
                    />
                    <View className={`flex-1 ${isRTL ? 'mr-3' : 'ml-3'}`}>
                      <Text className="font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                        {review.profiles.full_name}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Star size={14} color="#F59E0B" fill="#F59E0B" />
                        <Text className={`text-sm text-gray-600 ${isRTL ? 'mr-1' : 'ml-1'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                          {review.overall_rating.toFixed(1)}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
              {review.title && (
                <Text className="font-semibold text-gray-900 mb-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {review.title}
                </Text>
              )}
              {review.comment && (
                <TranslatableContent content={review.comment} contentType="review">
                  <Text className="text-gray-600 leading-5" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {review.comment}
                  </Text>
                </TranslatableContent>
              )}
              <Text className="text-xs text-gray-400 mt-2" style={{ fontFamily: 'Cairo_400Regular' }}>
                {new Date(review.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderLocation = () => (
    <View className="px-4 py-4">
      <Text className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: 'Cairo_700Bold' }}>
        {t('vehicle.location')}
      </Text>
      <View className="flex-row items-center mb-4">
        <MapPin size={20} color="#10B981" />
        <Text className={`text-gray-700 ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
          {vehicle.location}
        </Text>
      </View>

      {!vehicle.show_exact_location && (
        <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <Text className="text-sm text-amber-800" style={{ fontFamily: 'Cairo_400Regular' }}>
            {t('vehicle.exactLocationInfo')}
          </Text>
        </View>
      )}

      {vehicle.latitude && vehicle.longitude ? (
        <PropertyMap
          latitude={vehicle.latitude}
          longitude={vehicle.longitude}
          location={vehicle.location}
          showExactLocation={vehicle.show_exact_location ?? true}
        />
      ) : (
        <View className="bg-gray-100 rounded-xl h-64 items-center justify-center">
          <MapPin size={32} color="#9CA3AF" />
          <Text className="text-gray-500 mt-2" style={{ fontFamily: 'Cairo_400Regular' }}>
            {t('vehicle.locationNotAvailable')}
          </Text>
        </View>
      )}
    </View>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: t('vehicle.overview') },
    { key: 'features', label: t('vehicle.features') },
    { key: 'reviews', label: t('vehicle.reviews') },
    { key: 'location', label: t('vehicle.location') },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerBackTitle: 'Back',
          headerTintColor: '#000',
          headerRight: () => (
            <View className={`flex-row gap-2 ${isRTL ? 'ml-2' : 'mr-2'}`}>
              <Pressable
                onPress={handleShare}
                className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm"
              >
                <Share2 size={20} color="#000" />
              </Pressable>
              <Pressable
                onPress={handleToggleWishlist}
                className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm"
              >
                <Heart
                  size={20}
                  color={isInWishlist ? '#EF4444' : '#000'}
                  fill={isInWishlist ? '#EF4444' : 'none'}
                />
              </Pressable>
            </View>
          ),
        }}
      />
      <View className="flex-1 bg-white">
        {/* Header with Image */}
        <Pressable onPress={() => setShowGallery(true)} className="relative">
          <Image
            source={{ uri: mainImage }}
            className="w-full h-80"
            resizeMode="cover"
          />

          {/* Photo Count Badge */}
          {images.length > 1 && (
            <View className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} bg-black/60 rounded-full px-3 py-1`}>
              <Text className="text-white text-xs font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {images.length} {t('common.photos')}
              </Text>
            </View>
          )}

          {/* Featured Badge */}
          {vehicle.featured && (
            <View className={`absolute bottom-4 ${isRTL ? 'right-4' : 'left-4'} bg-emerald-500 rounded-full px-3 py-1`}>
              <Text className="text-white text-xs font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {t('vehicle.featured')}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Title and Info */}
        <View className="px-4 py-4 border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Cairo_700Bold' }}>
            {vehicle.title}
          </Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              {averageRating && (
                <View className={`flex-row items-center ${isRTL ? 'ml-4' : 'mr-4'}`}>
                  <Star size={16} color="#F59E0B" fill="#F59E0B" />
                  <Text className={`text-sm font-semibold text-gray-900 ${isRTL ? 'mr-1' : 'ml-1'}`} style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    {averageRating}
                  </Text>
                  <Text className={`text-sm text-gray-500 ${isRTL ? 'mr-1' : 'ml-1'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                    ({reviews.length})
                  </Text>
                </View>
              )}
              <View className="flex-row items-center">
                <MapPin size={16} color="#6B7280" />
                <Text className={`text-sm text-gray-600 ${isRTL ? 'mr-1' : 'ml-1'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                  {vehicle.location}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row border-b border-gray-200">
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className="flex-1 py-3 items-center"
            >
              <Text
                className={`text-sm font-semibold ${
                  activeTab === tab.key ? 'text-emerald-500' : 'text-gray-500'
                }`}
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                {tab.label}
              </Text>
              {activeTab === tab.key && (
                <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
              )}
            </Pressable>
          ))}
        </View>

        {/* Tab Content */}
        <ScrollView className="flex-1 mb-20">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'features' && renderFeatures()}
          {activeTab === 'reviews' && renderReviews()}
          {activeTab === 'location' && renderLocation()}
        </ScrollView>

        {/* Bottom Booking Bar */}
        <View className="absolute bottom-0 left-0 right-0 border-t border-gray-200 pt-4 px-4 pb-8 bg-white" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 }}>
          <View className="flex-row items-center justify-between">
            <View className={`flex-1 ${isRTL ? 'ml-4' : 'mr-4'}`}>
              <View className="flex-row items-center">
                {/* Original price (struck through if discounted) */}
                {pricingInfo.hasDiscount && (
                  <Text className="text-lg text-gray-400 line-through mr-2" style={{ fontFamily: 'Cairo_400Regular' }}>
                    ${pricingInfo.originalPrice}
                  </Text>
                )}

                {/* Display price */}
                <Text className={`text-2xl font-bold ${pricingInfo.hasDiscount ? 'text-red-600' : 'text-gray-900'}`} style={{ fontFamily: 'Cairo_700Bold' }}>
                  ${pricingInfo.displayPrice}
                  <Text className="text-base font-normal text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {' '}{t('vehicle.perDay')}
                  </Text>
                </Text>

                {/* Discount badge */}
                {pricingInfo.hasDiscount && (
                  <View className="ml-2 bg-red-500/90 px-2 py-1 rounded-full flex-row items-center">
                    <Percent size={10} color="#fff" />
                    <Text className="text-white text-xs font-semibold ml-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                      -{pricingInfo.discountPercentage}%
                    </Text>
                  </View>
                )}
              </View>

              {averageRating && (
                <View className="flex-row items-center mt-1">
                  <Star size={14} color="#F59E0B" fill="#F59E0B" />
                  <Text className={`text-sm text-gray-600 ${isRTL ? 'mr-1' : 'ml-1'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                    {averageRating} ({reviews.length} {t('vehicle.reviews')})
                  </Text>
                </View>
              )}
            </View>
            <Pressable
              className="bg-emerald-500 rounded-xl px-8 py-3"
              onPress={handleReservePress}
            >
              <Text className="text-white font-bold text-base" style={{ fontFamily: 'Cairo_700Bold' }}>
                {t('vehicle.reserve')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Booking Modal */}
      {vehicle && (
        <VehicleBookingModal
          visible={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          vehicle={vehicle}
          onSuccess={(bookingId) => {
            console.log('Vehicle booking created:', bookingId);
          }}
        />
      )}

      {/* Host Profile Modal */}
      {vehicle && vehicle.owner_id && (
        <HostProfileModal
          hostId={vehicle.owner_id}
          isOpen={showHostProfile}
          onClose={() => setShowHostProfile(false)}
          onStartConversation={() => {
            setShowHostProfile(false);
            setShowContactModal(true);
          }}
        />
      )}

      {/* Contact Host Modal */}
      {vehicle && vehicle.owner_id && vehicle.profiles && (
        <ContactHostModal
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
          host={{
            id: vehicle.owner_id,
            full_name: vehicle.profiles.full_name,
            avatar_url: vehicle.profiles.avatar_url,
          }}
          property={{
            id: vehicle.id,
            title: vehicle.title,
            type: 'vehicle',
          }}
        />
      )}

      {/* Photo Gallery */}
      {images.length > 0 && (
        <PhotoGallery
          images={images}
          initialIndex={0}
          visible={showGallery}
          onClose={() => setShowGallery(false)}
        />
      )}
    </>
  );
}
