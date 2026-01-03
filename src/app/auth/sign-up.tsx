import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { UserPlus, Check, X, Eye, EyeOff } from 'lucide-react-native';
import { useCreateSignupSession, useSendOTPEmail, useVerifyEmailOTP, useSignIn } from '@/lib/api/auth';
import { useTranslation } from '@/lib/i18n';

type SignupStep = 'details' | 'verify-email';

interface PasswordStrength {
  hasLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export default function SignUpScreen() {
  const [step, setStep] = useState<SignupStep>('details');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('');
  const [verificationPassword, setVerificationPassword] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>('');
  const [error, setError] = useState<string>('');
  const { t } = useTranslation();

  const createSession = useCreateSignupSession();
  const sendOTP = useSendOTPEmail();
  const verifyOTP = useVerifyEmailOTP();
  const signIn = useSignIn();

  // Calculate password strength
  const getPasswordStrength = (pwd: string): PasswordStrength => ({
    hasLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[^A-Za-z0-9]/.test(pwd),
  });

  const passwordStrength = getPasswordStrength(password);
  const isPasswordStrong = Object.values(passwordStrength).every(Boolean);

  const handleSignUp = async () => {
    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!isPasswordStrong) {
      setError('Please meet all password requirements');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');

    try {
      console.log('[SignUp] Starting signup process for:', email);

      // Step 1: Create signup session
      console.log('[SignUp] Step 1: Creating signup session...');
      const sessionData = await createSession.mutateAsync({
        email: email.toLowerCase().trim(),
        fullName: fullName.trim(),
        role: 'user',
        newsletterSubscribed: false,
      });
      console.log('[SignUp] Session created successfully:', sessionData);

      // Step 2: Send OTP email
      console.log('[SignUp] Step 2: Sending OTP email...');
      await sendOTP.mutateAsync({
        email: email.toLowerCase().trim(),
        userName: fullName.trim(),
      });
      console.log('[SignUp] OTP email sent successfully');

      // Store session token and move to verification step
      setSessionToken(sessionData.sessionToken);
      setStep('verify-email');
    } catch (err: any) {
      console.error('[SignUp] Error during signup:', err);
      console.error('[SignUp] Error details:', JSON.stringify(err, null, 2));
      setError(err.message || 'Failed to create account. Please try again.');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    if (!verificationPassword) {
      setError('Please re-enter your password');
      return;
    }

    if (verificationPassword !== password) {
      setError('Password does not match');
      return;
    }

    setError('');

    try {
      console.log('[SignUp] Starting OTP verification...');
      console.log('[SignUp] OTP Code:', otpCode);
      console.log('[SignUp] Session Token:', sessionToken?.substring(0, 16) + '...');

      // Step 3: Verify OTP and create account
      console.log('[SignUp] Step 3: Verifying OTP and creating account...');
      const verifyResult = await verifyOTP.mutateAsync({
        email: email.toLowerCase().trim(),
        otpCode: otpCode,
        sessionToken: sessionToken,
        password: verificationPassword,
      });
      console.log('[SignUp] OTP verified and account created:', verifyResult);

      // Step 4: Auto-login
      console.log('[SignUp] Step 4: Auto-login...');
      const result = await signIn.mutateAsync({
        email: email.toLowerCase().trim(),
        password: verificationPassword,
      });
      console.log('[SignUp] Login successful, checking 2FA requirement:', result);

      if (!result.requires2FA) {
        console.log('[SignUp] No 2FA required, redirecting to home...');
        router.replace('/(tabs)');
      } else {
        console.log('[SignUp] 2FA required, redirecting to verify-2fa...');
        router.push({
          pathname: '/auth/verify-2fa',
          params: {
            email: email.toLowerCase().trim(),
            password: verificationPassword,
            method: result.twoFactorMethod,
            phone: result.phone || '',
            phoneCountryCode: result.phoneCountryCode || '',
          },
        });
      }
    } catch (err: any) {
      console.error('[SignUp] Error during verification:', err);
      console.error('[SignUp] Error details:', JSON.stringify(err, null, 2));
      setError(err.message || 'Verification failed. Please try again.');
    }
  };

  const handleResendOTP = async () => {
    setError('');
    try {
      await sendOTP.mutateAsync({
        email: email.toLowerCase().trim(),
        userName: fullName.trim(),
      });
      setError('A new verification code has been sent to your email');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    }
  };

  // Render verification step
  if (step === 'verify-email') {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-1 px-6 py-8">
              {/* Header */}
              <View className="items-center mb-8 mt-8">
                <UserPlus size={48} color="#10B981" strokeWidth={2} />
                <Text className="text-2xl font-bold text-gray-900 mt-4 mb-2" style={{ fontFamily: 'Cairo_700Bold' }}>
                  {t('auth.verifyEmail') || 'Verify Your Email'}
                </Text>
                <Text className="text-base text-gray-600 text-center" style={{ fontFamily: 'Cairo_400Regular' }}>
                  {t('auth.weSentCode') || 'We sent a verification code to'} {email}
                </Text>
              </View>

              {/* Error Message */}
              {error ? (
                <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
                  <Text className="text-red-700 text-sm">{error}</Text>
                </View>
              ) : null}

              {/* OTP Input */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  {t('auth.verificationCode') || 'Verification Code'}
                </Text>
                <View style={{ direction: 'ltr' }}>
                  <TextInput
                    value={otpCode}
                    onChangeText={setOtpCode}
                    placeholder={t('auth.enterCode') || 'Enter 6-digit code'}
                    keyboardType="number-pad"
                    maxLength={6}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-2xl text-center font-bold text-gray-900 tracking-widest"
                    placeholderTextColor="#9CA3AF"
                    style={{ textAlign: 'center' }}
                  />
                </View>
              </View>

              {/* Password Re-entry */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  {t('auth.reEnterPassword') || 'Re-enter Password'}
                </Text>
                <TextInput
                  value={verificationPassword}
                  onChangeText={setVerificationPassword}
                  placeholder={t('signUp.passwordPlaceholder')}
                  secureTextEntry
                  autoCapitalize="none"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Verify Button */}
              <Pressable
                onPress={handleVerifyOTP}
                disabled={verifyOTP.isPending}
                className={`bg-emerald-500 rounded-xl py-4 items-center justify-center mb-4 active:opacity-80 ${
                  verifyOTP.isPending ? 'opacity-70' : ''
                }`}
              >
                {verifyOTP.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-base font-bold" style={{ fontFamily: 'Cairo_700Bold' }}>
                    {t('auth.verifyEmailBtn') || 'Verify & Create Account'}
                  </Text>
                )}
              </Pressable>

              {/* Resend OTP */}
              <Pressable
                onPress={handleResendOTP}
                disabled={sendOTP.isPending}
                className="py-3 items-center"
              >
                {sendOTP.isPending ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : (
                  <Text className="text-emerald-600 text-base font-semibold">
                    {t('auth.resendCode') || 'Resend Code'}
                  </Text>
                )}
              </Pressable>

              {/* Back */}
              <Pressable
                onPress={() => setStep('details')}
                className="py-3 items-center mt-2"
              >
                <Text className="text-gray-500 text-base">
                  {t('common.back') || 'Back'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Render signup details step
  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 py-8">
            {/* Logo Area */}
            <View className="items-center mb-8 mt-4">
              <View className="flex-row items-center mb-3">
                <UserPlus size={32} color="#10B981" strokeWidth={2.5} />
                <Text className="text-3xl font-bold text-gray-900 ml-3" style={{ fontFamily: 'Cairo_700Bold' }}>
                  {t('signUp.title')}
                </Text>
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'Cairo_700Bold' }}>
                {t('signUp.joinTitle')}
              </Text>
              <Text className="text-sm text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                {t('signUp.subtitle')}
              </Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
                <Text className="text-red-700 text-sm">{error}</Text>
              </View>
            ) : null}

