import React from 'react';
import { View, Text, ScrollView, Image, Pressable, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  User,
  Settings,
  CreditCard,
  Bell,
  Shield,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Star,
  Edit3,
  Languages,
} from 'lucide-react-native';
import { useAuth, useSignOut, useUserStats } from '@/lib/api/auth';
import { useLanguageStore, useTranslation } from '@/lib/i18n';

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

function MenuItem({ icon, title, subtitle, onPress, showChevron = true }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-4 bg-white active:bg-gray-50"
    >
      <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
        {icon}
      </View>
      <View className="flex-1 ml-3">
        <Text
          className="text-base font-semibold text-gray-900"
          style={{ fontFamily: 'Cairo_600SemiBold' }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            className="text-sm text-gray-500 mt-0.5"
            style={{ fontFamily: 'Cairo_400Regular' }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {showChevron && <ChevronRight size={20} color="#9CA3AF" />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { data: authData, isLoading, refetch } = useAuth();
  const { data: stats } = useUserStats();
  const signOut = useSignOut();
  const { t, language } = useTranslation();
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const [imageError, setImageError] = React.useState(false);

  // Refetch profile when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refetch();
      setImageError(false); // Reset image error state on refetch
    }, [refetch])
  );

  const handleSignOut = () => {
    Alert.alert(
      t('profile.logout'),
      'Are you sure you want to sign out?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: () => signOut.mutate(),
        },
      ]
    );
  };

  const handleLanguageChange = () => {
    Alert.alert(
      t('profile.language'),
      'Select your preferred language',
      [
        {
          text: 'English',
          onPress: () => {
            setLanguage('en');
            Alert.alert('Success', 'Language changed to English. Please restart the app for full effect.');
          },
        },
        {
          text: 'العربية',
          onPress: () => {
            setLanguage('ar');
            Alert.alert('نجاح', 'تم تغيير اللغة إلى العربية. يرجى إعادة تشغيل التطبيق للحصول على التأثير الكامل.');
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const openExternalLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open this URL');
    }
  };

  // If not authenticated, show sign in prompt
  if (!isLoading && !authData?.user) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <View className="px-4 pt-2 pb-4">
          <Text
            className="text-3xl font-bold text-gray-900"
            style={{ fontFamily: 'Cairo_700Bold' }}
          >
            Profile
          </Text>
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <View className="w-24 h-24 rounded-3xl bg-emerald-100 items-center justify-center mb-6">
            <User size={48} color="#10B981" />
          </View>
          <Text
            className="text-2xl font-bold text-gray-900 mb-3"
            style={{ fontFamily: 'Cairo_700Bold' }}
          >
            {t('profile.signInPrompt')}
          </Text>
          <Text
            className="text-base text-gray-600 text-center mb-8"
            style={{ fontFamily: 'Cairo_400Regular' }}
          >
            Create an account or sign in to access your bookings, wishlist, and more
          </Text>

          <Pressable
            onPress={() => router.push('/auth/sign-in')}
            className="bg-emerald-500 rounded-xl py-4 px-8 items-center justify-center mb-3 active:opacity-80 w-full"
          >
            <Text
              className="text-white text-base font-bold"
              style={{ fontFamily: 'Cairo_700Bold' }}
            >
              Sign In
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/auth/sign-up')}
            className="bg-white border-2 border-emerald-500 rounded-xl py-4 px-8 items-center justify-center w-full active:opacity-80"
          >
            <Text
              className="text-emerald-600 text-base font-bold"
              style={{ fontFamily: 'Cairo_700Bold' }}
            >
              Create Account
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      <View className="px-4 pt-2 pb-4 bg-white">
        <Text
          className="text-3xl font-bold text-gray-900"
          style={{ fontFamily: 'Cairo_700Bold' }}
        >
          {t('profile.title')}
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View className="bg-white px-4 py-6 mb-2">
          <View className="flex-row items-center">
            {authData?.profile?.avatar_url && !imageError ? (
              <Image
                source={{ uri: authData.profile.avatar_url }}
                className="w-20 h-20 rounded-full bg-gray-200"
                onError={() => {
                  setImageError(true);
                }}
              />
            ) : (
              <View className="w-20 h-20 rounded-full bg-gray-200 items-center justify-center">
                <User size={40} color="#9CA3AF" />
              </View>
            )}
            <View className="flex-1 ml-4">
              <Text
                className="text-2xl font-bold text-gray-900"
                style={{ fontFamily: 'Cairo_700Bold' }}
              >
                {authData?.profile?.full_name || 'Guest User'}
              </Text>
              <Text
                className="text-sm text-gray-600 mt-1"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                {authData?.user?.email || 'guest@nestoria.com'}
              </Text>
              <View className="flex-row items-center mt-2">
                <View className="bg-emerald-100 px-2 py-1 rounded-full">
                  <Text
                    className="text-xs font-semibold text-emerald-700"
                    style={{ fontFamily: 'Cairo_600SemiBold' }}
                  >
                    {authData?.profile?.role === 'supplier' ? 'Host' : 'Traveler'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/profile/edit')}
            className="mt-4 bg-emerald-500 py-3 rounded-xl flex-row items-center justify-center active:opacity-80"
          >
            <Edit3 size={18} color="#FFF" />
            <Text
              className="text-white font-semibold ml-2"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('profile.editProfile')}
            </Text>
          </Pressable>
        </View>

        {/* Stats */}
        <View className="bg-white px-4 py-4 mb-2">
          <View className="flex-row">
            <View className="flex-1 items-center py-2">
              <Text
                className="text-2xl font-bold text-gray-900"
                style={{ fontFamily: 'Cairo_700Bold' }}
              >
                {stats?.trips || 0}
              </Text>
              <Text
                className="text-sm text-gray-600 mt-1"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                {t('profile.trips')}
              </Text>
            </View>
            <View className="w-px bg-gray-200" />
            <View className="flex-1 items-center py-2">
              <Text
                className="text-2xl font-bold text-gray-900"
                style={{ fontFamily: 'Cairo_700Bold' }}
              >
                {stats?.wishlists || 0}
              </Text>
              <Text
                className="text-sm text-gray-600 mt-1"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                {t('profile.wishlists')}
              </Text>
            </View>
            <View className="w-px bg-gray-200" />
            <View className="flex-1 items-center py-2">
              <Text
                className="text-2xl font-bold text-gray-900"
                style={{ fontFamily: 'Cairo_700Bold' }}
              >
                {stats?.reviews || 0}
              </Text>
              <Text
                className="text-sm text-gray-600 mt-1"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                {t('profile.reviews')}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View className="bg-white mb-2">
          <View className="px-4 py-3 border-b border-gray-100">
            <Text
              className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('profile.settings')}
            </Text>
          </View>
          <MenuItem
            icon={<User size={20} color="#374151" />}
            title={t('profile.personalInfo')}
            subtitle={t('profile.personalInfoSub')}
            onPress={() => router.push('/profile/edit')}
          />
          <View className="h-px bg-gray-100 ml-16" />
          <MenuItem
            icon={<Settings size={20} color="#374151" />}
            title={t('profile.accountSettings')}
            subtitle={t('profile.accountSettingsSub')}
            onPress={() => router.push('/profile/settings')}
          />
          <View className="h-px bg-gray-100 ml-16" />
          <MenuItem
            icon={<Languages size={20} color="#374151" />}
            title={t('profile.language')}
            subtitle={language === 'en' ? 'English' : 'العربية'}
            onPress={handleLanguageChange}
          />
        </View>

        {/* Hosting */}
        {authData?.profile?.role !== 'supplier' && (
          <View className="bg-white mb-2">
            <View className="px-4 py-3 border-b border-gray-100">
              <Text
                className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                {t('profile.hosting')}
              </Text>
            </View>
            <Pressable
              onPress={() => openExternalLink('https://nestoria-travel.com/supplier-auth')}
              className="px-4 py-4 bg-gradient-to-r active:opacity-90"
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text
                    className="text-base font-bold text-gray-900"
                    style={{ fontFamily: 'Cairo_700Bold' }}
                  >
                    {t('profile.becomeHost')}
                  </Text>
                  <Text
                    className="text-sm text-gray-600 mt-1"
                    style={{ fontFamily: 'Cairo_400Regular' }}
                  >
                    {t('profile.becomeHostSub')}
                  </Text>
                </View>
                <View className="w-12 h-12 rounded-full bg-emerald-100 items-center justify-center">
                  <Text className="text-2xl">🏡</Text>
                </View>
              </View>
            </Pressable>
          </View>
        )}

        {/* Support & Legal */}
        <View className="bg-white mb-2">
          <View className="px-4 py-3 border-b border-gray-100">
            <Text
              className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              Support & Legal
            </Text>
          </View>
          <MenuItem
            icon={<HelpCircle size={20} color="#374151" />}
            title={t('profile.help')}
            subtitle={t('profile.helpSub')}
            onPress={() => router.push('/profile/get-help')}
          />
          <View className="h-px bg-gray-100 ml-16" />
          <MenuItem
            icon={<Shield size={20} color="#374151" />}
            title={t('profile.privacy')}
            onPress={() => openExternalLink('https://nestoria-travel.com/privacy')}
          />
          <View className="h-px bg-gray-100 ml-16" />
          <MenuItem
            icon={<FileText size={20} color="#374151" />}
            title={t('profile.terms')}
            onPress={() => openExternalLink('https://nestoria-travel.com/terms')}
          />
        </View>

        {/* Logout */}
        <View className="bg-white mb-6">
          <MenuItem
            icon={<LogOut size={20} color="#DC2626" />}
            title={t('profile.logout')}
            onPress={handleSignOut}
            showChevron={false}
          />
        </View>

        <View className="px-4 pb-8">
          <Text
            className="text-xs text-gray-500 text-center"
            style={{ fontFamily: 'Cairo_400Regular' }}
          >
            Nestoria v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

