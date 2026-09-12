import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getDatabase } from '@/database';
import { getHouseholdState } from '@/features/household/state';
import { OnboardingScreen } from '@/features/household/OnboardingScreen';
import { colors } from '@/constants/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const [gate, setGate] = useState<'loading' | 'onboarding' | 'app'>('loading');
  useNetworkStatus();

  useEffect(() => {
    getDatabase()
      .then(() => getHouseholdState())
      .then((household) => setGate(household ? 'app' : 'onboarding'))
      .catch((error) => {
        console.error('Baza nije spremna', error);
        setGate('onboarding');
      });
  }, []);

  if (gate === 'loading') {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  if (gate === 'onboarding') {
    return (
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <OnboardingScreen onComplete={() => setGate('app')} />
          <StatusBar style="dark" />
        </QueryClientProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="recipes/index" options={{ title: 'Recepti' }} />
          <Stack.Screen name="recipes/import" options={{ title: 'Uvoz iz linka' }} />
          <Stack.Screen name="recipes/create" options={{ title: 'Novi recept' }} />
          <Stack.Screen name="recipes/edit/[id]" options={{ title: 'Izmeni recept' }} />
          <Stack.Screen name="recipes/add-to-plan/[id]" options={{ title: 'Dodaj u plan' }} />
          <Stack.Screen name="favorites" options={{ title: 'Omiljeni recepti' }} />
          <Stack.Screen name="history" options={{ title: 'Istorija' }} />
          <Stack.Screen name="settings" options={{ title: 'Podešavanja' }} />
          <Stack.Screen name="meals/create" options={{ title: 'Dodaj obrok' }} />
          <Stack.Screen name="meals/edit/[id]" options={{ title: 'Izmeni obrok' }} />
          <Stack.Screen name="pantry/[id]" options={{ title: 'Namirnica' }} />
          <Stack.Screen name="pantry/create" options={{ title: 'Dodaj namirnicu' }} />
          <Stack.Screen name="shopping/create" options={{ title: 'Dodaj stavku' }} />
          <Stack.Screen name="shopping/[id]" options={{ title: 'Izmeni stavku' }} />
        </Stack>
        <StatusBar style="dark" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
