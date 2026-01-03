import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';
import { useAuth } from '@/lib/api/auth';
import { useChangePassword } from '@/lib/api/profile';
import { useTranslation, useLanguageStore } from '@/lib/i18n';

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const isRTL = useLanguageStore((state) => state.isRTL);
  const { data: authData } = useAuth();

  const changePassword = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password validation
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert(t('common.error'), t('password.enterCurrentPassword'));
      return;
    }

    if (!isPasswordValid) {
      Alert.alert(t('common.error'), t('password.weakPassword'));
      return;
    }

    if (!passwordsMatch) {
      Alert.alert(t('common.error'), t('password.passwordsDontMatch'));
      return;
    }

    try {
      await changePassword.mutateAsync({
        email: authData?.user?.email || '',
        oldPassword: currentPassword,
        newPassword: newPassword,
      });

      Alert.alert(t('common.success'), t('password.passwordChanged'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), t('password.incorrectCurrentPassword'));
    }
  };

  const PasswordRequirement = ({
    met,
    text,
  }: {
    met: boolean;
    text: string;
  }) => (
    <View className="flex-row items-center mb-2">
      {met ? (
        <CheckCircle2 size={16} color="#10B981" />
      ) : (
        <XCircle size={16} color="#9CA3AF" />
      )}
      <Text
        className={`ml-2 text-sm ${met ? 'text-emerald-600' : 'text-gray-500'}`}
        style={{ fontFamily: 'Cairo_400Regular' }}
      >
        {text}
      </Text>
    </View>
  );

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
            {t('password.title')}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-6"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Icon */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center">
            <Lock size={40} color="#10B981" />
          </View>
        </View>

        <Text
          className="text-center text-base text-gray-600 mb-8"
          style={{ fontFamily: 'Cairo_400Regular' }}
        >
          {t('password.description')}
        </Text>

        {/* Current Password */}
        <View className="mb-6">
          <Text
            className="text-sm font-semibold text-gray-700 mb-2"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('password.currentPassword')}
          </Text>
          <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder={t('password.enterCurrentPassword')}
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showCurrentPassword}
              className="flex-1 py-3 text-base text-gray-900"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
            />
            <Pressable
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              className="p-2"
            >
              {showCurrentPassword ? (
                <EyeOff size={20} color="#6B7280" />
              ) : (
                <Eye size={20} color="#6B7280" />
              )}
            </Pressable>
          </View>
        </View>

        {/* New Password */}
        <View className="mb-4">
          <Text
            className="text-sm font-semibold text-gray-700 mb-2"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('password.newPassword')}
          </Text>
          <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('password.enterNewPassword')}
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showNewPassword}
              className="flex-1 py-3 text-base text-gray-900"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
            />
            <Pressable
              onPress={() => setShowNewPassword(!showNewPassword)}
              className="p-2"
            >
              {showNewPassword ? (
                <EyeOff size={20} color="#6B7280" />
              ) : (
                <Eye size={20} color="#6B7280" />
              )}
            </Pressable>
          </View>
        </View>

        {/* Password Requirements */}
        <View className="bg-gray-50 rounded-xl p-4 mb-6">
          <Text
            className="text-sm font-semibold text-gray-700 mb-3"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('password.requirements')}
          </Text>
          <PasswordRequirement met={hasMinLength} text={t('password.minLength')} />
          <PasswordRequirement met={hasUppercase} text={t('password.uppercase')} />
          <PasswordRequirement met={hasLowercase} text={t('password.lowercase')} />
          <PasswordRequirement met={hasNumber} text={t('password.number')} />
          <PasswordRequirement met={hasSpecialChar} text={t('password.specialChar')} />
        </View>

        {/* Confirm Password */}
        <View className="mb-8">
          <Text
            className="text-sm font-semibold text-gray-700 mb-2"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {t('password.confirmPassword')}
          </Text>
          <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('password.confirmNewPassword')}
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showConfirmPassword}
              className="flex-1 py-3 text-base text-gray-900"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
            />
            <Pressable
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              className="p-2"
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color="#6B7280" />
              ) : (
                <Eye size={20} color="#6B7280" />
              )}
            </Pressable>
          </View>
          {confirmPassword.length > 0 && (
            <View className="flex-row items-center mt-2">
              {passwordsMatch ? (
                <>
                  <CheckCircle2 size={14} color="#10B981" />
                  <Text
                    className="text-sm text-emerald-600 ml-1"
                    style={{ fontFamily: 'Cairo_400Regular' }}
                  >
                    {t('password.passwordsMatch')}
                  </Text>
                </>
              ) : (
                <>
                  <XCircle size={14} color="#EF4444" />
                  <Text
                    className="text-sm text-red-500 ml-1"
                    style={{ fontFamily: 'Cairo_400Regular' }}
                  >
                    {t('password.passwordsDontMatch')}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>

        <View className="h-6" />
      </ScrollView>

      {/* Change Password Button */}
      <SafeAreaView edges={['bottom']} className="px-4 py-3 border-t border-gray-200 bg-white">
        <Pressable
          onPress={handleChangePassword}
          disabled={changePassword.isPending || !isPasswordValid || !passwordsMatch}
          className={`py-4 rounded-xl items-center ${
            changePassword.isPending || !isPasswordValid || !passwordsMatch
              ? 'bg-gray-300'
              : 'bg-emerald-500 active:opacity-80'
          }`}
        >
          {changePassword.isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text
              className="text-white text-base font-bold"
              style={{ fontFamily: 'Cairo_700Bold' }}
            >
              {t('password.changePassword')}
            </Text>
          )}
        </Pressable>
      </SafeAreaView>
    </SafeAreaView>
  );
}
