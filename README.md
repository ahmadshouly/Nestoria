# Nestoria Travel - Mobile App

Nestoria is a premium travel platform similar to Airbnb where users can book accommodations and rental cars. This is the mobile app for iOS and Android.

## ✅ Recent Updates

**Client Support Ticket System (Latest)**:
- **Get Help Screen**: Complete support ticket management accessible from profile
  - View all support tickets with filters (All, Open, Resolved, Closed)
  - Real-time ticket updates via Supabase subscriptions
  - Status badges (Open, In Progress, Resolved, Closed) with color coding
  - Unread message counter on tickets
  - Create new tickets with detailed information
- **Create Ticket Screen**: Full ticket creation form
  - Subject and detailed description fields
  - Category selection (General, Booking, Payment, Technical, Account, Other)
  - Priority levels (Low, Medium, High)
  - Optional booking reference linking
  - Booking dropdown populated from user's bookings
- **Ticket Detail & Messaging**: Real-time chat with support team
  - View complete ticket information (subject, category, priority, status)
  - Real-time messaging with automatic scroll to bottom
  - Admin messages clearly identified with "Support Team" label
  - File attachment support (PDF, DOC, DOCX, TXT, JPG, PNG, GIF - max 10MB)
  - Document picker with validation
  - File upload to Supabase Storage (`ticket-files` bucket)
  - View/download attachments inline
  - Auto-mark messages as read when viewing ticket
  - Keyboard-aware interface with proper padding
- **Real-Time Updates**:
  - Supabase real-time subscriptions for new messages
  - Ticket list updates automatically when status changes
  - Message list updates when admin replies
  - Unread count updates in real-time
- **Database Integration**:
  - `client_support_tickets` table stores all tickets
  - `client_ticket_messages` table for conversation history
  - Profile ID linking (not auth user ID directly)
  - Database triggers notify admins when tickets created
  - Database triggers notify users when admin replies
- **Files Updated**:
  - `/src/lib/api/support.ts` - Complete API hooks for support system
  - `/src/app/profile/get-help.tsx` - Main support tickets list screen
  - `/src/app/profile/create-ticket.tsx` - Ticket creation form
  - `/src/app/profile/ticket/[id].tsx` - Ticket detail and messaging screen
  - `/src/app/(tabs)/profile.tsx` - Added navigation to support system
  - `/src/lib/i18n.ts` - Added support translations (EN/AR)
- **User Experience**:
  - Access via Profile → Get Help
  - Filter tickets by status
  - Pull to refresh ticket list
  - Smooth message bubbles (admin in gray, user in emerald)
  - File preview before sending
  - Disabled messaging when ticket is closed
  - 24-hour response time message
  - Success alerts when ticket created

**Password Visibility Toggles & Sign-In Prompts**:
- **Password Visibility**: Added eye icons to show/hide passwords on sign-in and sign-up screens
  - Eye icon (show password) / EyeOff icon (hide password)
  - Positioned absolutely on the right side of password inputs
  - Includes hit slop for better touch targets
  - Applied to both password and confirm password fields
- **Sign-In Requirement for Bookings**: Non-logged-in users now get prompted to sign in when trying to make booking requests
  - Alert dialog shown when users tap "Reserve" button without authentication
  - Message: "Please sign in to make a booking request. You can create an account or sign in to continue."
  - Two options: Cancel or Sign In (navigates to /auth/sign-in)
  - Applied to both accommodation and vehicle detail pages
  - Improves user experience by guiding users to authenticate before booking
- **Files Updated**:
  - `/src/app/auth/sign-in.tsx` - Added password visibility toggle
  - `/src/app/auth/sign-up.tsx` - Added password and confirm password visibility toggles
  - `/src/app/accommodation/[id].tsx` - Added authentication check for Reserve button
  - `/src/app/vehicle/[id].tsx` - Added authentication check for Reserve button

**Two-Factor Authentication (2FA) - Complete Implementation**:
- **SMS 2FA**: Users can enable SMS-based 2FA with phone verification
  - Automatic SMS code sending on login
  - Phone number verification required before enabling
  - Clean verification code input UI
- **Authenticator App (TOTP)**: Users can enable authenticator app 2FA
  - QR code generation for easy setup
  - Support for Google Authenticator, Authy, etc.
  - 6-digit code verification with paste support
  - Backup codes generated on setup
- **Smart Login Flow**: Detects which 2FA method is active and requires appropriate verification
  - Checks `two_factor_method` field ('sms' or 'app') in database
  - Routes to correct verification screen based on method
  - Session persistence after successful 2FA verification
- **Trust Device**: Optional 30-day bypass for trusted devices
- **Security Settings**: Complete UI for managing 2FA methods and trusted devices
- **Files Updated**:
  - `/src/lib/api/auth.ts` - SMS sending, 2FA verification, session management
  - `/src/lib/api/profile.ts` - 2FA setup, method switching, phone verification
  - `/src/app/auth/verify-2fa.tsx` - Clean 2FA verification UI
  - `/src/app/profile/security.tsx` - Security settings with authenticator app setup
  - `/src/app/_layout.tsx` - Proper route configuration

**RTL Layout Fix for Arabic (Latest)**:
- **Fixed Arabic Layout Issues**: Arabic language now properly displays without component misalignment
  - **Problem**: When switching to Arabic, React Native's automatic RTL mode was flipping card layouts incorrectly
  - **Solution**: Added `direction: 'ltr'` to card containers to maintain consistent visual layout
  - **Text Alignment**: Arabic text properly aligned right while keeping card structure left-to-right
  - **Affected Components**:
    - Trip booking cards (image stays on left, content on right)
    - Wishlist cards (discount badge stays top-left, heart icon top-right)
    - Listing cards (consistent badge positioning)
    - Filter tabs (horizontal scroll order maintained)
- **Files Updated**:
  - `/src/app/(tabs)/trips.tsx` - Fixed booking card layout, status badges, action buttons, and filter tabs
  - `/src/app/(tabs)/wishlist.tsx` - Fixed wishlist card layout and price display
  - `/src/components/ListingCard.tsx` - Fixed listing card layout
- **Technical Implementation**:
  - Added `style={{ direction: 'ltr' }}` to main card containers
  - Kept `textAlign: isRTL ? 'right' : 'left'` for proper Arabic text alignment
  - Removed conditional `flex-row-reverse` classes that were causing layout flips
  - Maintained consistent spacing with standard `ml-*` and `mr-*` classes
- **User Experience**: App now looks professional in both English (LTR) and Arabic (RTL) with proper text flow

**Payment Message Distinction**:
- **Fixed Payment Messages on Booking Modal vs Details**: Booking modal now shows different message than booking details screen
  - **Booking Modal** (before host approval): "You will be able to complete payment after the host approves your booking request."
  - **Booking Details** (after host approval): "Your booking is accepted by the host, please complete the payment to get your booking confirmed."
  - Previously both screens showed the same message which was confusing
- **Translation Keys Added**:
  - `booking.onlinePaymentInfoModal` - New key for booking modal context
  - `booking.onlinePaymentInfo` - Existing key now only used on booking details screen
  - Both English and Arabic translations added
- **Files Updated**:
  - `/src/lib/i18n.ts` - Added new translation key
  - `/src/components/AccommodationBookingModal.tsx` - Uses `onlinePaymentInfoModal` key
  - `/src/components/VehicleBookingModal.tsx` - Uses `onlinePaymentInfoModal` key
  - `/src/app/booking/[id].tsx` - Continues to use `onlinePaymentInfo` key (for approved bookings)
- **User Experience**: Clear distinction between "payment required after approval" vs "payment required now"

**Booking Fee Labels Fix (Latest)**:
- **Fixed Fee Display in Booking Details**: Booking detail screen now correctly displays fees with proper labels
  - **Separate Fee Columns**: `cleaning_fee` and `fees` (service fee) now stored separately in database
  - **Correct Labels**: Cleaning fees shown as "Cleaning Fee", service fees shown as "Service Fee"
  - **Consistency**: Fee labels in booking details now match the labels shown in booking modal
  - **Zero-Value Handling**: Only shows fees greater than zero to avoid clutter
- **Technical Changes**:
  - Updated `Booking` TypeScript interface to include `cleaning_fee` field
  - Modified `useUserBookings` query to fetch `cleaning_fee` separately
  - Updated booking creation to store `cleaning_fee` and `fees` (service fee) separately
  - Changed `/src/app/booking/[id].tsx` to display fees with correct labels
  - Updated `/src/lib/supabase.ts` - Added `cleaning_fee` to Booking interface
  - Updated `/src/lib/api/bookings.ts` - Stores fees separately, fetches cleaning_fee
- **User Experience**: Users now see the exact same fee breakdown on trips screen as they saw during booking

**Supplier Role Restriction (Latest)**:
- **Mobile App Supplier Block**: Suppliers are now prevented from using the mobile app and directed to web
  - Role check on app launch: Suppliers redirected to dedicated screen
  - Role check on sign-in: After login, suppliers redirected to info screen
  - **Supplier Redirect Screen**: Shows message directing suppliers to use web Host panel
  - Automatic logout when suppliers try to go back
  - Clean separation between client mobile app and supplier web dashboard
