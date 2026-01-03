import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  Lock,
  Globe,
  Moon,
  Eye,
  EyeOff,
  Mail,
  MessageSquare,
  Gift,
  Star,
  Smartphone,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '@/lib/api/auth';
import {
  useUserSettings,
  useUpdateUserSettings,
  usePrivacySettings,
  useUpdatePrivacySettings,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/lib/api/profile';
import { useTranslation, useLanguageStore } from '@/lib/i18n';

type TabType = 'profile' | 'notifications' | 'privacy' | 'security';

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  onPress?: () => void;
  isLoading?: boolean;
  showChevron?: boolean;
}

function SettingRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  onPress,
  isLoading,
  showChevron,
}: SettingRowProps) {
  const content = (
    <View className="flex-row items-center px-4 py-4 bg-white">
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
      {isLoading ? (
        <ActivityIndicator size="small" color="#10B981" />
      ) : onValueChange !== undefined ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#E5E7EB', true: '#10B981' }}
          thumbColor="#FFFFFF"
        />
      ) : showChevron ? (
        <ChevronRight size={20} color="#9CA3AF" />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:bg-gray-50">
        {content}
      </Pressable>
    );
  }

  return content;
}

export default function ProfileSettingsScreen() {
  const { t, language } = useTranslation();
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const isRTL = useLanguageStore((state) => state.isRTL);

  const { data: authData } = useAuth();
  const { data: userSettings, isLoading: settingsLoading } = useUserSettings();
  const { data: privacySettings, isLoading: privacyLoading } = usePrivacySettings();
  const { data: notifications, isLoading: notificationsLoading } = useNotificationPreferences();

  const updateSettings = useUpdateUserSettings();
  const updatePrivacy = useUpdatePrivacySettings();
  const updateNotifications = useUpdateNotificationPreferences();

  const [activeTab, setActiveTab] = useState<TabType>('profile');

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: t('settings.profile'), icon: <User size={18} color={activeTab === 'profile' ? '#10B981' : '#6B7280'} /> },
    { key: 'notifications', label: t('settings.notifications'), icon: <Bell size={18} color={activeTab === 'notifications' ? '#10B981' : '#6B7280'} /> },
    { key: 'privacy', label: t('settings.privacy'), icon: <Eye size={18} color={activeTab === 'privacy' ? '#10B981' : '#6B7280'} /> },
    { key: 'security', label: t('settings.security'), icon: <Shield size={18} color={activeTab === 'security' ? '#10B981' : '#6B7280'} /> },
  ];

  const renderProfileTab = () => (
    <View>
      {/* Language */}
      <View className="bg-white mb-2">
        <View className="px-4 py-3 border-b border-gray-100">
          <Text
            className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('settings.preferences')}
          </Text>
        </View>
        <SettingRow
          icon={<Globe size={20} color="#374151" />}
          title={t('settings.language')}
          subtitle={language === 'en' ? 'English' : 'العربية'}
          onPress={() => {
            const newLang = language === 'en' ? 'ar' : 'en';
            setLanguage(newLang);
          }}
          showChevron
        />
        <View className="h-px bg-gray-100 ml-16" />
        <SettingRow
          icon={<Moon size={20} color="#374151" />}
          title={t('settings.darkMode')}
          subtitle={t('settings.darkModeDesc')}
          value={userSettings?.dark_mode ?? false}
          onValueChange={(value) => updateSettings.mutate({ dark_mode: value })}
          isLoading={updateSettings.isPending}
        />
      </View>

      {/* Account */}
      <View className="bg-white mb-2">
        <View className="px-4 py-3 border-b border-gray-100">
          <Text
            className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('settings.account')}
          </Text>
        </View>
        <SettingRow
          icon={<User size={20} color="#374151" />}
          title={t('settings.personalInfo')}
          subtitle={t('settings.personalInfoDesc')}
          onPress={() => router.push('/profile/edit')}
          showChevron
        />
        <View className="h-px bg-gray-100 ml-16" />
        <SettingRow
          icon={<Smartphone size={20} color="#374151" />}
          title={t('settings.phoneVerification')}
          subtitle={authData?.profile?.phone_verified ? t('settings.verified') : t('settings.notVerified')}
          onPress={() => router.push('/profile/verify-phone')}
          showChevron
        />
      </View>
    </View>
  );

  const renderNotificationsTab = () => (
    <View>
      {/* Email Notifications */}
      <View className="bg-white mb-2">
        <View className="px-4 py-3 border-b border-gray-100">
          <Text
            className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('settings.emailNotifications')}
          </Text>
        </View>
        <SettingRow
          icon={<Mail size={20} color="#374151" />}
          title={t('settings.bookingUpdates')}
          subtitle={t('settings.bookingUpdatesDesc')}
          value={notifications?.email_bookings ?? true}
          onValueChange={(value) => updateNotifications.mutate({ email_bookings: value })}
          isLoading={updateNotifications.isPending}
        />
        <View className="h-px bg-gray-100 ml-16" />
        <SettingRow
          icon={<MessageSquare size={20} color="#374151" />}
          title={t('settings.messages')}
          subtitle={t('settings.messagesDesc')}
          value={notifications?.email_messages ?? true}
          onValueChange={(value) => updateNotifications.mutate({ email_messages: value })}
          isLoading={updateNotifications.isPending}
        />
        <View className="h-px bg-gray-100 ml-16" />
        <SettingRow
          icon={<Gift size={20} color="#374151" />}
          title={t('settings.promotions')}
          subtitle={t('settings.promotionsDesc')}
          value={notifications?.email_promotions ?? false}
          onValueChange={(value) => updateNotifications.mutate({ email_promotions: value })}
          isLoading={updateNotifications.isPending}
        />
        <View className="h-px bg-gray-100 ml-16" />
        <SettingRow
          icon={<Star size={20} color="#374151" />}
          title={t('settings.reviews')}
          subtitle={t('settings.reviewsDesc')}
          value={notifications?.email_reviews ?? true}
          onValueChange={(value) => updateNotifications.mutate({ email_reviews: value })}
          isLoading={updateNotifications.isPending}
        />
      </View>

      {/* Push Notifications */}
      <View className="bg-white mb-2">
        <View className="px-4 py-3 border-b border-gray-100">
          <Text
            className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('settings.pushNotifications')}
          </Text>
        </View>
        <SettingRow
          icon={<Bell size={20} color="#374151" />}
          title={t('settings.bookingUpdates')}
          value={notifications?.push_bookings ?? true}
          onValueChange={(value) => updateNotifications.mutate({ push_bookings: value })}
          isLoading={updateNotifications.isPending}
        />
        <View className="h-px bg-gray-100 ml-16" />
        <SettingRow
          icon={<MessageSquare size={20} color="#374151" />}
          title={t('settings.messages')}
          value={notifications?.push_messages ?? true}
          onValueChange={(value) => updateNotifications.mutate({ push_messages: value })}
          isLoading={updateNotifications.isPending}
        />
        <View className="h-px bg-gray-100 ml-16" />
        <SettingRow
          icon={<Star size={20} color="#374151" />}
          title={t('settings.reviews')}
          value={notifications?.push_reviews ?? true}
          onValueChange={(value) => updateNotifications.mutate({ push_reviews: value })}
          isLoading={updateNotifications.isPending}
        />
      </View>
    </View>
  );

  const renderPrivacyTab = () => (
    <View>
      {/* Profile Visibility */}
      <View className="bg-white mb-2">
        <View className="px-4 py-3 border-b border-gray-100">
          <Text
            className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('settings.profileVisibility')}
          </Text>
        </View>
        <SettingRow
          icon={<Eye size={20} color="#374151" />}
          title={t('settings.showProfilePublicly')}
          subtitle={t('settings.showProfilePubliclyDesc')}
          value={userSettings?.show_profile_publicly ?? true}
          onValueChange={(value) => updateSettings.mutate({ show_profile_publicly: value })}
          isLoading={updateSettings.isPending}
        />
        <View className="h-px bg-gray-100 ml-16" />
        <SettingRow
          icon={<Mail size={20} color="#374151" />}
          title={t('settings.showEmailPublicly')}
          value={privacySettings?.show_email_publicly ?? false}
          onValueChange={(value) => updatePrivacy.mutate({ show_email_publicly: value })}
          isLoading={updatePrivacy.isPending}
        />
        <View className="h-px bg-gray-100 ml-16" />
        <SettingRow
          icon={<Smartphone size={20} color="#374151" />}
          title={t('settings.showPhonePublicly')}
          value={privacySettings?.show_phone_publicly ?? false}
          onValueChange={(value) => updatePrivacy.mutate({ show_phone_publicly: value })}
          isLoading={updatePrivacy.isPending}
        />
      </View>

      {/* Search Permissions */}
      <View className="bg-white mb-2">
        <View className="px-4 py-3 border-b border-gray-100">
          <Text
            className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('settings.searchPermissions')}
          </Text>
        </View>
        <SettingRow
          icon={<Mail size={20} color="#374151" />}
          title={t('settings.allowSearchByEmail')}
          value={privacySettings?.allow_search_by_email ?? false}
          onValueChange={(value) => updatePrivacy.mutate({ allow_search_by_email: value })}
          isLoading={updatePrivacy.isPending}
        />
        <View className="h-px bg-gray-100 ml-16" />
        <SettingRow
          icon={<Smartphone size={20} color="#374151" />}
          title={t('settings.allowSearchByPhone')}
          value={privacySettings?.allow_search_by_phone ?? false}
          onValueChange={(value) => updatePrivacy.mutate({ allow_search_by_phone: value })}
          isLoading={updatePrivacy.isPending}
        />
      </View>

      {/* Data & Marketing */}
      <View className="bg-white mb-2">
        <View className="px-4 py-3 border-b border-gray-100">
          <Text
            className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('settings.dataMarketing')}
          </Text>
        </View>
        <SettingRow
          icon={<Gift size={20} color="#374151" />}
          title={t('settings.allowMarketing')}
          subtitle={t('settings.allowMarketingDesc')}
          value={userSettings?.allow_marketing_contact ?? false}
          onValueChange={(value) => updateSettings.mutate({ allow_marketing_contact: value })}
          isLoading={updateSettings.isPending}
        />
      </View>
    </View>
  );

  const renderSecurityTab = () => (
    <View>
      {/* Password */}
      <View className="bg-white mb-2">
        <View className="px-4 py-3 border-b border-gray-100">
          <Text
            className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('settings.password')}
          </Text>
        </View>
        <SettingRow
          icon={<Lock size={20} color="#374151" />}
          title={t('settings.changePassword')}
          subtitle={t('settings.changePasswordDesc')}
          onPress={() => router.push('/profile/change-password')}
          showChevron
        />
      </View>

      {/* Two-Factor Authentication */}
      <View className="bg-white mb-2">
        <View className="px-4 py-3 border-b border-gray-100">
          <Text
            className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('settings.twoFactorAuth')}
          </Text>
        </View>
        <SettingRow
          icon={<Shield size={20} color="#374151" />}
          title={t('settings.setup2FA')}
          subtitle={
            authData?.profile?.two_factor_enabled
              ? t('settings.2FAEnabled')
              : t('settings.2FADisabled')
          }
          onPress={() => router.push('/profile/security')}
          showChevron
        />
      </View>

      {/* Documents */}
      {authData?.profile?.role === 'supplier' && (
        <View className="bg-white mb-2">
          <View className="px-4 py-3 border-b border-gray-100">
            <Text
              className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('settings.verification')}
            </Text>
          </View>
          <SettingRow
            icon={<User size={20} color="#374151" />}
            title={t('settings.verifyDocuments')}
            subtitle={t('settings.verifyDocumentsDesc')}
            onPress={() => router.push('/profile/documents')}
            showChevron
          />
        </View>
      )}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'privacy':
        return renderPrivacyTab();
      case 'security':
        return renderSecurityTab();
      default:
        return null;
    }
  };

  if (settingsLoading || privacyLoading || notificationsLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#10B981" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 pt-2 pb-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200 mr-3"
          >
            <ArrowLeft size={20} color="#000" />
          </Pressable>
          <Text
            className="text-xl font-bold text-gray-900"
            style={{ fontFamily: 'Cairo_700Bold' }}
          >
            {t('settings.title')}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View className="bg-white border-b border-gray-200">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          style={{ flexGrow: 0 }}
        >
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-row items-center px-4 py-3 mr-2 rounded-full ${
                activeTab === tab.key ? 'bg-emerald-50' : 'bg-gray-100'
              }`}
            >
              {tab.icon}
              <Text
                className={`ml-2 text-sm font-semibold ${
                  activeTab === tab.key ? 'text-emerald-600' : 'text-gray-600'
                }`}
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="py-4">{renderTabContent()}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
