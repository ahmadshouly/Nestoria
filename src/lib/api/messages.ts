import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useEffect, useRef } from 'react';

// Types
interface ConversationWithDetails {
  id: string;
  booking_request_id: string | null;
  accommodation_id: string | null;
  vehicle_id: string | null;
  guest_id: string;
  host_id: string;
  status: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  guest_deleted_at: string | null;
  host_deleted_at: string | null;
  guest_archived_at: string | null;
  host_archived_at: string | null;
  guest_name: string;
  guest_avatar: string | null;
  host_name: string;
  host_avatar: string | null;
  property_title: string;
  last_message: string;
  unread_count?: number;
  is_archived: boolean;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  message_type: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  attachments: string[] | null;
}

interface MessageWithSender extends Message {
  sender_name: string;
  sender_avatar: string | null;
}

// Helper: Get current user's profile ID
async function getProfileId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (error || !profile) throw new Error('Profile not found');
  return profile.id;
}

// Fetch conversations using RPC function
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async (): Promise<ConversationWithDetails[]> => {
      try {
        const profileId = await getProfileId();

        const { data, error } = await supabase.rpc('get_user_conversations', {
          user_uuid: profileId
        });

        if (error) {
          console.error('❌ Error fetching conversations:', error);
          throw error;
        }

        // Add unread count for each conversation
        const conversationsWithUnread = await Promise.all(
          (data || []).map(async (conv: any) => {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .eq('is_read', false)
              .neq('sender_id', profileId);

            return {
              ...conv,
              unread_count: count || 0
            };
          })
        );

        console.log('💬 Conversations loaded:', conversationsWithUnread.length);
        return conversationsWithUnread;
      } catch (error) {
        console.error('❌ Conversations error:', error);
        return [];
      }
    },
  });
}

// Fetch single conversation
export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async (): Promise<ConversationWithDetails | null> => {
      if (!conversationId) return null;

      const profileId = await getProfileId();

      const { data, error } = await supabase.rpc('get_user_conversations', {
        user_uuid: profileId
      });

      if (error) throw error;

      const conversation = (data || []).find((c: any) => c.id === conversationId);
      if (!conversation) return null;

      // Add unread count
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .neq('sender_id', profileId);

      return {
        ...conversation,
        unread_count: count || 0
      };
    },
    enabled: !!conversationId,
  });
}

// Fetch messages for a conversation
export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async (): Promise<MessageWithSender[]> => {
      if (!conversationId) return [];

      const profileId = await getProfileId();

      // Get conversation details
      const { data: convData } = await supabase.rpc('get_user_conversations', {
        user_uuid: profileId
      });

      const conversation = (convData || []).find((c: any) => c.id === conversationId);
      if (!conversation) return [];

      // Fetch messages
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Add sender information
      const messagesWithSender: MessageWithSender[] = (messages || []).map(msg => ({
        ...msg,
        sender_name: msg.sender_id === conversation.guest_id
          ? conversation.guest_name
          : conversation.host_name,
        sender_avatar: msg.sender_id === conversation.guest_id
          ? conversation.guest_avatar
          : conversation.host_avatar
      }));

      return messagesWithSender;
    },
    enabled: !!conversationId,
  });
}

// Send message
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      message,
      attachment,
    }: {
      conversationId: string;
      message: string;
      attachment?: {
        url: string;
        type: string;
        name: string;
        size: number;
      };
    }) => {
      const profileId = await getProfileId();

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: profileId,
          message: message,
          message_type: 'text',
          attachment_url: attachment?.url || null,
          attachment_type: attachment?.type || null,
          attachment_name: attachment?.name || null,
          attachment_size: attachment?.size || null,
        });

      if (messageError) throw messageError;

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    },
    onSuccess: (_: void, variables: { conversationId: string; message: string; attachment?: any }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', variables.conversationId] });
    },
  });
}

// Mark messages as read
export function useMarkMessagesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string): Promise<void> => {
      const profileId = await getProfileId();

      // Get unread messages from other users
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .neq('sender_id', profileId);

      if (unreadMessages && unreadMessages.length > 0) {
        const messageIds = unreadMessages.map(m => m.id);

        await supabase
          .from('messages')
          .update({
            is_read: true,
            read_at: new Date().toISOString()
          })
          .in('id', messageIds);
      }
    },
    onSuccess: (_: void, conversationId: string) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    },
  });
}

