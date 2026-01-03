import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Send,
  Check,
  CheckCheck,
  MoreVertical,
  Archive,
  Trash2,
  X,
  Eraser,
  Search,
  ChevronUp,
  ChevronDown,
  Languages,
  ChevronRight,
} from 'lucide-react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useConversation,
  useMessages,
  useSendMessage,
  useMarkMessagesAsRead,
  useSubscribeToMessages,
  useDeleteMessage,
  useClearConversation,
  useDeleteConversation,
  useArchiveConversation,
  useUserPreferredLanguage,
  useChatTranslate,
  useBatchTranslateMessages,
  SUPPORTED_LANGUAGES,
  getLanguageNativeName,
} from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n';

dayjs.extend(relativeTime);

interface MessageBubbleProps {
  item: any;
  isOwnMessage: boolean;
  onLongPress: () => void;
  translatedText?: string;
  isTranslating?: boolean;
}

function MessageBubble({ item, isOwnMessage, onLongPress, translatedText, isTranslating }: MessageBubbleProps) {
  const time = dayjs(item.created_at).format('h:mm A');
  const translateX = useSharedValue(0);
  const { t } = useTranslation();

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onEnd(() => {
      if (isOwnMessage) {
        runOnJS(onLongPress)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const displayMessage = translatedText || item.message;

  return (
    <GestureDetector gesture={longPressGesture}>
      <Animated.View
        style={animatedStyle}
        className={`px-4 py-2 ${isOwnMessage ? 'items-end' : 'items-start'}`}
      >
        <View className="flex-row items-end max-w-[75%]">
          {!isOwnMessage && (
            <Image
              source={{ uri: item.sender_avatar || 'https://via.placeholder.com/150' }}
              className="w-8 h-8 rounded-full bg-gray-200 mr-2"
            />
          )}

          <View>
            <View
              className={`px-4 py-3 rounded-2xl ${
                isOwnMessage
                  ? 'bg-emerald-500 rounded-br-sm'
                  : 'bg-gray-100 rounded-bl-sm'
              }`}
            >
              {isTranslating ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color={isOwnMessage ? '#FFF' : '#10B981'} />
                  <Text
                    className={`ml-2 text-sm ${isOwnMessage ? 'text-white/70' : 'text-gray-500'}`}
                    style={{ fontFamily: 'Cairo_400Regular' }}
                  >
                    {t('translation.translating')}
                  </Text>
                </View>
              ) : (
                <Text
                  className={`text-base ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}
                  style={{ fontFamily: 'Cairo_400Regular' }}
                >
                  {displayMessage}
                </Text>
              )}
            </View>

            {/* Translation indicator */}
            {translatedText && !isTranslating && (
              <View className={`flex-row items-center mt-0.5 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                <Languages size={10} color="#10B981" />
                <Text className="text-xs text-emerald-600 ml-0.5" style={{ fontFamily: 'Cairo_400Regular' }}>
                  {t('translation.translated')}
                </Text>
              </View>
            )}

            <View
              className={`flex-row items-center mt-1 ${
                isOwnMessage ? 'justify-end' : 'justify-start'
              }`}
            >
              <Text
                className="text-xs text-gray-500"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                {time}
              </Text>
              {isOwnMessage && (
                <View className="ml-1">
                  {item.is_read ? (
                    <CheckCheck size={14} color="#10B981" />
                  ) : (
                    <Check size={14} color="#9CA3AF" />
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messageText, setMessageText] = useState<string>('');
  const [currentProfileId, setCurrentProfileId] = useState<string>('');
  const [showActionsMenu, setShowActionsMenu] = useState<boolean>(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchBar, setShowSearchBar] = useState<boolean>(false);
  const [searchResultIndices, setSearchResultIndices] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(0);

  // Translation states
  const [isTranslationEnabled, setIsTranslationEnabled] = useState<boolean>(false);
  const [targetLanguage, setTargetLanguage] = useState<string>('en');
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);
  const [isTranslatingBatch, setIsTranslatingBatch] = useState<boolean>(false);

  const flatListRef = useRef<FlatList>(null);

  // Refs to always have latest values in subscription callback
  const isTranslationEnabledRef = useRef(isTranslationEnabled);
  const targetLanguageRef = useRef(targetLanguage);
  const currentProfileIdRef = useRef(currentProfileId);

  const { t } = useTranslation();

  const { data: conversation, isLoading: isLoadingConversation } = useConversation(id);
  const { data: messages, isLoading: isLoadingMessages } = useMessages(id);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkMessagesAsRead();
  const deleteMessage = useDeleteMessage();
  const clearConversation = useClearConversation();
  const deleteConversation = useDeleteConversation();
  const archiveConversation = useArchiveConversation();
  const { data: preferredLanguage } = useUserPreferredLanguage();
  const chatTranslate = useChatTranslate();
  const batchTranslate = useBatchTranslateMessages();

  // Get current user's profile ID
  useEffect(() => {
    async function getProfileId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (profile) {
          setCurrentProfileId(profile.id);
        }
      }
    }
    getProfileId();
  }, []);

  // Update refs when values change
  useEffect(() => {
    isTranslationEnabledRef.current = isTranslationEnabled;
  }, [isTranslationEnabled]);

  useEffect(() => {
    targetLanguageRef.current = targetLanguage;
  }, [targetLanguage]);

  useEffect(() => {
    currentProfileIdRef.current = currentProfileId;
  }, [currentProfileId]);

  // Set target language based on user preference
  useEffect(() => {
    if (preferredLanguage && preferredLanguage !== 'en') {
      setTargetLanguage(preferredLanguage);
    }
  }, [preferredLanguage]);

  // Mark messages as read when screen loads
  useEffect(() => {
    if (id && currentProfileId) {
      markAsRead.mutate(id);
    }
  }, [id, currentProfileId]);

  // Subscribe to real-time messages
  useSubscribeToMessages(id, (newMessage) => {
    // Auto-scroll to bottom on new message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Auto-translate new incoming message if translation is enabled
    // Only translate messages from others (sent messages are already translated in handleSend)
    if (isTranslationEnabledRef.current && newMessage.sender_id !== currentProfileIdRef.current) {
      console.log('🌐 Auto-translating incoming message to:', targetLanguageRef.current);
      // Translate the new message
      supabase.functions.invoke('translate-content', {
        body: {
          content: newMessage.message,
          targetLanguage: targetLanguageRef.current,
          contentType: 'message',
        },
      }).then(({ data, error }) => {
        if (!error && data?.translatedContent) {
          console.log('✅ Incoming message translated');
          setTranslatedMessages(prev => ({
            ...prev,
            [newMessage.id]: data.translatedContent,
          }));
        } else if (error) {
          console.error('❌ Translation error:', error);
        }
      }).catch(err => {
        console.error('Failed to translate incoming message:', err);
      });
    }
  });

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 300);
    }
  }, [messages?.length]);

  // Batch translate messages when translation is enabled
  useEffect(() => {
    if (isTranslationEnabled && messages && messages.length > 0) {
      translateAllMessages();
    } else if (!isTranslationEnabled) {
      setTranslatedMessages({});
    }
  }, [isTranslationEnabled, targetLanguage]);

  const translateSingleMessage = async (messageId: string, messageText: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: {
          content: messageText,
          targetLanguage,
          contentType: 'message',
        },
      });

      if (!error && data?.translatedContent) {
        setTranslatedMessages(prev => ({
          ...prev,
          [messageId]: data.translatedContent,
        }));
      }
    } catch (err) {
      console.error('Failed to translate message:', err);
    }
  };

  const translateAllMessages = async () => {
    if (!messages || messages.length === 0) return;

    setIsTranslatingBatch(true);

    try {
      const messagesToTranslate = messages.map(m => ({ id: m.id, message: m.message }));
      const translations = await batchTranslate.mutateAsync({
        messages: messagesToTranslate,
        targetLanguage,
      });

      setTranslatedMessages(translations);
    } catch (error) {
      console.error('Batch translation failed:', error);
    } finally {
      setIsTranslatingBatch(false);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || !id || !currentProfileId) return;

    const text = messageText.trim();
    setMessageText('');

    try {
      // Use chat-translate for sending with translation
      if (isTranslationEnabled) {
        const result = await chatTranslate.mutateAsync({
          message: text,
          targetLanguage,
          conversationId: id,
          senderId: currentProfileId,
        });

        // Store the translated message for display
        if (result.message?.id && result.translatedMessage) {
          setTranslatedMessages(prev => ({
            ...prev,
            [result.message.id]: result.translatedMessage,
          }));
        }
      } else {
        await sendMessage.mutateAsync({
          conversationId: id,
          message: text,
        });
      }

      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      if (error.message === 'MESSAGE_BLOCKED') {
        Alert.alert(
          t('chat.messageBlocked'),
          t('chat.messageBlockedDesc')
        );
      } else {
        setMessageText(text); // Restore message on error
      }
    }
  };

  const handleDeleteMessage = useCallback((messageId: string) => {
    if (!id) return;

    Alert.alert(
      t('chat.deleteMessage'),
      t('chat.deleteMessageConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            deleteMessage.mutate({ messageId, conversationId: id });
            setSelectedMessageId(null);
          },
        },
      ]
    );
  }, [id, deleteMessage, t]);

  const handleClearConversation = useCallback(() => {
    if (!id) return;

    Alert.alert(
      t('chat.clearConversation'),
      t('chat.clearConversationConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.clear'),
          style: 'destructive',
          onPress: () => {
            clearConversation.mutate(id);
            setShowActionsMenu(false);
          },
        },
      ]
    );
  }, [id, clearConversation, t]);

  const handleDeleteConversation = useCallback(() => {
    if (!id) return;

    Alert.alert(
      t('chat.deleteConversation'),
      t('chat.deleteConversationConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            deleteConversation.mutate(id);
            setShowActionsMenu(false);
            router.back();
          },
        },
      ]
    );
  }, [id, deleteConversation, t]);

  const handleArchiveConversation = useCallback(() => {
    if (!id) return;

    archiveConversation.mutate(id);
    setShowActionsMenu(false);
    router.back();
  }, [id, archiveConversation]);

  const handleToggleTranslation = () => {
    if (!isTranslationEnabled) {
      setShowLanguageModal(true);
    } else {
      setIsTranslationEnabled(false);
      setTranslatedMessages({});
    }
  };

  const handleSelectLanguage = (langCode: string) => {
    setTargetLanguage(langCode);
    setShowLanguageModal(false);
    setIsTranslationEnabled(true);
  };

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim() || !messages) {
      setSearchResultIndices([]);
      setCurrentSearchIndex(0);
      return;
    }

    const query = searchQuery.toLowerCase();
    const indices: number[] = [];

    messages.forEach((msg, index) => {
      if (msg.message.toLowerCase().includes(query)) {
        indices.push(index);
      }
    });

    setSearchResultIndices(indices);
    setCurrentSearchIndex(0);

    // Scroll to first result
    if (indices.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: indices[0],
          animated: true,
          viewPosition: 0.5,
        });
      }, 100);
    }
  }, [searchQuery, messages]);

  const handleSearchNext = () => {
    if (searchResultIndices.length === 0) return;

    const nextIndex = (currentSearchIndex + 1) % searchResultIndices.length;
    setCurrentSearchIndex(nextIndex);

    flatListRef.current?.scrollToIndex({
      index: searchResultIndices[nextIndex],
      animated: true,
      viewPosition: 0.5,
    });
  };

  const handleSearchPrevious = () => {
    if (searchResultIndices.length === 0) return;

    const prevIndex = currentSearchIndex === 0
      ? searchResultIndices.length - 1
      : currentSearchIndex - 1;
    setCurrentSearchIndex(prevIndex);

    flatListRef.current?.scrollToIndex({
      index: searchResultIndices[prevIndex],
      animated: true,
      viewPosition: 0.5,
    });
  };

  const handleCloseSearch = () => {
    setShowSearchBar(false);
    setSearchQuery('');
    setSearchResultIndices([]);
    setCurrentSearchIndex(0);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isOwnMessage = item.sender_id === currentProfileId;
    const translatedText = isTranslationEnabled ? translatedMessages[item.id] : undefined;
    const isTranslating = isTranslationEnabled && isTranslatingBatch && !translatedText;

    return (
      <MessageBubble
        item={item}
        isOwnMessage={isOwnMessage}
        onLongPress={() => handleDeleteMessage(item.id)}
        translatedText={translatedText}
        isTranslating={isTranslating}
      />
    );
  };

  if (isLoadingConversation || isLoadingMessages) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10B981" />
          <Text
            className="text-gray-600 mt-4"
            style={{ fontFamily: 'Cairo_400Regular' }}
          >
            {t('chat.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!conversation) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <Text
            className="text-gray-600"
            style={{ fontFamily: 'Cairo_400Regular' }}
          >
            {t('chat.notFound')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Determine other user
  const isGuest = conversation.guest_id === currentProfileId;
  const otherUserName = isGuest ? conversation.host_name : conversation.guest_name;
  const otherUserAvatar = isGuest ? conversation.host_avatar : conversation.guest_avatar;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View className="px-4 pt-2 pb-4 border-b border-gray-200">
            {showSearchBar ? (
              /* Search Bar */
              <View className="flex-row items-center">
                <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 py-2 mr-2">
                  <Search size={18} color="#9CA3AF" />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={t('chat.searchMessages')}
                    placeholderTextColor="#9CA3AF"
                    className="flex-1 ml-2 text-base text-gray-900"
                    style={{ fontFamily: 'Cairo_400Regular' }}
                    autoFocus
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')} className="mr-2">
                      <X size={16} color="#9CA3AF" />
                    </Pressable>
                  )}
                </View>

                {/* Search navigation */}
                {searchResultIndices.length > 0 && (
                  <View className="flex-row items-center mr-2">
                    <Text className="text-xs text-gray-600 mr-2" style={{ fontFamily: 'Cairo_400Regular' }}>
                      {currentSearchIndex + 1}/{searchResultIndices.length}
                    </Text>
                    <Pressable
                      onPress={handleSearchPrevious}
                      className="w-8 h-8 items-center justify-center"
                    >
                      <ChevronUp size={18} color="#000" />
                    </Pressable>
                    <Pressable
                      onPress={handleSearchNext}
                      className="w-8 h-8 items-center justify-center"
                    >
                      <ChevronDown size={18} color="#000" />
                    </Pressable>
                  </View>
                )}

                <Pressable
                  onPress={handleCloseSearch}
                  className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
                >
                  <X size={20} color="#000" />
                </Pressable>
              </View>
            ) : (
              /* Normal Header */
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => router.back()}
                  className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200 mr-3"
                >
                  <ArrowLeft size={20} color="#000" />
                </Pressable>

                <Image
                  source={{ uri: otherUserAvatar || 'https://via.placeholder.com/150' }}
                  className="w-10 h-10 rounded-full bg-gray-200 mr-3"
                />

                <View className="flex-1">
                  <Text
                    className="text-lg font-bold text-gray-900"
                    style={{ fontFamily: 'Cairo_700Bold' }}
                  >
                    {otherUserName}
                  </Text>
                  {conversation.property_title && (
                    <Text
                      className="text-xs text-emerald-600"
                      numberOfLines={1}
                      style={{ fontFamily: 'Cairo_600SemiBold' }}
                    >
                      {conversation.property_title}
                    </Text>
                  )}
                </View>

                {/* Translation toggle */}
                <Pressable
                  onPress={handleToggleTranslation}
                  className={`w-10 h-10 rounded-full items-center justify-center active:opacity-70 mr-2 ${
                    isTranslationEnabled ? 'bg-emerald-500' : 'bg-gray-100'
                  }`}
                >
                  <Languages size={20} color={isTranslationEnabled ? '#FFF' : '#000'} />
                </Pressable>

                {/* Search button */}
                <Pressable
                  onPress={() => setShowSearchBar(true)}
                  className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200 mr-2"
                >
                  <Search size={20} color="#000" />
                </Pressable>

                {/* Actions menu button */}
                <Pressable
                  onPress={() => setShowActionsMenu(true)}
                  className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
                >
                  <MoreVertical size={20} color="#000" />
                </Pressable>
              </View>
            )}
          </View>

          {/* Translation status bar */}
          {isTranslationEnabled && (
            <Pressable
              onPress={() => setShowLanguageModal(true)}
              className="flex-row items-center justify-center bg-emerald-50 py-2 px-4"
            >
              <Languages size={14} color="#10B981" />
              <Text className="text-sm text-emerald-600 ml-2" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {t('translation.translatingTo')} {getLanguageNativeName(targetLanguage)}
              </Text>
              <ChevronRight size={14} color="#10B981" className="ml-1" />
              {isTranslatingBatch && (
                <ActivityIndicator size="small" color="#10B981" style={{ marginLeft: 8 }} />
              )}
            </Pressable>
          )}

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages || []}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 8 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center justify-center py-20 px-4">
                <Text
                  className="text-gray-500 text-center"
                  style={{ fontFamily: 'Cairo_400Regular' }}
                >
                  {t('chat.noMessages')}
                </Text>
              </View>
            }
            ListHeaderComponent={
              messages && messages.length > 0 ? (
                <Text className="text-xs text-gray-400 text-center py-2" style={{ fontFamily: 'Cairo_400Regular' }}>
                  {t('chat.longPressToDelete')}
                </Text>
              ) : null
            }
          />

          {/* Input */}
          <SafeAreaView edges={['bottom']} className="border-t border-gray-200 bg-white">
            <View className="px-4 py-3 flex-row items-center">
              <View className="flex-1 bg-gray-100 rounded-full px-4 py-3 mr-2">
                <TextInput
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder={t('chat.typeMessage')}
                  placeholderTextColor="#9CA3AF"
                  className="text-base text-gray-900"
                  style={{ fontFamily: 'Cairo_400Regular' }}
                  multiline
                  maxLength={1000}
                />
              </View>

              <Pressable
                onPress={handleSend}
                disabled={!messageText.trim() || sendMessage.isPending || chatTranslate.isPending}
                className={`w-12 h-12 rounded-full items-center justify-center ${
                  messageText.trim() && !sendMessage.isPending && !chatTranslate.isPending
                    ? 'bg-emerald-500 active:opacity-80'
                    : 'bg-gray-300'
                }`}
              >
                {sendMessage.isPending || chatTranslate.isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Send size={20} color="#FFF" />
                )}
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>

        {/* Actions Menu Modal */}
        <Modal
          visible={showActionsMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowActionsMenu(false)}
        >
          <Pressable
            className="flex-1 bg-black/50 justify-end"
            onPress={() => setShowActionsMenu(false)}
          >
            <View className="bg-white rounded-t-3xl pt-6 pb-10 px-4">
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
                  {t('chat.conversationOptions')}
                </Text>
                <Pressable
                  onPress={() => setShowActionsMenu(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                >
                  <X size={18} color="#000" />
                </Pressable>
              </View>

              {/* Translation */}
              <Pressable
                onPress={() => {
                  setShowActionsMenu(false);
                  setTimeout(() => setShowLanguageModal(true), 300);
                }}
                className="flex-row items-center py-4 border-b border-gray-100 active:bg-gray-50"
              >
                <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${
                  isTranslationEnabled ? 'bg-emerald-100' : 'bg-purple-100'
                }`}>
                  <Languages size={20} color={isTranslationEnabled ? '#10B981' : '#8B5CF6'} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    {t('translation.autoTranslate')}
                  </Text>
                  <Text className="text-sm text-gray-500" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {isTranslationEnabled
                      ? `${t('translation.translatingTo')} ${getLanguageNativeName(targetLanguage)}`
                      : t('translation.autoTranslateDesc')}
                  </Text>
                </View>
                <View className={`px-2 py-1 rounded-full ${isTranslationEnabled ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  <Text className={`text-xs ${isTranslationEnabled ? 'text-emerald-600' : 'text-gray-500'}`} style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    {isTranslationEnabled ? t('common.on') : t('common.off')}
                  </Text>
                </View>
              </Pressable>

              {/* Archive */}
              <Pressable
                onPress={handleArchiveConversation}
                className="flex-row items-center py-4 border-b border-gray-100 active:bg-gray-50"
              >
                <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-4">
                  <Archive size={20} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    {t('chat.archive')}
                  </Text>
                  <Text className="text-sm text-gray-500" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {t('chat.archiveDesc')}
                  </Text>
                </View>
              </Pressable>

              {/* Clear conversation */}
              <Pressable
                onPress={handleClearConversation}
                className="flex-row items-center py-4 border-b border-gray-100 active:bg-gray-50"
              >
                <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-4">
                  <Eraser size={20} color="#F97316" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    {t('chat.clearConversation')}
                  </Text>
                  <Text className="text-sm text-gray-500" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {t('chat.clearDesc')}
                  </Text>
                </View>
              </Pressable>

              {/* Delete conversation */}
              <Pressable
                onPress={handleDeleteConversation}
                className="flex-row items-center py-4 active:bg-gray-50"
              >
                <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center mr-4">
                  <Trash2 size={20} color="#EF4444" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-red-600" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    {t('chat.deleteConversation')}
                  </Text>
                  <Text className="text-sm text-gray-500" style={{ fontFamily: 'Cairo_400Regular' }}>
                    {t('chat.deleteConversationDesc')}
                  </Text>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* Language Selection Modal */}
        <Modal
          visible={showLanguageModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <Pressable
            className="flex-1 bg-black/50 justify-end"
            onPress={() => setShowLanguageModal(false)}
          >
            <View className="bg-white rounded-t-3xl max-h-[70%]">
              {/* Header */}
              <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
                <Text className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
                  {t('translation.selectLanguage')}
                </Text>
                <Pressable
                  onPress={() => setShowLanguageModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                >
                  <X size={18} color="#000" />
                </Pressable>
              </View>

              {/* Disable option */}
              {isTranslationEnabled && (
                <Pressable
                  onPress={() => {
                    setIsTranslationEnabled(false);
                    setTranslatedMessages({});
                    setShowLanguageModal(false);
                  }}
                  className="flex-row items-center justify-between py-4 px-4 border-b border-gray-100 active:bg-gray-50"
                >
                  <Text className="text-base text-red-500" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                    {t('translation.disableTranslation')}
                  </Text>
                </Pressable>
              )}

              {/* Language List */}
              <ScrollView className="px-4 py-2" showsVerticalScrollIndicator={false}>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <Pressable
                    key={lang.code}
                    onPress={() => handleSelectLanguage(lang.code)}
                    className={`flex-row items-center justify-between py-3 px-3 rounded-xl mb-1 ${
                      targetLanguage === lang.code && isTranslationEnabled ? 'bg-emerald-50' : 'active:bg-gray-50'
                    }`}
                  >
                    <View>
                      <Text
                        className={`text-base ${
                          targetLanguage === lang.code && isTranslationEnabled ? 'text-emerald-600' : 'text-gray-900'
                        }`}
                        style={{ fontFamily: 'Cairo_600SemiBold' }}
                      >
                        {lang.nativeName}
                      </Text>
                      <Text className="text-xs text-gray-500" style={{ fontFamily: 'Cairo_400Regular' }}>
                        {lang.name}
                      </Text>
                    </View>
                    {targetLanguage === lang.code && isTranslationEnabled && (
                      <Check size={20} color="#10B981" />
                    )}
                  </Pressable>
                ))}
                <View className="h-8" />
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
