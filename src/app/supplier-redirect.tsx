import React, { useEffect } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Globe } from 'lucide-react-native';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

export default function SupplierRedirectScreen() {
  const { t } = useTranslation();

  useEffect(() => {
    // Prevent back navigation
    const handleBackPress = () => {
      handleLogout();
      return true; // Prevent default back behavior
    };

    // No need to add listener in web, just handle logout
    return () => {};
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/auth/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        {/* Icon */}
        <View className="w-32 h-32 bg-emerald-100 rounded-full items-center justify-center mb-8">
          <Globe size={64} color="#10B981" />
        </View>

        {/* Title */}
        <Text className="text-2xl font-bold text-gray-900 text-center mb-4" style={{ fontFamily: 'Cairo_700Bold' }}>
          Host Panel Access
        </Text>

        {/* Message */}
        <Text className="text-base text-gray-600 text-center mb-8 px-4" style={{ fontFamily: 'Cairo_400Regular' }}>
          This mobile app is designed for travelers. As a host/supplier, please use the web platform to manage your properties, bookings, and settings.
        </Text>

        {/* Web URL */}
        <View className="bg-gray-50 rounded-xl p-4 mb-8 w-full">
          <Text className="text-sm text-gray-500 text-center mb-2" style={{ fontFamily: 'Cairo_400Regular' }}>
            Access Host Panel at:
          </Text>
          <Text className="text-base font-semibold text-emerald-600 text-center" style={{ fontFamily: 'Cairo_600SemiBold' }}>
            nestoria.com
          </Text>
        </View>

        {/* Instructions */}
        <View className="bg-blue-50 rounded-xl p-4 mb-8 w-full">
          <Text className="text-sm text-blue-800 text-center" style={{ fontFamily: 'Cairo_400Regular' }}>
            💡 Please log out from this mobile app and access the web platform from your computer or browser.
          </Text>
        </View>

        {/* Logout Button */}
        <Pressable
          onPress={handleLogout}
          className="bg-emerald-500 px-8 py-4 rounded-xl flex-row items-center justify-center w-full active:opacity-80"
        >
          <LogOut size={20} color="#FFF" />
          <Text className="text-white text-base font-bold ml-2" style={{ fontFamily: 'Cairo_700Bold' }}>
            {t('common.logout')}
          </Text>
        </Pressable>

        {/* Footer Note */}
        <Text className="text-xs text-gray-400 text-center mt-8 px-4" style={{ fontFamily: 'Cairo_400Regular' }}>
          The mobile app provides the best experience for travelers browsing and booking accommodations.
        </Text>
      </View>
    </SafeAreaView>
  );
}