// Create or get conversation
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      hostId,
      propertyId,
      propertyType,
      initialMessage,
    }: {
      hostId: string;
      propertyId: string;
      propertyType: 'accommodation' | 'vehicle';
      initialMessage: string;
    }): Promise<string> => {
      const profileId = await getProfileId();

      // Check if conversation already exists
      const propertyColumn = propertyType === 'accommodation'
        ? 'accommodation_id'
        : 'vehicle_id';

      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('guest_id', profileId)
        .eq('host_id', hostId)
        .eq(propertyColumn, propertyId)
        .single();

      let conversationId: string;

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        // Create new conversation
        const conversationData: any = {
          guest_id: profileId,
          host_id: hostId,
          status: 'active'
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

        if (convError) throw convError;
        conversationId = newConversation.id;
      }

      // Send the initial message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: profileId,
          message: initialMessage,
          message_type: 'text'
        });

      if (messageError) throw messageError;

      return conversationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Get unread messages count
export function useUnreadMessagesCount() {
  return useQuery({
    queryKey: ['messages', 'unread', 'count'],
    queryFn: async (): Promise<number> => {
      try {
        const profileId = await getProfileId();

        const { data: conversations } = await supabase.rpc('get_user_conversations', {
          user_uuid: profileId
        });

        if (!conversations) return 0;

        let totalUnread = 0;
        for (const conv of conversations) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', profileId);

          totalUnread += count || 0;
        }

        return totalUnread;
      } catch (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }
    },
  });
}

// Subscribe to new messages (real-time)
export function useSubscribeToMessages(
  conversationId: string | undefined,
  onNewMessage: (message: Message) => void
) {
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onNewMessage(payload.new as Message);
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId, onNewMessage, queryClient]);
}

// Subscribe to conversation list updates
export function useSubscribeToConversations(onUpdate: () => void) {
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          onUpdate();
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          onUpdate();
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [onUpdate, queryClient]);
}

// Helper: Get current auth user ID (for RPC calls)
async function getAuthUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// Delete a single message (sender only)
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      conversationId,
    }: {
      messageId: string;
      conversationId: string;
    }): Promise<void> => {
      const authUserId = await getAuthUserId();

      const { error } = await supabase.rpc('delete_message', {
        _message_id: messageId,
        _user_id: authUserId,
      });

      if (error) {
        console.error('❌ Error deleting message:', error);
        throw error;
      }

      console.log('🗑️ Message deleted:', messageId);
    },
    onSuccess: (_: void, variables: { messageId: string; conversationId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Clear all messages in a conversation (affects both users)
export function useClearConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string): Promise<void> => {
      const authUserId = await getAuthUserId();

      const { error } = await supabase.rpc('clear_conversation', {
        _conversation_id: conversationId,
        _user_id: authUserId,
      });

      if (error) {
        console.error('❌ Error clearing conversation:', error);
        throw error;
      }

      console.log('🧹 Conversation cleared:', conversationId);
    },
    onSuccess: (_: void, conversationId: string) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    },
  });
}

// Delete conversation for current user only (soft delete)
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string): Promise<void> => {
      const authUserId = await getAuthUserId();

      const { error } = await supabase.rpc('delete_conversation_for_user', {
        _conversation_id: conversationId,
        _user_id: authUserId,
      });

      if (error) {
        console.error('❌ Error deleting conversation:', error);
        throw error;
      }

      console.log('🗑️ Conversation deleted for user:', conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Archive conversation for current user
export function useArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string): Promise<void> => {
      const authUserId = await getAuthUserId();

      const { error } = await supabase.rpc('archive_conversation_for_user', {
        _conversation_id: conversationId,
        _user_id: authUserId,
      });

      if (error) {
        console.error('❌ Error archiving conversation:', error);
        throw error;
      }

      console.log('📦 Conversation archived:', conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Unarchive conversation for current user
export function useUnarchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string): Promise<void> => {
      const authUserId = await getAuthUserId();

      const { error } = await supabase.rpc('unarchive_conversation_for_user', {
        _conversation_id: conversationId,
        _user_id: authUserId,
      });

      if (error) {
        console.error('❌ Error unarchiving conversation:', error);
        throw error;
      }

      console.log('📤 Conversation unarchived:', conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