- **Technical Implementation**:
  - `/src/app/supplier-redirect.tsx` - Dedicated screen for supplier users
  - `/src/app/index.tsx` - Role check on app launch
  - `/src/app/auth/sign-in.tsx` - Role check after successful sign-in
  - Profile role fetched from `profiles.role` field in database
  - Logout functionality with navigation to sign-in screen
- **User Flow**:
  1. Supplier attempts to sign in on mobile app
  2. System detects `role: 'supplier'` in profile
  3. Redirects to supplier-redirect screen with info message
  4. Supplier can logout or is automatically logged out if they try to go back
  5. Message directs them to use nestoria-travel.com for Host panel

**Share Button with Deep Links (Latest)**:
- **Share Functionality**: Users can now share accommodations and vehicles with others
  - Share button in header of accommodation and vehicle detail screens
  - Creates shareable link with base URL: `https://nestoria-travel.com`
  - Accommodation links: `https://nestoria-travel.com/accommodation/{id}`
  - Vehicle links: `https://nestoria-travel.com/vehicle/{id}`
  - Uses React Native's Share API for native sharing
  - **Engaging Share Message**:
    - Accommodations: "I found this amazing place on Nestoria! 🏡✨"
    - Vehicles: "I found this amazing ride on Nestoria! 🚗✨"
  - Share includes property/vehicle title and link
  - Works on iOS and Android with native share sheets
- **Photo Gallery Feature**: Interactive photo browser for listing images
  - Tap on main image to open full-screen photo gallery
  - **Photo count badge** displayed on main image (e.g., "5 Photos")
  - Swipe or use arrow buttons to navigate between images
  - Thumbnail strip at bottom for quick navigation
  - Full-screen immersive viewing experience with dark background
  - Close button and image counter (e.g., "3 / 8")
  - Current image highlighted in thumbnail strip with emerald border
  - **Android back button support** - Hardware back button closes gallery
  - Available for both accommodations and vehicles
- **Dynamic Pricing on Map Search**: Map markers now show dynamic pricing
  - **Red markers** for listings with active discounts
  - **Green markers** for regular pricing
  - Displays calculated price with all applicable rules
  - Shows "From $XX" for hotels with multiple rooms
  - Hover over marker to see listing details
  - All pricing rules applied (seasonal, weekend, discounts)
- **Technical Implementation**:
  - `/src/app/accommodation/[id].tsx` - Added `handleShare` function, Share import, gallery integration
  - `/src/app/vehicle/[id].tsx` - Added `handleShare` function, Share import, gallery integration
  - `/src/components/PhotoGallery.tsx` - New full-screen photo gallery modal component
    - Added `presentationStyle="fullScreen"` for proper modal display
    - Added `edges={['top', 'bottom']}` to SafeAreaView for proper safe area handling
    - `onRequestClose` handler for Android back button support
  - `/src/components/SearchResultsMap.tsx` - Dynamic pricing integration
    - Imports `getListingDisplayPrice` from pricing API
    - Calculates display price for each marker
    - Red background for discounted listings, green for regular
    - Pricing rules and room data passed from search results
  - `/src/lib/api/accommodations.ts` - Enhanced to fetch pricing data
    - Fetches `supplier_pricing_rules` for each accommodation
    - Fetches lowest room price for hotels/resorts
    - Returns `pricing_rules`, `lowest_room_price`, `has_rooms` fields
  - `/src/lib/api/vehicles.ts` - Enhanced to fetch pricing data
    - Fetches `supplier_pricing_rules` for each vehicle
    - Returns `pricing_rules` field
  - Share button connected with `onPress={handleShare}` handler
  - Gallery triggered by tapping on main image
  - Photo count badge shows when multiple images available
  - Error handling for share failures
- **User Experience**:
  - **Share**: Tap share icon in header → Native share sheet with message and link
  - **Gallery**: Tap main image → Full-screen gallery opens
  - Navigate photos with left/right arrows or thumbnail strip
  - Photo counter shows current position (e.g., "2 / 5")
  - Press Android back button or X to close gallery
  - Thumbnails auto-scroll to keep current image visible
  - **Map Search**: See dynamic prices on map markers
  - Red markers indicate discounted listings
  - Tap marker to view full listing details
  - Can share via Messages, WhatsApp, Email, Copy Link, etc.
  - Recipient can open link in web browser to view listing

**Real-Time Data & Instant Notifications**:
- **Immediate Data Fetching**: All screens fetch data immediately on mount with no delays
  - React Query configured with `staleTime: 0` - data always considered stale, fetches immediately
  - `refetchOnMount: 'always'` - always refetch when component mounts
  - `refetchOnWindowFocus: true` - refetch when app comes to foreground
  - `refetchOnReconnect: true` - refetch when internet reconnects
  - No manual refresh needed - data updates automatically
- **Real-Time Subscriptions**:
  - **Bookings**: Supabase real-time subscriptions listen for booking changes
    - Detects INSERT, UPDATE, DELETE events on bookings table
    - Filters by user_id for security
    - Automatically refetches booking list when changes occur
    - Instant status updates (pending → approved → confirmed → cancelled)
    - **Trips Screen**: Auto-refetches when tab comes into focus using `useFocusEffect`
    - Status changes appear immediately without manual refresh
    - Works across all booking statuses and filters (upcoming, current, past, cancelled)
  - **Notifications**: Real-time notification delivery
    - New notifications appear instantly without refresh
    - Unread count badge updates immediately
    - Both notification list and count have separate subscriptions
    - Automatically invalidates cache on any notification change
- **Performance**:
  - Exponential backoff retry strategy for failed requests
  - 5-minute cache time for unused data
  - Automatic cleanup of subscriptions on unmount
  - Separate channels for different data types (bookings, notifications, unread count)
- **Technical Implementation**:
  - `/src/app/_layout.tsx`: Global React Query configuration
  - `/src/lib/api/bookings.ts`: Real-time booking subscriptions with useEffect
  - `/src/app/(tabs)/trips.tsx`: Added useFocusEffect for refetch on focus
  - `/src/lib/api/notifications.ts`: Real-time notification subscriptions
  - Supabase Postgres Changes API for real-time updates
  - Query invalidation triggers immediate refetch

**Online Booking Payment System**:
- **Fully In-App Payment Flow**: Complete payment experience without leaving the app
  - **Pay Now Button**: Displays prominently on booking detail screen for approved online payment bookings
  - **Payment Info Message**: "Your booking is accepted by the host, please complete the payment to get your booking confirmed"
  - **EnhancedPaymentModal**: Payment interface with multiple options
    - Shows amount to pay prominently at the top
    - Displays all saved payment methods
    - "Add New Card" option for first-time users or new cards
  - **Payment Options**:
    - **Saved Cards**: Instant in-app checkout with stored payment methods
      - Shows card brand and last 4 digits
      - Displays expiration date
      - "Default" badge for default card
      - Auto-selects default payment method
      - One-tap payment - no browser redirect needed
    - **New Card Entry**: In-app WebView with Stripe.js
      - **WebViewPaymentModal**: Embedded Stripe payment form
      - Uses Stripe Payment Element for secure card entry
      - All payment happens inside the app (no external browser)
      - PCI-compliant card input via Stripe.js
      - Real-time card validation
      - Card automatically saved for future use
      - Beautiful, responsive design matching native UI
    - Helpful "No saved cards found" message when no cards exist
  - **Payment Processing**:
    - **Saved cards**: Instant payment via Stripe PaymentIntent API (seamless, stays in app)
    - **New cards**: WebView modal with Stripe Payment Element
      - Creates payment intent with client secret
      - Stripe.js handles card tokenization and payment confirmation
      - All processing happens in-app via WebView
      - No redirect to external browser
      - Booking status updates automatically to `confirmed`
    - Real-time booking updates via Supabase subscriptions
    - Payment confirmation notifications sent instantly
  - **User Experience**:
    - Smooth modal transitions with slide animation
    - Loading indicators during payment processing
    - Visual card selection with checkmarks and green highlight
    - Security lock icon with "Your payment information is secure and encrypted" message
    - Success/error alerts with clear, translated messaging
    - Disabled pay button when no payment method selected
    - Modal closes automatically on successful payment
    - WebView payment form matches app design with consistent styling
  - **Real-time Updates**: Booking status and notifications update instantly after payment
- **Technical Implementation**:
  - `/src/components/EnhancedPaymentModal.tsx`: Payment modal with saved cards list
  - `/src/components/WebViewPaymentModal.tsx`: WebView-based card entry with Stripe.js
  - `/src/app/booking/[id].tsx`: Booking detail screen with Pay Now button
  - Uses `react-native-webview` for embedded Stripe form
  - Stripe Payment Element for secure card entry
  - Payment intent creation via `create-payment-intent` Edge Function
  - WebView communication via `postMessage` for payment status
  - Works perfectly in Expo Go (no native modules required)
- **Security**:
  - PCI-compliant card handling via Stripe.js
  - Card details never touch your servers
  - Stripe handles all tokenization and storage
  - Payment methods filtered by user ID
  - Only active payment methods shown
  - RLS policies protect payment data
  - WebView isolates payment form for additional security

