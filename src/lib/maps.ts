/**
 * Map utilities for Nestoria Mobile App
 * Handles coordinates, geocoding, and privacy for map displays
 */

// Mapbox configuration
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYWhtYWRzaG91bHkiLCJhIjoiY21kMW5iNW1wMTgzczJrcW4zN214M2hldSJ9.A34wf1EDxoSfDHI8BqW-nQ';

export const getMapboxToken = (): string => {
  return MAPBOX_TOKEN;
};

// Default map configuration
export const MAP_CONFIG = {
  defaultCenter: {
    latitude: 33.5138,  // Damascus, Syria
    longitude: 36.2765,
  },
  defaultZoom: 12,
  styles: {
    streets: 'mapbox://styles/mapbox/streets-v12',
    light: 'mapbox://styles/mapbox/light-v11',
  },
};

// Display coordinates interface
export interface DisplayCoordinates {
  latitude: number;
  longitude: number;
  isApproximate: boolean;
}

/**
 * Get display coordinates with privacy offset if needed
 * When show_exact_location is false, add random offset (~1km radius)
 */
export const getDisplayCoordinates = (
  latitude: number | null,
  longitude: number | null,
  showExactLocation: boolean = true
): DisplayCoordinates | null => {
  // Return null if no coordinates
  if (latitude === null || longitude === null) {
    return null;
  }

  // If exact location enabled, return as-is
  if (showExactLocation) {
    return {
      latitude,
      longitude,
      isApproximate: false,
    };
  }

  // Add random offset (~1km radius) for privacy
  // 1km ≈ 0.009 degrees
  const OFFSET_DEGREES = 0.009;

  return {
    latitude: latitude + (Math.random() - 0.5) * OFFSET_DEGREES,
    longitude: longitude + (Math.random() - 0.5) * OFFSET_DEGREES,
    isApproximate: true,
  };
};

/**
 * Map bounds interface
 */
export interface MapBounds {
  southwest: { latitude: number; longitude: number };
  northeast: { latitude: number; longitude: number };
  center: { latitude: number; longitude: number };
}

/**
 * Calculate map bounds for multiple properties
 */
export const calculateMapBounds = (
  properties: Array<{
    latitude: number | null;
    longitude: number | null;
    show_exact_location?: boolean;
  }>
): MapBounds | null => {
  const validCoords = properties
    .map((p) =>
      getDisplayCoordinates(
        p.latitude,
        p.longitude,
        p.show_exact_location ?? true
      )
    )
    .filter((c) => c !== null) as DisplayCoordinates[];

  if (validCoords.length === 0) {
    return null;
  }

  let minLat = Infinity,
    maxLat = -Infinity;
  let minLng = Infinity,
    maxLng = -Infinity;

  validCoords.forEach((coord) => {
    minLat = Math.min(minLat, coord.latitude);
    maxLat = Math.max(maxLat, coord.latitude);
    minLng = Math.min(minLng, coord.longitude);
    maxLng = Math.max(maxLng, coord.longitude);
  });

  return {
    southwest: { latitude: minLat, longitude: minLng },
    northeast: { latitude: maxLat, longitude: maxLng },
    center: {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
    },
  };
};

/**
 * Reverse geocoding - Convert coordinates to address
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  try {
    const token = getMapboxToken();
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&limit=1`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();
    const placeName = data?.features?.[0]?.place_name;

    return placeName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
};

/**
 * Forward geocoding - Convert address to coordinates
 */
export interface GeocodingResult {
  latitude: number;
  longitude: number;
  placeName: string;
}

export const forwardGeocode = async (
  address: string
): Promise<GeocodingResult | null> => {
  try {
    const token = getMapboxToken();
    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${token}&limit=1`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();
    const feature = data?.features?.[0];

    if (!feature) return null;

    return {
      latitude: feature.center[1],
      longitude: feature.center[0],
      placeName: feature.place_name,
    };
  } catch (error) {
    console.error('Forward geocoding error:', error);
    return null;
  }
};

/**
 * Validate coordinates
 */
export const isValidCoordinate = (
  latitude: number | null,
  longitude: number | null
): boolean => {
  if (latitude === null || longitude === null) return false;
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};
