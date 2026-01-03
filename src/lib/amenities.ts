import {
  MapPin, Wifi, Zap, Settings, Shield, Gauge, Camera, Eye,
  UtensilsCrossed, Key, Car, Coffee, Waves, Dumbbell, Snowflake,
  Flame, Tv, Shirt, Mountain, TreePine, Building, Home, PawPrint,
  Gamepad2, Music, Utensils, DoorOpen, type LucideIcon
} from 'lucide-react-native';

interface AmenityIconMap {
  keywords: string[];
  icon: LucideIcon;
}

const amenityIconMappings: AmenityIconMap[] = [
  // ============ VEHICLE-SPECIFIC AMENITIES ============
  { keywords: ['navigation', 'gps'], icon: MapPin },
  { keywords: ['bluetooth', 'wireless'], icon: Wifi },
  { keywords: ['usb', 'charging'], icon: Zap },
  { keywords: ['automatic', 'manual', 'transmission'], icon: Settings },
  { keywords: ['abs', 'brake', 'airbag', 'safety'], icon: Shield },
  { keywords: ['cruise control', 'speed control'], icon: Gauge },
  { keywords: ['parking sensor', 'backup camera', 'camera'], icon: Camera },
  { keywords: ['sunroof', 'moonroof'], icon: Eye },
  { keywords: ['leather', 'heated seat', 'seat'], icon: UtensilsCrossed },
  { keywords: ['keyless', 'push start', 'remote'], icon: Key },

  // ============ ACCOMMODATION-SPECIFIC AMENITIES ============
  { keywords: ['wifi', 'internet'], icon: Wifi },
  { keywords: ['parking', 'garage'], icon: Car },
  { keywords: ['coffee', 'kitchen'], icon: Coffee },
  { keywords: ['pool', 'swimming'], icon: Waves },
  { keywords: ['gym', 'fitness'], icon: Dumbbell },
  { keywords: ['air conditioning', 'ac'], icon: Snowflake },
  { keywords: ['heating'], icon: Flame },
  { keywords: ['tv', 'television'], icon: Tv },
  { keywords: ['washing', 'dryer'], icon: Shirt },
  { keywords: ['mountain view'], icon: Mountain },
  { keywords: ['garden', 'nature'], icon: TreePine },
  { keywords: ['city view'], icon: Building },
  { keywords: ['ocean view', 'sea view', 'lake view'], icon: Eye },
  { keywords: ['balcony', 'patio'], icon: Home },
  { keywords: ['pet'], icon: PawPrint },
  { keywords: ['fireplace', 'fire pit'], icon: Flame },
  { keywords: ['game', 'entertainment'], icon: Gamepad2 },
  { keywords: ['piano', 'music'], icon: Music },
  { keywords: ['bbq', 'grill'], icon: Utensils },
  { keywords: ['beach access'], icon: DoorOpen },
  { keywords: ['hot tub', 'spa'], icon: Waves },
];

// Default icon for unmatched amenities
const DEFAULT_ICON = MapPin;

/**
 * Get the appropriate Lucide icon for an amenity based on keywords
 */
export function getAmenityIcon(amenity: string): LucideIcon {
  const lowerAmenity = amenity.toLowerCase();

  for (const mapping of amenityIconMappings) {
    if (mapping.keywords.some(keyword => lowerAmenity.includes(keyword))) {
      return mapping.icon;
    }
  }

  return DEFAULT_ICON;
}

/**
 * Format amenity name from camelCase/PascalCase to readable text
 */
export function formatAmenityName(amenity: string): string {
  return amenity
    .replace(/([A-Z])/g, ' $1')  // Add space before capital letters
    .replace(/^./, str => str.toUpperCase())  // Capitalize first letter
    .trim();
}

/**
 * Common accommodation amenities
 */
export const ACCOMMODATION_AMENITIES = [
  'WiFi', 'Parking', 'Kitchen', 'Pool', 'Gym', 'Air Conditioning',
  'Heating', 'TV', 'Washing Machine', 'Dryer', 'Mountain View',
  'Garden', 'City View', 'Ocean View', 'Sea View', 'Lake View',
  'Balcony', 'Patio', 'Pet Friendly', 'Fireplace', 'Fire Pit',
  'Game Room', 'Entertainment', 'Piano', 'BBQ', 'Grill',
  'Beach Access', 'Hot Tub', 'Spa', 'Coffee Maker'
];

/**
 * Common vehicle features
 */
export const VEHICLE_FEATURES = [
  'GPS Navigation', 'Bluetooth', 'USB Charging', 'Automatic Transmission',
  'Manual Transmission', 'ABS Brakes', 'Airbags', 'Cruise Control',
  'Parking Sensors', 'Backup Camera', 'Sunroof', 'Leather Seats',
  'Heated Seats', 'Keyless Entry', 'Push Start', 'Remote Start',
  'Air Conditioning', 'Apple CarPlay', 'Android Auto', 'WiFi Hotspot'
];
