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
import { Heart, MapPin, Star, ChevronLeft, Share2, Users, Bed, Bath, Home as HomeIcon, Percent } from 'lucide-react-native';
import { useAccommodationDetail, useAccommodationReviews, useAccommodationWishlistStatus, useToggleAccommodationWishlist, useCancellationPolicy, calculateAverageRating, formatCancellationRule } from '@/lib/api/accommodation-details';
import { supabase } from '@/lib/supabase';
import { getAmenityIcon, formatAmenityName } from '@/lib/amenities';
import PropertyMap from '@/components/PropertyMap';
import AccommodationBookingModal from '@/components/AccommodationBookingModal';
import HostProfileModal from '@/components/HostProfileModal';
import ContactHostModal from '@/components/ContactHostModal';
import PhotoGallery from '@/components/PhotoGallery';
import { TranslatableContent } from '@/components/TranslateButton';
import { useTranslation } from '@/lib/i18n';
import {
  useAccommodationPricingRules,
  useLowestRoomPrice,
  getListingDisplayPrice,
} from '@/lib/api/pricing';

const { width } = Dimensions.get('window');

type Tab = 'overview' | 'amenities' | 'reviews' | 'location';

export default function AccommodationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
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
  const { data: accommodation, isLoading } = useAccommodationDetail(id);
  const { data: reviews = [] } = useAccommodationReviews(id);
  const { data: isInWishlist = false } = useAccommodationWishlistStatus(id, userId);
  const { data: cancellationPolicy } = useCancellationPolicy(accommodation?.cancellation_policy_id);
  const toggleWishlist = useToggleAccommodationWishlist();

  // Fetch dynamic pricing
  const isHotel = accommodation?.property_type === 'hotel' || accommodation?.property_type === 'resort';
  const { data: pricingRules = [] } = useAccommodationPricingRules(accommodation?.id);
  const { data: roomPriceData } = useLowestRoomPrice(isHotel ? accommodation?.id : undefined);

  // Calculate display price
  const hasRooms = roomPriceData?.hasRooms ?? false;
  const lowestRoomPrice = roomPriceData?.lowestPrice ?? null;
  const basePrice = accommodation?.price_per_night || 0;

  const pricingInfo = getListingDisplayPrice(
    basePrice,
    pricingRules,
    hasRooms,
    lowestRoomPrice
  );

  const averageRating = calculateAverageRating(reviews);

  const handleToggleWishlist = () => {
    if (!userId) {
      router.push('/auth/login');
      return;
    }
    if (!id) return;

    toggleWishlist.mutate({
      accommodationId: id,
      userId,
      isCurrentlyInWishlist: isInWishlist,
    });
  };

  const handleShare = async () => {
    try {
      const url = `https://nestoria-travel.com/accommodation/${id}`;
      const message = `I found this amazing place on Nestoria! 🏡✨\n\n${accommodation?.title || 'Check out this accommodation'}\n\n${url}`;

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
        t('accommodation.signInRequired') || 'Sign In Required',
        t('accommodation.signInToBook') || 'Please sign in to make a booking request. You can create an account or sign in to continue.',
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

  if (!accommodation) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-lg text-gray-900 font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
          {t('accommodation.notFound')}
        </Text>
      </View>
    );
  }

  const images = accommodation.images || [];
  const mainImage = accommodation.main_image_url || images[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800';

  const renderOverview = () => (
    <View className="px-4 py-4 space-y-6">
      {/* Host Card */}
      {accommodation.profiles && (
        <View className="bg-gray-50 rounded-2xl p-4">
          <View className="flex-row items-center mb-3">
            <Image
              source={{ uri: accommodation.profiles.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(accommodation.profiles.full_name) }}
              className="w-14 h-14 rounded-full"
            />
            <View className={`flex-1 ${isRTL ? 'mr-3' : 'ml-3'}`}>
              <Text className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {accommodation.profiles.full_name}
              </Text>
              <Text className="text-sm text-gray-500" style={{ fontFamily: 'Cairo_400Regular' }}>
                {t('accommodation.host')}
              </Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              className="flex-1 bg-emerald-500 rounded-xl py-3 items-center"
              onPress={() => setShowHostProfile(true)}
            >
              <Text className="text-white font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {t('accommodation.viewProfile')}
              </Text>
            </Pressable>
            <Pressable
              className="flex-1 bg-white border border-gray-200 rounded-xl py-3 items-center"
              onPress={() => setShowContactModal(true)}
            >
              <Text className="text-gray-700 font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {t('accommodation.contact')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Property Details */}
      <View>
        <Text className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: 'Cairo_700Bold' }}>
          {t('accommodation.propertyDetails')}
        </Text>
        <View className="flex-row flex-wrap">
          <View className="w-1/2 mb-4">
            <View className="flex-row items-center">
              <Users size={20} color="#10B981" />
              <Text className={`text-gray-700 ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                {accommodation.max_guests} {t('accommodation.guests')}
              </Text>
            </View>
          </View>
          <View className="w-1/2 mb-4">
            <View className="flex-row items-center">
              <Bed size={20} color="#10B981" />
              <Text className={`text-gray-700 ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                {accommodation.bedrooms} {t('accommodation.bedrooms')}
              </Text>
            </View>
          </View>
          <View className="w-1/2 mb-4">
            <View className="flex-row items-center">
              <Bath size={20} color="#10B981" />
              <Text className={`text-gray-700 ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                {accommodation.bathrooms} {t('accommodation.bathrooms')}
              </Text>
            </View>
          </View>
          <View className="w-1/2 mb-4">
            <View className="flex-row items-center">
              <HomeIcon size={20} color="#10B981" />
              <Text className={`text-gray-700 capitalize ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                {accommodation.property_type}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Description */}
      <View>
        <Text className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Cairo_700Bold' }}>
          {t('accommodation.aboutPlace')}
        </Text>
        <TranslatableContent content={accommodation.description} contentType="description">
          <Text className="text-gray-600 leading-6" style={{ fontFamily: 'Cairo_400Regular' }}>
            {accommodation.description}
          </Text>
        </TranslatableContent>
      </View>

      {/* House Rules */}
      {accommodation.house_rules && (
        <View>
          <Text className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Cairo_700Bold' }}>
            {t('accommodation.houseRules')}
          </Text>

          {/* Preset rules (not translated) */}
          {accommodation.house_rules.presets && accommodation.house_rules.presets.length > 0 && (
            <View className="space-y-2 mb-3">
              {accommodation.house_rules.presets.map((rule, index) => (
                <Text key={index} className="text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                  • {rule}
                </Text>
              ))}
            </View>
          )}

          {/* Custom notes (translatable) */}
          {accommodation.house_rules.notes && (
            <TranslatableContent content={accommodation.house_rules.notes} contentType="description">
              <Text className="text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                {accommodation.house_rules.notes}
              </Text>
            </TranslatableContent>
          )}
        </View>
      )}

      {/* Cancellation Policy */}
      {cancellationPolicy && (
        <View>
          <Text className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Cairo_700Bold' }}>
            {t('accommodation.cancellationPolicy')}
          </Text>
          <Text className="text-base font-semibold text-gray-800 mb-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
            {cancellationPolicy.name}
          </Text>

          {/* Description (translatable) */}
          <TranslatableContent content={cancellationPolicy.description} contentType="description">
            <Text className="text-gray-600 mb-3" style={{ fontFamily: 'Cairo_400Regular' }}>
              {cancellationPolicy.description}
            </Text>
          </TranslatableContent>

          {/* Rules (not translated - structured data) */}
          {cancellationPolicy.rules && cancellationPolicy.rules.length > 0 && (
            <View className="space-y-2">
              {cancellationPolicy.rules.map((rule) => (
                <Text key={rule.id} className="text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                  • {formatCancellationRule(rule)}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Additional Info */}
      <View className="bg-gray-50 rounded-xl p-4">
        <Text className="text-sm text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
          <Text className="font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
            {t('accommodation.minStay')}
          </Text> {accommodation.min_stay} {accommodation.min_stay > 1 ? t('accommodation.nights') : t('accommodation.night')}
        </Text>
        {accommodation.max_stay && (
          <Text className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Cairo_400Regular' }}>
            <Text className="font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
              {t('accommodation.maxStay')}
            </Text> {accommodation.max_stay} {t('accommodation.nights')}
          </Text>
        )}
        <Text className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Cairo_400Regular' }}>
          <Text className="font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
            {t('accommodation.cleaningFee')}
          </Text> ${accommodation.cleaning_fee}
        </Text>
      </View>
    </View>
  );

  const renderAmenities = () => (
    <View className="px-4 py-4">
      <Text className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'Cairo_700Bold' }}>
        {t('accommodation.availableAmenities')}
      </Text>
      <View className="flex-row flex-wrap">
        {accommodation.amenities.map((amenity, index) => {
          const Icon = getAmenityIcon(amenity);
          return (
            <View key={index} className="w-1/2 mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center">
                  <Icon size={20} color="#10B981" />
                </View>
                <Text className={`text-gray-700 flex-1 ${isRTL ? 'mr-3' : 'ml-3'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
                  {formatAmenityName(amenity)}
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
          {t('accommodation.reviews')} ({reviews.length})
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
          {t('accommodation.noReviews')}
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
        {t('accommodation.location')}
      </Text>
      <View className="flex-row items-center mb-4">
        <MapPin size={20} color="#10B981" />
        <Text className={`text-gray-700 ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_400Regular' }}>
          {accommodation.location}
        </Text>
      </View>

      {!accommodation.show_exact_location && (
        <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <Text className="text-sm text-amber-800" style={{ fontFamily: 'Cairo_400Regular' }}>
            {t('accommodation.exactLocationInfo')}
          </Text>
        </View>
      )}

      {accommodation.latitude && accommodation.longitude ? (
        <PropertyMap
          latitude={accommodation.latitude}
          longitude={accommodation.longitude}
          location={accommodation.location}
          showExactLocation={accommodation.show_exact_location ?? true}
        />
      ) : (
        <View className="bg-gray-100 rounded-xl h-64 items-center justify-center">
          <MapPin size={32} color="#9CA3AF" />
          <Text className="text-gray-500 mt-2" style={{ fontFamily: 'Cairo_400Regular' }}>
            {t('accommodation.locationNotAvailable')}
          </Text>
        </View>
      )}
    </View>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: t('accommodation.overview') },
    { key: 'amenities', label: t('accommodation.amenities') },
    { key: 'reviews', label: t('accommodation.reviews') },
    { key: 'location', label: t('accommodation.location') },
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
          {accommodation.featured && (
            <View className={`absolute bottom-4 ${isRTL ? 'right-4' : 'left-4'} bg-emerald-500 rounded-full px-3 py-1`}>
              <Text className="text-white text-xs font-semibold" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {t('accommodation.featured')}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Title and Info */}
        <View className="px-4 py-4 border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Cairo_700Bold' }}>
            {accommodation.title}
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
                  {accommodation.location}
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
          {activeTab === 'amenities' && renderAmenities()}
          {activeTab === 'reviews' && renderReviews()}
          {activeTab === 'location' && renderLocation()}
        </ScrollView>

        {/* Bottom Booking Bar */}
        <View className="absolute bottom-0 left-0 right-0 border-t border-gray-200 pt-4 px-4 pb-8 bg-white" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 }}>
          <View className="flex-row items-center justify-between">
            <View className={`flex-1 ${isRTL ? 'ml-4' : 'mr-4'}`}>
              <View className="flex-row items-center">
                {/* From label for hotels */}
                {pricingInfo.showFromLabel && (
                  <Text className="text-base text-gray-600 mr-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {t('common.from')}
                  </Text>
                )}

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
                    {' '}{t('accommodation.perNight')}
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
                    {averageRating} ({reviews.length} {t('accommodation.reviews')})
                  </Text>
                </View>
              )}
            </View>
            <Pressable
              className="bg-emerald-500 rounded-xl px-8 py-3"
              onPress={handleReservePress}
            >
              <Text className="text-white font-bold text-base" style={{ fontFamily: 'Cairo_700Bold' }}>
                {t('accommodation.reserve')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Booking Modal */}
      {accommodation && (
        <AccommodationBookingModal
          visible={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          accommodation={accommodation}
          onSuccess={(bookingId) => {
            console.log('Booking created:', bookingId);
          }}
        />
      )}

      {/* Host Profile Modal */}
      {accommodation && accommodation.host_id && (
        <HostProfileModal
          hostId={accommodation.host_id}
          isOpen={showHostProfile}
          onClose={() => setShowHostProfile(false)}
          onStartConversation={() => {
            setShowHostProfile(false);
            setShowContactModal(true);
          }}
        />
      )}

      {/* Contact Host Modal */}
      {accommodation && accommodation.host_id && accommodation.profiles && (
        <ContactHostModal
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
          host={{
            id: accommodation.host_id,
            full_name: accommodation.profiles.full_name,
            avatar_url: accommodation.profiles.avatar_url,
          }}
          property={{
            id: accommodation.id,
            title: accommodation.title,
            type: 'accommodation',
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
