import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { X, Send } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useTranslation } from '@/lib/i18n';

interface ContactHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  host: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  property: {
    id: string;
    title: string;
    type: 'accommodation' | 'vehicle';
  };
}

interface SendMessagePayload {
  message: string;
  hostId: string;
  propertyId: string;
  propertyType: 'accommodation' | 'vehicle';
}

async function sendMessageToHost({
  message,
  hostId,
  propertyId,
  propertyType,
}: SendMessagePayload) {
  // 1. Get current user's auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be logged in to contact a host');
  }

  // 2. Get user's profile (to get profiles.id)
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (profileError || !userProfile) {
    throw new Error('User profile not found');
  }

  // 3. Check for existing conversation
  let conversationQuery = supabase
    .from('conversations')
    .select('id')
    .eq('guest_id', userProfile.id)
    .eq('host_id', hostId);

  if (propertyType === 'accommodation') {
    conversationQuery = conversationQuery.eq('accommodation_id', propertyId);
  } else {
    conversationQuery = conversationQuery.eq('vehicle_id', propertyId);
  }

  const { data: existingConversation } = await conversationQuery.maybeSingle();

  let conversationId: string;

  // 4. Create new conversation if none exists
  if (!existingConversation) {
    const conversationData: any = {
      guest_id: userProfile.id,
      host_id: hostId,
      status: 'active',
      last_message_at: new Date().toISOString(),
    };

    if (propertyType === 'accommodation') {
      conversationData.accommodation_id = propertyId;
    } else {
      conversationData.vehicle_id = propertyId;
    }

    const { data: newConversation, error: convError } = await supabase
      .from('conversations')
      .insert(conversationData)
      .select('id')
      .single();

    if (convError || !newConversation) {
      throw new Error('Failed to create conversation');
    }

    conversationId = newConversation.id;
  } else {
    conversationId = existingConversation.id;

    // Update last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);
  }

  // 5. Send the message
  const { error: messageError } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: userProfile.id,
    message: message.trim(),
    message_type: 'text',
    is_read: false,
  });

  if (messageError) {
    throw new Error('Failed to send message');
  }

  return { conversationId };
}

export default function ContactHostModal({
  isOpen,
  onClose,
  host,
  property,
}: ContactHostModalProps) {
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const [message, setMessage] = useState<string>('');

  const sendMessageMutation = useMutation({
    mutationFn: sendMessageToHost,
    onSuccess: () => {
      setMessage('');
      onClose();
      // Navigate to inbox tab
      router.push('/(tabs)/inbox');
    },
    onError: (error: any) => {
      if (error.message === 'You must be logged in to contact a host') {
        onClose();
        router.push('/auth/login');
      } else {
        Alert.alert(t('accommodation.error'), error.message || t('accommodation.sendMessageError'));
      }
    },
  });

  const handleSend = () => {
    if (!message.trim()) {
      Alert.alert(t('accommodation.error'), t('accommodation.messageRequired'));
      return;
    }

    sendMessageMutation.mutate({
      message,
      hostId: host.id,
      propertyId: property.id,
      propertyType: property.type,
    });
  };

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-white"
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View className="border-b border-gray-200 px-4 py-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
                {t('accommodation.contactHost')}
              </Text>
              <Pressable
                onPress={onClose}
                className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
              >
                <X size={20} color="#000" />
              </Pressable>
            </View>

            {/* Host Info */}
            <View className="flex-row items-center">
              <Image
                source={{
                  uri:
                    host.avatar_url ||
                    'https://ui-avatars.com/api/?name=' + encodeURIComponent(host.full_name),
                }}
                className="w-12 h-12 rounded-full"
              />
              <View className={`flex-1 ${isRTL ? 'mr-3' : 'ml-3'}`}>
                <Text className="font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {host.full_name}
                </Text>
                <Text className="text-sm text-gray-500" style={{ fontFamily: 'Cairo_400Regular' }}>
                  {t('accommodation.host')}
                </Text>
              </View>
            </View>
          </View>

          {/* Property Info */}
          <View className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <Text className="text-sm text-gray-600" style={{ fontFamily: 'Cairo_400Regular' }}>
              {t('accommodation.aboutProperty')}
            </Text>
            <Text className="text-base font-semibold text-gray-900 mt-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
              {property.title}
            </Text>
          </View>

          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Message Input */}
            <View className="px-4 py-4">
              <Text className="text-base font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {t('accommodation.yourMessage')}
              </Text>
              <TextInput
                className="bg-gray-50 rounded-xl p-4 text-gray-900"
                style={{
                  fontFamily: 'Cairo_400Regular',
                  textAlignVertical: 'top',
                  minHeight: 200,
                  maxHeight: 300,
                }}
                placeholder={t('accommodation.messageHostPlaceholder')}
                placeholderTextColor="#9CA3AF"
                value={message}
                onChangeText={setMessage}
                multiline
                editable={!sendMessageMutation.isPending}
                returnKeyType="default"
                blurOnSubmit={false}
              />

              {/* Tips */}
              <View className="mt-4 bg-blue-50 rounded-xl p-3">
                <Text className="text-sm text-blue-900 font-semibold mb-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {t('accommodation.messageTips')}
                </Text>
                <Text className="text-sm text-blue-800" style={{ fontFamily: 'Cairo_400Regular' }}>
                  • {t('accommodation.tip1')}
                </Text>
                <Text className="text-sm text-blue-800" style={{ fontFamily: 'Cairo_400Regular' }}>
                  • {t('accommodation.tip2')}
                </Text>
                <Text className="text-sm text-blue-800" style={{ fontFamily: 'Cairo_400Regular' }}>
                  • {t('accommodation.tip3')}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Send Button - Always visible at bottom */}
          <View className="border-t border-gray-200 px-4 py-4 bg-white">
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                handleSend();
              }}
              disabled={!message.trim() || sendMessageMutation.isPending}
              className={`rounded-xl py-4 flex-row items-center justify-center ${
                !message.trim() || sendMessageMutation.isPending
                  ? 'bg-gray-300'
                  : 'bg-emerald-500'
              }`}
            >
              {sendMessageMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Send size={20} color="#FFF" />
                  <Text className={`text-white font-bold text-base ${isRTL ? 'mr-2' : 'ml-2'}`} style={{ fontFamily: 'Cairo_700Bold' }}>
                    {t('accommodation.sendMessage')}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
