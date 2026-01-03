import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { router } from 'expo-router';
import { useEffect } from 'react';

// Supabase configuration - used for direct fetch calls
const SUPABASE_URL = 'https://xljovgmnunoomjbighia.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsam92Z21udW5vb21qYmlnaGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNDUxMjYsImV4cCI6MjA2NzgyMTEyNn0.SbB9FbxyeIc6MvJSlUIlr7o7px9owhrrQYCYpH3aN1I';

// Auth state hook with session restoration
export function useAuth() {
  const queryClient = useQueryClient();

  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Invalidate and refetch auth data
        queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
      } else if (event === 'SIGNED_OUT') {
        // Clear all queries on sign out
        queryClient.clear();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      // Try to get the session first (this will restore from AsyncStorage)
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) return null;

      // Get user profile with role
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      console.log('🔍 [Auth] Fetched profile with avatar_url:', profile?.avatar_url);

      return { user: session.user, profile };
    },
    staleTime: Infinity, // Keep data fresh until auth state changes
    gcTime: Infinity, // Don't garbage collect
    retry: false, // Don't retry on auth failures
  });
}

// Sign in mutation
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      // First, sign in to get the user_id (but don't return yet)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) throw signInError;

      console.log('🔐 [Sign In] Successfully authenticated user:', signInData.user?.id);

      // Now check 2FA status using the user_id
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('two_factor_enabled, two_factor_method, phone, phone_country_code')
        .eq('user_id', signInData.user?.id)
        .maybeSingle();

      console.log('🔐 [Sign In] Profile 2FA data:', profileData);

      // If 2FA is enabled, sign out and require 2FA verification
      if (profileData?.two_factor_enabled === true) {
        console.log('🔐 [Sign In] 2FA is enabled, signing out and redirecting to 2FA screen');

        // Sign out the user since they need to complete 2FA first
        await supabase.auth.signOut({ scope: 'local' });

        return {
          requires2FA: true,
          twoFactorMethod: profileData.two_factor_method,
          phone: profileData.phone,
          phoneCountryCode: profileData.phone_country_code,
          email,
          password,
        };
      }

      console.log('🔐 [Sign In] 2FA not enabled, user is signed in');

      // 2FA not enabled, user is already signed in
      return { requires2FA: false, data: signInData };
    },
    onSuccess: (result) => {
      if (!result.requires2FA) {
        // Invalidate auth queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
      }
    },
  });
}

// Sign up mutation (Legacy - kept for compatibility)
export function useSignUp() {
  return useMutation({
    mutationFn: async ({
      email,
      password,
      fullName,
      role = 'user',
    }: {
      email: string;
      password: string;
      fullName: string;
      role?: 'user' | 'supplier';
    }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });
      if (error) throw error;
      return data;
    },
  });
}

// ============ OTP-Based Signup Flow ============

// Step 1: Create signup session
export function useCreateSignupSession() {
  return useMutation({
    mutationFn: async ({
      email,
      fullName,
      role = 'user',
      newsletterSubscribed = false,
    }: {
      email: string;
      fullName: string;
      role?: 'user' | 'supplier';
      newsletterSubscribed?: boolean;
    }) => {
      console.log('[useCreateSignupSession] Invoking create-signup-session Edge Function...');
      console.log('[useCreateSignupSession] Payload:', { email, fullName, role, newsletterSubscribed });

      const { data, error } = await supabase.functions.invoke('create-signup-session', {
        body: {
          email,
          fullName,
          role,
          newsletterSubscribed,
        },
      });

      console.log('[useCreateSignupSession] Response:', { data, error });

      if (error) {
        console.error('[useCreateSignupSession] Error from Edge Function:', error);
        throw error;
      }
      if (!data?.sessionToken) {
        console.error('[useCreateSignupSession] No sessionToken in response:', data);
        throw new Error('Failed to create signup session');
      }

      console.log('[useCreateSignupSession] Success! Session token received');
      return data;
    },
  });
}