**Profile Picture Upload System**:
- **Complete Avatar Upload & Change**: Users can upload and change their profile pictures
  - Tap on avatar in Edit Profile screen to select a new photo
  - Image picker with cropping (1:1 aspect ratio) and quality optimization (80%)
  - **Instant Upload with Visual Feedback**: Profile picture uploads immediately after selection
    - Shows uploading spinner overlay while uploading
    - Shows green checkmark overlay when successfully uploaded
    - Success message auto-hides after 3 seconds
    - Text changes: "Tap to change photo" → "Uploading photo..." → "Photo uploaded successfully!"
    - Upload happens before saving profile (no need to wait for Save button)
  - Uploads to Supabase Storage in `avatars` bucket
  - File path: `{user_id}/avatar.{extension}`
  - Uses `upsert: true` to automatically replace old avatars
  - Public URL stored in `profiles.avatar_url` field
  - Real-time UI updates after successful upload
  - Error handling: reverts to previous avatar if upload fails
  - **Auto-refresh on Profile Tab**: Profile tab refetches data when you navigate back, ensuring avatar changes are visible immediately
- **Security Features**:
  - RLS policies ensure users can only upload to their own folder
  - Folder name must match `auth.uid()` for security
  - Public bucket for viewing (avatars visible to all users)
  - Upload/Update/Delete restricted to owner
- **User Experience**:
  - Camera icon overlay shows upload is available
  - Fallback to User icon when no avatar is set
  - Loading state during upload with disabled picker
  - Success/error alerts with translations
  - Immediate visual feedback on upload state
  - Image cache-busting with timestamp query parameters
- **Technical Implementation**:
  - `useUploadAvatar()` hook in `/src/lib/api/profile.ts`
  - Expo ImagePicker for native image selection
  - **ArrayBuffer Upload**: Uses `ArrayBuffer` instead of `Blob` for reliable React Native uploads
  - Fetch API to convert local URI to ArrayBuffer
  - Supabase Storage for file management
  - File validation: checks response status and buffer size before upload
  - Automatic cache invalidation after upload
  - Upload triggered in `handlePickImage()` immediately after selection
  - `useFocusEffect` hook in profile tab to refetch on navigation
  - Image key prop forces re-render on URL changes
  - Clean URLs stored in database (no query params)
- **File Management**:
  - Supported formats: JPG, PNG, WEBP, etc.
  - Consistent naming: `avatar.{extension}`
  - Automatic overwrite prevents storage bloat
  - Public URLs generated automatically
- **Translation Keys**: Added `uploadingPhoto` and `photoUploaded` (EN/AR)

**Phone Number Change Detection**:
- **Automatic Unverification on Phone Change**: Phone verification status is now automatically cleared when user changes their phone number
  - Detects phone number changes in edit profile screen
  - Automatically sets `phone_verified: false` and clears `phone_verified_at` timestamp
  - **Country Code Selector**: Added searchable country code picker with 25+ countries
    - Same elegant modal interface as phone verification screen
    - Search functionality to quickly find countries
    - Flag and code display for easy identification
    - Saves country code along with phone number
  - Detects changes to both phone number AND country code
  - Prevents users from changing phone without re-verification
  - Maintains data integrity and security
  - User prompted to verify new phone number after saving changes
- **Updated Components**:
  - `/src/app/profile/edit.tsx` - Added phone change detection logic and country code selector
  - `/src/lib/api/auth.ts` - Extended `useUpdateProfile` to support verification fields
- **User Flow**:
  1. User navigates to Edit Profile
  2. User taps country code selector to choose country
  3. User enters/changes phone number
  4. User saves changes
  5. System detects phone number or country code change
  6. System automatically unverifies phone (`phone_verified: false`)
  7. User sees unverified badge and is prompted to verify new number
  8. User can go to Verify Phone screen to verify new number

**OTP Input Improvements**:
- **Fixed Paste Support for 6-Digit Verification Codes**: All OTP inputs now support pasting full codes
  - When pasting a 6-digit code, it automatically fills all input fields
  - Works on sign-up email verification, 2FA SMS verification, and phone verification
  - Smart paste handling: extracts only digits, fills from current position
  - Auto-focuses the last filled input after pasting
- **Fixed LTR Display for Arabic**: Number inputs now display left-to-right even when app is in Arabic
  - Applied `direction: 'ltr'` to all OTP input containers
  - Ensures numbers display correctly regardless of app language
  - Applies to: signup OTP, 2FA codes, phone verification codes
- **Increased maxLength for Better UX**: Changed OTP inputs from `maxLength={1}` to `maxLength={6}` to support paste
- **Files Updated**:
  - `/src/app/auth/verify-2fa.tsx` - 2FA verification screen
  - `/src/app/auth/sign-up.tsx` - Email verification during signup
  - `/src/app/profile/verify-phone.tsx` - Phone number verification

**OTP-Based Signup Implementation**:
- **Implemented Secure OTP Email Verification**: Mobile app now follows the secure server-side session token signup flow
  - **Step 1**: Create signup session via `create-signup-session` Edge Function
  - **Step 2**: Send 6-digit OTP to email via `send-email` Edge Function
  - **Step 3**: User verifies OTP + re-enters password (password never stored client-side)
  - **Step 4**: Account created via `verify-email-otp` Edge Function + auto-login
  - Session token stored temporarily (not password) for security
  - Real-time password strength indicator with check/x icons
  - Two-step UI: signup details → email verification
  - Resend OTP functionality
  - Automatic 2FA flow support after account creation
- **Security Features**:
  - Password never stored in browser/app storage
  - 64-character secure session token (30-min expiry)
  - 6-digit OTP with 15-minute expiry
  - Password re-entry required during verification
  - Client-only registration on mobile (suppliers must use web)
- **New API Hooks**: `useCreateSignupSession()`, `useSendOTPEmail()`, `useVerifyEmailOTP()` in `src/lib/api/auth.ts`
- **Translation Keys Added**: All auth OTP verification keys (EN/AR)
- **User Flow**: Fill form → Submit → Check email → Enter OTP + re-enter password → Account created → Auto-login → Home

**Client-Only Sign Up Fix**:
- **Removed Supplier Registration from Mobile**: Mobile app now only allows client registration
  - Removed role selector (user/supplier) from sign-up screen
  - All mobile registrations are automatically set to 'user' role
  - Added informational banner: "Want to list your property? Supplier registration is available on our website."
  - Simplified sign-up flow with cleaner UI
- **Translation Keys Added**: `signUp.supplierWebOnly` (EN/AR)
- **Reason**: Suppliers require extensive verification documents and business information that should be handled through the web dashboard, not mobile

**SMS 2FA Network Error Fix**:
- **Fixed Network Request Failed Error**: Resolved Edge Function dependency issues for 2FA verification
  - Updated `useVerify2FA()` in `src/lib/api/auth.ts` to work without relying on `verify-login-2fa` Edge Function
  - Added `useSend2FACode()` mutation to send SMS codes during login
  - SMS verification now uses existing `send-verification-sms` function directly
  - Automatic SMS code sending when reaching 2FA verification screen
  - Added "Resend Code" button for SMS method
  - Proper error handling and user feedback throughout the flow
- **Translation Keys Added**: `2fa.resendCode` (EN/AR), `2fa.codeSent` (EN/AR)
- **User Flow**:
  1. User logs in with email/password
  2. If SMS 2FA enabled, system automatically sends SMS code
  3. User enters 6-digit code on verification screen
  4. Can resend code if needed
  5. Successfully logs in after verification

**SMS 2FA Login Fix**:
- **Created 2FA Verification Screen**: Fixed "not found" error when logging in with 2FA enabled
  - Created `src/app/auth/verify-2fa.tsx` - Full 2FA verification screen for login
  - Supports both SMS and Authenticator App 2FA methods
  - 6-digit code input with auto-focus between fields
  - "Trust this device for 30 days" option
  - Real-time error handling and code validation
  - Responsive design matching app aesthetics
- **Translation Keys Added**: All 2FA verification keys (EN/AR) including `2fa.title`, `2fa.verifyIdentity`, `2fa.smsDescription`, `2fa.appDescription`, `2fa.trustDevice`, `2fa.smsHelp`, `2fa.appHelp`, `2fa.backToSignIn`
- **User Flow**: When logging in with 2FA enabled, user is redirected to `/auth/verify-2fa` to enter verification code, then redirected to home on success

**SMS 2FA Activation Fix**:
- **Fixed SMS 2FA Activation**: SMS two-factor authentication can now be properly enabled after phone verification
  - Added `useEnableSMS2FA()` mutation to `src/lib/api/profile.ts` to activate SMS 2FA
  - Updated `src/app/profile/security.tsx` to properly enable SMS 2FA when phone is verified
  - SMS 2FA now sets `two_factor_enabled: true` and `two_factor_method: 'sms'` in the profile
  - Added success/error messages with translations (`security.sms2FAEnabled`, `security.sms2FAError`)
  - Phone verification is required before SMS 2FA can be enabled
- **User Flow**:
  1. User verifies phone number in `/profile/verify-phone`
  2. User goes to Security settings and taps "SMS Authentication"
  3. System checks if phone is verified, then enables SMS 2FA
  4. Success message confirms activation
- **Translation Keys Added**: `security.sms2FAEnabled` (EN/AR), `security.sms2FAError` (EN/AR)

**RTL Layout Fix**:
- **Removed RTL Layout Changes**: All components now use LTR (left-to-right) layout structure for both English and Arabic
  - Removed `flex-row-reverse` conditionals from all components
  - Removed conditional margin/padding switches (mr vs ml)
  - Components maintain natural LTR flow regardless of language
