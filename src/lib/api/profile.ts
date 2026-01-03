import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import * as ImagePicker from 'expo-image-picker';

// ============ Types ============
export interface UserSettings {
  id: string;
  user_id: string;
  language: string;
  currency: string;
  timezone: string;
  dark_mode: boolean;
  show_profile_publicly: boolean;
  allow_marketing_contact: boolean;
  two_factor_enabled: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrivacySettings {
  id: string;
  user_id: string;
  show_email_publicly: boolean;
  show_phone_publicly: boolean;
  show_last_active: boolean;
  allow_search_by_email: boolean;
  allow_search_by_phone: boolean;
  data_processing_consent: boolean;
  marketing_consent: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  email_bookings: boolean;
  email_messages: boolean;
  email_promotions: boolean;
  email_reviews: boolean;
  push_bookings: boolean;
  push_messages: boolean;
  push_reviews: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyProfile {
  id: string;
  user_id: string;
  points: number;
  tier: 'Explorer' | 'Traveler' | 'Adventurer' | 'Elite';
  total_nights: number;
  total_spent: number;
  referral_count: number;
  created_at: string;
  updated_at: string;
}

export interface TrustedDevice {
  id: string;
  user_id: string;
  device_fingerprint: string;
  device_name: string | null;
  browser_info: string | null;
  ip_address: string | null;
  location: string | null;
  trusted_at: string;
  expires_at: string;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  transaction_type: 'deposit' | 'withdrawal' | 'payment' | 'refund' | 'adjustment';
  amount: number;
  currency: string;
  description: string | null;
  reference_id: string | null;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export type DocumentType = 'id_front' | 'id_back' | 'business_license' | 'additional';
export type DocumentStatus = 'pending' | 'approved' | 'rejected' | null;

// ============ User Settings ============
export function useUserSettings() {
  const { data: session } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  return useQuery({
    queryKey: ['user', 'settings', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Create default settings if none exist
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: session.user.id,
            language: 'en',
            currency: 'USD',
            timezone: 'UTC',
            dark_mode: false,
            show_profile_publicly: true,
            allow_marketing_contact: false,
            two_factor_enabled: false,
            email_verified: false,
            phone_verified: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newData as UserSettings;
      }

      return data as UserSettings;
    },
    enabled: !!session?.user?.id,
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'settings'] });
    },
  });
}

// ============ Privacy Settings ============
export function usePrivacySettings() {
  const { data: session } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  return useQuery({
    queryKey: ['user', 'privacy', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;

      const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from('privacy_settings')
          .insert({
            user_id: session.user.id,
            show_email_publicly: false,
            show_phone_publicly: false,
            show_last_active: true,
            allow_search_by_email: false,
            allow_search_by_phone: false,
            data_processing_consent: true,
            marketing_consent: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newData as PrivacySettings;
      }

      return data as PrivacySettings;
    },
    enabled: !!session?.user?.id,
  });
}

export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<PrivacySettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('privacy_settings')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'privacy'] });
    },
  });
}

// ============ Notification Preferences ============
export function useNotificationPreferences() {
  const { data: session } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  return useQuery({
    queryKey: ['user', 'notifications', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: session.user.id,
            email_bookings: true,
            email_messages: true,
            email_promotions: false,
            email_reviews: true,
            push_bookings: true,
            push_messages: true,
            push_reviews: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newData as NotificationPreference;
      }

      return data as NotificationPreference;
    },
    enabled: !!session?.user?.id,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<NotificationPreference>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'notifications'] });
    },
  });
}