// Step 2: Send OTP email
export function useSendOTPEmail() {
  return useMutation({
    mutationFn: async ({
      email,
      userName,
    }: {
      email: string;
      userName: string;
    }) => {
      console.log('[useSendOTPEmail] Invoking send-email Edge Function...');
      console.log('[useSendOTPEmail] Payload:', { type: 'email_verification', email, user_name: userName });

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'email_verification',
          email,
          user_name: userName,
        },
      });

      console.log('[useSendOTPEmail] Response:', { data, error });

      if (error) {
        console.error('[useSendOTPEmail] Error from Edge Function:', error);
        throw error;
      }

      console.log('[useSendOTPEmail] Success! OTP email sent');
      return data;
    },
  });
}

// Step 3: Verify OTP and create account
export function useVerifyEmailOTP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      otpCode,
      sessionToken,
      password,
    }: {
      email: string;
      otpCode: string;
      sessionToken: string;
      password: string;
    }) => {
      console.log('[useVerifyEmailOTP] Invoking verify-email-otp Edge Function...');
      console.log('[useVerifyEmailOTP] Payload:', {
        email,
        otpCode,
        sessionToken: sessionToken?.substring(0, 16) + '...',
        password: '***',
      });

      const { data, error } = await supabase.functions.invoke('verify-email-otp', {
        body: {
          email,
          otpCode,
          sessionToken,
          password,
        },
      });

      console.log('[useVerifyEmailOTP] Response:', { data, error });

      if (error) {
        console.error('[useVerifyEmailOTP] Error from Edge Function:', error);
        throw error;
      }
      if (!data?.success) {
        console.error('[useVerifyEmailOTP] Verification failed:', data);
        throw new Error('Failed to verify email');
      }

      console.log('[useVerifyEmailOTP] Success! Account created and verified');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
  });
}

// Sign out mutation
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.clear();
      router.replace('/auth/sign-in');
    },
  });
}

// Get user role
export function useUserRole() {
  const { data: authData } = useAuth();

  return useQuery({
    queryKey: ['user', 'role', authData?.user?.id],
    queryFn: async () => {
      if (!authData?.user?.id) return null;
      const { data } = await supabase.rpc('get_user_role', {
        _user_id: authData.user.id,
      });
      return data;
    },
    enabled: !!authData?.user?.id,
  });
}

// Update profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<{
      full_name: string;
      phone: string;
      phone_country_code: string;
      phone_verified: boolean;
      phone_verified_at: null;
      address: string;
      city: string;
      country: string;
      postal_code: string;
      avatar_url: string;
    }>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
  });
}

// Password reset request
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'nestoria://reset-password',
      });
      if (error) throw error;
    },
  });
}

// Update password
export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    },
  });
}

