import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Phone,
  CheckCircle2,
  ChevronDown,
  Search,
} from 'lucide-react-native';
import { useAuth } from '@/lib/api/auth';
import {
  useSendPhoneVerification,
  useVerifyPhone,
  countryCodes,
} from '@/lib/api/profile';
import { useTranslation, useLanguageStore } from '@/lib/i18n';

export default function VerifyPhoneScreen() {
  const { t } = useTranslation();
  const isRTL = useLanguageStore((state) => state.isRTL);
  const { data: authData } = useAuth();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState(authData?.profile?.phone || '');
  const [selectedCountry, setSelectedCountry] = useState(
    countryCodes.find((c) => c.code === (authData?.profile?.phone_country_code || '+963')) || countryCodes[0]
  );
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');

  const otpInputRefs = useRef<(TextInput | null)[]>([]);

  const sendVerification = useSendPhoneVerification();
  const verifyPhone = useVerifyPhone();

  const filteredCountries = countryCodes.filter(
    (c) =>
      c.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.includes(searchQuery)
  );

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      setError(t('verifyPhone.enterPhone'));
      return;
    }

    setError('');
    try {
      await sendVerification.mutateAsync({
        phoneNumber: phoneNumber,
        countryCode: selectedCountry.code,
      });
      setStep('otp');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('verifyPhone.sendError');
      setError(errorMessage);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    // Handle paste - if pasting more than 1 character, distribute across inputs
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];

      // Fill from current index
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });

      setOtp(newOtp);

      // Focus last filled input or next empty one
      const lastFilledIndex = Math.min(index + digits.length - 1, 5);
      otpInputRefs.current[lastFilledIndex]?.focus();
      return;
    }

    // Normal single character input
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError(t('verifyPhone.enterCode'));
      return;
    }

    setError('');
    try {
      await verifyPhone.mutateAsync({
        phoneNumber: phoneNumber,
        countryCode: selectedCountry.code,
        code: code,
      });
      router.back();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('verifyPhone.verifyError');
      setError(errorMessage);
    }
  };

  const isAlreadyVerified = authData?.profile?.phone_verified && authData?.profile?.phone === phoneNumber;

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
            {t('verifyPhone.title')}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {/* Verified Badge */}
        {isAlreadyVerified && (
          <View className="bg-emerald-50 rounded-xl p-4 mb-6 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center">
              <CheckCircle2 size={24} color="#10B981" />
            </View>
            <View className="flex-1 ml-3">
              <Text
                className="text-base font-semibold text-emerald-700"
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                {t('verifyPhone.alreadyVerified')}
              </Text>
              <Text
                className="text-sm text-emerald-600"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                {selectedCountry.code} {phoneNumber}
              </Text>
            </View>
          </View>
        )}

        {step === 'phone' ? (
          <>
            {/* Icon */}
            <View className="items-center mb-6">
              <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center">
                <Phone size={40} color="#10B981" />
              </View>
            </View>

            <Text
              className="text-center text-base text-gray-600 mb-8"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {t('verifyPhone.description')}
            </Text>

            {/* Country Code Selector */}
            <Text
              className="text-sm font-semibold text-gray-700 mb-2"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('verifyPhone.countryCode')}
            </Text>
            <Pressable
              onPress={() => setShowCountryPicker(true)}
              className="flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4"
            >
              <View className="flex-row items-center">
                <Text className="text-xl mr-2">{selectedCountry.flag}</Text>
                <Text
                  className="text-base text-gray-900"
                  style={{ fontFamily: 'Cairo_400Regular' }}
                >
                  {selectedCountry.country}
                </Text>
                <Text
                  className="text-base text-gray-500 ml-2"
                  style={{ fontFamily: 'Cairo_400Regular' }}
                >
                  {selectedCountry.code}
                </Text>
              </View>
              <ChevronDown size={20} color="#6B7280" />
            </Pressable>

            {/* Phone Number Input */}
            <Text
              className="text-sm font-semibold text-gray-700 mb-2"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('verifyPhone.phoneNumber')}
            </Text>
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 mb-6">
              <Text
                className="text-base text-gray-500 mr-2"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                {selectedCountry.code}
              </Text>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder={t('verifyPhone.phonePlaceholder')}
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                className="flex-1 py-3 text-base text-gray-900"
                style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
              />
            </View>

            {error ? (
              <Text
                className="text-red-500 text-sm mb-4 text-center"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                {error}
              </Text>
            ) : null}

            <Pressable
              onPress={handleSendCode}
              disabled={sendVerification.isPending}
              className={`py-4 rounded-xl items-center ${
                sendVerification.isPending ? 'bg-gray-300' : 'bg-emerald-500 active:opacity-80'
              }`}
            >
              {sendVerification.isPending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text
                  className="text-white text-base font-bold"
                  style={{ fontFamily: 'Cairo_700Bold' }}
                >
                  {t('verifyPhone.sendCode')}
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            {/* OTP Step */}
            <View className="items-center mb-6">
              <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center">
                <CheckCircle2 size={40} color="#10B981" />
              </View>
            </View>

            <Text
              className="text-center text-base text-gray-600 mb-2"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {t('verifyPhone.codeSent')}
            </Text>
            <Text
              className="text-center text-base font-semibold text-gray-900 mb-8"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {selectedCountry.code} {phoneNumber}
            </Text>

            {/* OTP Input */}
            <View className="flex-row justify-center mb-6" style={{ direction: 'ltr' }}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    otpInputRefs.current[index] = ref;
                  }}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                  keyboardType="number-pad"
                  maxLength={6}
                  className="w-12 h-14 mx-1 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl"
                  style={{ fontFamily: 'Cairo_700Bold', textAlign: 'center' }}
                />
              ))}
            </View>

            {error ? (
              <Text
                className="text-red-500 text-sm mb-4 text-center"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                {error}
              </Text>
            ) : null}

            <Pressable
              onPress={handleVerify}
              disabled={verifyPhone.isPending}
              className={`py-4 rounded-xl items-center mb-4 ${
                verifyPhone.isPending ? 'bg-gray-300' : 'bg-emerald-500 active:opacity-80'
              }`}
            >
              {verifyPhone.isPending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text
                  className="text-white text-base font-bold"
                  style={{ fontFamily: 'Cairo_700Bold' }}
                >
                  {t('verifyPhone.verify')}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setOtp(['', '', '', '', '', '']);
                handleSendCode();
              }}
              disabled={sendVerification.isPending}
              className="py-3 items-center"
            >
              <Text
                className="text-emerald-600 text-base font-semibold"
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                {t('verifyPhone.resendCode')}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setStep('phone')}
              className="py-3 items-center"
            >
              <Text
                className="text-gray-500 text-sm"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                {t('verifyPhone.changeNumber')}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

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
                  setSelectedCountry(item);
                  setShowCountryPicker(false);
                }}
                className={`flex-row items-center px-4 py-4 border-b border-gray-100 ${
                  selectedCountry.code === item.code ? 'bg-emerald-50' : ''
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
                {selectedCountry.code === item.code && (
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