- **Kept Text RTL**: Text alignment still respects RTL for Arabic using `textAlign: isRTL ? 'right' : 'left'`
- **Updated Components**:
  - `src/components/AnnouncementBanner.tsx` - Fixed layout structure
  - `src/app/notifications.tsx` - Fixed notification cards and header
  - `src/app/notification-settings.tsx` - Fixed settings categories and header
- **Benefit**: Prevents component misalignment issues while maintaining proper text direction for Arabic

**Announcements Banner System**:
- **AnnouncementBanner Component** (`src/components/AnnouncementBanner.tsx`): Display admin announcements on homepage
  - **Type-based Styling**: info (blue), warning (yellow), success (green), error (red)
  - **Priority Badges**: Urgent (red), High (orange), Normal (blue), Low (gray)
  - **Custom Icons**: bell, info, alert-triangle, check-circle, x-circle, megaphone, star, heart
  - **Dismissible**: Tap X to dismiss, persisted in AsyncStorage
  - **Date Display**: Shows posted date and expiration date
  - **Animated**: Smooth fade in/out with react-native-reanimated
  - **Custom Colors**: Supports admin-defined background, text, and border colors
- **Announcement API** (`src/lib/api/announcements.ts`):
  - `useHomepageAnnouncements()` - Fetch homepage announcements for clients
  - `useDashboardAnnouncements()` - Fetch dashboard announcements by user role
  - `getDismissedAnnouncements()` - Get list of dismissed announcement IDs
  - `dismissAnnouncement()` - Dismiss an announcement (saved to AsyncStorage)
  - `getAnnouncementColors()` - Get colors based on type or custom values
  - `getPriorityBadgeStyle()` - Get priority badge styling
- **Target Audience**: Announcements filtered by `clients`, `suppliers`, or `all`
- **Scheduling**: Announcements respect `starts_at` and `expires_at` timestamps
- **Homepage Integration**: Banner displayed at top of home screen content
- **Translations**: Added announcement keys (EN + AR)

**Notification System**:
- **Notifications Screen** (`/notifications`): Complete notification center with real-time updates
  - **Filter Tabs**: All, Unread (with count), Read
  - **Notification Types**: 30+ types including booking, message, review, payment, promo, security, system
  - **Type-based Icons**: Color-coded icons based on notification type (success=green, error=red, warning=amber, info=blue)
  - **Type-based Background**: Colored backgrounds for unread notifications based on type
  - **Mark as Read**: Tap notification to mark as read and navigate to relevant content
  - **Mark All as Read**: Button to mark all notifications as read at once
  - **Delete Notifications**: Long press to delete individual notifications
  - **Real-time Updates**: Supabase subscription for instant notification delivery
  - **Pull to Refresh**: Swipe down to refresh notification list
  - **Empty State**: Friendly message when no notifications
- **Notification Bell** (Home Screen Header): Notification icon with unread badge
  - **Badge Counter**: Shows unread count (up to 99+)
  - **Quick Access**: Tap to navigate to notifications screen
  - **Real-time Badge**: Updates automatically when new notifications arrive
- **Notification Settings** (`/notification-settings`): Manage notification preferences
  - **Category-based Settings**: Bookings, Messages, Reviews, Promotions
  - **Channel Toggles**: Enable/disable Push and Email per category
  - **Info Banner**: Explains notification settings functionality
  - **Persisted Preferences**: Settings saved to database
- **Notification API** (`src/lib/api/notifications.ts`):
  - `useNotifications()` - Fetch user's notifications
  - `useUnreadNotificationCount()` - Get unread count for badge
  - `useMarkNotificationAsRead()` - Mark single notification as read
  - `useMarkAllNotificationsAsRead()` - Mark all notifications as read
  - `useDeleteNotification()` - Delete a notification
  - `useNotificationPreferences()` - Fetch notification preferences
  - `useUpdateNotificationPreference()` - Update preference setting
  - `useNotificationSubscription()` - Real-time subscription hook
  - `getNotificationStyle()` - Get icon/color styling for notification type
- **NotificationService** (`src/lib/api/notificationService.ts`): Service for sending notifications
  - `sendNotification()` - Send single notification
  - `sendBulkNotifications()` - Send to multiple users
  - `sendBookingConfirmation()` - Booking confirmed notification
  - `sendBookingCancellation()` - Booking cancelled notification
  - `sendReviewRequest()` - Request review after checkout
  - `sendMessageReceived()` - New message notification
  - `sendPaymentReceived()` - Payment success notification
  - `sendWelcome()` - Welcome new users
  - ...and many more helper methods
- **Smart Navigation**: Tap notification to navigate to relevant screen (booking, chat, property, etc.)
- **Translations**: Added 30+ notification translation keys (EN + AR)

**Bug Fixes and Improvements**:
- **Fixed Hardcoded Ratings**: Home screen now calculates actual average ratings from `property_reviews` table instead of showing hardcoded 4.5
- **Arabic Featured Sections**: Featured section titles now display in Arabic (`title_ar`) when Arabic language is selected
- **Added Missing Translation**: Added `common.continue` translation key (EN: "Continue", AR: "متابعة")
- **Translation Display Fix**: Fixed `TranslatableContent` component layout to show translate button above content instead of beside it

**Bookings Screen Improvements**:
- **Enhanced Trips Screen** (`/trips.tsx`): Complete booking management with status-based actions
  - **All Status Badges**: Pending, Approved, Confirmed, Completed, Cancelled, Pending Cancellation, Cancellation Rejected
  - **Status-based Action Buttons**: View Details, Pay Now, Cancel, Write Review based on booking status
  - **Pay on Arrival Badge**: Blue badge for offline payment bookings
  - **Filter Tabs**: All, Upcoming, Current, Past, Cancelled
- **Write Review Modal** (`src/components/WriteReviewModal.tsx`): Multi-step review submission
  - **Step 1**: Rate Property/Vehicle with star ratings
  - **Step 2**: Rate Host with star ratings
  - **Step 3**: Rate Platform (Nestoria) with star ratings
  - **Question Templates**: Fetches questions from `review_question_templates` table
  - **Comments Section**: Optional additional comments for each review type
  - **Duplicate Prevention**: Checks for existing reviews before allowing submission
  - **Progress Indicator**: Visual step indicator at top
- **Cancellation Request Modal** (`src/components/CancellationRequestModal.tsx`): Request booking cancellation
  - **Predefined Reasons**: Personal emergency, Travel restrictions, Health concerns, Work commitments, Family reasons, Weather conditions, Change of plans, Other
  - **Custom Reason**: Text input when "Other" is selected
  - **Confirmation Step**: Review reason before submitting
  - **Status Update**: Changes booking status to 'pending_cancellation'
- **Review API Hooks** (`src/lib/api/reviews.ts`):
  - `useReviewQuestions()` - Fetch active review question templates
  - `useExistingReview()` - Check if user already reviewed a booking
  - `useSubmitReview()` - Submit reviews to property_reviews, host_reviews, platform_reviews tables
  - `useSubmitCancellation()` - Submit cancellation request
  - `useCancellationRequest()` - Fetch cancellation request status
  - `CANCELLATION_REASONS` - Array of predefined cancellation reasons
- **Translations**: Added 50+ new keys for reviews and cancellation (EN + AR)

**AI Translation System**:
- **Chat Auto-Translation** (`/chat/[id].tsx`): Real-time message translation with proper ref handling
  - **Translation Toggle**: Language icon button in chat header enables/disables translation
  - **Language Selection Modal**: Choose from 16 supported languages
  - **Batch Translation**: Translates all existing messages when enabled
  - **Auto-translate Sent Messages**: Newly sent messages immediately show translated version
  - **Auto-translate Received Messages**: Incoming messages automatically translated in real-time using refs to avoid stale closures
  - **Clear on Disable**: When translation is disabled, all messages return to original text
  - **Translation Status Bar**: Shows current translation language with activity indicator
  - **Translation Indicator**: Small "Translated" label on translated message bubbles
  - **Content Moderation**: Messages sent through chat-translate edge function with AI moderation
  - **Blocked Messages**: Alert shown if message contains contact information
  - **Debug Logging**: Console logs show translation status for debugging
- **Property Detail Translation** (`/accommodation/[id].tsx`, `/vehicle/[id].tsx`):
  - **Translatable Descriptions**: Translate property/vehicle descriptions written by hosts
  - **Translatable House Rules**: Translate accommodation house rules and notes
  - **Translatable Cancellation Policy**: Translate cancellation policy descriptions
  - **Translatable Reviews**: Translate user reviews and comments
  - **Show Original Toggle**: View translated content with option to show original
  - **Language Selector**: Choose specific language for translation
  - **Translation Indicator**: Shows which language content was translated to
- **TranslateButton Component** (`src/components/TranslateButton.tsx`):
  - **Quick Translate**: One-tap translate to user's preferred language
  - **Language Selector**: Dropdown to choose different target language
  - **TranslatableContent Wrapper**: Component that wraps content with translation capability
  - **Show Original**: Toggle to see original content after translation