// Send 2FA Code (for SMS method)
export function useSend2FACode() {
  return useMutation({
    mutationFn: async ({ phone, phoneCountryCode, email }: { phone: string; phoneCountryCode: string; email?: string }) => {
      // Clean up phone number (remove spaces)
      const cleanPhone = phone.trim();
      const cleanCountryCode = phoneCountryCode.trim();
      const fullPhone = `${cleanCountryCode}${cleanPhone}`;

      console.log('📞 [Send 2FA] Sending SMS to:', { cleanPhone, cleanCountryCode, fullPhone, email });

      // Validate phone number format
      if (fullPhone.length > 15) {
        throw new Error(`Phone number too long (${fullPhone.length} digits). Please update your phone number in Security settings.`);
      }

      if (cleanPhone.length < 6) {
        throw new Error('Phone number too short. Please update your phone number in Security settings.');
      }

      try {
        // Send SMS verification code using direct fetch to get proper error messages
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/send-verification-sms`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              action: 'send',
              phone: fullPhone,
              phoneNumber: cleanPhone,
              countryCode: cleanCountryCode,
              email: email, // Include email for login flow (when user is not authenticated)
            }),
          }
        );

        const data = await response.json();

        console.log('📞 [Send 2FA] Response status:', response.status);
        console.log('📞 [Send 2FA] Response data:', data);

        if (!response.ok) {
          console.error('📞 [Send 2FA] Error response:', data);

          // Get the actual error message from the Edge Function
          const errorMsg = data?.error || data?.message || 'Failed to send SMS. Please verify your phone number is correct in Security settings.';
          throw new Error(errorMsg);
        }

        if (!data.success) {
          console.error('📞 [Send 2FA] SMS sending failed:', data);
          const errorMsg = data?.error || data?.message || 'Failed to send SMS. Please verify your phone number is correct in Security settings.';
          throw new Error(errorMsg);
        }

        return { success: true };
      } catch (err: any) {
        console.error('📞 [Send 2FA] Exception caught:', err);

        // If already an Error we threw, rethrow it
        if (err instanceof Error) {
          throw err;
        }

        // Otherwise, provide helpful error
        throw new Error('Failed to send SMS. Please check your phone number format in Security settings.');
      }
    },
  });
}

// 2FA Verification
export function useVerify2FA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      token,
      method,
      trustDevice = false,
    }: {
      email: string;
      password: string;
      token: string;
      method: string;
      trustDevice?: boolean;
    }) => {
      console.log('🔐 [Verify 2FA] Starting verification:', { email, method, trustDevice });

      // For SMS method, verify the code using the Edge Function
      if (method === 'sms') {
        console.log('🔐 [Verify 2FA] Verifying SMS code...');

        // Use the verify-login-2fa Edge Function which handles the full flow
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/verify-login-2fa`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              email,
              password,
              token,
              method: 'sms',
              trustDevice,
              deviceInfo: {
                fingerprint: 'mobile-app',
                deviceName: 'Mobile App',
                browser: 'React Native',
              },
            }),
          }
        );

        const data = await response.json();

        console.log('🔐 [Verify 2FA] Response status:', response.status);
        console.log('🔐 [Verify 2FA] Response data:', data);

        if (!response.ok || !data?.success) {
          console.error('🔐 [Verify 2FA] Verification failed:', data);
          const errorMsg = data?.error || data?.message || 'Invalid verification code';
          throw new Error(errorMsg);
        }

        console.log('✅ [Verify 2FA] Verification successful!');

        // IMPORTANT: Set the session in Supabase client so the user stays logged in
        if (data.session) {
          console.log('🔐 [Verify 2FA] Setting session in Supabase client...');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

          if (sessionError) {
            console.error('🔐 [Verify 2FA] Failed to set session:', sessionError);
            throw sessionError;
          }

          console.log('✅ [Verify 2FA] Session set successfully!');
        }

        return { success: true, session: data.session, user: data.user };
      } else {
        // For authenticator app method - also use verify-login-2fa Edge Function
        console.log('🔐 [Verify 2FA] Verifying authenticator code...');

        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/verify-login-2fa`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              email,
              password,
              token,
              method: 'app',
              trustDevice,
              deviceInfo: {
                fingerprint: 'mobile-app',
                deviceName: 'Mobile App',
                browser: 'React Native',
              },
            }),
          }
        );

        const data = await response.json();

        console.log('🔐 [Verify 2FA] Response status:', response.status);
        console.log('🔐 [Verify 2FA] Response data:', data);

        if (!response.ok || !data?.success) {
          console.error('🔐 [Verify 2FA] Verification failed:', data);
          const errorMsg = data?.error || data?.message || 'Invalid verification code';
          throw new Error(errorMsg);
        }

        console.log('✅ [Verify 2FA] Verification successful!');

        // IMPORTANT: Set the session in Supabase client so the user stays logged in
        if (data.session) {
          console.log('🔐 [Verify 2FA] Setting session in Supabase client...');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

          if (sessionError) {
            console.error('🔐 [Verify 2FA] Failed to set session:', sessionError);
            throw sessionError;
          }

          console.log('✅ [Verify 2FA] Session set successfully!');
        }

        return { success: true, session: data.session, user: data.user };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
  });
}

// Get user stats
export function useUserStats() {
  const { data: authData } = useAuth();

  return useQuery({
    queryKey: ['user', 'stats', authData?.user?.id],
    queryFn: async () => {
      if (!authData?.user?.id) return { trips: 0, wishlists: 0, reviews: 0 };

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authData.user.id)
        .single();

      if (!profile) return { trips: 0, wishlists: 0, reviews: 0 };

      // Get trips count (both accommodations and vehicles)
      const { count: accommodationBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      const { count: vehicleBookings } = await supabase
        .from('vehicle_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      const trips = (accommodationBookings || 0) + (vehicleBookings || 0);

      // Get wishlists count
      const { count: wishlistCount } = await supabase
        .from('wishlist')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      // Get reviews count
      const { count: reviewCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      return {
        trips: trips,
        wishlists: wishlistCount || 0,
        reviews: reviewCount || 0,
      };
    },
    enabled: !!authData?.user?.id,
  });
}

