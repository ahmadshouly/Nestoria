import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { X, Star, Shield, CheckCircle, MessageCircle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';

interface HostProfileModalProps {
  hostId: string;
  isOpen: boolean;
  onClose: () => void;
  onStartConversation?: () => void;
}

interface HostProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
  user_id: string;
  profile_verified?: boolean;
}

interface HostStats {
  totalProperties: number;
  totalReviews: number;
  averageRating: number;
  responseRate: number;
  isVerified: boolean;
  isSuperhost: boolean;
}

interface HostReview {
  id: string;
  overall_rating: number;
  comment?: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
}

// Fetch complete host profile with stats and reviews
async function fetchHostProfile(hostId: string) {
  // 1. Fetch Host Profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', hostId)
    .single();

  if (profileError) throw profileError;

  // 2. Fetch Host Properties (accommodations + vehicles)
  const { data: accommodations } = await supabase
    .from('accommodations')
    .select('id, is_superhost')
    .eq('host_id', hostId)
    .eq('status', 'approved');

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id')
    .eq('owner_id', hostId)
    .eq('status', 'approved');

  const totalProperties = (accommodations?.length || 0) + (vehicles?.length || 0);
  const isSuperhost = accommodations?.some((acc) => acc.is_superhost) || false;

  // 3. Fetch Reviews for All Host Properties
  const accommodationIds = (accommodations || []).map((a) => a.id);
  const vehicleIds = (vehicles || []).map((v) => v.id);

  let reviews: any[] = [];
  if (accommodationIds.length > 0 || vehicleIds.length > 0) {
    let reviewsQuery = supabase
      .from('property_reviews')
      .select(`
        id,
        overall_rating,
        comment,
        created_at,
        profiles!reviewer_id(full_name, avatar_url)
      `)
      .eq('status', 'approved');

    // Build OR condition for both property types
    if (accommodationIds.length > 0 && vehicleIds.length > 0) {
      reviewsQuery = reviewsQuery.or(
        `accommodation_id.in.(${accommodationIds.join(',')}),vehicle_id.in.(${vehicleIds.join(',')})`
      );
    } else if (accommodationIds.length > 0) {
      reviewsQuery = reviewsQuery.in('accommodation_id', accommodationIds);
    } else if (vehicleIds.length > 0) {
      reviewsQuery = reviewsQuery.in('vehicle_id', vehicleIds);
    }

    const { data: reviewsData } = await reviewsQuery.order('created_at', { ascending: false });
    reviews = reviewsData || [];
  }

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.overall_rating, 0) / totalReviews
      : 0;

  // 4. Calculate Response Rate
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('host_id', hostId);

  let responseRate = 100; // Default if no conversations
  if (conversations && conversations.length > 0) {
    const { data: messages } = await supabase
      .from('messages')
      .select('conversation_id, sender_id')
      .in('conversation_id', conversations.map((c) => c.id));

    if (messages && messages.length > 0) {
      const conversationsWithHostResponse = conversations.filter((conv) =>
        messages.some((msg) => msg.conversation_id === conv.id && msg.sender_id === hostId)
      );
      responseRate = Math.round(
        (conversationsWithHostResponse.length / conversations.length) * 100
      );
    }
  }

  const stats: HostStats = {
    totalProperties,
    totalReviews,
    averageRating,
    responseRate,
    isVerified: profile.profile_verified || false,
    isSuperhost,
  };

  return {
    profile: profile as HostProfile,
    stats,
    reviews: reviews as HostReview[],
  };
}

