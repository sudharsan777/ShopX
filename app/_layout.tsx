import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { CartProvider } from '@/components/shop/CartProvider';
import { CatalogProvider } from '@/components/shop/CatalogProvider';
import { SessionProvider } from '@/components/auth/SessionProvider';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SessionProvider>
      <CatalogProvider>
        <CartProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="signin" options={{ presentation: 'modal' }} />
            <Stack.Screen name="signup" options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="product/[id]" options={{ headerShown: false, animation: "slide_from_right" }} />
          </Stack>
        </CartProvider>
      </CatalogProvider>
    </SessionProvider>
  );
}