            {/* Full Name Input */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">{t('signUp.fullName')}</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder={t('signUp.fullNamePlaceholder')}
                autoCapitalize="words"
                autoComplete="name"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">{t('signUp.email')}</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('signUp.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Password Input */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">{t('signUp.password')}</Text>
              <View className="relative">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('signUp.passwordPlaceholder')}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 pr-12 text-base text-gray-900"
                  placeholderTextColor="#9CA3AF"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#9CA3AF" />
                  ) : (
                    <Eye size={20} color="#9CA3AF" />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <View className="bg-blue-50 rounded-xl p-4 mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  {t('auth.passwordRequirements') || 'Password Requirements:'}
                </Text>
                {[
                  { key: 'hasLength' as const, text: t('auth.atLeast8Chars') || 'At least 8 characters' },
                  { key: 'hasUpper' as const, text: t('auth.oneUppercase') || 'One uppercase letter' },
                  { key: 'hasLower' as const, text: t('auth.oneLowercase') || 'One lowercase letter' },
                  { key: 'hasNumber' as const, text: t('auth.oneNumber') || 'One number' },
                  { key: 'hasSpecial' as const, text: t('auth.oneSpecial') || 'One special character' },
                ].map(({ key, text }) => (
                  <View key={key} className="flex-row items-center mb-1">
                    {passwordStrength[key] ? (
                      <Check size={16} color="#10B981" />
                    ) : (
                      <X size={16} color="#EF4444" />
                    )}
                    <Text className={`ml-2 text-sm ${passwordStrength[key] ? 'text-emerald-700' : 'text-gray-600'}`}>
                      {text}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Confirm Password Input */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2">{t('signUp.confirmPassword')}</Text>
              <View className="relative">
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('signUp.confirmPasswordPlaceholder')}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 pr-12 text-base text-gray-900"
                  placeholderTextColor="#9CA3AF"
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-4"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#9CA3AF" />
                  ) : (
                    <Eye size={20} color="#9CA3AF" />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Info about supplier registration */}
            <View className="bg-blue-50 rounded-xl p-4 mb-6">
              <Text className="text-sm text-blue-900 text-center" style={{ fontFamily: 'Cairo_400Regular' }}>
                {t('signUp.supplierWebOnly') || 'Want to list your property? Supplier registration is available on our website.'}
              </Text>
            </View>

            {/* Sign Up Button */}
            <Pressable
              onPress={handleSignUp}
              disabled={createSession.isPending || sendOTP.isPending}
              className={`bg-emerald-500 rounded-xl py-4 items-center justify-center mb-4 active:opacity-80 ${
                createSession.isPending || sendOTP.isPending ? 'opacity-70' : ''
              }`}
            >
              {createSession.isPending || sendOTP.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center">
                  <UserPlus size={20} color="white" />
                  <Text className="text-white text-base font-bold ml-2">{t('signUp.createAccount')}</Text>
                </View>
              )}
            </Pressable>

            {/* Terms */}
            <Text className="text-xs text-gray-500 text-center mb-4">
              {t('signUp.termsText')}
              <Text
                className="text-emerald-600 font-semibold"
                onPress={() => Linking.openURL('https://nestoria-travel.com/terms')}
              >
                {t('signUp.terms')}
              </Text>{t('signUp.and')}
              <Text
                className="text-emerald-600 font-semibold"
                onPress={() => Linking.openURL('https://nestoria-travel.com/privacy')}
              >
                {t('signUp.privacy')}
              </Text>
            </Text>

            {/* Divider */}
            <View className="flex-row items-center my-4">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="text-gray-500 text-sm mx-4">{t('signUp.or')}</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>

            {/* Sign In Link */}
            <View className="flex-row items-center justify-center mb-4">
              <Text className="text-gray-600 text-base">{t('signUp.haveAccount')}</Text>
              <Pressable onPress={() => router.back()}>
                <Text className="text-emerald-600 font-bold text-base">{t('signUp.signIn')}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
