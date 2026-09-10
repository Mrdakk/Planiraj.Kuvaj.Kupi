import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getDatabase } from '@/database';
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
  const [dbReady, setDbReady] = useState(false);
  useNetworkStatus();

  useEffect(() => {
    getDatabase()
      .then(() => setDbReady(true))
      .catch((error) => {
        console.error('Baza nije spremna', error);
        setDbReady(true);
      });
  }, []);

  if (!dbReady) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
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
          <Stack.Screen name="favorites" options={{ title: 'Omiljeni recepti' }} />
          <Stack.Screen name="history" options={{ title: 'Istorija' }} />
          <Stack.Screen name="settings" options={{ title: 'Podešavanja' }} />
          <Stack.Screen name="meals/create" options={{ title: 'Dodaj obrok' }} />
          <Stack.Screen name="meals/edit/[id]" options={{ title: 'Izmeni obrok' }} />
          <Stack.Screen name="pantry/[id]" options={{ title: 'Namirnica' }} />
          <Stack.Screen name="pantry/create" options={{ title: 'Dodaj namirnicu' }} />
        </Stack>
        <StatusBar style="dark" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