export default function HostProfileModal({
  hostId,
  isOpen,
  onClose,
  onStartConversation,
}: HostProfileModalProps) {
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const [activeTab, setActiveTab] = useState<'about' | 'reviews'>('about');

  const { data, isLoading, error } = useQuery({
    queryKey: ['hostProfile', hostId],
    queryFn: () => fetchHostProfile(hostId),
    enabled: isOpen && !!hostId,
  });

  const profile = data?.profile;
  const stats = data?.stats;
  const reviews = data?.reviews || [];

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : null;

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="border-b border-gray-200 px-4 py-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
              {t('accommodation.hostProfile')}
            </Text>
            <Pressable
              onPress={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
            >
              <X size={20} color="#000" />
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        ) : error || !profile || !stats ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-gray-600 text-center" style={{ fontFamily: 'Cairo_400Regular' }}>
              {t('accommodation.hostNotFound')}
            </Text>
          </View>
        ) : (
          <>
            <ScrollView className="flex-1">
              {/* Host Header */}
              <View className="px-4 py-6 items-center border-b border-gray-100">
                <Image
                  source={{
                    uri:
                      profile.avatar_url ||
                      'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.full_name),
                  }}
                  className="w-24 h-24 rounded-full mb-4"
                />
                <Text className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Cairo_700Bold' }}>
                  {profile.full_name}
                </Text>
                {memberSince && (
                  <Text className="text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {t('accommodation.memberSince')} {memberSince}
                  </Text>
                )}

                {/* Badges */}
                <View className="flex-row gap-2 mt-3">
                  {stats.isVerified && (
                    <View className="flex-row items-center bg-blue-50 px-3 py-1 rounded-full">
                      <Shield size={14} color="#3B82F6" />
                      <Text className={`text-xs text-blue-600 font-semibold ${isRTL ? 'mr-1' : 'ml-1'}`} style={{ fontFamily: 'Cairo_600SemiBold' }}>
                        {t('accommodation.verified')}
                      </Text>
                    </View>
                  )}
                  {stats.isSuperhost && (
                    <View className="flex-row items-center bg-emerald-50 px-3 py-1 rounded-full">
                      <Star size={14} color="#10B981" fill="#10B981" />
                      <Text className={`text-xs text-emerald-600 font-semibold ${isRTL ? 'mr-1' : 'ml-1'}`} style={{ fontFamily: 'Cairo_600SemiBold' }}>
                        {t('accommodation.superhost')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Stats Grid */}
              <View className="flex-row flex-wrap px-4 py-6 border-b border-gray-100">
                <View className="w-1/2 items-center mb-4">
                  <Text className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
                    {stats.totalProperties}
                  </Text>
                  <Text className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {t('accommodation.properties')}
                  </Text>
                </View>
                <View className="w-1/2 items-center mb-4">
                  <Text className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
                    {stats.totalReviews}
                  </Text>
                  <Text className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {t('accommodation.reviews')}
                  </Text>
                </View>
                <View className="w-1/2 items-center">
                  <View className="flex-row items-center">
                    <Star size={20} color="#F59E0B" fill="#F59E0B" />
                    <Text className={`text-2xl font-bold text-gray-900 ${isRTL ? 'mr-1' : 'ml-1'}`} style={{ fontFamily: 'Cairo_700Bold' }}>
                      {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}
                    </Text>
                  </View>
                  <Text className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {t('accommodation.rating')}
                  </Text>
                </View>
                <View className="w-1/2 items-center">
                  <Text className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
                    {stats.responseRate}%
                  </Text>
                  <Text className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {t('accommodation.responseRate')}
                  </Text>
                </View>
              </View>

              {/* Tabs */}
              <View className="flex-row border-b border-gray-200">
                <Pressable
                  onPress={() => setActiveTab('about')}
                  className="flex-1 py-3 items-center"
                >
                  <Text
                    className={`text-sm font-semibold ${
                      activeTab === 'about' ? 'text-emerald-500' : 'text-gray-500'
                    }`}
                    style={{ fontFamily: 'Cairo_600SemiBold' }}
                  >
                    {t('accommodation.about')}
                  </Text>
                  {activeTab === 'about' && (
                    <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setActiveTab('reviews')}
                  className="flex-1 py-3 items-center"
                >
                  <Text
                    className={`text-sm font-semibold ${
                      activeTab === 'reviews' ? 'text-emerald-500' : 'text-gray-500'
                    }`}
                    style={{ fontFamily: 'Cairo_600SemiBold' }}
                  >
                    {t('accommodation.reviews')} ({stats.totalReviews})
                  </Text>
                  {activeTab === 'reviews' && (
                    <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                  )}
                </Pressable>
              </View>

              {/* Tab Content */}
              {activeTab === 'about' ? (
                <View className="px-4 py-6">
                  <Text className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'Cairo_700Bold' }}>
                    {t('accommodation.aboutHost')}
                  </Text>

                  {stats.isSuperhost && (
                    <View className="bg-emerald-50 rounded-xl p-4 mb-4">
                      <View className="flex-row items-center mb-2">
                        <CheckCircle size={20} color="#10B981" />
                        <Text className={`text-base font-semibold text-gray-900 ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_600SemiBold' }}>
                          {profile.full_name} {t('accommodation.isSuperhost')}
                        </Text>
                      </View>
                      <Text className="text-sm text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                        {t('accommodation.superhostDesc')}
                      </Text>
                    </View>
                  )}

                  {stats.isVerified && (
                    <View className="bg-blue-50 rounded-xl p-4 mb-4">
                      <View className="flex-row items-center mb-2">
                        <Shield size={20} color="#3B82F6" />
                        <Text className={`text-base font-semibold text-gray-900 ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_600SemiBold' }}>
                          {t('accommodation.verifiedIdentity')}
                        </Text>
                      </View>
                      <Text className="text-sm text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                        {t('accommodation.verifiedDesc')}
                      </Text>
                    </View>
                  )}

                  <View className="space-y-3">
                    <View className="flex-row items-center">
                      <Text className="text-gray-600 flex-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                        {t('accommodation.properties')}:
                      </Text>
                      <Text className="font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                        {stats.totalProperties}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Text className="text-gray-600 flex-1" style={{ fontFamily: 'Cairo_400Regular' }}>
                        {t('accommodation.responseRate')}:
                      </Text>
                      <Text className="font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                        {stats.responseRate}%
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="px-4 py-6">
                  {reviews.length === 0 ? (
                    <Text className="text-gray-500 text-center py-8" style={{ fontFamily: 'Cairo_400Regular' }}>
                      {t('accommodation.noReviews')}
                    </Text>
                  ) : (
                    <View className="space-y-4">
                      {reviews.map((review) => (
                        <View key={review.id} className="bg-gray-50 rounded-xl p-4">
                          <View className="flex-row items-center mb-2">
                            <Image
                              source={{
                                uri:
                                  review.profiles.avatar_url ||
                                  'https://ui-avatars.com/api/?name=' +
                                    encodeURIComponent(review.profiles.full_name),
                              }}
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
                          </View>
                          {review.comment && (
                            <Text className="text-gray-600 leading-5" style={{ fontFamily: 'Cairo_400Regular' }}>
                              {review.comment}
                            </Text>
                          )}
                          <Text className="text-xs text-gray-400 mt-2" style={{ fontFamily: 'Cairo_400Regular' }}>
                            {new Date(review.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Contact Button */}
            {onStartConversation && (
              <View className="border-t border-gray-200 px-4 py-4">
                <Pressable
                  onPress={onStartConversation}
                  className="bg-emerald-500 rounded-xl py-4 flex-row items-center justify-center"
                >
                  <MessageCircle size={20} color="#FFF" />
                  <Text className={`text-white font-bold text-base ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_700Bold' }}>
                    {t('accommodation.contactHost')}
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}