- **Translation API Hooks** (`src/lib/api/translation.ts`):
  - `useUserPreferredLanguage()` - Fetch user's preferred language from profile
  - `useUpdatePreferredLanguage()` - Update user's preferred language
  - `useTranslateContent()` - On-demand content translation
  - `useChatTranslate()` - Send chat message with translation and moderation
  - `useBatchTranslateMessages()` - Translate multiple messages in batches
  - `SUPPORTED_LANGUAGES` - Array of 16 supported languages with codes and native names
  - `getLanguageName()` / `getLanguageNativeName()` - Helper functions
- **Supported Languages**: English, Arabic, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Hindi, Dutch, Swedish, Norwegian, Turkish
- **Supabase Edge Functions Used**:
  - `translate-content` - On-demand translation for content (reviews, descriptions, messages)
  - `chat-translate` - Chat message translation with AI content moderation
- **Translations**: Added 18 new translation keys for translation features (EN + AR)
  - translation.translate, translation.translating, translation.translated
  - translation.translatingTo, translation.showOriginal, translation.selectLanguage
  - translation.autoTranslate, translation.disableTranslation
  - chat.messageBlocked, chat.messageBlockedDesc
  - common.on, common.off

**Chat System with Archive, Delete & Clear**:
- **Inbox Screen** (`/(tabs)/inbox.tsx`): Complete conversation management
  - **Search Bar**: Search conversations by user name, property title, or message content
  - **Active/Archived Tabs**: Toggle between active and archived conversations
  - **Swipe Actions**: Swipe left on conversations to reveal Archive and Delete buttons
  - **Archive Functionality**: Move conversations to archived tab (soft delete per user)
  - **Unarchive Functionality**: Restore archived conversations to active
  - **Delete Confirmation**: Alert dialog before deleting conversations
  - **Empty States**: Different messages for active vs archived tabs
  - **Swipe Hint**: Helpful text showing users they can swipe for options
- **Chat Screen** (`/chat/[id].tsx`): Full conversation actions with search
  - **In-Chat Search**: Search button in header toggles search mode
  - **Search Navigation**: Navigate between search results with up/down buttons
  - **Result Counter**: Shows current result position (e.g., "2/5")
  - **Auto-scroll**: Automatically scrolls to search results
  - **Actions Menu**: Three-dot menu in header for conversation options
  - **Archive Option**: Move conversation to archived with visual feedback
  - **Clear Conversation**: Delete ALL messages (affects both users)
  - **Delete Conversation**: Soft delete for current user only
  - **Long Press to Delete**: Long press on your own messages to delete them
  - **Delete Confirmation**: Alert dialogs for destructive actions
  - **Visual Feedback**: Icons and descriptions for each action
- **New API Hooks** (`src/lib/api/messages.ts`):
  - `useDeleteMessage()` - Delete individual message (sender only)
  - `useClearConversation()` - Clear all messages in conversation
  - `useDeleteConversation()` - Soft delete conversation for current user
  - `useArchiveConversation()` - Archive conversation for current user
  - `useUnarchiveConversation()` - Restore archived conversation
  - Uses `auth.uid()` for RPC calls (correct user ID for database functions)
- **Supabase RPC Functions Used**:
  - `delete_message(_message_id, _user_id)` - Delete single message
  - `clear_conversation(_conversation_id, _user_id)` - Clear all messages
  - `delete_conversation_for_user(_conversation_id, _user_id)` - Soft delete
  - `archive_conversation_for_user(_conversation_id, _user_id)` - Archive
  - `unarchive_conversation_for_user(_conversation_id, _user_id)` - Unarchive
- **Translations**: Added 22+ new translation keys for chat features (EN + AR)
  - inbox.active, inbox.archived, inbox.noArchived, inbox.swipeHint, inbox.searchConversations
  - chat.archive, chat.unarchive, chat.deleteMessage, chat.clearConversation
  - chat.deleteConversation, chat.conversationOptions, chat.longPressToDelete, chat.searchMessages

**Dynamic Pricing System**:
- **Dynamic Pricing Rules**: Complete implementation of `supplier_pricing_rules` table integration
  - Supports `discount`, `seasonal`, and `weekend` rule types
  - `percentage` and `fixed` adjustment types
  - Date range validity (start_date/end_date)
  - Day of week constraints (0=Sunday to 6=Saturday)
  - Min/max nights requirements
  - Priority-based rule application
  - **IMPORTANT**: ALL discount rules now show on listing cards regardless of constraints ✅
- **Homepage Listings** (`/(tabs)/index.tsx`): Display dynamic pricing with discount badges ✅
  - Shows "-X%" badge when discounts are active
  - Strikethrough original price with discounted price in red
  - "From $XX" label for hotel/resort accommodations with rooms
  - Uses lowest room price for hotels instead of base accommodation price
- **Search Results** (`/search.tsx`): Dynamic pricing on search results page ✅
  - Discount badges with percentage savings
  - Strikethrough prices when discounts apply
  - "From" label for hotels with multiple rooms
  - Red highlighted discounted prices
- **Wishlist Screen** (`/(tabs)/wishlist.tsx`): Dynamic pricing on saved listings ✅
  - Discount badges (-X%) when rules apply
  - Strikethrough original prices
  - Red highlighted discounted prices
  - "From" label for hotels with rooms
- **Listing Detail Page** (`/listing/[id]`): Updated bottom booking bar ✅
  - Shows "From" prefix for hotel room prices
  - Discount percentage badge with Percent icon
  - Original and discounted price display
- **Accommodation Detail Page** (`/accommodation/[id]`): Dynamic pricing in bottom bar ✅
  - Discount badges (-X%) when rules apply
  - Strikethrough original prices
  - Red highlighted discounted prices
  - "From" label for hotels with rooms
- **Vehicle Detail Page** (`/vehicle/[id]`): Dynamic pricing in bottom bar ✅
  - Discount badges (-X%) when rules apply
  - Strikethrough original prices
  - Red highlighted discounted prices
- **Booking Modals**: Full dynamic pricing calculation ✅
  - AccommodationBookingModal: Calculates per-night pricing with rules applied
  - VehicleBookingModal: Applies vehicle pricing rules
  - Shows discount breakdown in price details
  - "You save $XX!" message when discounts apply
  - Combines calendar price overrides with pricing rules
  - Submits bookings with dynamic pricing applied
- **Hotel Room Support**: Lowest room price for hotels/resorts
  - Fetches cheapest active room price from `rooms` table
  - Displays "From $XX /night" on all listing cards
- **New API Module**: `src/lib/api/pricing.ts`
  - `useAccommodationPricingRules(id)` - Fetch accommodation pricing rules
  - `useVehiclePricingRules(id)` - Fetch vehicle pricing rules
  - `useRoomPricingRules(roomId, accommodationId)` - Fetch room-specific rules
  - `useLowestRoomPrice(accommodationId)` - Get cheapest room for hotels
  - `getApplicableRules()` - Filter rules by booking context
  - `calculateDynamicPrice()` - Calculate adjusted price with rules
  - `calculateDynamicDateRangePrice()` - Calculate total for date range
  - `getListingDisplayPrice()` - Get display price for listing cards (shows ALL discounts)
- **Translation Keys**: Added English and Arabic translations
  - `common.from` - "From" / "إبتداءً من"
  - `booking.discount` - "Discount" / "خصم"
  - `booking.youSave` - "You save" / "وفرت"
  - Additional booking-related translations

**Trips Screen & Translation Updates**:
- **Trips Screen**: Complete trips/bookings management screen ✅ **FULLY IMPLEMENTED**
  - **CRITICAL**: Uses `profiles.id` lookup (not `auth.uid` directly) ✅ **WEBAPP PARITY**
  - **Date-based Filtering**: Implements webapp's exact filtering logic ✅ **WEBAPP PARITY**
    - **All**: Shows all non-cancelled bookings
    - **Upcoming**: Check-in > today AND not cancelled/completed
    - **Current**: Currently staying (between check-in and check-out)
    - **Past**: Check-out < today OR status=completed
    - **Cancelled**: Only cancelled bookings
  - **Unified Bookings**: Both accommodations AND vehicles from single `bookings` table ✅
  - **Status Colors**: Matches webapp exactly (green, yellow, orange, red, blue, gray)
  - **Status Badges**: All statuses supported (pending, approved, confirmed, cancelled, completed, rejected, etc.)
  - **Booking Cards**: Image, type indicator, status badge, dates, location, nights/days, total price
  - **Clickable Cards**: Navigate to booking detail screen
  - **Empty State**: Call-to-action to explore when no bookings
  - **Full RTL Support**: Arabic language with proper text alignment
  - **Nights Calculation**: Shows X nights/days based on check-in/check-out difference
- **Booking Detail Screen**: Complete booking details page ✅ **FULLY IMPLEMENTED**
  - **Route**: `/booking/[id]` with dynamic ID parameter
  - **Status Badges**: Color-coded status with icons (confirmed, pending, cancelled, etc.)
  - **Payment Type Badges**: "Pay on Arrival" badge for offline payments
  - **Confirmation Details**: Shows confirmation number and security PIN (if confirmed)
  - **Booking Information**: Check-in/out dates, guests, nights calculation
  - **Price Breakdown**: Base price, service fees, taxes, total with proper formatting
  - **Special Requests**: Displays any special requests from guest
  - **Host Contact**: Phone and email links (if booking confirmed)
  - **Payment Info Messages**: Shows onlinePaymentInfo or offlinePaymentInfo based on payment type
  - **Property Details**: Title, location, image, type indicator (accommodation/vehicle)
  - **Back Navigation**: Arrow button to return to trips screen
  - **Error Handling**: Shows friendly message if booking not found
  - **Full RTL Support**: All text and icons adapt to Arabic
