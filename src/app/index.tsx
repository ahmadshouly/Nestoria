import React, { useEffect } from 'react';
import { View, Text, Pressable, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plane, Home, Car, MapPin } from 'lucide-react-native';
import { useAuth } from '@/lib/api/auth';
import * as SplashScreen from 'expo-splash-screen';
import { useTranslation } from '@/lib/i18n';

export default function WelcomeScreen() {
  const { data: authData, isLoading } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    // Hide splash screen when auth check is complete
    if (!isLoading) {
      SplashScreen.hideAsync();

      // If user is already authenticated, check their role
      if (authData?.user) {
        // Check if user is a supplier/host
        if (authData?.profile?.role === 'supplier') {
          console.log('🚫 Supplier detected, redirecting to supplier-redirect screen');
          router.replace('/supplier-redirect');
        } else {
          // Client user - go to tabs
          router.replace('/(tabs)');
        }
      }
    }
  }, [isLoading, authData?.user, authData?.profile?.role]);

  if (isLoading) {
    return null; // Keep splash screen visible
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 py-8">
        {/* Logo and Hero Section */}
        <View className="flex-1 items-center justify-center">
          <View className="flex-row items-center mb-6">
            <Home size={48} color="#10B981" strokeWidth={2.5} />
            <Text className="text-4xl font-bold text-gray-900 ml-3" style={{ fontFamily: 'Cairo_700Bold' }}>
              {t('landing.title')}
            </Text>
          </View>
          <Text className="text-lg text-gray-600 text-center mb-12 px-8" style={{ fontFamily: 'Cairo_400Regular' }}>
            {t('landing.subtitle')}
          </Text>

          {/* Features Grid */}
          <View className="w-full flex-row flex-wrap justify-center gap-4 mb-12">
            <View className="items-center">
              <View className="w-16 h-16 rounded-2xl bg-emerald-50 items-center justify-center mb-2">
                <Home size={28} color="#10B981" />
              </View>
              <Text className="text-xs font-semibold text-gray-700">{t('landing.stays')}</Text>
            </View>

            <View className="items-center">
              <View className="w-16 h-16 rounded-2xl bg-emerald-50 items-center justify-center mb-2">
                <Car size={28} color="#10B981" />
              </View>
              <Text className="text-xs font-semibold text-gray-700">{t('landing.rentals')}</Text>
            </View>

            <View className="items-center">
              <View className="w-16 h-16 rounded-2xl bg-emerald-50 items-center justify-center mb-2">
                <Plane size={28} color="#10B981" />
              </View>
              <Text className="text-xs font-semibold text-gray-700">{t('landing.flights')}</Text>
              <Text className="text-[9px] text-emerald-600 font-semibold mt-0.5">{t('landing.comingSoon')}</Text>
            </View>

            <View className="items-center">
              <View className="w-16 h-16 rounded-2xl bg-emerald-50 items-center justify-center mb-2">
                <MapPin size={28} color="#10B981" />
              </View>
              <Text className="text-xs font-semibold text-gray-700">{t('landing.explore')}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="pb-4">
          <Pressable
            onPress={() => router.push('/auth/sign-up')}
            className="bg-emerald-500 rounded-2xl py-4 items-center justify-center mb-3 active:opacity-80 shadow-lg"
          >
            <Text className="text-white text-lg font-bold">{t('landing.getStarted')}</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/auth/sign-in')}
            className="bg-white border-2 border-emerald-500 rounded-2xl py-4 items-center justify-center mb-3 active:opacity-80"
          >
            <Text className="text-emerald-600 text-lg font-bold">{t('landing.signIn')}</Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace('/(tabs)')}
            className="py-3 items-center"
          >
            <Text className="text-gray-500 text-base">{t('landing.continueGuest')}</Text>
          </Pressable>

          {/* Privacy & Terms */}
          <View className="flex-row items-center justify-center mt-4">
            <Pressable onPress={() => Linking.openURL('https://nestoria-travel.com/privacy')}>
              <Text className="text-gray-600 text-sm underline">{t('landing.privacy')}</Text>
            </Pressable>
            <Text className="text-gray-400 mx-2">•</Text>
            <Pressable onPress={() => Linking.openURL('https://nestoria-travel.com/terms')}>
              <Text className="text-gray-600 text-sm underline">{t('landing.terms')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
