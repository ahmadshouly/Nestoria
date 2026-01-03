import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { useRequestPasswordReset } from '@/lib/api/auth';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const requestReset = useRequestPasswordReset();

  const handleSubmit = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');

    try {
      await requestReset.mutateAsync(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    }
  };

  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 px-6 py-8 justify-center">
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center mb-4">
              <Mail size={40} color="#10B981" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Check your email
            </Text>
            <Text className="text-base text-gray-600 text-center mb-8">
              We've sent a password reset link to{'\n'}
              <Text className="font-semibold">{email}</Text>
            </Text>
          </View>

          <Pressable
            onPress={() => router.back()}
            className="bg-emerald-500 rounded-xl py-4 items-center justify-center active:opacity-80"
          >
            <Text className="text-white text-base font-bold">Back to Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 py-8">
        {/* Header */}
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mb-8"
        >
          <ArrowLeft size={24} color="#000" />
        </Pressable>

        {/* Title */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-3">Forgot Password?</Text>
          <Text className="text-base text-gray-600">
            Enter your email address and we'll send you instructions to reset your password.
          </Text>
        </View>

        {/* Error Message */}
        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        ) : null}

        {/* Email Input */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-gray-700 mb-2">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Submit Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={requestReset.isPending}
          className={`bg-emerald-500 rounded-xl py-4 items-center justify-center active:opacity-80 ${
            requestReset.isPending ? 'opacity-70' : ''
          }`}
        >
          {requestReset.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-base font-bold">Send Reset Link</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
