import { supabase } from '@/lib/supabase';
import { useMutation, useQuery } from '@tanstack/react-query';

// Supported languages for translation
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
];

// Types
export interface TranslateContentRequest {
  content: string;
  targetLanguage: string;
  contentType: 'review' | 'description' | 'message';
}

export interface TranslateContentResponse {
  originalContent: string;
  translatedContent: string;
  targetLanguage: string;
  rateLimited: boolean;
  error: string | null;
}

export interface ChatTranslateRequest {
  message: string;
  targetLanguage: string | null;
  conversationId: string;
  senderId: string;
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
  attachment_size?: number;
}

export interface ChatTranslateResponse {
  message: {
    id: string;
    message: string;
    sender_id: string;
    created_at: string;
    sender: {
      id: string;
      full_name: string;
      avatar_url: string;
    };
  };
  originalMessage: string;
  translatedMessage: string;
}

// Fetch user's preferred language
export function useUserPreferredLanguage() {
  return useQuery({
    queryKey: ['user-preferred-language'],
    queryFn: async (): Promise<string> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'en';

      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('user_id', user.id)
        .single();

      return profile?.preferred_language || 'en';
    },
  });
}

// Update user's preferred language
export function useUpdatePreferredLanguage() {
  return useMutation({
    mutationFn: async (language: string): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: language })
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error updating preferred language:', error);
        throw error;
      }

      console.log('✅ Preferred language updated to:', language);
    },
  });
}

// Translate content (on-demand)
export function useTranslateContent() {
  return useMutation({
    mutationFn: async (request: TranslateContentRequest): Promise<TranslateContentResponse> => {
      console.log('🌐 Translating content to:', request.targetLanguage);

      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: request,
      });

      if (error) {
        console.error('❌ Translation error:', error);
        throw error;
      }

      if (data?.rateLimited) {
        console.warn('⚠️ Translation rate limited');
      }

      console.log('✅ Content translated successfully');
      return data as TranslateContentResponse;
    },
  });
}

// Send chat message with translation and moderation
export function useChatTranslate() {
  return useMutation({
    mutationFn: async (request: ChatTranslateRequest): Promise<ChatTranslateResponse> => {
      console.log('💬 Sending message with translation:', {
        targetLanguage: request.targetLanguage,
        hasAttachment: !!request.attachment_url,
      });

      const { data, error } = await supabase.functions.invoke('chat-translate', {
        body: request,
      });

      if (error) {
        console.error('❌ Chat translate error:', error);
        // Check if message was blocked
        if (error.message?.includes('blocked')) {
          throw new Error('MESSAGE_BLOCKED');
        }
        throw error;
      }

      console.log('✅ Message sent with translation');
      return data as ChatTranslateResponse;
    },
  });
}

// Batch translate messages
export function useBatchTranslateMessages() {
  return useMutation({
    mutationFn: async ({
      messages,
      targetLanguage,
    }: {
      messages: Array<{ id: string; message: string }>;
      targetLanguage: string;
    }): Promise<Record<string, string>> => {
      console.log('📚 Batch translating', messages.length, 'messages to', targetLanguage);

      const translations: Record<string, string> = {};
      const batchSize = 3;
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);

        // Process batch in parallel
        const results = await Promise.allSettled(
          batch.map(async (msg) => {
            const { data, error } = await supabase.functions.invoke('translate-content', {
              body: {
                content: msg.message,
                targetLanguage,
                contentType: 'message',
              },
            });

            if (!error && data?.translatedContent) {
              return { id: msg.id, translated: data.translatedContent };
            }
            return { id: msg.id, translated: msg.message }; // Fallback to original
          })
        );

        // Collect results
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            translations[result.value.id] = result.value.translated;
          }
        });

        // Add delay between batches to avoid rate limiting
        if (i + batchSize < messages.length) {
          await delay(1000);
        }
      }

      console.log('✅ Batch translation complete:', Object.keys(translations).length, 'messages');
      return translations;
    },
  });
}

// Get language name by code
export function getLanguageName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang?.name || code;
}

// Get native language name by code
export function getLanguageNativeName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang?.nativeName || code;
}
