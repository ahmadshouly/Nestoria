import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  User,
  Camera,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Search,
} from 'lucide-react-native';
import { useAuth, useUpdateProfile } from '@/lib/api/auth';
import { useUploadAvatar, getProfileCompletion, countryCodes } from '@/lib/api/profile';
import { useTranslation, useLanguageStore } from '@/lib/i18n';

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const isRTL = useLanguageStore((state) => state.isRTL);
  const { data: authData, refetch } = useAuth();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();

  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [selectedCountryCode, setSelectedCountryCode] = useState(
    countryCodes.find((c) => c.code === '+963') || countryCodes[0]
  );
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [postalCode, setPostalCode] = useState<string>('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [emergencyContactName, setEmergencyContactName] = useState<string>('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState<string>('');
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState<string>('');
  const [avatarUri, setAvatarUri] = useState<string>('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  const filteredCountries = countryCodes.filter(
    (c) =>
      c.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.includes(searchQuery)
  );

  const profileCompletion = getProfileCompletion(
    authData?.profile as Record<string, unknown> | null,
    authData?.profile?.role || 'user'
  );

  useEffect(() => {
    if (authData?.profile) {
      console.log('🔄 [Edit Profile] Updating state from profile data');
      setFullName(authData.profile.full_name || '');
      setPhone(authData.profile.phone || '');
      const savedCountryCode = countryCodes.find(
        (c) => c.code === authData.profile.phone_country_code
      );
      if (savedCountryCode) {
        setSelectedCountryCode(savedCountryCode);
      }
      setAddress(authData.profile.address || '');
      setCity(authData.profile.city || '');
      setCountry(authData.profile.country || '');
      setPostalCode(authData.profile.postal_code || '');
      setDateOfBirth(authData.profile.date_of_birth || '');
      setEmergencyContactName(authData.profile.emergency_contact_name || '');
      setEmergencyContactPhone(authData.profile.emergency_contact_phone || '');
      setEmergencyContactRelationship(authData.profile.emergency_contact_relationship || '');

      // Update avatar URI from database (important for showing new uploads)
      const dbAvatarUrl = authData.profile.avatar_url || '';
      console.log('📸 [Edit Profile] Setting avatar from DB:', dbAvatarUrl);
      setAvatarUri(dbAvatarUrl);
    }
  }, [authData]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newUri = result.assets[0].uri;
      setAvatarUri(newUri);
      setUploadSuccess(false);

      // Upload immediately after selecting
      try {
        setIsUploadingAvatar(true);
        console.log('📤 [Edit Profile] Uploading avatar immediately after selection...');
        await uploadAvatar.mutateAsync(newUri);
        console.log('✅ [Edit Profile] Avatar uploaded successfully');

        // Show success indicator
        setUploadSuccess(true);

        // Hide success indicator after 3 seconds
        setTimeout(() => {
          setUploadSuccess(false);
        }, 3000);

        // Refetch to get the new avatar URL
        await refetch();
      } catch (error: unknown) {
        console.error('❌ [Edit Profile] Avatar upload error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload avatar';
        Alert.alert(t('common.error'), errorMessage);
        // Revert to previous avatar on error
        setAvatarUri(authData?.profile?.avatar_url || '');
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  const handleSave = async () => {
    try {
      console.log('💾 [Edit Profile] Starting save...');

      // Avatar is already uploaded in handlePickImage, no need to upload again

      // Check if phone number or country code has changed
      const originalPhone = authData?.profile?.phone || '';
      const originalCountryCode = authData?.profile?.phone_country_code || '';
      const phoneChanged = phone !== originalPhone || selectedCountryCode.code !== originalCountryCode;

      console.log('📞 [Edit Profile] Phone change check:', {
        phoneChanged,
        originalPhone,
        newPhone: phone,
        originalCountryCode,
        newCountryCode: selectedCountryCode.code,
      });

      // Prepare update data
      const updateData: {
        full_name: string;
        phone?: string;
        phone_country_code?: string;
        phone_verified?: boolean;
        phone_verified_at?: null;
        address?: string;
        city?: string;
        country?: string;
        postal_code?: string;
      } = {
        full_name: fullName,
        phone: phone || undefined,
        phone_country_code: selectedCountryCode.code,
        address: address || undefined,
        city: city || undefined,
        country: country || undefined,
        postal_code: postalCode || undefined,
      };

      // If phone number or country code changed, unverify it
      if (phoneChanged && phone) {
        updateData.phone_verified = false;
        updateData.phone_verified_at = null;
        console.log('🔓 [Edit Profile] Phone changed - marking as unverified');
      }

      console.log('💾 [Edit Profile] Updating profile data...');
      await updateProfile.mutateAsync(updateData);
      console.log('✅ [Edit Profile] Profile data updated');

      console.log('🔄 [Edit Profile] Refetching profile...');
      await refetch();
      console.log('✅ [Edit Profile] Profile refetched');

      Alert.alert(t('common.success'), t('editProfile.saved'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (error: unknown) {
      console.error('❌ [Edit Profile] Save error:', error);
      const errorMessage = error instanceof Error ? error.message : t('editProfile.saveError');
      Alert.alert(t('common.error'), errorMessage);
    }
  };

  const isLoading = updateProfile.isPending;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 pt-2 pb-4 border-b border-gray-200">
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
            {t('editProfile.title')}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {/* Profile Completion */}
        <View className="bg-emerald-50 rounded-xl p-4 mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text
              className="text-sm font-semibold text-emerald-700"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('editProfile.profileCompletion')}
            </Text>
            <Text
              className="text-sm font-bold text-emerald-700"
              style={{ fontFamily: 'Cairo_700Bold' }}
            >
              {profileCompletion}%
            </Text>
          </View>
          <View className="h-2 bg-emerald-200 rounded-full overflow-hidden">
            <View
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${profileCompletion}%` }}
            />
          </View>
          {profileCompletion < 100 && (
            <Text
              className="text-xs text-emerald-600 mt-2"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {t('editProfile.completeProfile')}
            </Text>
          )}
        </View>

        {/* Avatar */}
        <View className="items-center mb-8">
          <Pressable onPress={handlePickImage} disabled={isUploadingAvatar} className="relative">
            {avatarUri ? (
              <Image
                key={avatarUri}
                source={{
                  uri: avatarUri.startsWith('http')
                    ? `${avatarUri}${avatarUri.includes('?') ? '&' : '?'}t=${Date.now()}`
                    : avatarUri
                }}
                className="w-24 h-24 rounded-full bg-gray-200"
                onError={(error) => {
                  console.error('❌ [Edit Profile] Image load error:', error.nativeEvent?.error || 'Unknown error');
                  console.log('🖼️ [Edit Profile] Failed to load avatarUri:', avatarUri);
                }}
                onLoad={() => {
                  console.log('✅ [Edit Profile] Image loaded successfully:', avatarUri);
                }}
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center">
                <User size={40} color="#9CA3AF" />
              </View>
            )}

            {/* Uploading Overlay */}
            {isUploadingAvatar && (
              <View className="absolute inset-0 w-24 h-24 rounded-full bg-black/50 items-center justify-center">
                <ActivityIndicator size="small" color="#FFF" />
              </View>
            )}

            {/* Success Indicator */}
            {uploadSuccess && (
              <View className="absolute inset-0 w-24 h-24 rounded-full bg-emerald-500/90 items-center justify-center">
                <CheckCircle2 size={32} color="#FFF" />
              </View>
            )}

            <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-500 items-center justify-center border-2 border-white">
              <Camera size={16} color="#FFF" />
            </View>
          </Pressable>
          <Text
            className="text-sm text-gray-500 mt-3"
            style={{ fontFamily: 'Cairo_400Regular' }}
          >
            {isUploadingAvatar
              ? t('editProfile.uploadingPhoto')
              : uploadSuccess
              ? t('editProfile.photoUploaded')
              : t('editProfile.tapToChangePhoto')}
          </Text>
        </View>

        {/* Verification Status */}
        {authData?.profile?.phone_verified ? (
          <View className="flex-row items-center bg-emerald-50 rounded-xl px-4 py-3 mb-6">
            <CheckCircle2 size={20} color="#10B981" />
            <Text
              className="text-sm text-emerald-700 ml-2"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('editProfile.phoneVerified')}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push('/profile/verify-phone')}
            className="flex-row items-center bg-yellow-50 rounded-xl px-4 py-3 mb-6 active:opacity-80"
          >
            <AlertCircle size={20} color="#F59E0B" />
            <View className="flex-1 ml-2">
              <Text
                className="text-sm text-yellow-700"
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                {t('editProfile.verifyPhone')}
              </Text>
              <Text
                className="text-xs text-yellow-600"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                {t('editProfile.verifyPhoneDesc')}
              </Text>
            </View>
          </Pressable>
        )}

        {/* Personal Information */}
        <Text
          className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4"
          style={{ fontFamily: 'Cairo_600SemiBold' }}
        >
          {t('editProfile.personalInfo')}
        </Text>

        {/* Form */}
        <View className="mb-6">
          <Text
            className="text-sm font-semibold text-gray-700 mb-2"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('editProfile.fullName')} *
          </Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder={t('editProfile.fullNamePlaceholder')}
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
            style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
          />
        </View>

        <View className="mb-6">
          <Text
            className="text-sm font-semibold text-gray-700 mb-2"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('editProfile.email')}
          </Text>
          <TextInput
            value={authData?.user?.email || ''}
            editable={false}
            className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-500"
            style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
          />
          <Text
            className="text-xs text-gray-500 mt-1"
            style={{ fontFamily: 'Cairo_400Regular' }}
          >
            {t('editProfile.emailCantChange')}
          </Text>
        </View>

        <View className="mb-6">
          <Text
            className="text-sm font-semibold text-gray-700 mb-2"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('editProfile.phone')}
          </Text>

          {/* Country Code Selector */}
          <Pressable
            onPress={() => setShowCountryPicker(true)}
            className="flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-2"
          >
            <View className="flex-row items-center">
              <Text className="text-xl mr-2">{selectedCountryCode.flag}</Text>
              <Text
                className="text-base text-gray-900"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                {selectedCountryCode.country}
              </Text>
              <Text
                className="text-base text-gray-500 ml-2"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                {selectedCountryCode.code}
              </Text>
            </View>
            <ChevronDown size={20} color="#6B7280" />
          </Pressable>

          {/* Phone Number Input */}
          <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
            <Text
              className="text-base text-gray-500 mr-2"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {selectedCountryCode.code}
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder={t('verifyPhone.phonePlaceholder')}
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              className="flex-1 py-3 text-base text-gray-900"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
            />
          </View>
        </View>

        <View className="mb-6">
          <Text
            className="text-sm font-semibold text-gray-700 mb-2"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('editProfile.address')}
          </Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder={t('editProfile.addressPlaceholder')}
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
            style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
          />
        </View>

        <View className="flex-row mb-6">
          <View className="flex-1 mr-2">
            <Text
              className="text-sm font-semibold text-gray-700 mb-2"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('editProfile.city')}
            </Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder={t('editProfile.city')}
              placeholderTextColor="#9CA3AF"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
            />
          </View>

          <View className="flex-1 ml-2">
            <Text
              className="text-sm font-semibold text-gray-700 mb-2"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('editProfile.postalCode')}
            </Text>
            <TextInput
              value={postalCode}
              onChangeText={setPostalCode}
              placeholder="12345"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
            />
          </View>
        </View>

        <View className="mb-8">
          <Text
            className="text-sm font-semibold text-gray-700 mb-2"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('editProfile.country')}
          </Text>
          <TextInput
            value={country}
            onChangeText={setCountry}
            placeholder={t('editProfile.country')}
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
            style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
          />
        </View>

        {/* Emergency Contact */}
        <Text
          className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4"
          style={{ fontFamily: 'Cairo_600SemiBold' }}
        >
          {t('editProfile.emergencyContact')}
        </Text>

        <View className="mb-6">
          <Text
            className="text-sm font-semibold text-gray-700 mb-2"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('editProfile.contactName')}
          </Text>
          <TextInput
            value={emergencyContactName}
            onChangeText={setEmergencyContactName}
            placeholder={t('editProfile.contactNamePlaceholder')}
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
            style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
          />
        </View>

        <View className="flex-row mb-8">
          <View className="flex-1 mr-2">
            <Text
              className="text-sm font-semibold text-gray-700 mb-2"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('editProfile.contactPhone')}
            </Text>
            <TextInput
              value={emergencyContactPhone}
              onChangeText={setEmergencyContactPhone}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
            />
          </View>

          <View className="flex-1 ml-2">
            <Text
              className="text-sm font-semibold text-gray-700 mb-2"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('editProfile.relationship')}
            </Text>
            <TextInput
              value={emergencyContactRelationship}
              onChangeText={setEmergencyContactRelationship}
              placeholder={t('editProfile.relationshipPlaceholder')}
              placeholderTextColor="#9CA3AF"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
            />
          </View>
        </View>

        <View className="h-6" />
      </ScrollView>

      {/* Save Button */}
      <SafeAreaView edges={['bottom']} className="px-4 py-3 border-t border-gray-200 bg-white">
        <Pressable
          onPress={handleSave}
          disabled={isLoading || !fullName.trim()}
          className={`py-4 rounded-xl items-center ${
            isLoading || !fullName.trim()
              ? 'bg-gray-300'
              : 'bg-emerald-500 active:opacity-80'
          }`}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text
              className="text-white text-base font-bold"
              style={{ fontFamily: 'Cairo_700Bold' }}
            >
              {t('editProfile.save')}
            </Text>
          )}
        </Pressable>
      </SafeAreaView>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView edges={['top']} className="flex-1 bg-white">
          <View className="px-4 pt-2 pb-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <Text
                className="text-xl font-bold text-gray-900"
                style={{ fontFamily: 'Cairo_700Bold' }}
              >
                {t('verifyPhone.selectCountry')}
              </Text>
              <Pressable
                onPress={() => setShowCountryPicker(false)}
                className="p-2"
              >
                <Text
                  className="text-emerald-600 font-semibold"
                  style={{ fontFamily: 'Cairo_600SemiBold' }}
                >
                  {t('common.done')}
                </Text>
              </Pressable>
            </View>

            {/* Search */}
            <View className="flex-row items-center bg-gray-100 rounded-xl px-4 mt-4">
              <Search size={20} color="#6B7280" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('verifyPhone.searchCountry')}
                placeholderTextColor="#9CA3AF"
                className="flex-1 py-3 ml-2 text-base text-gray-900"
                style={{ fontFamily: 'Cairo_400Regular' }}
              />
            </View>
          </View>

          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setSelectedCountryCode(item);
                  setShowCountryPicker(false);
                  setSearchQuery('');
                }}
                className={`flex-row items-center px-4 py-4 border-b border-gray-100 ${
                  selectedCountryCode.code === item.code ? 'bg-emerald-50' : ''
                }`}
              >
                <Text className="text-2xl mr-3">{item.flag}</Text>
                <View className="flex-1">
                  <Text
                    className="text-base text-gray-900"
                    style={{ fontFamily: 'Cairo_400Regular' }}
                  >
                    {item.country}
                  </Text>
                </View>
                <Text
                  className="text-base text-gray-500"
                  style={{ fontFamily: 'Cairo_400Regular' }}
                >
                  {item.code}
                </Text>
                {selectedCountryCode.code === item.code && (
                  <View className="ml-2">
                    <CheckCircle2 size={20} color="#10B981" />
                  </View>
                )}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
