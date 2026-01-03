import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Shield,
  Smartphone,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Copy,
  ChevronRight,
  Trash2,
  Monitor,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/lib/api/auth';
import {
  useCheck2FAStatus,
  useSetup2FA,
  useVerify2FASetup,
  useDisable2FA,
  useEnableSMS2FA,
  useTrustedDevices,
  useRevokeTrustedDevice,
} from '@/lib/api/profile';
import { useTranslation, useLanguageStore } from '@/lib/i18n';

export default function SecurityScreen() {
  const { t } = useTranslation();
  const isRTL = useLanguageStore((state) => state.isRTL);
  const { data: authData } = useAuth();

  const { data: twoFAStatus, refetch: refetch2FA } = useCheck2FAStatus();
  const { data: trustedDevices, refetch: refetchDevices } = useTrustedDevices();

  const setup2FA = useSetup2FA();
  const verify2FASetup = useVerify2FASetup();
  const disable2FA = useDisable2FA();
  const enableSMS2FA = useEnableSMS2FA();
  const revokeDevice = useRevokeTrustedDevice();

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupStep, setSetupStep] = useState<'qr' | 'verify' | 'backup'>('qr');
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);

  const verificationInputRefs = useRef<(TextInput | null)[]>([]);

  const handleSetup2FA = async () => {
    try {
      const data = await setup2FA.mutateAsync();
      setSetupData(data);
      setSetupStep('qr');
      setShowSetupModal(true);
    } catch (error) {
      Alert.alert(t('common.error'), t('security.setupError'));
    }
  };

  const handleVerificationCodeChange = (value: string, index: number) => {
    // Handle paste - if pasting more than 1 character, distribute across inputs
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = [...verificationCode];

      // Fill from current index
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });

      setVerificationCode(newCode);

      // Focus last filled input or next empty one
      const lastFilledIndex = Math.min(index + digits.length - 1, 5);
      verificationInputRefs.current[lastFilledIndex]?.focus();
      return;
    }

    // Normal single character input
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      verificationInputRefs.current[index + 1]?.focus();
    }
  };

  const handleVerificationCodeKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !verificationCode[index] && index > 0) {
      verificationInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      Alert.alert(t('common.error'), t('security.enterCode'));
      return;
    }

    try {
      await verify2FASetup.mutateAsync(code);
      setSetupStep('backup');
      refetch2FA();
    } catch (error) {
      Alert.alert(t('common.error'), t('security.invalidCode'));
    }
  };

  const handleCopySecret = async () => {
    if (setupData?.secret) {
      await Clipboard.setStringAsync(setupData.secret);
      Alert.alert(t('common.success'), t('security.secretCopied'));
    }
  };

  const handleCopyBackupCodes = async () => {
    if (setupData?.backupCodes) {
      await Clipboard.setStringAsync(setupData.backupCodes.join('\n'));
      Alert.alert(t('common.success'), t('security.backupCodesCopied'));
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword.trim()) {
      Alert.alert(t('common.error'), t('security.enterPassword'));
      return;
    }

    try {
      await disable2FA.mutateAsync(disablePassword);
      setShowDisableModal(false);
      setDisablePassword('');
      refetch2FA();
      Alert.alert(t('common.success'), t('security.2FADisabled'));
    } catch (error) {
      Alert.alert(t('common.error'), t('security.wrongPassword'));
    }
  };

  const handleRevokeDevice = async (deviceId: string, deviceName: string) => {
    Alert.alert(
      t('security.revokeDevice'),
      `${t('security.revokeDeviceMessage')} ${deviceName}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('security.revoke'),
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeDevice.mutateAsync(deviceId);
              refetchDevices();
            } catch (error) {
              Alert.alert(t('common.error'), t('security.revokeError'));
            }
          },
        },
      ]
    );
  };

  const closeSetupModal = () => {
    setShowSetupModal(false);
    setSetupStep('qr');
    setSetupData(null);
    setVerificationCode(['', '', '', '', '', '']);
  };

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
            {t('security.title')}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* 2FA Status */}
        <View className="bg-white mt-4 mx-4 rounded-xl overflow-hidden">
          <View className="p-4 border-b border-gray-100">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center">
                  <Shield size={20} color="#10B981" />
                </View>
                <View className="ml-3">
                  <Text
                    className="text-base font-semibold text-gray-900"
                    style={{ fontFamily: 'Cairo_600SemiBold' }}
                  >
                    {t('security.twoFactorAuth')}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    {twoFAStatus?.enabled ? (
                      <>
                        <CheckCircle2 size={14} color="#10B981" />
                        <Text
                          className="text-sm text-emerald-600 ml-1"
                          style={{ fontFamily: 'Cairo_400Regular' }}
                        >
                          {t('security.enabled')}
                        </Text>
                      </>
                    ) : (
                      <>
                        <XCircle size={14} color="#EF4444" />
                        <Text
                          className="text-sm text-red-500 ml-1"
                          style={{ fontFamily: 'Cairo_400Regular' }}
                        >
                          {t('security.disabled')}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>

          {twoFAStatus?.enabled ? (
            <Pressable
              onPress={() => setShowDisableModal(true)}
              className="p-4 flex-row items-center justify-between active:bg-gray-50"
            >
              <View className="flex-row items-center">
                <XCircle size={20} color="#EF4444" />
                <Text
                  className="text-base text-red-500 ml-3"
                  style={{ fontFamily: 'Cairo_600SemiBold' }}
                >
                  {t('security.disable2FA')}
                </Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={handleSetup2FA}
                disabled={setup2FA.isPending}
                className="p-4 flex-row items-center justify-between active:bg-gray-50 border-b border-gray-100"
              >
                <View className="flex-row items-center flex-1">
                  <Smartphone size={20} color="#374151" />
                  <View className="ml-3 flex-1">
                    <Text
                      className="text-base text-gray-900"
                      style={{ fontFamily: 'Cairo_600SemiBold' }}
                    >
                      {t('security.authenticatorApp')}
                    </Text>
                    <Text
                      className="text-sm text-gray-500"
                      style={{ fontFamily: 'Cairo_400Regular' }}
                    >
                      {t('security.authenticatorAppDesc')}
                    </Text>
                  </View>
                </View>
                {setup2FA.isPending ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : (
                  <ChevronRight size={20} color="#9CA3AF" />
                )}
              </Pressable>

              <Pressable
                onPress={async () => {
                  if (!twoFAStatus?.phoneVerified) {
                    router.push('/profile/verify-phone');
                  } else {
                    // Phone is verified, enable SMS 2FA
                    try {
                      await enableSMS2FA.mutateAsync();
                      refetch2FA();
                      Alert.alert(
                        t('common.success'),
                        t('security.sms2FAEnabled') || 'SMS two-factor authentication has been enabled successfully!'
                      );
                    } catch (error) {
                      Alert.alert(
                        t('common.error'),
                        error instanceof Error ? error.message : t('security.sms2FAError') || 'Failed to enable SMS 2FA'
                      );
                    }
                  }
                }}
                disabled={enableSMS2FA.isPending}
                className="p-4 flex-row items-center justify-between active:bg-gray-50"
              >
                <View className="flex-row items-center flex-1">
                  <MessageSquare size={20} color="#374151" />
                  <View className="ml-3 flex-1">
                    <Text
                      className="text-base text-gray-900"
                      style={{ fontFamily: 'Cairo_600SemiBold' }}
                    >
                      {t('security.smsAuth')}
                    </Text>
                    <Text
                      className="text-sm text-gray-500"
                      style={{ fontFamily: 'Cairo_400Regular' }}
                    >
                      {twoFAStatus?.phoneVerified
                        ? t('security.smsAuthDesc')
                        : t('security.verifyPhoneFirst')}
                    </Text>
                  </View>
                </View>
                {enableSMS2FA.isPending ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : (
                  <ChevronRight size={20} color="#9CA3AF" />
                )}
              </Pressable>
            </>
          )}
        </View>

        {/* Trusted Devices */}
        <View className="bg-white mt-4 mx-4 rounded-xl overflow-hidden mb-8">
          <View className="p-4 border-b border-gray-100">
            <Text
              className="text-base font-semibold text-gray-900"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('security.trustedDevices')}
            </Text>
            <Text
              className="text-sm text-gray-500 mt-1"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {t('security.trustedDevicesDesc')}
            </Text>
          </View>

          {trustedDevices && trustedDevices.length > 0 ? (
            trustedDevices.map((device) => (
              <View
                key={device.id}
                className="p-4 flex-row items-center justify-between border-b border-gray-100"
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                    <Monitor size={20} color="#374151" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text
                      className="text-base text-gray-900"
                      style={{ fontFamily: 'Cairo_600SemiBold' }}
                    >
                      {device.device_name || t('security.unknownDevice')}
                    </Text>
                    <Text
                      className="text-sm text-gray-500"
                      style={{ fontFamily: 'Cairo_400Regular' }}
                    >
                      {device.location || device.ip_address || t('security.unknownLocation')}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => handleRevokeDevice(device.id, device.device_name || '')}
                  className="p-2"
                >
                  <Trash2 size={18} color="#EF4444" />
                </Pressable>
              </View>
            ))
          ) : (
            <View className="p-4">
              <Text
                className="text-sm text-gray-500 text-center"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                {t('security.noTrustedDevices')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 2FA Setup Modal */}
      <Modal visible={showSetupModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView edges={['top']} className="flex-1 bg-white">
          <View className="px-4 pt-2 pb-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <Text
                className="text-xl font-bold text-gray-900"
                style={{ fontFamily: 'Cairo_700Bold' }}
              >
                {t('security.setup2FA')}
              </Text>
              <Pressable onPress={closeSetupModal} className="p-2">
                <XCircle size={24} color="#6B7280" />
              </Pressable>
            </View>
          </View>

          <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
            {setupStep === 'qr' && setupData && (
              <>
                <Text
                  className="text-base text-gray-600 text-center mb-6"
                  style={{ fontFamily: 'Cairo_400Regular' }}
                >
                  {t('security.scanQRCode')}
                </Text>

                {/* QR Code */}
                <View className="items-center mb-6">
                  <View className="bg-white p-4 rounded-xl border border-gray-200">
                    <Image
                      source={{ uri: setupData.qrCode }}
                      style={{ width: 200, height: 200 }}
                      resizeMode="contain"
                    />
                  </View>
                </View>

                {/* Secret Key */}
                <Text
                  className="text-sm text-gray-500 text-center mb-2"
                  style={{ fontFamily: 'Cairo_400Regular' }}
                >
                  {t('security.orEnterManually')}
                </Text>
                <Pressable
                  onPress={handleCopySecret}
                  className="flex-row items-center justify-center bg-gray-100 rounded-xl px-4 py-3 mb-6"
                >
                  <Text
                    className="text-base text-gray-900 mr-2"
                    style={{ fontFamily: 'Cairo_600SemiBold' }}
                    numberOfLines={1}
                  >
                    {setupData.secret}
                  </Text>
                  <Copy size={18} color="#6B7280" />
                </Pressable>

                <Pressable
                  onPress={() => setSetupStep('verify')}
                  className="bg-emerald-500 py-4 rounded-xl items-center active:opacity-80"
                >
                  <Text
                    className="text-white text-base font-bold"
                    style={{ fontFamily: 'Cairo_700Bold' }}
                  >
                    {t('common.next')}
                  </Text>
                </Pressable>
              </>
            )}

            {setupStep === 'verify' && (
              <>
                <Text
                  className="text-base text-gray-600 text-center mb-6"
                  style={{ fontFamily: 'Cairo_400Regular' }}
                >
                  {t('security.enterVerificationCode')}
                </Text>

                {/* Verification Code Input */}
                <View className="flex-row justify-center mb-6" style={{ direction: 'ltr' }}>
                  {verificationCode.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        verificationInputRefs.current[index] = ref;
                      }}
                      value={digit}
                      onChangeText={(value) => handleVerificationCodeChange(value, index)}
                      onKeyPress={({ nativeEvent }) =>
                        handleVerificationCodeKeyPress(nativeEvent.key, index)
                      }
                      keyboardType="number-pad"
                      maxLength={6}
                      selectTextOnFocus
                      className="w-12 h-14 mx-1 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl"
                      style={{ fontFamily: 'Cairo_700Bold', textAlign: 'center' }}
                    />
                  ))}
                </View>

                <Pressable
                  onPress={handleVerify}
                  disabled={verify2FASetup.isPending}
                  className={`py-4 rounded-xl items-center ${
                    verify2FASetup.isPending ? 'bg-gray-300' : 'bg-emerald-500 active:opacity-80'
                  }`}
                >
                  {verify2FASetup.isPending ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text
                      className="text-white text-base font-bold"
                      style={{ fontFamily: 'Cairo_700Bold' }}
                    >
                      {t('security.verify')}
                    </Text>
                  )}
                </Pressable>
              </>
            )}

            {setupStep === 'backup' && setupData && (
              <>
                <View className="items-center mb-6">
                  <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center">
                    <CheckCircle2 size={40} color="#10B981" />
                  </View>
                </View>

                <Text
                  className="text-xl font-bold text-gray-900 text-center mb-2"
                  style={{ fontFamily: 'Cairo_700Bold' }}
                >
                  {t('security.2FAEnabled')}
                </Text>

                <Text
                  className="text-base text-gray-600 text-center mb-6"
                  style={{ fontFamily: 'Cairo_400Regular' }}
                >
                  {t('security.saveBackupCodes')}
                </Text>

                {/* Backup Codes */}
                <View className="bg-gray-50 rounded-xl p-4 mb-4">
                  <View className="flex-row flex-wrap justify-center">
                    {setupData.backupCodes.map((code, index) => (
                      <View
                        key={index}
                        className="bg-white rounded-lg px-3 py-2 m-1 border border-gray-200"
                      >
                        <Text
                          className="text-sm text-gray-900 font-mono"
                          style={{ fontFamily: 'Cairo_600SemiBold' }}
                        >
                          {code}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <Pressable
                  onPress={handleCopyBackupCodes}
                  className="flex-row items-center justify-center bg-gray-100 rounded-xl py-3 mb-6"
                >
                  <Copy size={18} color="#374151" />
                  <Text
                    className="text-base text-gray-700 ml-2"
                    style={{ fontFamily: 'Cairo_600SemiBold' }}
                  >
                    {t('security.copyBackupCodes')}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={closeSetupModal}
                  className="bg-emerald-500 py-4 rounded-xl items-center active:opacity-80"
                >
                  <Text
                    className="text-white text-base font-bold"
                    style={{ fontFamily: 'Cairo_700Bold' }}
                  >
                    {t('common.done')}
                  </Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Disable 2FA Modal */}
      <Modal visible={showDisableModal} animationType="fade" transparent>
        <View className="flex-1 bg-black/50 items-center justify-center px-4">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <Text
              className="text-lg font-bold text-gray-900 mb-2"
              style={{ fontFamily: 'Cairo_700Bold' }}
            >
              {t('security.disable2FA')}
            </Text>
            <Text
              className="text-sm text-gray-600 mb-4"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {t('security.enterPasswordToDisable')}
            </Text>

            <TextInput
              value={disablePassword}
              onChangeText={setDisablePassword}
              placeholder={t('security.password')}
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
              style={{ fontFamily: 'Cairo_400Regular' }}
            />

            <View className="flex-row">
              <Pressable
                onPress={() => {
                  setShowDisableModal(false);
                  setDisablePassword('');
                }}
                className="flex-1 py-3 rounded-xl bg-gray-100 items-center mr-2"
              >
                <Text
                  className="text-gray-700 font-semibold"
                  style={{ fontFamily: 'Cairo_600SemiBold' }}
                >
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleDisable2FA}
                disabled={disable2FA.isPending}
                className={`flex-1 py-3 rounded-xl items-center ml-2 ${
                  disable2FA.isPending ? 'bg-gray-300' : 'bg-red-500'
                }`}
              >
                {disable2FA.isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text
                    className="text-white font-semibold"
                    style={{ fontFamily: 'Cairo_600SemiBold' }}
                  >
                    {t('security.disable')}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
