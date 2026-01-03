import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

// Fetch user wishlist
export function useWishlist() {
  return useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          *,
          accommodations(*),
          vehicles(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

// Check if item is wishlisted
export function useIsWishlisted(itemId: string | undefined, itemType: 'accommodation' | 'vehicle') {
  return useQuery({
    queryKey: ['wishlist', 'check', itemId, itemType],
    queryFn: async () => {
      if (!itemId) return false;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const column = itemType === 'accommodation' ? 'accommodation_id' : 'vehicle_id';

      const { data, error } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .eq(column, itemId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!itemId,
  });
}

// Add to wishlist
export function useAddToWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      itemType,
    }: {
      itemId: string;
      itemType: 'accommodation' | 'vehicle';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData = {
        user_id: user.id,
        accommodation_id: itemType === 'accommodation' ? itemId : null,
        vehicle_id: itemType === 'vehicle' ? itemId : null,
      };

      const { data, error } = await supabase
        .from('wishlists')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist', 'check', variables.itemId] });
    },
  });
}

// Remove from wishlist
export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      itemType,
    }: {
      itemId: string;
      itemType: 'accommodation' | 'vehicle';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const column = itemType === 'accommodation' ? 'accommodation_id' : 'vehicle_id';

      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', user.id)
        .eq(column, itemId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist', 'check', variables.itemId] });
    },
  });
}

// Toggle wishlist
export function useToggleWishlist() {
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();

  return useMutation({
    mutationFn: async ({
      itemId,
      itemType,
      isCurrentlyWishlisted,
    }: {
      itemId: string;
      itemType: 'accommodation' | 'vehicle';
      isCurrentlyWishlisted: boolean;
    }) => {
      if (isCurrentlyWishlisted) {
        await removeFromWishlist.mutateAsync({ itemId, itemType });
      } else {
        await addToWishlist.mutateAsync({ itemId, itemType });
      }
    },
  });
}

// Get wishlist count
export function useWishlistCount() {
  return useQuery({
    queryKey: ['wishlist', 'count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('wishlists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) throw error;
      return count || 0;
    },
  });
}
