import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import {
  SourceSans3_400Regular,
  SourceSans3_500Medium,
  SourceSans3_600SemiBold,
  SourceSans3_700Bold,
} from '@expo-google-fonts/source-sans-3';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAutoSync } from '@/hooks/useAutoSync';
import { getDatabase } from '@/database';
import { getHouseholdState } from '@/features/household/state';
import { OnboardingScreen } from '@/features/household/OnboardingScreen';
import { colors, fonts, typography } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const [gate, setGate] = useState<'loading' | 'dbError' | 'onboarding' | 'app'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_700Bold,
    SourceSans3_400Regular,
    SourceSans3_500Medium,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
  });
  useNetworkStatus();

  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    getDatabase()
      .then(() => getHouseholdState())
      .then((household) => setGate(household ? 'app' : 'onboarding'))
      .catch((error) => {
        console.error('Baza nije spremna', error);
        setGate('dbError');
      });
  }, [attempt]);

  useEffect(() => {
    if (fontsReady && gate !== 'loading') {
      SplashScreen.hideAsync();
    }
  }, [fontsReady, gate]);

  if (!fontsReady || gate === 'loading') {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    );
  }

  if (gate === 'dbError') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.blocking}>
          <EmptyState
            icon="alert-circle-outline"
            title="Podaci nisu učitani"
            message="Lokalna baza nije mogla da se otvori. Pokušaj ponovo, a ako se ponavlja, restartuj aplikaciju."
            actionTitle="Pokušaj ponovo"
            onAction={() => {
              setGate('loading');
              setAttempt((value) => value + 1);
            }}
          />
        </SafeAreaView>
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
        <AppShell />
        <StatusBar style="dark" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  blocking: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

function AppShell() {
  useAutoSync();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerTitleStyle: {
          fontFamily: fonts.bodySemi,
          fontSize: typography.h3.fontSize,
          color: colors.text,
        },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="recipes/index" options={{ title: 'Recepti' }} />
      <Stack.Screen name="recipes/import" options={{ title: 'Uvoz recepta' }} />
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
  );
}