- **Translation Labels**: Added all missing booking and trips labels ✅ **COMPLETE**
  - Booking labels: selectCheckout, selectDate, taxes, onlinePaymentInfo, offlinePaymentInfo
  - Trips labels: all, pending, confirmed, completed, current
  - Both English and Arabic translations
  - No duplicate keys

**Booking API Updates** ✅ **CRITICAL FIXES**:
- **FIXED**: `useUserBookings` now correctly uses `profiles.id` instead of `auth.uid`
- **FIXED**: Single `bookings` table for BOTH accommodations AND vehicles (not separate tables)
- **FIXED**: Fetches accommodations and vehicles in parallel for better performance
- **FIXED**: Returns proper joined data with property/vehicle information

**Booking Flow System** - FULLY FUNCTIONAL booking system:
- **CRITICAL FIX**: Uses `profiles.id` instead of `auth.users.id` for bookings ✅ **FIXED**
- **CRITICAL FIX**: Both accommodation AND vehicle bookings now work properly ✅ **FIXED**
- **CRITICAL FIX**: Service fees and taxes ALWAYS displayed (even if 0%) for transparency ✅ **FIXED**
- **CRITICAL FIX**: Calendar timezone issue fixed - dates now correctly match availability calendar ✅ **FIXED**
  - Changed from `toISOString()` (UTC) to local date formatting
  - Fixes 1-day offset issue when marking unavailable dates
  - Example: If property unavailable 01.01.2026-10.01.2026, calendar now shows exact same dates
  - **Real-time availability**: Calendar always fetches fresh data when booking modal opens
  - No caching - ensures users always see the most current unavailable dates
- **Admin Fees Integration**: Fetches service fees and taxes from `admin_fees` table ✅ **WORKING**
  - Service Fee: 0% (configurable in database)
  - Taxes: 0% (configurable in database)
  - Always shows in price breakdown even when 0%
- **Automatic Payment Type**: Determined by supplier's `offline_payment_enabled` setting
- **Fee Calculation**: Proper calculation of fees, taxes, and total price
  - Service Fee: Applied to base price
  - Taxes: Applied to (base + service fee + cleaning fee)
  - All fees included in `total_price` column
- **Debug Logging**: Console logs show admin fees and pricing calculations
- **Interactive Calendar**: Custom calendar UI with month navigation, date range selection
- **Availability Calendar**: Fetches availability from `availability_calendar` database table
- **Hotel Rooms Support**: For hotels/resorts, fetches and displays available rooms from `rooms` table
- **Dynamic Pricing**: Supports `price_override` from availability calendar for date-specific pricing
- **Accommodation Booking Modal**: Calendar picker, guest selector, room selection (hotels)
- **Vehicle Booking Modal**: Calendar picker, pickup locations, fully functional submission
- **Price Breakdown**: Shows ALL fees (base price, cleaning fee, service fee, taxes, insurance) even if $0
- **Full RTL Support**: All booking UI works in Arabic mode
- **Min/Max Stay Validation**: Prevents booking outside allowed stay range

**Host Profile & Messaging System** - Complete host profile viewing and direct messaging:
- **Host Profile Modal**: View detailed host information with stats, badges, and reviews
  - Host stats: Total properties, reviews, average rating, response rate
  - Verification badges: Profile verified, Superhost status
  - Reviews tab: Display all host reviews with reviewer info
  - About tab: Host information and achievements
- **Contact Host Modal**: Send direct messages to property hosts/owners
  - Pre-filled property information context
  - Message validation and tips for guests
  - Automatic conversation creation/retrieval
  - Keyboard dismiss by tapping outside or pressing send
  - Send button always visible (proper KeyboardAvoidingView with ScrollView)
  - Navigation to inbox tab after sending (/(tabs)/inbox)
- **Integrated into Detail Pages**: Both accommodation and vehicle detail screens
- **Full Authentication Flow**: Redirects to login if not authenticated
- **Database Integration**: Works with `conversations`, `messages`, `property_reviews`, and `profiles` tables
- **RTL Support**: Full Arabic language support

### Host Profile & Messaging Architecture

#### Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `HostProfileModal` | `src/components/HostProfileModal.tsx` | Display host profile, stats, and reviews |
| `ContactHostModal` | `src/components/ContactHostModal.tsx` | Send messages to hosts |

#### Host Profile Data Flow
```typescript
// 1. Fetch host profile
profiles.select('*').eq('id', hostId)

// 2. Fetch host properties (accommodations + vehicles)
accommodations.select('id, is_superhost').eq('host_id', hostId)
vehicles.select('id').eq('owner_id', hostId)

// 3. Fetch all host reviews
property_reviews
  .select('*, profiles!reviewer_id(full_name, avatar_url)')
  .eq('status', 'approved')
  .or(`accommodation_id.in.(...),vehicle_id.in.(...)`)

// 4. Calculate response rate
conversations.select('id').eq('host_id', hostId)
messages.select('conversation_id, sender_id')
```

#### Contact Host Flow
```typescript
// 1. Get user's profile ID
profiles.select('id').eq('user_id', authUser.id)

// 2. Check/create conversation
conversations
  .select('id')
  .eq('guest_id', userProfile.id)
  .eq('host_id', hostId)
  .eq('accommodation_id | vehicle_id', propertyId)

// 3. Send message
messages.insert({
  conversation_id,
  sender_id: userProfile.id,
  message,
  message_type: 'text'
})

// 4. Navigate to /messages
```

#### Database Tables Used
| Table | Purpose |
|-------|---------|
| `profiles` | Host information and verification status |
| `accommodations` | Host's accommodation listings |
| `vehicles` | Host's vehicle listings |
| `property_reviews` | Reviews for host's properties |
| `conversations` | Message threads between guests and hosts |
| `messages` | Individual messages in conversations |


### Booking Flow Architecture

#### Data Fetching Hooks (src/lib/api/bookings.ts)
- `useAdminFees(appliesTo?)` - Fetches active fees from `admin_fees` table
- `useAccommodationAvailability(id)` - Fetches availability calendar for accommodations
- `useVehicleAvailability(id)` - Fetches availability calendar for vehicles
- `useRoomAvailability(roomId)` - Fetches availability for specific hotel rooms
- `useRooms(accommodationId)` - Fetches rooms for hotels/resorts

#### Helper Functions
- `isDateAvailable(date, availability)` - Checks if single date is available (empty availability = ALL AVAILABLE by default)
- `isDateRangeAvailable(start, end, availability)` - Validates entire date range
- `calculateDateRangePrice(start, end, basePrice, availability)` - Calculates price with dynamic pricing
- `calculateBookingFees(basePrice, cleaningFee, adminFees)` - Applies service fee and taxes

#### Database Tables Used
| Table | Purpose |
|-------|---------|
| `availability_calendar` | Date-by-date availability and price overrides |
| `rooms` | Hotel room inventory with pricing |
| `admin_fees` | Service fees, taxes, commission rates |
| `accommodations` | Listing details including `offline_payment_enabled` |
| `vehicles` | Vehicle details including `offline_payment_enabled` |
| `bookings` | Stores booking records |

#### Payment Type Logic
- Payment type is **automatic** - users don't choose
- Determined by `offline_payment_enabled` on the listing
- `true` → Offline payment (pay at property/pickup)
- `false` → Online payment (Stripe)

**Complete Profile Page System** - Full profile management with:
- **Profile Settings**: Tabbed interface (Profile, Notifications, Privacy, Security)
- **Phone Verification**: OTP verification with country code picker (25+ countries)
- **Document Verification**: Upload ID front/back, business license, additional documents
- **Two-Factor Authentication**: Authenticator app setup with QR code and backup codes
- **Password Management**: Change password with strength requirements
- **Notification Preferences**: Email and push notification toggles
- **Privacy Settings**: Profile visibility and search permissions
- **Profile Completion**: Progress bar showing profile completion percentage
- **Avatar Upload**: Change profile photo from device gallery
- **Emergency Contact**: Add emergency contact information
- **Full Arabic/English translations** for all new screens

**Comprehensive Search Filters** - Complete filtering system with all amenities and property types:
- **30+ accommodation amenities**: WiFi, Parking, Kitchen, Pool, Gym, Air Conditioning, Heating, TV, Washing Machine, Dryer, Mountain View, Garden, City View, Ocean View, Sea View, Lake View, Balcony, Patio, Pet Friendly, Fireplace, Fire Pit, Game Room, Entertainment, Piano, BBQ, Grill, Beach Access, Hot Tub, Spa, Coffee Maker
- **20+ vehicle features**: GPS Navigation, Bluetooth, USB Charging, Automatic/Manual Transmission, ABS Brakes, Airbags, Cruise Control, Parking Sensors, Backup Camera, Sunroof, Leather Seats, Heated Seats, Keyless Entry, Push Start, Remote Start, Air Conditioning, Apple CarPlay, Android Auto, WiFi Hotspot
- **15+ property types**: Apartment, House, Villa, Hotel, Studio, Loft, Condo, Townhouse, Cabin, Chalet, Cottage, Bungalow, Resort, Hostel, Guest House
- **13 vehicle types**: Economy, Compact, SUV, Luxury, Van, Sedan, Sports Car, Convertible, Truck, Minivan, Crossover, Electric, Hybrid
- **Accommodation-specific filters**:
  - Bedrooms: Any, 1, 2, 3, 4, 5+
  - Bathrooms: Any, 1, 2, 3, 4+
  - Guests: Any, 1, 2, 4, 6, 8, 10+
  - Instant Book toggle for instant bookings without host approval
