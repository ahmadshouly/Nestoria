import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/lib/useColorScheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useFonts, Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold } from '@expo-google-fonts/cairo';
import { useEffect } from 'react';
import { useLanguageStore } from '@/lib/i18n';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Data is always considered stale, fetch immediately
      gcTime: 1000 * 60 * 5, // Keep unused data in cache for 5 minutes
      refetchOnMount: 'always', // Always refetch when component mounts
      refetchOnWindowFocus: true, // Refetch when app comes to foreground
      refetchOnReconnect: true, // Refetch when internet reconnects
      retry: 2, // Retry failed requests 2 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
  },
});

function RootLayoutNav({ colorScheme }: { colorScheme: 'light' | 'dark' | null | undefined }) {
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="auth/sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="auth/verify-2fa" options={{ headerShown: false }} />
        <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false, title: 'Search' }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false, title: 'Chat' }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: false, title: 'Edit Profile' }} />
        <Stack.Screen name="profile/settings" options={{ headerShown: false, title: 'Settings' }} />
        <Stack.Screen name="profile/verify-phone" options={{ headerShown: false, title: 'Verify Phone' }} />
        <Stack.Screen name="profile/documents" options={{ headerShown: false, title: 'Documents' }} />
        <Stack.Screen name="profile/security" options={{ headerShown: false, title: 'Security' }} />
        <Stack.Screen name="profile/change-password" options={{ headerShown: false, title: 'Change Password' }} />
        <Stack.Screen name="accommodation/[id]" options={{ headerShown: false, title: 'Accommodation' }} />
        <Stack.Screen name="vehicle/[id]" options={{ headerShown: false, title: 'Vehicle' }} />
        <Stack.Screen name="booking/[id]" options={{ headerShown: false, title: 'Booking Details' }} />
        <Stack.Screen name="listing/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}



export default function RootLayout() {
  const colorScheme = useColorScheme();
  const initLanguage = useLanguageStore(s => s.initLanguage);
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  useEffect(() => {
    // Initialize language and RTL settings on app start
    initLanguage();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <RootLayoutNav colorScheme={colorScheme} />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}