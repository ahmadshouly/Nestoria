import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

// Types
export interface ReviewQuestion {
  id: string;
  question_text: string;
  question_type: 'rating' | 'text' | 'scale';
  target_type: 'property' | 'host' | 'platform';
  is_required: boolean;
  sort_order: number;
  scale_min?: number;
  scale_max?: number;
  is_active: boolean;
}

export interface ReviewResponse {
  value?: number;
  text?: string;
}

export interface SubmitReviewParams {
  bookingId: string;
  accommodationId?: string | null;
  vehicleId?: string | null;
  hostId?: string | null;
  responses: Record<string, ReviewResponse>;
  propertyComment?: string;
  hostComment?: string;
  platformComment?: string;
}

interface ExistingReview {
  propertyReview?: { id: string };
  hostReview?: { id: string };
  platformReview?: { id: string };
}

// Fetch review question templates
export function useReviewQuestions() {
  return useQuery({
    queryKey: ['review-questions'],
    queryFn: async (): Promise<ReviewQuestion[]> => {
      const { data, error } = await supabase
        .from('review_question_templates')
        .select('*')
        .eq('is_active', true)
        .order('target_type')
        .order('sort_order');

      if (error) {
        console.error('❌ Error fetching review questions:', error);
        throw error;
      }

      return data || [];
    },
  });
}

// Check if user has already reviewed this booking
export function useExistingReview(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['existing-review', bookingId],
    queryFn: async (): Promise<ExistingReview> => {
      if (!bookingId) return {};

      const [propertyRes, hostRes, platformRes] = await Promise.all([
        supabase
          .from('property_reviews')
          .select('id')
          .eq('booking_id', bookingId)
          .maybeSingle(),
        supabase
          .from('host_reviews')
          .select('id')
          .eq('booking_id', bookingId)
          .maybeSingle(),
        supabase
          .from('platform_reviews')
          .select('id')
          .eq('booking_id', bookingId)
          .maybeSingle(),
      ]);

      return {
        propertyReview: propertyRes.data || undefined,
        hostReview: hostRes.data || undefined,
        platformReview: platformRes.data || undefined,
      };
    },
    enabled: !!bookingId,
  });
}

