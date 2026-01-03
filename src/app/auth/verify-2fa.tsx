import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, ArrowLeft, Smartphone, MessageSquare } from 'lucide-react-native';
import { useVerify2FA, useSend2FACode } from '@/lib/api/auth';
import { useTranslation } from '@/lib/i18n';

export default function Verify2FAScreen() {
  const { email, password, method, phone, phoneCountryCode } = useLocalSearchParams<{
    email: string;
    password: string;
    method: string;
    phone: string;
    phoneCountryCode: string;
  }>();

  const { t } = useTranslation();
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [trustDevice, setTrustDevice] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [codeSent, setCodeSent] = useState<boolean>(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const verify2FA = useVerify2FA();
  const send2FACode = useSend2FACode();

  const isSMS = method === 'sms';

  // Automatically send SMS code when screen loads (for SMS method only)
  React.useEffect(() => {
    if (isSMS && phone && phoneCountryCode && !codeSent) {
      console.log('📱 [2FA] Attempting to send SMS code to:', { phone, phoneCountryCode, email });
      send2FACode.mutateAsync({ phone, phoneCountryCode, email })
        .then(() => {
          console.log('✅ [2FA] SMS code sent successfully');
          setCodeSent(true);
        })
        .catch((err) => {
          console.error('❌ [2FA] Failed to send SMS code:', err);

          // Provide a helpful error message
          let errorMessage = 'Failed to send SMS code. ';

          if (err instanceof Error) {
            errorMessage += err.message;
          } else {
            errorMessage += 'Please check your phone number in Security settings and try again.';
          }

          // Add hint about phone number format if it looks suspicious
          const fullPhone = `${phoneCountryCode}${phone.trim()}`;
          if (fullPhone && fullPhone.length > 15) {
            errorMessage += ' The phone number format may be incorrect.';
          }

          setError(errorMessage);
        });
    } else {
      console.log('📱 [2FA] SMS send conditions:', { isSMS, phone, phoneCountryCode, codeSent });
    }
  }, [isSMS, phone, phoneCountryCode, codeSent, email]);

  const handleCodeChange = (value: string, index: number) => {
    // Handle paste - if pasting more than 1 character, distribute across inputs
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = [...code];

      // Fill from current index
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });

      setCode(newCode);

      // Focus last filled input or next empty one
      const lastFilledIndex = Math.min(index + digits.length - 1, 5);
      inputRefs.current[lastFilledIndex]?.focus();
      return;
    }

    // Normal single character input
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const token = code.join('');

    if (token.length !== 6) {
      setError(t('security.enterCode') || 'Please enter the 6-digit code');
      return;
    }

    if (!email || !password) {
      setError('Invalid session. Please try signing in again.');
      return;
    }

    setError('');

    try {
      await verify2FA.mutateAsync({
        email,
        password,
        token,
        method: method || 'sms',
        trustDevice,
      });

      // Success - navigate to home
      router.replace('/(tabs)');
    } catch (err: unknown) {
      console.error('❌ [2FA Verify] Error caught in handleVerify:', err);
      const errorMessage = err instanceof Error ? err.message : 'Invalid verification code';
      console.log('❌ [2FA Verify] Setting error message:', errorMessage);
      setError(errorMessage);
      // Clear code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResendCode = async () => {
    if (!isSMS || !phone || !phoneCountryCode) return;

    setError('');
    setCode(['', '', '', '', '', '']);

    try {
      await send2FACode.mutateAsync({ phone, phoneCountryCode, email });
      setCodeSent(true);
      Alert.alert(
        t('common.success') || 'Success',
        t('2fa.codeSent') || 'A new verification code has been sent to your phone'
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send code';
      setError(errorMessage);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 pt-2 pb-4 bg-white">
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
            {t('2fa.title') || 'Two-Factor Authentication'}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {/* Icon */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center">
            {isSMS ? (
              <MessageSquare size={40} color="#10B981" />
            ) : (
              <Smartphone size={40} color="#10B981" />
            )}
          </View>
        </View>

        {/* Title & Description */}
        <Text
          className="text-2xl font-bold text-gray-900 text-center mb-2"
          style={{ fontFamily: 'Cairo_700Bold' }}
        >
          {t('2fa.verifyIdentity') || 'Verify Your Identity'}
        </Text>

        <Text
          className="text-center text-base text-gray-600 mb-8"
          style={{ fontFamily: 'Cairo_400Regular' }}
        >
          {isSMS
            ? t('2fa.smsDescription') || 'Enter the 6-digit code sent to your phone'
            : t('2fa.appDescription') || 'Enter the 6-digit code from your authenticator app'}
        </Text>

        {/* Code Input */}
        <View className="flex-row justify-center mb-6" style={{ direction: 'ltr' }}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              value={digit}
              onChangeText={(value) => handleCodeChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={6}
              className="w-12 h-14 mx-1 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl"
              style={{ fontFamily: 'Cairo_700Bold', textAlign: 'center' }}
            />
          ))}
        </View>

        {/* Error Message */}
        {error ? (
          <View className="bg-red-100 border-2 border-red-400 rounded-xl p-4 mb-6">
            <View className="flex-row items-start">
              <View className="flex-1">
                <Text
                  className="text-red-800 text-base font-semibold mb-1"
                  style={{ fontFamily: 'Cairo_600SemiBold' }}
                >
                  {isSMS ? 'Invalid SMS Code' : 'Invalid Verification Code'}
                </Text>
                <Text
                  className="text-red-700 text-sm"
                  style={{ fontFamily: 'Cairo_400Regular' }}
                >
                  {error}
                </Text>
              </View>
            </View>
            {!isSMS && (
              <Pressable
                onPress={() => {
                  setError('');
                  setCode(['', '', '', '', '', '']);
                  inputRefs.current[0]?.focus();
                }}
                className="mt-3 py-2 px-3 bg-red-200 rounded-lg active:bg-red-300"
              >
                <Text
                  className="text-red-800 text-sm font-semibold text-center"
                  style={{ fontFamily: 'Cairo_600SemiBold' }}
                >
                  Try Again
                </Text>
              </Pressable>
            )}
            {isSMS && (
              <Pressable
                onPress={() => router.replace('/profile/security')}
                className="mt-3 py-2 px-3 bg-red-200 rounded-lg active:bg-red-300"
              >
                <Text
                  className="text-red-800 text-sm font-semibold text-center"
                  style={{ fontFamily: 'Cairo_600SemiBold' }}
                >
                  Go to Security Settings
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {/* Trust Device */}
        <Pressable
          onPress={() => setTrustDevice(!trustDevice)}
          className="flex-row items-center mb-6 px-2"
        >
          <View
            className={`w-5 h-5 rounded border-2 items-center justify-center mr-3 ${
              trustDevice ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
            }`}
          >
            {trustDevice && (
              <View className="w-3 h-3 bg-white rounded-sm" />
            )}
          </View>
          <Text
            className="text-base text-gray-700 flex-1"
            style={{ fontFamily: 'Cairo_400Regular' }}
          >
            {t('2fa.trustDevice') || 'Trust this device for 30 days'}
          </Text>
        </Pressable>

        {/* Verify Button */}
        <Pressable
          onPress={handleVerify}
          disabled={verify2FA.isPending}
          className={`py-4 rounded-xl items-center mb-4 ${
            verify2FA.isPending ? 'bg-gray-300' : 'bg-emerald-500 active:opacity-80'
          }`}
        >
          {verify2FA.isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <View className="flex-row items-center">
              <ShieldCheck size={20} color="white" />
              <Text
                className="text-white text-base font-bold ml-2"
                style={{ fontFamily: 'Cairo_700Bold' }}
              >
                {t('2fa.verify') || 'Verify'}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Help Text */}
        <View className="bg-blue-50 rounded-xl p-4 mt-4">
          <Text
            className="text-sm text-blue-900 text-center mb-2"
            style={{ fontFamily: 'Cairo_400Regular' }}
          >
            {isSMS
              ? t('2fa.smsHelp') ||
                "Having trouble receiving the code?"
              : t('2fa.appHelp') ||
                'Open your authenticator app (Google Authenticator, Authy, etc.) and enter the 6-digit code.'}
          </Text>
          {isSMS && error && (
            <Text
              className="text-xs text-blue-700 text-center mt-2"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              If your phone number is incorrect, you can fix it in Security settings after signing in. Contact support if you're unable to access your account.
            </Text>
          )}
        </View>

        {/* Resend Code (SMS only) */}
        {isSMS && (
          <Pressable
            onPress={handleResendCode}
            disabled={send2FACode.isPending}
            className="py-4 items-center mt-2"
          >
            {send2FACode.isPending ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <Text
                className="text-emerald-600 text-base font-semibold"
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                {t('2fa.resendCode') || 'Resend Code'}
              </Text>
            )}
          </Pressable>
        )}

        {/* Back to Sign In */}
        <Pressable
          onPress={() => router.back()}
          className="py-4 items-center mt-4"
        >
          <Text
            className="text-gray-500 text-base"
            style={{ fontFamily: 'Cairo_400Regular' }}
          >
            {t('2fa.backToSignIn') || 'Back to Sign In'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