- Price range filtering with min/max inputs
- Superhost/Verified owner toggle with descriptions
- Quick filter chips showing active filters
- Individual filter removal or clear all option
- Filters properly passed to API with optional chaining
- All filters work seamlessly with real-time search results

**Advanced Search Filters** - Comprehensive filtering system:
- Updated API hooks to use `.overlaps()` for amenities/features filtering
- Added superhost/verified owner filter toggle with descriptive text
- Implemented quick filter chips below search header
- Filter chips show active filters: property type, price range, amenities, quality filters
- Quick removal of individual filters by tapping X on chips
- "+N more" indicator for additional amenities
- Clear all filters button for easy reset
- Filters automatically applied to search results
- Proper TypeScript types for all filter parameters
- Works seamlessly with both accommodations and vehicles

**RTL Layout & Spacing Fixes** - Perfect RTL support with proper spacing:
- Fixed padding and margins for Arabic RTL layout on all screens
- Changed padding from `px-4` to `px-6` for better spacing in RTL
- Conditional margins using `${isRTL ? 'mr-X' : 'ml-X'}` throughout
- Conditional positioning using `${isRTL ? 'right-X' : 'left-X'}` for badges and overlays
- Centered empty state text for better RTL appearance
- **Wishlist screen**: Fixed heart icon positioning and spacing
- **Trips screen**: Fixed booking card margins and status badge positioning
- **Accommodation detail**: Full translation + RTL-aware spacing throughout all tabs
- **Vehicle detail**: Full translation + RTL-aware spacing throughout all tabs
- **Search map**: Translated "stays on map" and "cars on map" text
- Components no longer touch right edge in Arabic mode

**Complete Translations** - All screens now support Arabic and English:
- All main screens translated: Trips, Wishlist, Inbox, Chat
- Tab navigation labels translated
- RTL layout automatically applied when Arabic is selected
- Cairo font ensures perfect rendering in both languages
- Language preference persists across app restarts

**Authentication Persistence** - Improved session management with:
- Automatic session restoration from AsyncStorage on app restart
- Auth state listener for real-time session updates
- Users stay logged in across app restarts
- Automatic redirect to profile when authenticated
- Token auto-refresh for seamless experience
- No need to log in multiple times

**Internationalization (i18n)** - Complete bilingual support:
- Arabic and English translations for **all screens and components**
- **Trips screen**: booking status, dates, property types
- **Wishlist screen**: saved listings, empty states, property details
- **Inbox screen**: conversations, messages, empty states
- **Chat screen**: messaging interface, input placeholder, status indicators
- **Tab navigation**: all tab labels translated
- Language toggle in profile settings
- RTL layout automatically applied for Arabic (forceRTL)
- Persistent language preference using AsyncStorage
- Cairo font optimized for both languages
- Translation keys organized by screen/feature

**Branding Updates** - Consistent logo implementation:
- Removed background from logo (icon only)
- "Nestoria" text displayed beside icons
- Emerald green theme on explore screen
- "Coming Soon" label on Flights feature
- Privacy and Terms links on all auth screens

**Featured Sections** - Now loading successfully via RPC function that bypasses RLS policies. The explore screen displays 3 dynamic sections from the admin panel with Airbnb-style property cards.

**Property Detail Pages** - Implemented comprehensive accommodation and vehicle detail pages with:
- Image galleries with featured badges
- Tabbed navigation (Overview, Amenities/Features, Reviews, Location)
- Host/Owner profile cards with contact options
- Property details, descriptions, and rules
- Cancellation policies (accommodations)
- Rental terms (vehicles)
- Review system with ratings
- **Interactive maps** with privacy controls (exact location or approximate area)
- Wishlist functionality
- Bottom booking bar with pricing

**Map Integration** - Fully integrated maps using react-native-maps:
- PropertyMap component for location tab
- SearchResultsMap component for search page map view
- Privacy-aware coordinate display (exact pin or approximate circle)
- Automatic zoom levels based on privacy settings
- Map/List view toggle on search page
- Interactive markers with pricing overlays
- Mapbox token configuration for geocoding support
- Map utilities for coordinate validation and transformations

**Messaging System** - Complete real-time messaging functionality:
- Conversation list with unread message badges
- Real-time chat with message delivery status
- Message read receipts (✓ sent, ✓✓ read)
- Auto-scroll to new messages
- Property context displayed in chat header
- Uses Supabase RPC function `get_user_conversations`
- Real-time subscriptions via Supabase channels
- Support for guest-host communication

## 🎨 Design & Branding