// Submit reviews
export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SubmitReviewParams) => {
      const {
        bookingId,
        accommodationId,
        vehicleId,
        hostId,
        responses,
        propertyComment,
        hostComment,
        platformComment,
      } = params;

      // Get auth user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get profile ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) throw new Error('Profile not found');

      // Get questions to know target types
      const { data: questions } = await supabase
        .from('review_question_templates')
        .select('id, target_type, question_type')
        .eq('is_active', true);

      if (!questions) throw new Error('Could not fetch questions');

      // Insert detailed responses (uses auth.users.id for reviewer_id)
      const reviewResponses = Object.entries(responses).map(([questionId, response]) => {
        const question = questions.find(q => q.id === questionId);
        return {
          booking_id: bookingId,
          reviewer_id: user.id, // auth.users.id
          question_id: questionId,
          response_value: response.value || null,
          response_text: response.text || null,
          target_type: question?.target_type,
          property_id: accommodationId || vehicleId,
        };
      });

      if (reviewResponses.length > 0) {
        const { error: responsesError } = await supabase
          .from('review_responses_detailed')
          .insert(reviewResponses);

        if (responsesError) {
          console.error('❌ Error inserting review responses:', responsesError);
        }
      }

      // Calculate average ratings for property
      const propertyQuestions = questions.filter(q => q.target_type === 'property' && q.question_type === 'rating');
      const propertyRatings = propertyQuestions
        .map(q => responses[q.id]?.value)
        .filter((v): v is number => v !== undefined && v !== null);

      if (propertyRatings.length > 0) {
        const overallRating = Math.round(
          propertyRatings.reduce((a, b) => a + b, 0) / propertyRatings.length
        );

        // Check for existing property review
        const { data: existingProperty } = await supabase
          .from('property_reviews')
          .select('id')
          .eq('booking_id', bookingId)
          .maybeSingle();

        if (!existingProperty) {
          const { error: propertyError } = await supabase
            .from('property_reviews')
            .insert({
              booking_id: bookingId,
              accommodation_id: accommodationId || null,
              vehicle_id: vehicleId || null,
              reviewer_id: profile.id, // profiles.id
              overall_rating: overallRating,
              comment: propertyComment || null,
              is_verified: true,
              status: 'pending',
            });

          if (propertyError) {
            console.error('❌ Error inserting property review:', propertyError);
          }
        }
      }

      // Calculate average ratings for host
      if (hostId) {
        const hostQuestions = questions.filter(q => q.target_type === 'host' && q.question_type === 'rating');
        const hostRatings = hostQuestions
          .map(q => responses[q.id]?.value)
          .filter((v): v is number => v !== undefined && v !== null);

        if (hostRatings.length > 0) {
          const overallHostRating = Math.round(
            hostRatings.reduce((a, b) => a + b, 0) / hostRatings.length
          );

          // Check for existing host review
          const { data: existingHost } = await supabase
            .from('host_reviews')
            .select('id')
            .eq('booking_id', bookingId)
            .maybeSingle();

          if (!existingHost) {
            const { error: hostError } = await supabase
              .from('host_reviews')
              .insert({
                booking_id: bookingId,
                host_id: hostId,
                accommodation_id: accommodationId || null,
                vehicle_id: vehicleId || null,
                reviewer_id: profile.id, // profiles.id
                overall_rating: overallHostRating,
                comment: hostComment || null,
                is_verified: true,
                status: 'pending',
              });

            if (hostError) {
              console.error('❌ Error inserting host review:', hostError);
            }
          }
        }
      }

      // Platform review
      const platformQuestions = questions.filter(q => q.target_type === 'platform' && q.question_type === 'rating');
      const platformRatings = platformQuestions
        .map(q => responses[q.id]?.value)
        .filter((v): v is number => v !== undefined && v !== null);

      if (platformRatings.length > 0) {
        const overallPlatformRating = Math.round(
          platformRatings.reduce((a, b) => a + b, 0) / platformRatings.length
        );

        // Check for existing platform review
        const { data: existingPlatform } = await supabase
          .from('platform_reviews')
          .select('id')
          .eq('booking_id', bookingId)
          .maybeSingle();

        if (!existingPlatform) {
          const { error: platformError } = await supabase
            .from('platform_reviews')
            .insert({
              booking_id: bookingId,
              user_id: user.id, // auth.users.id
              rating: overallPlatformRating,
              comment: platformComment || null,
              status: 'pending',
            });

          if (platformError) {
            console.error('❌ Error inserting platform review:', platformError);
          }
        }
      }

      console.log('✅ Reviews submitted successfully');
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['existing-review', variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

// Cancellation reasons
export const CANCELLATION_REASONS = [
  'Personal emergency',
  'Travel restrictions',
  'Health concerns',
  'Work commitments',
  'Family reasons',
  'Weather conditions',
  'Change of plans',
  'Other',
];

// Submit cancellation request
export function useSubmitCancellation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      reason,
      customReason,
    }: {
      bookingId: string;
      reason: string;
      customReason?: string;
    }) => {
      // Get auth user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get profile ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) throw new Error('Profile not found');

      const finalReason = reason === 'Other' && customReason ? customReason : reason;

      // Insert cancellation request
      const { error: requestError } = await supabase
        .from('cancellation_requests')
        .insert({
          booking_id: bookingId,
          requested_by: profile.id, // profiles.id
          reason: finalReason,
          currency: 'USD',
        });

      if (requestError) {
        console.error('❌ Error inserting cancellation request:', requestError);
        throw requestError;
      }

      // Update booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'pending_cancellation' })
        .eq('id', bookingId);

      if (updateError) {
        console.error('❌ Error updating booking status:', updateError);
        throw updateError;
      }

      console.log('✅ Cancellation request submitted');
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking'] });
    },
  });
}

// Fetch cancellation request status
export function useCancellationRequest(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['cancellation-request', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      const { data, error } = await supabase
        .from('cancellation_requests')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching cancellation request:', error);
        return null;
      }

      return data;
    },
    enabled: !!bookingId,
  });
}
