import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xljovgmnunoomjbighia.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsam92Z21udW5vb21qYmlnaGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNDUxMjYsImV4cCI6MjA2NzgyMTEyNn0.SbB9FbxyeIc6MvJSlUIlr7o7px9owhrrQYCYpH3aN1I';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for React Native
  },
});

// Database types (subset - expand as needed)
export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  phone_country_code: string | null;
  phone_verified: boolean;
  phone_verified_at: string | null;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  location: string | null;

  // Emergency Contact
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;

  // Supplier-specific fields
  supplier_type: 'individual' | 'company' | null;
  company_name: string | null;
  company_registration_number: string | null;
  tax_number: string | null;
  business_address: string | null;
  business_phone: string | null;
  business_website: string | null;
  business_description: string | null;
  contact_person_name: string | null;
  contact_person_position: string | null;

  // Banking/Payout Info
  bank_account_holder: string | null;
  bank_account_number: string | null;
  bank_name: string | null;
  bank_routing_number: string | null;
  iban: string | null;
  paypal_email: string | null;

  // Arrays for supplier experience
  languages_spoken: string[];
  years_of_experience: number | null;
  property_types_offered: string[];
  service_areas: string[];
  certifications: string[];

  // Document Verification
  id_verification_status: 'pending' | 'approved' | 'rejected' | null;
  id_verification_rejection_reason: string | null;
  id_document_url: string | null;
  id_documents_urls: string[];
  id_front_document_status: string | null;
  id_front_document_rejection_reason: string | null;
  id_back_document_status: string | null;
  id_back_document_rejection_reason: string | null;

  // Business License
  business_license_url: string | null;
  business_license_urls: string[];
  business_license_status: string | null;
  business_license_document_status: string | null;
  business_license_rejection_reason: string | null;

  // Additional Documents
  additional_documents_urls: string[];
  additional_documents_status: string | null;
  additional_documents_rejection_reason: string | null;

  // Profile Verification
  profile_verified: boolean;
  profile_verified_at: string | null;
  profile_verified_by: string | null;

  // Security
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  two_factor_method: 'app' | 'sms' | null;

  // Notifications
  newsletter_subscribed: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;

  // Status
  is_banned: boolean;
  preferred_language: string | null;
  profile_completion_percentage: number | null;

  role: 'admin' | 'supplier' | 'user';
  is_host: boolean;
  is_verified: boolean;
  loyalty_points: number;
  loyalty_tier: string | null;
  wallet_balance: number;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
}

export interface Accommodation {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  location: string;
  city_id: string | null;
  latitude: number | null;
  longitude: number | null;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  price_per_night: number;
  cleaning_fee: number | null;
  amenities: string[];
  images: string[];
  main_image_url: string | null;
  min_stay: number;
  max_stay: number | null;
  house_rules: any;
  status: 'pending' | 'approved' | 'rejected';
  featured: boolean;
  cancellation_policy_id: string | null;
  offline_payment_enabled: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  profiles?: Profile;
  cities?: { id: string; name: string; country: string };
  accommodation_rooms?: AccommodationRoom[];
  average_rating?: number;
  review_count?: number;
}

export interface AccommodationRoom {
  id: string;
  accommodation_id: string;
  name: string;
  description: string | null;
  price_per_night: number;
  max_guests: number;
  bed_type: string | null;
  amenities: string[];
  images: string[];
  is_available: boolean;
  created_at: string;
}

export interface Vehicle {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  make: string;
  model: string;
  year: number;
  vehicle_type: string;
  transmission: string;
  fuel_type: string;
  seats: number;
  doors: number;
  luggage_capacity: number;
  price_per_day: number;
  location: string;
  city_id: string | null;
  latitude: number | null;
  longitude: number | null;
  features: string[];
  images: string[];
  main_image_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  featured: boolean;
  mileage_limit: number | null;
  extra_mileage_rate: number | null;
  insurance_included: boolean;
  min_driver_age: number;
  license_requirements: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  profiles?: Profile;
  cities?: { id: string; name: string; country: string };
  average_rating?: number;
  review_count?: number;
}

export interface Booking {
  id: string;
  user_id: string;
  accommodation_id: string | null;
  vehicle_id: string | null;
  room_id: string | null;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  base_price: number;
  fees: number | null;
  cleaning_fee: number | null;
  taxes: number | null;
  discount_amount: number | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'approved' | 'rejected' | 'pending_cancellation' | 'cancellation_rejected' | 'pending_modification';
  stripe_payment_intent_id: string | null;
  cancellation_reason: string | null;
  special_requests: string | null;
  host_id: string | null;
  payment_type: 'online' | 'offline';
  confirmation_number: string | null;
  pin: string | null;
  pickup_location: string | null;
  selected_extras: string[] | null;
  created_at: string;
  updated_at: string;
  // Joined data
  accommodations?: Accommodation;
  vehicles?: Vehicle;
  profiles?: Profile;
  accommodation_rooms?: AccommodationRoom;
}

export interface VehicleBooking {
  id: string;
  user_id: string;
  vehicle_id: string;
  pickup_date: string;
  return_date: string;
  pickup_location: string;
  return_location: string;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: string;
  driver_name: string | null;
  driver_license: string | null;
  created_at: string;
  // Joined data
  vehicles?: Vehicle;
}

export interface Conversation {
  id: string;
  user_id: string;
  host_id: string;
  accommodation_id: string | null;
  vehicle_id: string | null;
  booking_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
  user_unread_count: number;
  host_unread_count: number;
  created_at: string;
  // Joined data
  user_profile?: Profile;
  host_profile?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  message_type: 'text' | 'system' | 'booking_request';
  attachments: string[];
  created_at: string;
  // Joined data
  sender?: Profile;
}

export interface Wishlist {
  id: string;
  user_id: string;
  accommodation_id: string | null;
  vehicle_id: string | null;
  created_at: string;
  // Joined data
  accommodations?: Accommodation;
  vehicles?: Vehicle;
}

export interface AdminFee {
  id: string;
  name: string;
  fee_type: 'percentage' | 'fixed';
  amount: number;
  applies_to: 'accommodation' | 'vehicle' | 'both';
  calculation_type: 'booking' | 'listing';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityCalendar {
  id: string;
  accommodation_id: string | null;
  vehicle_id: string | null;
  room_id: string | null;
  date: string;
  is_available: boolean;
  price_override: number | null;
  minimum_stay: number | null;
  maximum_stay: number | null;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  accommodation_id: string;
  room_number: string;
  room_name: string;
  room_type: string;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  size_sqm: number | null;
  amenities: string[];
  images: string[];
  is_active: boolean;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}
