import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Send, Paperclip, FileText, Image as ImageIcon, X } from 'lucide-react-native';
import {
  useTicketDetails,
  useTicketMessages,
  useSendTicketMessage,
  useMarkTicketRead,
  pickDocument,
  uploadTicketFile,
  getTicketStatusColor,
  getTicketPriorityColor,
  STATUS_LABELS,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
} from '@/lib/api/support';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const scrollViewRef = useRef<ScrollView>(null);

  const [message, setMessage] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const { data: ticket, isLoading: loadingTicket } = useTicketDetails(id);
  const { data: messages, isLoading: loadingMessages, refetch: refetchMessages } = useTicketMessages(id);
  const sendMessage = useSendTicketMessage();
  const markRead = useMarkTicketRead();

  // Real-time subscription for new messages
  useEffect(() => {
    if (id && id !== 'new') {
      const channel = supabase
        .channel('ticket-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'client_ticket_messages',
            filter: `ticket_id=eq.${id}`,
          },
          () => {
            refetchMessages();
            scrollToBottom();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  // Mark messages as read when screen opens
  useEffect(() => {
    if (id && ticket && ticket.unread_messages_count > 0) {
      markRead.mutate(id);
    }
  }, [id, ticket]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handlePickFile = async () => {
    try {
      const file = await pickDocument();
      if (file) {
        setSelectedFile({
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType,
        });
      }
    } catch (error: any) {
      Alert.alert(
        t('common.error') || 'Error',
        error.message || t('support.filePickError') || 'Failed to pick file'
      );
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !selectedFile) {
      Alert.alert(
        t('common.error') || 'Error',
        t('support.messageRequired') || 'Please enter a message or attach a file'
      );
      return;
    }

    setUploading(true);

    try {
      let attachments: string[] = [];

      // Upload file if selected
      if (selectedFile) {
        const filePath = await uploadTicketFile(id, selectedFile.uri, selectedFile.name);
        attachments.push(filePath);
      }

      // Send message
      await sendMessage.mutateAsync({
        ticket_id: id,
        message: message.trim() || '[File attachment]',
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      setMessage('');
      setSelectedFile(null);
      scrollToBottom();
    } catch (error: any) {
      Alert.alert(
        t('common.error') || 'Error',
        error.message || t('support.sendError') || 'Failed to send message'
      );
    } finally {
      setUploading(false);
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
      return <ImageIcon size={16} color="#10B981" />;
    }
    return <FileText size={16} color="#10B981" />;
  };

  if (loadingTicket || loadingMessages) {
    return (
      <View className="flex-1 bg-white">
        <Stack.Screen
          options={{
            title: t('support.ticketDetails') || 'Ticket Details',
            headerStyle: { backgroundColor: '#fff' },
            headerTintColor: '#000',
          }}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View className="flex-1 bg-white">
        <Stack.Screen
          options={{
            title: t('support.ticketDetails') || 'Ticket Details',
            headerStyle: { backgroundColor: '#fff' },
            headerTintColor: '#000',
          }}
        />
        <View className="flex-1 items-center justify-center px-6">
          <Text
            className="text-gray-500 text-center text-base"
            style={{ fontFamily: 'Cairo_400Regular' }}
          >
            {t('support.ticketNotFound') || 'Ticket not found'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: `#${ticket.id.substring(0, 8)}`,
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#000',
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={90}
      >
        {/* Ticket Header */}
        <View className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <Text
            className="text-lg font-bold text-gray-900 mb-2"
            style={{ fontFamily: 'Cairo_700Bold' }}
          >
            {ticket.subject}
          </Text>
          <View className="flex-row items-center flex-wrap">
            <View
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: getTicketStatusColor(ticket.status) + '20' }}
            >
              <Text
                className="text-xs font-semibold"
                style={{
                  fontFamily: 'Cairo_600SemiBold',
                  color: getTicketStatusColor(ticket.status),
                }}
              >
                {STATUS_LABELS[ticket.status]}
              </Text>
            </View>
            <View
              className={`px-3 py-1 rounded-full ${isRTL ? 'mr-2' : 'ml-2'}`}
              style={{ backgroundColor: getTicketPriorityColor(ticket.priority) + '20' }}
            >
              <Text
                className="text-xs font-semibold"
                style={{
                  fontFamily: 'Cairo_600SemiBold',
                  color: getTicketPriorityColor(ticket.priority),
                }}
              >
                {PRIORITY_LABELS[ticket.priority]}
              </Text>
            </View>
            <Text
              className={`text-xs text-gray-500 ${isRTL ? 'mr-2' : 'ml-2'}`}
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {CATEGORY_LABELS[ticket.category]}
            </Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
        >
          {messages && messages.length > 0 ? (
            messages.map((msg) => {
              const isAdmin = msg.sender_profile?.role === 'admin';
              return (
                <View
                  key={msg.id}
                  className={`mb-4 ${isAdmin ? (isRTL ? 'items-start' : 'items-end') : (isRTL ? 'items-end' : 'items-start')}`}
                >
                  <View
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      isAdmin ? 'bg-gray-100' : 'bg-emerald-500'
                    }`}
                  >
                    {isAdmin && (
                      <Text
                        className="text-xs font-semibold text-gray-600 mb-1"
                        style={{ fontFamily: 'Cairo_600SemiBold' }}
                      >
                        {msg.sender_profile?.full_name || 'Support Team'}
                      </Text>
                    )}
                    <Text
                      className={`text-base ${isAdmin ? 'text-gray-900' : 'text-white'}`}
                      style={{ fontFamily: 'Cairo_400Regular' }}
                    >
                      {msg.message}
                    </Text>

                    {/* Attachments */}
                    {msg.attachment_urls && msg.attachment_urls.length > 0 && (
                      <View className="mt-2">
                        {msg.attachment_urls.map((url, index) => {
                          const fileName = msg.attachments?.[index]?.split('/').pop() || 'file';
                          return (
                            <Pressable
                              key={index}
                              onPress={() => {
                                // Open file in browser
                                if (url) {
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.target = '_blank';
                                  a.click();
                                }
                              }}
                              className={`flex-row items-center px-3 py-2 rounded-lg mt-1 ${
                                isAdmin ? 'bg-gray-200' : 'bg-emerald-600'
                              }`}
                            >
                              {getFileIcon(fileName)}
                              <Text
                                className={`text-sm ${isRTL ? 'mr-2' : 'ml-2'} ${
                                  isAdmin ? 'text-gray-700' : 'text-white'
                                }`}
                                style={{ fontFamily: 'Cairo_400Regular' }}
                                numberOfLines={1}
                              >
                                {fileName}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}

                    <Text
                      className={`text-xs mt-1 ${isAdmin ? 'text-gray-500' : 'text-emerald-100'}`}
                      style={{ fontFamily: 'Cairo_400Regular' }}
                    >
                      {formatMessageTime(msg.created_at)}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View className="items-center justify-center py-12">
              <Text
                className="text-gray-500 text-center text-base"
                style={{ fontFamily: 'Cairo_400Regular' }}
              >
                {t('support.noMessages') || 'No messages yet'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Selected File Preview */}
        {selectedFile && (
          <View className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex-row items-center">
            {getFileIcon(selectedFile.name)}
            <Text
              className={`flex-1 text-sm text-gray-700 ${isRTL ? 'mr-2' : 'ml-2'}`}
              style={{ fontFamily: 'Cairo_400Regular' }}
              numberOfLines={1}
            >
              {selectedFile.name}
            </Text>
            <Pressable onPress={handleRemoveFile} className="p-2">
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>
        )}

        {/* Message Input */}
        {ticket.status !== 'closed' && (
          <View className="bg-white border-t border-gray-200 px-4 py-3 flex-row items-end">
            <Pressable
              onPress={handlePickFile}
              disabled={uploading}
              className={`p-3 ${isRTL ? 'ml-2' : 'mr-2'}`}
            >
              <Paperclip size={24} color={uploading ? '#D1D5DB' : '#10B981'} />
            </Pressable>

            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={t('support.typeMessage') || 'Type your message...'}
              multiline
              maxLength={1000}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-base text-gray-900 max-h-24"
              style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }}
              placeholderTextColor="#9CA3AF"
            />

            <Pressable
              onPress={handleSendMessage}
              disabled={uploading || sendMessage.isPending || (!message.trim() && !selectedFile)}
              className={`p-3 ${isRTL ? 'mr-2' : 'ml-2'} ${
                uploading || sendMessage.isPending || (!message.trim() && !selectedFile)
                  ? 'opacity-50'
                  : ''
              }`}
            >
              {uploading || sendMessage.isPending ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Send size={24} color="#10B981" />
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
