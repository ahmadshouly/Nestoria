import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LogIn, Eye, EyeOff } from 'lucide-react-native';
import { useSignIn } from '@/lib/api/auth';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const { t } = useTranslation();

  const signIn = useSignIn();

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setError('');

    try {
      const result = await signIn.mutateAsync({ email, password });

      if (result.requires2FA) {
        // Navigate to 2FA screen if needed
        router.push({
          pathname: '/auth/verify-2fa',
          params: {
            email,
            password,
            method: result.twoFactorMethod,
            phone: result.phone || '',
            phoneCountryCode: result.phoneCountryCode || '',
          },
        });
      } else {
        // Success - fetch user profile to check role
        if (result.data?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', result.data.user.id)
            .single();

          // Check if user is a supplier
          if (profile?.role === 'supplier') {
            console.log('🚫 Supplier user detected after sign-in, redirecting to supplier-redirect screen');
            router.replace('/supplier-redirect');
          } else {
            // Client user - navigate to home
            router.replace('/(tabs)');
          }
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    }
  };

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
            {/* Logo Area */}
            <View className="items-center mb-8 mt-8">
              <View className="flex-row items-center mb-4">
                <LogIn size={36} color="#10B981" strokeWidth={2.5} />
                <Text className="text-3xl font-bold text-gray-900 ml-3" style={{ fontFamily: 'Cairo_700Bold' }}>
                  {t('signIn.title')}
                </Text>
              </View>
              <Text className="text-sm text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                {t('signIn.subtitle')}
              </Text>
            </View>

            {/* Welcome Text */}
            <View className="mb-8 items-center">
              <Text className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Cairo_700Bold' }}>
                {t('signIn.welcome')}
              </Text>
              <Text className="text-base text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
                {t('signIn.welcomeSub')}
              </Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
                <Text className="text-red-700 text-sm">{error}</Text>
              </View>
            ) : null}

            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">{t('signIn.email')}</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('signIn.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Password Input */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2">{t('signIn.password')}</Text>
              <View className="relative">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('signIn.passwordPlaceholder')}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
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

            {/* Forgot Password */}
            <Pressable
              onPress={() => router.push('/auth/forgot-password')}
              className="self-end mb-6"
            >
              <Text className="text-emerald-600 font-semibold text-sm">{t('signIn.forgotPassword')}</Text>
            </Pressable>

            {/* Sign In Button */}
            <Pressable
              onPress={handleSignIn}
              disabled={signIn.isPending}
              className={`bg-emerald-500 rounded-xl py-4 items-center justify-center mb-4 active:opacity-80 ${
                signIn.isPending ? 'opacity-70' : ''
              }`}
            >
              {signIn.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center">
                  <LogIn size={20} color="white" />
                  <Text className="text-white text-base font-bold ml-2">{t('signIn.signInButton')}</Text>
                </View>
              )}
            </Pressable>

            {/* Divider */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="text-gray-500 text-sm mx-4">{t('signIn.or')}</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>

            {/* Sign Up Link */}
            <View className="flex-row items-center justify-center">
              <Text className="text-gray-600 text-base">{t('signIn.noAccount')}</Text>
              <Pressable onPress={() => router.push('/auth/sign-up')}>
                <Text className="text-emerald-600 font-bold text-base">{t('signIn.signUp')}</Text>
              </Pressable>
            </View>

            {/* Guest Mode */}
            <Pressable
              onPress={() => router.replace('/(tabs)')}
              className="mt-8 py-3 items-center"
            >
              <Text className="text-gray-500 text-sm">{t('signIn.continueGuest')}</Text>
            </Pressable>

            {/* Privacy & Terms */}
            <View className="flex-row items-center justify-center mt-6">
              <Pressable onPress={() => Linking.openURL('https://nestoria-travel.com/privacy')}>
                <Text className="text-gray-600 text-sm underline">{t('landing.privacy')}</Text>
              </Pressable>
              <Text className="text-gray-400 mx-2">•</Text>
              <Pressable onPress={() => Linking.openURL('https://nestoria-travel.com/terms')}>
                <Text className="text-gray-600 text-sm underline">{t('landing.terms')}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
