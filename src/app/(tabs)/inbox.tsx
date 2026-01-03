import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Image, Pressable, ActivityIndicator, Dimensions, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle, Archive, Trash2, ArchiveRestore, Search, X } from 'lucide-react-native';
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
  useConversations,
  useArchiveConversation,
  useUnarchiveConversation,
  useDeleteConversation,
} from '@/lib/api';
import { router } from 'expo-router';
import { useTranslation } from '@/lib/i18n';

dayjs.extend(relativeTime);

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;

interface ConversationCardProps {
  conversation: any;
  onPress: () => void;
  onArchive: () => void;
  onDelete: () => void;
  isArchived: boolean;
}

function ConversationCard({ conversation, onPress, onArchive, onDelete, isArchived }: ConversationCardProps) {
  const translateX = useSharedValue(0);
  const { t } = useTranslation();

  // Determine other user (guest or host perspective)
  const isGuest = conversation.guest_id !== conversation.host_id;
  const otherUserName = isGuest ? conversation.host_name : conversation.guest_name;
  const otherUserAvatar = isGuest ? conversation.host_avatar : conversation.guest_avatar;
  const hasUnread = (conversation.unread_count || 0) > 0;

  const handleArchiveAction = useCallback(() => {
    translateX.value = withSpring(0);
    onArchive();
  }, [onArchive, translateX]);

  const handleDeleteAction = useCallback(() => {
    translateX.value = withSpring(0);
    Alert.alert(
      t('chat.deleteConversation'),
      t('chat.deleteConversationConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  }, [onDelete, translateX, t]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow left swipe (negative values)
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -160);
      }
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-160);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      if (translateX.value < -40) {
        translateX.value = withSpring(0);
      } else {
        runOnJS(onPress)();
      }
    });

  const combinedGesture = Gesture.Race(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View className="relative overflow-hidden">
      {/* Background actions */}
      <View className="absolute right-0 top-0 bottom-0 flex-row">
        <Pressable
          onPress={handleArchiveAction}
          className="w-20 items-center justify-center bg-blue-500"
        >
          {isArchived ? (
            <ArchiveRestore size={24} color="#FFF" />
          ) : (
            <Archive size={24} color="#FFF" />
          )}
          <Text className="text-white text-xs mt-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
            {isArchived ? t('chat.unarchive') : t('chat.archive')}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleDeleteAction}
          className="w-20 items-center justify-center bg-red-500"
        >
          <Trash2 size={24} color="#FFF" />
          <Text className="text-white text-xs mt-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
            {t('common.delete')}
          </Text>
        </Pressable>
      </View>

      {/* Main card */}
      <GestureDetector gesture={combinedGesture}>
        <Animated.View
          style={animatedStyle}
          className={`px-4 py-4 flex-row items-center border-b border-gray-100 ${
            hasUnread ? 'bg-emerald-50/30' : 'bg-white'
          }`}
        >
          <View className="relative">
            <Image
              source={{ uri: otherUserAvatar || 'https://via.placeholder.com/150' }}
              className="w-14 h-14 rounded-full bg-gray-200"
            />
            {hasUnread && (
              <View className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white items-center justify-center">
                <Text className="text-white text-xs font-bold" style={{ fontFamily: 'Cairo_700Bold' }}>
                  {conversation.unread_count}
                </Text>
              </View>
            )}
          </View>

          <View className="flex-1 ml-3">
            <View className="flex-row items-center justify-between mb-1">
              <Text
                className={`text-base ${hasUnread ? 'font-bold' : 'font-semibold'} text-gray-900 flex-1`}
                numberOfLines={1}
                style={{ fontFamily: hasUnread ? 'Cairo_700Bold' : 'Cairo_600SemiBold' }}
              >
                {otherUserName || t('inbox.unknownUser')}
              </Text>
              <Text
                className={`text-xs ${hasUnread ? 'font-semibold text-gray-700' : 'text-gray-500'} ml-2`}
                style={{ fontFamily: hasUnread ? 'Cairo_600SemiBold' : 'Cairo_400Regular' }}
              >
                {conversation.last_message_at ? dayjs(conversation.last_message_at).fromNow() : ''}
              </Text>
            </View>

            {conversation.property_title && (
              <Text
                className="text-xs text-emerald-600 mb-1"
                numberOfLines={1}
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                {conversation.property_title}
              </Text>
            )}

            <Text
              className={`text-sm ${hasUnread ? 'font-medium text-gray-900' : 'text-gray-600'}`}
              numberOfLines={2}
              style={{ fontFamily: hasUnread ? 'Cairo_600SemiBold' : 'Cairo_400Regular' }}
            >
              {conversation.last_message || t('inbox.startConversation')}
            </Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function InboxScreen() {
  const { data: conversations, isLoading } = useConversations();
  const archiveConversation = useArchiveConversation();
  const unarchiveConversation = useUnarchiveConversation();
  const deleteConversation = useDeleteConversation();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter conversations based on active tab
  const activeConversations = conversations?.filter((c) => !c.is_archived) || [];
  const archivedConversations = conversations?.filter((c) => c.is_archived) || [];

  // Apply search filter
  const filterConversations = (convos: any[]) => {
    if (!searchQuery.trim()) return convos;

    const query = searchQuery.toLowerCase();
    return convos.filter((conv) => {
      const otherUserName = conv.guest_id !== conv.host_id
        ? (conv.guest_id === conv.host_id ? conv.guest_name : conv.host_name)
        : conv.guest_name;
      const propertyTitle = conv.property_title || '';
      const lastMessage = conv.last_message || '';

      return (
        otherUserName?.toLowerCase().includes(query) ||
        propertyTitle?.toLowerCase().includes(query) ||
        lastMessage?.toLowerCase().includes(query)
      );
    });
  };

  const filteredActiveConversations = filterConversations(activeConversations);
  const filteredArchivedConversations = filterConversations(archivedConversations);
  const displayedConversations = activeTab === 'active' ? filteredActiveConversations : filteredArchivedConversations;

  const handleArchive = (conversationId: string) => {
    archiveConversation.mutate(conversationId);
  };

  const handleUnarchive = (conversationId: string) => {
    unarchiveConversation.mutate(conversationId);
  };

  const handleDelete = (conversationId: string) => {
    deleteConversation.mutate(conversationId);
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <View className="px-4 pt-2 pb-4">
          <Text className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
            {t('inbox.title')}
          </Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10B981" />
          <Text className="text-gray-600 mt-4" style={{ fontFamily: 'Cairo_400Regular' }}>
            {t('inbox.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} className="flex-1 bg-white">
        <View className="px-4 pt-2 pb-4">
          <Text className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'Cairo_700Bold' }}>
            {t('inbox.title')}
          </Text>

          {/* Search Bar */}
          <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-2 mb-3">
            <Search size={20} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('inbox.searchConversations')}
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-base text-gray-900"
              style={{ fontFamily: 'Cairo_400Regular' }}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <X size={18} color="#9CA3AF" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row px-4 mb-2">
          <Pressable
            onPress={() => setActiveTab('active')}
            className={`flex-1 py-3 rounded-full mr-2 ${
              activeTab === 'active' ? 'bg-emerald-500' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                activeTab === 'active' ? 'text-white' : 'text-gray-600'
              }`}
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('inbox.active')} ({activeConversations.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('archived')}
            className={`flex-1 py-3 rounded-full flex-row items-center justify-center ${
              activeTab === 'archived' ? 'bg-emerald-500' : 'bg-gray-100'
            }`}
          >
            <Archive
              size={16}
              color={activeTab === 'archived' ? '#FFF' : '#6B7280'}
              style={{ marginRight: 6 }}
            />
            <Text
              className={`text-center font-semibold ${
                activeTab === 'archived' ? 'text-white' : 'text-gray-600'
              }`}
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('inbox.archived')} ({archivedConversations.length})
            </Text>
          </Pressable>
        </View>

        {/* Swipe hint */}
        {displayedConversations.length > 0 && (
          <Text className="text-xs text-gray-400 text-center mb-2" style={{ fontFamily: 'Cairo_400Regular' }}>
            {t('inbox.swipeHint')}
          </Text>
        )}

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {displayedConversations.length > 0 ? (
            displayedConversations.map((conversation) => (
              <ConversationCard
                key={conversation.id}
                conversation={conversation}
                onPress={() => router.push(`/chat/${conversation.id}`)}
                onArchive={() =>
                  activeTab === 'active'
                    ? handleArchive(conversation.id)
                    : handleUnarchive(conversation.id)
                }
                onDelete={() => handleDelete(conversation.id)}
                isArchived={activeTab === 'archived'}
              />
            ))
          ) : (
            <View className="items-center justify-center py-20 px-4">
              <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center mb-4">
                {activeTab === 'archived' ? (
                  <Archive size={36} color="#10B981" />
                ) : (
                  <MessageCircle size={36} color="#10B981" />
                )}
              </View>
              <Text className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                {activeTab === 'archived' ? t('inbox.noArchived') : t('inbox.empty')}
              </Text>
              <Text className="text-sm text-gray-500 mt-2 text-center px-8" style={{ fontFamily: 'Cairo_400Regular' }}>
                {activeTab === 'archived' ? t('inbox.noArchivedSub') : t('inbox.emptySub')}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
