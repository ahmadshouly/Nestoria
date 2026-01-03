import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';

export interface City {
  id: string;
  name: string;
  country: string;
  image_url: string | null;
}

export interface FeaturedSection {
  id: string;
  title: string;
  section_type: string;
  property_type: string;
  city_id: string | null;
  max_items: number;
  display_order: number;
  cities: City | null;
  items: any[];
}

// Fetch all featured sections with their items
export function useFeaturedSections() {
  return useQuery({
    queryKey: ['featured-sections'],
    queryFn: async () => {
      console.log('🔍 Fetching featured sections...');

      // Try using RPC function first (bypasses RLS)
      const { data: rpcSections, error: rpcError } = await supabase
        .rpc('list_active_featured_sections');

      if (rpcError) {
        console.log('⚠️ RPC function not available, falling back to direct query:', rpcError.message);

        // Fallback to direct query
        const { data: sections, error: sectionsError } = await supabase
          .from('featured_sections')
          .select(`
            id,
            title,
            title_ar,
            section_type,
            property_type,
            city_id,
            max_items,
            display_order,
            is_active,
            cities(id, name, country, image_url)
          `)
          .order('display_order', { ascending: true });

        console.log('📦 Featured sections response (all sections):', {
          sections,
          sectionsError,
          activeSections: sections?.filter(s => s.is_active).length
        });

        if (sectionsError) {
          console.error('❌ Featured sections error:', sectionsError);
          throw sectionsError;
        }

        if (!sections || sections.length === 0) {
          console.log('⚠️ No featured sections found in database');
          return [];
        }

        // Filter to active sections only
        const activeSections = sections.filter(s => s.is_active);

        if (activeSections.length === 0) {
          console.log('⚠️ Found sections but none are active');
          return [];
        }

        console.log(`✅ Found ${activeSections.length} active featured sections`);

        // Use activeSections for the rest of the logic
        const sections2 = activeSections;

        // Step 2: For each section, get featured properties
        const sectionsWithItems = await Promise.all(
          sections2.map(async (section) => {
            // Get featured property IDs for this section
            const { data: featuredProps } = await supabase
              .from('featured_properties')
              .select('property_id, property_type, display_order')
              .eq('section_id', section.id)
              .eq('is_active', true)
              .order('display_order', { ascending: true })
              .limit(section.max_items);

            console.log(`📋 Featured props for "${section.title}":`, featuredProps?.length || 0);

            const items: any[] = [];

            if (featuredProps) {
              // Separate IDs by type
              const accommodationIds = featuredProps
                .filter(p => p.property_type === 'accommodation')
                .map(p => p.property_id);

              const vehicleIds = featuredProps
                .filter(p => p.property_type === 'vehicle')
                .map(p => p.property_id);

              // Fetch accommodations
              if (accommodationIds.length > 0 &&
                  (section.property_type === 'accommodations' || section.property_type === 'both')) {
                const { data: accommodations } = await supabase
                  .from('accommodations')
                  .select(`
                    id,
                    title,
                    description,
                    location,
                    price_per_night,
                    max_guests,
                    bedrooms,
                    bathrooms,
                    amenities,
                    images,
                    main_image_url,
                    property_type,
                    city_id,
                    featured,
                    profiles!host_id(id, full_name, avatar_url)
                  `)
                  .in('id', accommodationIds)
                  .eq('status', 'approved');

                if (accommodations && accommodations.length > 0) {
                  // Fetch reviews separately
                  const { data: reviews } = await supabase
                    .from('property_reviews')
                    .select('accommodation_id, overall_rating')
                    .in('accommodation_id', accommodations.map(a => a.id))
                    .not('accommodation_id', 'is', null);

                  items.push(...accommodations.map(a => {
                    const accReviews = reviews?.filter(r => r.accommodation_id === a.id) || [];
                    const avgRating = accReviews.length > 0
                      ? accReviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / accReviews.length
                      : 0;
                    return { ...a, type: 'accommodation' as const, average_rating: avgRating };
                  }));
                }
              }

              // Fetch vehicles
              if (vehicleIds.length > 0 &&
                  (section.property_type === 'vehicles' || section.property_type === 'both')) {
                const { data: vehicles } = await supabase
                  .from('vehicles')
                  .select(`
                    id,
                    title,
                    description,
                    location,
                    price_per_day,
                    vehicle_type,
                    brand,
                    model,
                    year,
                    features,
                    images,
                    main_image_url,
                    seats,
                    transmission,
                    fuel_type,
                    city_id,
                    featured,
                    profiles!owner_id(id, full_name, avatar_url)
                  `)
                  .in('id', vehicleIds)
                  .eq('status', 'approved');

                if (vehicles && vehicles.length > 0) {
                  // Fetch reviews separately
                  const { data: reviews } = await supabase
                    .from('property_reviews')
                    .select('vehicle_id, overall_rating')
                    .in('vehicle_id', vehicles.map(v => v.id))
                    .not('vehicle_id', 'is', null);

                  items.push(...vehicles.map(v => {
                    const vehReviews = reviews?.filter(r => r.vehicle_id === v.id) || [];
                    const avgRating = vehReviews.length > 0
                      ? vehReviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / vehReviews.length
                      : 0;
                    return { ...v, type: 'vehicle' as const, average_rating: avgRating };
                  }));
                }
              }
            }

            return {
              ...section,
              items
            };
          })
        );

        return sectionsWithItems;
      }

      console.log('📦 Featured sections from RPC:', { rpcSections });

      if (!rpcSections || rpcSections.length === 0) {
        console.log('⚠️ No active featured sections found via RPC');
        return [];
      }

      console.log(`✅ Found ${rpcSections.length} featured sections via RPC`);

      // Step 2: For each section, get featured properties
      const sectionsWithItems = await Promise.all(
        rpcSections.map(async (section: any) => {
          // Get featured property IDs for this section
          const { data: featuredProps, error: fpError } = await supabase
            .from('featured_properties')
            .select('property_id, property_type, display_order')
            .eq('section_id', section.id)
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .limit(section.max_items);

          console.log(`📋 Featured props for "${section.title}":`, {
            count: featuredProps?.length || 0,
            error: fpError,
            sectionId: section.id
          });

          const items: any[] = [];

          if (featuredProps) {
            // Separate IDs by type
            const accommodationIds = featuredProps
              .filter(p => p.property_type === 'accommodation')
              .map(p => p.property_id);

            const vehicleIds = featuredProps
              .filter(p => p.property_type === 'vehicle')
              .map(p => p.property_id);

            // Fetch accommodations
            if (accommodationIds.length > 0 &&
                (section.property_type === 'accommodations' || section.property_type === 'both')) {
              const { data: accommodations, error: accError } = await supabase
                .from('accommodations')
                .select(`
                  id,
                  title,
                  description,
                  location,
                  price_per_night,
                  max_guests,
                  bedrooms,
                  bathrooms,
                  amenities,
                  images,
                  main_image_url,
                  property_type,
                  city_id,
                  featured,
                  profiles!host_id(id, full_name, avatar_url)
                `)
                .in('id', accommodationIds)
                .eq('status', 'approved');

              console.log(`🏠 Accommodations query result:`, {
                count: accommodations?.length || 0,
                error: accError,
                ids: accommodationIds
              });

              if (accommodations && accommodations.length > 0) {
                console.log(`✅ Found ${accommodations.length} accommodations for section`);

                // Fetch reviews separately for these accommodations
                const { data: reviews } = await supabase
                  .from('property_reviews')
                  .select('accommodation_id, overall_rating')
                  .in('accommodation_id', accommodations.map(a => a.id))
                  .not('accommodation_id', 'is', null);

                console.log(`⭐ Found ${reviews?.length || 0} reviews for accommodations`);

                items.push(...accommodations.map(a => {
                  // Calculate average rating from reviews for this accommodation
                  const accReviews = reviews?.filter(r => r.accommodation_id === a.id) || [];
                  const avgRating = accReviews.length > 0
                    ? accReviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / accReviews.length
                    : 0;
                  return { ...a, type: 'accommodation' as const, average_rating: avgRating };
                }));
              }
            }

            // Fetch vehicles
            if (vehicleIds.length > 0 &&
                (section.property_type === 'vehicles' || section.property_type === 'both')) {
              const { data: vehicles, error: vehError } = await supabase
                .from('vehicles')
                .select(`
                  id,
                  title,
                  description,
                  location,
                  price_per_day,
                  vehicle_type,
                  brand,
                  model,
                  year,
                  features,
                  images,
                  main_image_url,
                  seats,
                  transmission,
                  fuel_type,
                  city_id,
                  featured,
                  profiles!owner_id(id, full_name, avatar_url)
                `)
                .in('id', vehicleIds)
                .eq('status', 'approved');

              console.log(`🚗 Vehicles query result:`, {
                count: vehicles?.length || 0,
                error: vehError,
                ids: vehicleIds
              });

              if (vehicles && vehicles.length > 0) {
                console.log(`✅ Found ${vehicles.length} vehicles for section`);

                // Fetch reviews separately for these vehicles
                const { data: reviews } = await supabase
                  .from('property_reviews')
                  .select('vehicle_id, overall_rating')
                  .in('vehicle_id', vehicles.map(v => v.id))
                  .not('vehicle_id', 'is', null);

                console.log(`⭐ Found ${reviews?.length || 0} reviews for vehicles`);

                items.push(...vehicles.map(v => {
                  // Calculate average rating from reviews for this vehicle
                  const vehReviews = reviews?.filter(r => r.vehicle_id === v.id) || [];
                  const avgRating = vehReviews.length > 0
                    ? vehReviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / vehReviews.length
                    : 0;
                  return { ...v, type: 'vehicle' as const, average_rating: avgRating };
                }));
              }
            }
          }

          console.log(`📦 Section "${section.title}" has ${items.length} items`);

          return {
            ...section,
            items
          };
        })
      );

      return sectionsWithItems;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Fetch cities
export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, country, image_url')
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Complete homepage data
export function useHomepageData() {
  const featuredSections = useFeaturedSections();
  const cities = useCities();

  return {
    featuredSections: featuredSections.data || [],
    cities: cities.data || [],
    isLoading: featuredSections.isLoading || cities.isLoading,
    error: featuredSections.error || cities.error,
  };
}