// ============ Loyalty Profile ============
export function useLoyaltyProfile() {
  const { data: session } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  return useQuery({
    queryKey: ['user', 'loyalty', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;

      const { data, error } = await supabase
        .from('loyalty_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as LoyaltyProfile | null;
    },
    enabled: !!session?.user?.id,
  });
}

// ============ Phone Verification ============
export function useSendPhoneVerification() {
  return useMutation({
    mutationFn: async ({ phoneNumber, countryCode }: { phoneNumber: string; countryCode: string }) => {
      const fullPhone = `${countryCode}${phoneNumber}`;

      const { error } = await supabase.functions.invoke('send-verification-sms', {
        body: {
          action: 'send',
          phone: fullPhone,
          phoneNumber: phoneNumber,
          countryCode: countryCode,
        },
      });

      if (error) throw error;
    },
  });
}

export function useVerifyPhone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ phoneNumber, countryCode, code }: { phoneNumber: string; countryCode: string; code: string }) => {
      const fullPhone = `${countryCode}${phoneNumber}`;

      const { data, error } = await supabase.functions.invoke('send-verification-sms', {
        body: {
          action: 'verify',
          phone: fullPhone,
          code: code,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Verification failed');

      // Update profile with verified phone
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({
            phone: phoneNumber,
            phone_country_code: countryCode,
            phone_verified: true,
            phone_verified_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
  });
}

// ============ Avatar Upload ============
export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uri: string) => {
      console.log('📸 [Avatar Upload] Starting upload...', { uri });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ [Avatar Upload] User not authenticated');
        throw new Error('Not authenticated');
      }

      console.log('✅ [Avatar Upload] User authenticated:', user.id);

      // Get the file extension from the uri
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `avatar.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      console.log('📁 [Avatar Upload] File path:', filePath);

      // Fetch the file and convert to ArrayBuffer (better for React Native)
      console.log('🔄 [Avatar Upload] Fetching file from URI...');
      const response = await fetch(uri);

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log('✅ [Avatar Upload] ArrayBuffer created:', { size: arrayBuffer.byteLength });

      // Verify buffer has content
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Image file is empty');
      }

      // Upload to avatars bucket using ArrayBuffer
      console.log('☁️ [Avatar Upload] Uploading to Supabase Storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          upsert: true,
          contentType: `image/${fileExt}`,
        });

      if (uploadError) {
        console.error('❌ [Avatar Upload] Upload error:', uploadError);
        throw uploadError;
      }

      console.log('✅ [Avatar Upload] File uploaded successfully:', uploadData);

      // Get public URL without timestamp first
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('🔗 [Avatar Upload] Base Public URL:', publicUrl);

      // Store URL without timestamp in database (timestamp added only for display)
      // This ensures the URL remains valid even without query params
      console.log('💾 [Avatar Upload] Updating profile in database...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('❌ [Avatar Upload] Database update error:', updateError);
        throw updateError;
      }

      console.log('✅ [Avatar Upload] Profile updated successfully!');

      return publicUrl;
    },
    onSuccess: (publicUrl) => {
      console.log('🎉 [Avatar Upload] Success! Invalidating cache...', { publicUrl });
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
    onError: (error) => {
      console.error('❌ [Avatar Upload] Mutation error:', error);
    },
  });
}

// ============ Document Upload ============
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      uri,
      documentType,
      fileType = 'image/jpeg',
    }: {
      uri: string;
      documentType: DocumentType;
      fileType?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Get file extension
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${documentType}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Fetch and upload
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(filePath, blob, {
          contentType: fileType,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(filePath);

      // Prepare update data based on document type
      let updateData: Record<string, unknown> = { id_verification_status: 'pending' };

      if (documentType === 'id_front') {
        updateData.id_document_url = publicUrl;
        updateData.id_front_document_status = 'pending';
        updateData.id_front_document_rejection_reason = null;
      } else if (documentType === 'id_back') {
        const existingUrls = Array.isArray(profile?.id_documents_urls)
          ? profile.id_documents_urls : [];
        updateData.id_documents_urls = [...existingUrls, publicUrl];
        updateData.id_back_document_status = 'pending';
        updateData.id_back_document_rejection_reason = null;
      } else if (documentType === 'business_license') {
        const existingUrls = Array.isArray(profile?.business_license_urls)
          ? profile.business_license_urls : [];
        updateData.business_license_urls = [...existingUrls, publicUrl];
        updateData.business_license_document_status = 'pending';
        updateData.business_license_status = 'pending';
        updateData.business_license_document_rejection_reason = null;
      } else if (documentType === 'additional') {
        const existingUrls = Array.isArray(profile?.additional_documents_urls)
          ? profile.additional_documents_urls : [];
        updateData.additional_documents_urls = [...existingUrls, publicUrl];
        updateData.additional_documents_status = 'pending';
        updateData.additional_documents_rejection_reason = null;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentType,
      documentIndex,
    }: {
      documentType: DocumentType;
      documentIndex?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const fieldMap: Record<DocumentType, string> = {
        id_front: 'id_document_url',
        id_back: 'id_documents_urls',
        business_license: 'business_license_urls',
        additional: 'additional_documents_urls',
      };

      const field = fieldMap[documentType];
      const documentData = profile[field];

      if (!documentData) return;

      // Handle array fields
      if (Array.isArray(documentData) && documentIndex !== undefined) {
        const urlToDelete = documentData[documentIndex];

        if (urlToDelete) {
          const urlParts = urlToDelete.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const filePath = `${user.id}/${fileName}`;

          await supabase.storage
            .from('verification-documents')
            .remove([filePath]);
        }

        const updatedUrls = documentData.filter((_: string, index: number) => index !== documentIndex);

        await supabase
          .from('profiles')
          .update({ [field]: updatedUrls.length > 0 ? updatedUrls : null })
          .eq('user_id', user.id);
      } else {
        // Handle single field (id_front)
        const documentUrl = typeof documentData === 'string' ? documentData : documentData[0];

        if (documentUrl) {
          const urlParts = documentUrl.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const filePath = `${user.id}/${fileName}`;

          await supabase.storage
            .from('verification-documents')
            .remove([filePath]);
        }

        await supabase
          .from('profiles')
          .update({
            [field]: null,
            id_verification_status: 'rejected',
          })
          .eq('user_id', user.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
  });
}

// ============ Two-Factor Authentication ============
export function useCheck2FAStatus() {
  const { data: session } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  return useQuery({
    queryKey: ['user', '2fa', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('two_factor_enabled, two_factor_method, phone_verified, phone')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      return {
        enabled: profile?.two_factor_enabled || false,
        method: profile?.two_factor_method || null,
        phoneVerified: profile?.phone_verified || false,
        phone: profile?.phone || null,
      };
    },
    enabled: !!session?.user?.id,
  });
}

export function useSetup2FA() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('setup-2fa');

      if (error) throw error;

      return data as {
        secret: string;
        qrCode: string;
        backupCodes: string[];
      };
    },
  });
}

export function useVerify2FASetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.functions.invoke('verify-2fa-setup', {
        body: { token },
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Invalid verification code');

      // IMPORTANT: Update the two_factor_method to 'app' after successful verification
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('🔐 [Verify 2FA Setup] Updating two_factor_method to "app"');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ two_factor_method: 'app' })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('🔐 [Verify 2FA Setup] Failed to update method:', updateError);
          throw updateError;
        }
        console.log('✅ [Verify 2FA Setup] Method updated to "app"');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', '2fa'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
  });
}

export function useDisable2FA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (password: string) => {
      const { data, error } = await supabase.functions.invoke('disable-2fa', {
        body: { password },
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Failed to disable 2FA');

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', '2fa'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
  });
}

// ============ SMS 2FA Activation ============
export function useEnableSMS2FA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if phone is verified first
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_verified, phone')
        .eq('user_id', user.id)
        .single();

      if (!profile?.phone_verified || !profile?.phone) {
        throw new Error('Phone number must be verified first');
      }

      // Enable SMS 2FA
      const { error } = await supabase
        .from('profiles')
        .update({
          two_factor_enabled: true,
          two_factor_method: 'sms',
        })
        .eq('user_id', user.id);

      if (error) throw error;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', '2fa'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
  });
}

// ============ Trusted Devices ============
export function useTrustedDevices() {
  const { data: session } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  return useQuery({
    queryKey: ['user', 'devices', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      const { data, error } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .order('last_used_at', { ascending: false });

      if (error) throw error;

      return data as TrustedDevice[];
    },
    enabled: !!session?.user?.id,
  });
}

export function useRevokeTrustedDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      const { error } = await supabase
        .from('trusted_devices')
        .update({ is_active: false })
        .eq('id', deviceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'devices'] });
    },
  });
}

// ============ Password Management ============
export function useChangePassword() {
  return useMutation({
    mutationFn: async ({
      email,
      oldPassword,
      newPassword,
    }: {
      email: string;
      oldPassword: string;
      newPassword: string;
    }) => {
      // Verify old password
      const { error: oldPasswordError } = await supabase.auth.signInWithPassword({
        email: email,
        password: oldPassword,
      });

      if (oldPasswordError) {
        throw new Error('Incorrect current password');
      }

      // Update password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (passwordError) throw passwordError;
    },
  });
}

// ============ Wallet Transactions ============
export function useWalletTransactions() {
  const { data: session } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  return useQuery({
    queryKey: ['user', 'wallet', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data as WalletTransaction[];
    },
    enabled: !!session?.user?.id,
  });
}

// ============ Data Export (GDPR) ============
export function useExportUserData() {
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, *')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Get bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', profile.id);

      // Get preferences
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      return {
        profile,
        bookings: bookings || [],
        preferences,
        exportDate: new Date().toISOString(),
      };
    },
  });
}

// ============ Profile Completion ============
export function getProfileCompletion(profile: Record<string, unknown> | null, userRole: string): number {
  if (!profile) return 0;

  if (userRole === 'supplier') {
    const requiredFields = [
      'full_name',
      'email',
      'phone',
      'company_name',
      'business_address',
      'business_phone',
    ];

    const documentStatuses = [
      profile.id_front_document_status,
      profile.id_back_document_status,
      profile.business_license_document_status,
      profile.additional_documents_status,
    ];

    let completedFields = 0;
    requiredFields.forEach((field) => {
      if (profile[field]) completedFields += 1;
    });

    const approvedDocs = documentStatuses.filter((status) => status === 'approved').length;
    completedFields += approvedDocs;

    const totalFields = requiredFields.length + 4;
    return Math.round((completedFields / totalFields) * 100);
  }

  // Client user completion
  const essentialFields = [
    'full_name',
    'phone',
    'avatar_url',
    'address',
    'city',
    'country',
    'date_of_birth',
  ];

  let completed = essentialFields.filter((field) => profile[field]).length;

  // Add bonus for phone verification
  if (profile.phone_verified) {
    completed += 1;
  }

  const totalFields = essentialFields.length + 1;
  return Math.round((completed / totalFields) * 100);
}

// ============ Country Codes ============
export const countryCodes = [
  { flag: '🇸🇾', code: '+963', country: 'Syria' },
  { flag: '🇺🇸', code: '+1', country: 'United States' },
  { flag: '🇬🇧', code: '+44', country: 'United Kingdom' },
  { flag: '🇩🇪', code: '+49', country: 'Germany' },
  { flag: '🇫🇷', code: '+33', country: 'France' },
  { flag: '🇸🇦', code: '+966', country: 'Saudi Arabia' },
  { flag: '🇦🇪', code: '+971', country: 'United Arab Emirates' },
  { flag: '🇱🇧', code: '+961', country: 'Lebanon' },
  { flag: '🇯🇴', code: '+962', country: 'Jordan' },
  { flag: '🇮🇶', code: '+964', country: 'Iraq' },
  { flag: '🇹🇷', code: '+90', country: 'Turkey' },
  { flag: '🇪🇬', code: '+20', country: 'Egypt' },
  { flag: '🇲🇦', code: '+212', country: 'Morocco' },
  { flag: '🇶🇦', code: '+974', country: 'Qatar' },
  { flag: '🇰🇼', code: '+965', country: 'Kuwait' },
  { flag: '🇧🇭', code: '+973', country: 'Bahrain' },
  { flag: '🇴🇲', code: '+968', country: 'Oman' },
  { flag: '🇾🇪', code: '+967', country: 'Yemen' },
  { flag: '🇵🇸', code: '+970', country: 'Palestine' },
  { flag: '🇱🇾', code: '+218', country: 'Libya' },
  { flag: '🇹🇳', code: '+216', country: 'Tunisia' },
  { flag: '🇩🇿', code: '+213', country: 'Algeria' },
  { flag: '🇮🇳', code: '+91', country: 'India' },
  { flag: '🇨🇳', code: '+86', country: 'China' },
  { flag: '🇯🇵', code: '+81', country: 'Japan' },
];
