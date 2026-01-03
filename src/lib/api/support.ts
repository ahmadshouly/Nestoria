import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

// Types
export type TicketCategory = 'general' | 'booking' | 'payment' | 'technical' | 'account' | 'other';
export type TicketPriority = 'low' | 'medium' | 'high';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  user_id: string;
  booking_id?: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_admin_id?: string;
  unread_messages_count: number;
  escalated: boolean;
  resolution?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  attachments?: string[];
  attachment_urls?: string[];
  is_internal: boolean;
  created_at: string;
  sender_profile?: {
    full_name: string;
    avatar_url?: string;
    role?: string;
  };
}

export interface CreateTicketData {
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  booking_id?: string;
}

export interface SendMessageData {
  ticket_id: string;
  message: string;
  attachments?: string[];
}

// Fetch user's support tickets
export function useUserTickets(status?: TicketStatus) {
  return useQuery({
    queryKey: ['support-tickets', status],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      let query = supabase
        .from('client_support_tickets')
        .select('*')
        .eq('user_id', profile.id)
        .order('last_activity_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SupportTicket[];
    },
  });
}

// Fetch single ticket details
export function useTicketDetails(ticketId: string) {
  return useQuery({
    queryKey: ['support-ticket', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (error) throw error;
      return data as SupportTicket;
    },
    enabled: !!ticketId && ticketId !== 'new',
  });
}

// Fetch ticket messages
export function useTicketMessages(ticketId: string) {
  return useQuery({
    queryKey: ['ticket-messages', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_ticket_messages')
        .select(`
          *,
          sender_profile:profiles!sender_id(
            full_name,
            avatar_url
          )
        `)
        .eq('ticket_id', ticketId)
        .eq('is_internal', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get public URLs for attachments
      const messagesWithUrls = await Promise.all(
        (data || []).map(async (message) => {
          if (message.attachments && message.attachments.length > 0) {
            const urls = message.attachments.map((path: string) => {
              const { data: urlData } = supabase.storage
                .from('ticket-files')
                .getPublicUrl(path);
              return urlData.publicUrl;
            });
            return { ...message, attachment_urls: urls };
          }
          return message;
        })
      );

      return messagesWithUrls as TicketMessage[];
    },
    enabled: !!ticketId && ticketId !== 'new',
  });
}

// Create new ticket
export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketData: CreateTicketData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('client_support_tickets')
        .insert({
          user_id: profile.id,
          subject: ticketData.subject,
          description: ticketData.description,
          category: ticketData.category,
          priority: ticketData.priority,
          booking_id: ticketData.booking_id || null,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Create initial message (same as description)
      const { error: messageError } = await supabase
        .from('client_ticket_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: profile.id,
          message: ticketData.description,
        });

      if (messageError) throw messageError;

      return ticket as SupportTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });
}

// Send message to ticket
export function useSendTicketMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageData: SendMessageData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('client_ticket_messages')
        .insert({
          ticket_id: messageData.ticket_id,
          sender_id: profile.id,
          message: messageData.message || '[File attachment]',
          attachments: messageData.attachments || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', variables.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket', variables.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });
}

// Upload file to ticket
export async function uploadTicketFile(ticketId: string, fileUri: string, fileName: string): Promise<string> {
  try {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to array buffer
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const fileExt = fileName.split('.').pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `ticket-attachments/${ticketId}/${uniqueFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('ticket-files')
      .upload(filePath, bytes.buffer, {
        contentType: getContentType(fileExt || ''),
      });

    if (uploadError) throw uploadError;

    return filePath;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

// Get content type from file extension
function getContentType(extension: string): string {
  const types: { [key: string]: string } = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
  };
  return types[extension.toLowerCase()] || 'application/octet-stream';
}

// Mark ticket messages as read
export function useMarkTicketRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase.rpc('mark_client_ticket_messages_read', {
        ticket_id_param: ticketId,
      });

      if (error) throw error;
    },
    onSuccess: (_, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });
}

// Pick document
export async function pickDocument() {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif',
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return null;
    }

    const file = result.assets[0];

    // Check file size (10MB limit)
    if (file.size && file.size > 10 * 1024 * 1024) {
      throw new Error('File size must be less than 10MB');
    }

    return file;
  } catch (error) {
    console.error('Error picking document:', error);
    throw error;
  }
}

// Download/view file
export async function getFileUrl(filePath: string): Promise<string> {
  const { data } = supabase.storage
    .from('ticket-files')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// Get ticket status color
export function getTicketStatusColor(status: TicketStatus): string {
  switch (status) {
    case 'open':
      return '#3B82F6'; // blue
    case 'in_progress':
      return '#F59E0B'; // amber
    case 'resolved':
      return '#10B981'; // green
    case 'closed':
      return '#6B7280'; // gray
    default:
      return '#6B7280';
  }
}

// Get priority color
export function getTicketPriorityColor(priority: TicketPriority): string {
  switch (priority) {
    case 'low':
      return '#10B981'; // green
    case 'medium':
      return '#F59E0B'; // amber
    case 'high':
      return '#EF4444'; // red
    default:
      return '#6B7280';
  }
}

// Category labels
export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  general: 'General Support',
  booking: 'Booking Issue',
  payment: 'Payment Issue',
  technical: 'Technical Issue',
  account: 'Account Issue',
  other: 'Other',
};

// Priority labels
export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

// Status labels
export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};