### Brand Identity
- **Name**: Nestoria Travel
- **Logo**: Home icon in emerald green circle
- **Primary Color**: Emerald Green (#10B981)
- **Secondary Color**: White (#FFFFFF)
- **Typography**: Cairo font family (supports Arabic & English)
  - Cairo_400Regular - Body text
  - Cairo_600SemiBold - Subheadings
  - Cairo_700Bold - Headings

### Design Philosophy
- Clean, modern design inspired by iOS Human Interface Guidelines
- Mobile-first approach with touch-optimized interactions
- Bilingual support (Arabic & English) with Cairo font
- Emerald green accents throughout for brand consistency
- Card-based UI for listings with smooth animations
- Professional spacing and typography

## 🏗️ App Structure

### Main Screens (Tab Navigation)
- **Explore** (`/`) - Browse accommodations and vehicles with featured sections
- **Trips** (`/trips`) - View upcoming and past bookings
- **Wishlist** (`/wishlist`) - Saved listings
- **Inbox** (`/inbox`) - Messages with hosts
- **Profile** (`/profile`) - User account and settings

### Other Screens
- **Search** (`/search`) - Advanced search with filters for accommodations and vehicles, with map/list view toggle
- **Chat** (`/chat/[id]`) - Real-time messaging screen with read receipts and property context
- **Accommodation Detail** (`/accommodation/[id]`) - Full accommodation details with tabs
- **Vehicle Detail** (`/vehicle/[id]`) - Full vehicle details with tabs
- **Authentication** (`/auth/*`) - Sign in, sign up, forgot password

## 🛠️ Tech Stack

- **Framework**: Expo SDK 53
- **Runtime**: React Native 0.76.7
- **Package Manager**: bun (not npm)
- **Navigation**: Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind CSS v3)
- **State Management**: React Query (@tanstack/react-query) for server state
- **Animations**: react-native-reanimated v3
- **Gestures**: react-native-gesture-handler
- **Icons**: lucide-react-native
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Fonts**: @expo-google-fonts/cairo

## 📁 Project Structure

```
src/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab navigation (emerald active color)
│   │   ├── index.tsx         # Explore screen with featured sections
│   │   ├── trips.tsx         # Real bookings data
│   │   ├── wishlist.tsx      # Real wishlist data
│   │   ├── inbox.tsx         # Real conversations
│   │   └── profile.tsx       # User profile with auth
│   ├── auth/
│   │   ├── sign-in.tsx       # Sign in screen
│   │   ├── sign-up.tsx       # Sign up screen
│   │   └── forgot-password.tsx
│   ├── accommodation/
│   │   └── [id].tsx          # Accommodation detail with tabs
│   ├── vehicle/
│   │   └── [id].tsx          # Vehicle detail with tabs
│   ├── chat/
│   │   └── [id].tsx          # Real-time chat screen
│   ├── search.tsx            # Advanced search with filters
│   └── _layout.tsx           # Root layout with Cairo font loading
├── components/
│   ├── ListingCard.tsx       # Reusable listing card (works with real API data)
│   ├── PropertyMap.tsx       # Location map for property details
│   └── SearchResultsMap.tsx  # Map view for search results
└── lib/
    ├── api/                  # API hooks for Supabase
    │   ├── index.ts          # Export all hooks
    │   ├── auth.ts           # useAuth, useSignIn, useSignOut
    │   ├── accommodations.ts # useAccommodations, useAccommodation
    │   ├── vehicles.ts       # useVehicles, useVehicle
    │   ├── bookings.ts       # useUserBookings, useUserVehicleBookings
    │   ├── wishlist.ts       # useWishlist, useToggleWishlist
    │   ├── messages.ts       # useConversations, useMessages, useSendMessage
    │   ├── featured.ts       # useFeaturedSections, useHomepageData
    │   ├── accommodation-details.ts  # useAccommodationDetail, useAccommodationReviews
    │   └── vehicle-details.ts        # useVehicleDetail, useVehicleReviews
    ├── amenities.ts          # Amenity icon mapping utilities
    ├── supabase.ts           # Supabase client & TypeScript types
    └── cn.ts                 # className merge utility
```

## 🔌 Backend Integration (Supabase)

### Supabase Configuration
- **URL**: `https://xljovgmnunoomjbighia.supabase.co`
- **Storage**: AsyncStorage for React Native (session persistence enabled)
- **Auth**: Auto-refresh tokens, persistent sessions, 2FA support
- **Session Restoration**: Automatic login on app restart via AsyncStorage

### API Hooks Available

#### Authentication
- `useAuth()` - Get current user and profile with session restoration
  - Includes auth state listener for real-time updates
  - Automatically restores session from AsyncStorage
  - Returns user and profile data
- `useSignIn()` - Sign in with email/password (invalidates auth cache)
- `useSignOut()` - Sign out user (clears all cached data)
- `useSignUp()` - Register new user

#### Listings
- `useAccommodations(filters)` - Fetch accommodations with filters
- `useAccommodation(id)` - Fetch single accommodation
- `useVehicles(filters)` - Fetch vehicles with filters
- `useVehicle(id)` - Fetch single vehicle
- `useFeaturedSections()` - Fetch featured homepage sections
- `useHomepageData()` - Combined featured sections + cities

#### Bookings
- `useUserBookings(status?)` - Fetch user's accommodation bookings
- `useUserVehicleBookings(status?)` - Fetch user's vehicle bookings

#### Wishlist
- `useWishlist()` - Fetch user's saved listings
- `useToggleWishlist()` - Add/remove from wishlist

#### Messaging
- `useConversations()` - Fetch user's conversations with hosts

### Database Tables
- `profiles` - User profiles
- `accommodations` - Property listings
- `vehicles` - Vehicle listings
- `cities` - Cities with images
- `bookings` - Accommodation bookings
- `vehicle_bookings` - Vehicle bookings
- `wishlist` - Saved listings
- `conversations` - Chat conversations
- `messages` - Individual messages
- `featured_sections` - Homepage sections
- `featured_properties` - Properties in sections
- `reviews` - Ratings and reviews

## 🚀 Current Status - FULLY CONNECTED TO BACKEND ✅

### ✅ Completed
1. **Supabase Integration**
   - Client configured with AsyncStorage
   - Full TypeScript types for all tables
   - Row Level Security (RLS) policies respected
   - Fixed foreign key references (vehicles use `owner_id`, accommodations use `host_id`)

2. **Authentication System**
   - Sign in/sign up screens with Nestoria branding
   - User profile management with real data
   - 2FA support (SMS & App)
   - **Persistent sessions - users stay logged in across app restarts**
   - **Session restoration from AsyncStorage**
   - **Auth state listener for real-time updates**
   - Automatic token refresh
   - "Remember me" functionality built-in

3. **All Screens Using Real Data**
   - Explore: Featured sections + browse all listings
   - Search: Advanced search with filters (price, type, amenities)
   - Trips: Real bookings (accommodations & vehicles)
   - Wishlist: Real saved listings
   - Inbox: Real-time conversations with unread counts
   - Chat: Real-time messaging with read receipts
   - Profile: Real user data
   - Listing Detail: Real accommodation/vehicle data with reviews

4. **Design System**
   - Cairo fonts loaded and applied everywhere
   - Emerald green (#10B981) branding throughout
   - Home icon logo (replaced "N" text)
   - Mobile-optimized with proper SafeArea handling
   - Smooth animations and transitions

5. **Search Functionality**
   - Dedicated search screen (`/search`)
   - **Advanced filtering system with quick filter chips**:
     - Property/vehicle type selection
     - Price range filtering (min/max)
     - Amenities/features filtering (uses `.overlaps()` for array matching)
     - Superhost/Verified owner toggle filter
     - Quick filter chips for easy filter management
     - Clear individual filters or clear all at once
   - Additional filters: bedrooms, bathrooms, guests, transmission, fuel type, seats, year
   - Toggle between accommodations and vehicles
   - Map/List view toggle for results visualization
   - Interactive map with price markers
   - Real-time results with proper location search

6. **Messaging System**
   - Real-time conversations using Supabase RPC and channels
   - Conversation list with unread message badges
   - Chat screen with message delivery status
   - Read receipts (single check for sent, double check for read)
   - Auto-scroll to new messages
   - Property context in chat header
   - Mark messages as read when viewing
   - Real-time message subscriptions

### 🔍 Debugging Steps

The app has console logging enabled in API calls to help debug any data fetching issues:
- Check expo.log for runtime logs
- Look for 🔍, 📦, ❌, ✅ emoji indicators in logs
- Authentication status is logged
- API responses are logged with counts

7. **Internationalization (i18n)**
   - Complete bilingual support (Arabic & English)
   - **All screens translated**: Trips, Wishlist, Inbox, Chat, Profile, Explore, Auth, Accommodation Detail, Vehicle Detail, Search
   - **Tab navigation** labels fully translated
   - Language toggle in profile settings
   - RTL layout support for Arabic (I18nManager.forceRTL)
   - **Perfect RTL spacing** with conditional margins and padding
   - Persistent language preference using AsyncStorage
   - Translations for all screens and components
   - Cairo font optimized for both languages
   - Translation keys organized by screen/feature
   - **200+ translation keys** covering:
     - Landing & Authentication screens
     - Explore & Search functionality (including map overlays)
     - Profile settings & management
     - Trips (upcoming, past, status labels)
     - Wishlist (empty states, property details)
     - Inbox (conversations, messages)
     - Chat (messaging interface, status indicators)
     - Accommodation Detail (all tabs, property info, reviews, location)
     - Vehicle Detail (all tabs, rental terms, insurance, reviews)
     - Search Results Map (stats overlay, no location data message)
     - Common UI elements (buttons, labels, errors)

### 📝 Important Notes

1. **Authentication & Sessions**:
   - Sessions persist across app restarts automatically
   - Users only need to log in once
   - Auth tokens refresh automatically
   - Session stored securely in AsyncStorage
   - Auth state updates in real-time via Supabase listener

2. **Authentication Required**: Most data requires a logged-in user
   - Bookings require authentication
   - Wishlist requires authentication
   - Messages require authentication
   - Explore/Browse works without auth

2. **Data Availability**: The app will show empty states if:
   - No data exists in the database yet
   - User is not authenticated (for protected routes)
   - Supabase RLS policies restrict access

3. **Cairo Font**: Must be loaded before rendering
   - Font loading happens in root `_layout.tsx`
   - Splash screen hides until fonts are ready

## 🎯 Next Steps

To populate data and test:
1. Sign up a new user via the app
2. Add sample data to Supabase:
   - Cities
   - Accommodations
   - Vehicles
   - Featured sections
3. Create bookings and wishlists through the app
4. Test messaging between users

## 💻 Development

```bash
# The app runs automatically on port 8081
# View logs
tail -f expo.log

# Clear cache if needed
bun expo start --clear
```

## 🌐 Website Reference
- Platform URL: nestoria-travel.com
- Design inspiration from modern travel platforms
- Mobile app matches web platform branding
   - AsyncStorage for session persistence
   - TypeScript types for all database tables

2. **Authentication** (`src/lib/api/auth.ts`)
   - Sign in / Sign up / Sign out
   - Two-factor authentication (2FA) support
   - Profile management
   - Password reset
   - JWT token handling

3. **Accommodations API** (`src/lib/api/accommodations.ts`)
   - Browse accommodations with filters
   - Search by location/title
   - Featured listings
   - Single accommodation details with reviews
   - Availability checking
   - CRUD operations for suppliers

4. **Vehicles API** (`src/lib/api/vehicles.ts`)
   - Browse vehicles with filters
   - Vehicle details with reviews
   - Availability checking
   - CRUD operations for suppliers

5. **Bookings API** (`src/lib/api/bookings.ts`)
   - Create accommodation bookings
   - Create vehicle bookings
   - View user bookings
   - Cancel bookings
   - Payment processing integration
   - Booking statistics

6. **Wishlist API** (`src/lib/api/wishlist.ts`)
   - Add/remove from wishlist
   - Check if item is wishlisted
   - View all wishlisted items
   - Wishlist count

7. **Messages API** (`src/lib/api/messages.ts`)
   - View conversations
   - Send messages
   - Real-time message subscriptions
   - Unread message counts
   - Mark messages as read
   - Create new conversations

### 🔌 Using the API Hooks

Example usage in screens:

```typescript
import { useAccommodations, useWishlist, useAuth } from '@/lib/api';

function ExploreScreen() {
  // Authentication
  const { data: authData } = useAuth();

  // Fetch accommodations
  const { data: accommodations, isLoading } = useAccommodations({
    city: 'Dubai',
    minPrice: 100,
    maxPrice: 500,
  });

  // Wishlist
  const { data: wishlist } = useWishlist();

  // ... render UI
}
```

### 🎯 Next Steps

To complete the integration:

1. **Add Authentication UI**: Create sign-in/sign-up screens
2. **Update Screens**: Replace mock data with real API hooks
3. **Handle Loading States**: Add loading spinners and error handling
4. **Implement Payments**: Integrate Stripe for bookings
5. **Test with Real Data**: Create test listings in Supabase dashboard

The backend is ready! You can now:
- Sign up users through the Supabase dashboard
- Add test accommodations and vehicles
- Test the full booking flow
- Send messages between users

## 📱 Development

The app is running on Expo's development server on port 8081. All changes are automatically reflected in the Vibecode app preview.

View logs in the LOGS tab or in `expo.log` file.

---

Built with ❤️ for Nestoria
